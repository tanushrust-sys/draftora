# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

**Stack:** Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + Supabase + Anthropic Claude API

### Request Flow & Role-Based Routing

1. Root `app/page.tsx` checks auth and calls `getAccountHomePath(profile)` to redirect to the correct dashboard per role
2. `app/layout.tsx` wraps the app in `AuthProvider` + `ThemeProvider`
3. Three separate dashboard roots:
   - `app/dashboard/` — Student gamified writing app (persistent sidebar via `app/dashboard/layout.tsx`)
   - `app/parent/` — Parent workspace (monitors linked children)
   - `app/teacher/` — Teacher workspace (manages classes and students)
4. Parent/teacher pages use `RoleAppShell` (`app/components/role-app-shell.tsx`) instead of the student sidebar

### Multi-Role System

Three account types: `'student' | 'parent' | 'teacher'` (defined in `app/lib/account-type.ts`).

- Role is stored in `profile.account_type` and readable from `user_metadata`
- `getAccountHomePath(profile)` returns `/dashboard`, `/parent`, or `/teacher` accordingly
- LocalStorage overrides exist for testing (`app/lib/account-type.ts`, `app/lib/profile-overrides.ts`)

**Student codes** (`app/lib/student-code.ts`): Parents and teachers link to students using 9-character codes (format: `DRA` + 6 alphanumeric chars). Generated with `generateStudentCode()`, normalized with `normalizeStudentCode()`.

### State Management

Two React Contexts (no external state library):
- **`AuthContext`** (`app/context/AuthContext.tsx`) — Supabase session, user profile, `refreshProfile()`, plus override hooks for testing (age group, account type, profile data, writing experience)
- **`ThemeContext`** (`app/context/ThemeContext.tsx`) — Active theme + Tailwind color class maps; theme unlocks are gated by XP/streak/activity milestones (student only)

### Database (Supabase/PostgreSQL)

Types are in `app/types/database.ts`. Key tables:
- `profiles` — level, XP, streak, goals, active theme, `account_type`, `plan`, `student_id`, trial counters (`coach_messages_used`, `writings_created`, `vocab_words_saved`)
- `writings` — submissions with feedback and status
- `vocab_words` — word bank with mastery tracking
- `vocab_tests` — quiz results
- `daily_stats` / `xp_log` — progress tracking and XP audit trail
- `coach_conversations` — AI coach chat history
- `teacher_classes` — classes owned by teachers
- `teacher_class_students` — student membership in classes
- `parent_student_links` — parent↔student relationships (keyed by student code)
- `deleted_accounts` — soft-delete audit log (prevents email/username resurrection)

Supabase client is initialized in `app/lib/supabase.ts`. Admin client (service role key) used in API routes via `requireRouteAuth`.

### Server-Side Auth (`app/lib/server-auth.ts`)

All sensitive API routes use `requireRouteAuth(request, allowedRoles?)`:
- Validates bearer token from `Authorization` header
- Checks `deleted_accounts` to block resurrected accounts
- Enforces role-based access via optional `allowedRoles` array
- Returns `{ auth: { userId, profile }, adminSupabase }` or `{ error, status }`

### Freemium / Trial System (`app/lib/trial.ts`)

Free users (`plan: 'free'`) get a 30-day trial with per-feature caps tracked in `profiles`:
- `coach_messages_used` (cap: 50)
- `writings_created` (cap: 30)
- `vocab_words_saved` (cap: 90)

`getTrialStatus(profile)` returns what's blocked. `UpgradeModal` gates features behind paywall.

### XP & Progression (`app/lib/xp.ts`)

- `awardXP(userId, action, amount)` — writes to `xp_log` and updates `profiles.total_xp`
- `updateDailyStats()` — increments words written, vocab used for the day
- `updateStreak()` — handles streak logic
- Level/title helpers (`getLevelFromXP`, `getTitleForLevel`) live in `app/types/database.ts`

### AI API Routes

Cost note: OpenAI stays on `gpt-4o-mini`, which is still the cheapest good OpenAI chat model. If `AI_PROVIDER=anthropic`, the default model family is `claude-haiku-4-5-20251001` across tiers unless an `AI_*_MODEL` override is set.

| Route | Model | Purpose |
|---|---|---|
| `POST /api/ai-coach` | gpt-4o-mini / claude-haiku-4-5-20251001 | Writing coach chat |
| `POST /api/ai-feedback` | gpt-4o-mini / claude-haiku-4-5-20251001 | Structured feedback on submissions |
| `POST /api/extract-vocab` | gpt-4o-mini / claude-haiku-4-5-20251001 | Extract vocab words, save to DB |
| `POST /api/drill-review` | gpt-4o-mini / claude-haiku-4-5-20251001 | AI review of vocab drill session |
| `GET /api/student-report` | — | Aggregate student data for parents/teachers |
| `GET/POST /api/teacher/*` | — | Class and student CRUD (teacher-only) |
| `GET/POST /api/parent/links` | — | Parent-student linking |

### Workspace UI (Parent/Teacher)

Parent and teacher dashboards use `RoleAppShell` with a separate dark/light mode system (stored in `app/lib/workspace-mode.ts`, independent of student themes). Color palettes defined in `app/lib/workspace-palette.ts`. Reusable workspace components (`SectionTitle`, `PillButton`, `ToggleRow`, `downloadFile`) live in `app/components/workspace-controls.tsx`.

### Themes (Student Only)

5 unlockable themes defined in `ThemeContext`. Each theme provides a map of Tailwind color classes consumed by all dashboard components. Unlock conditions combine XP thresholds, streak counts, and activity milestones.

### Build Notes

- `scripts/build-with-chunk-mirror.js` mirrors Next.js server chunks for production
- `webpackBuildWorker: false` set in `next.config.ts` for Windows compatibility
- Windows shims: `scripts/fs-readlink-shim.js`, `scripts/next-worker-shim.js`
