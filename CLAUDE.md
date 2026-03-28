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

### Request Flow

1. Root `app/page.tsx` checks auth and redirects to `/dashboard` or `/login`
2. `app/layout.tsx` wraps the entire app in `AuthProvider` + `ThemeProvider`
3. `app/dashboard/layout.tsx` enforces auth and renders the persistent sidebar
4. Protected dashboard pages live under `app/dashboard/`
5. Three AI endpoints under `app/api/` call the Anthropic SDK server-side

### State Management

Two React Contexts (no external state library):
- **`AuthContext`** (`app/context/AuthContext.tsx`) — Supabase session, user profile, `refreshProfile()`
- **`ThemeContext`** (`app/context/ThemeContext.tsx`) — Active theme + Tailwind color class maps; theme unlocks are gated by XP/streak/activity milestones

### Database (Supabase/PostgreSQL)

Types are in `app/types/database.ts`. Key tables:
- `profiles` — level, XP, streak, goals, active theme
- `writings` — submissions with feedback and status
- `vocab_words` — word bank with mastery tracking
- `vocab_tests` — quiz results
- `daily_stats` / `xp_log` — progress tracking and XP audit trail
- `coach_conversations` — AI coach chat history

Supabase client is initialized in `app/lib/supabase.ts`.

### XP & Progression (`app/lib/xp.ts`)

- `awardXP(userId, action, amount)` — writes to `xp_log` and updates `profiles.total_xp`
- `updateDailyStats()` — increments words written, vocab used for the day
- `updateStreak()` — handles streak logic
- Level/title helpers (`getLevelFromXP`, `getTitleForLevel`) live in `app/types/database.ts`

### AI API Routes

All three routes use the Anthropic SDK server-side:

| Route | Model | Purpose |
|---|---|---|
| `POST /api/ai-coach` | sonnet-4-6 (thinking) / haiku-4-5 (creative) | Writing coach chat |
| `POST /api/ai-feedback` | haiku-4-5 | Structured feedback on submissions |
| `POST /api/extract-vocab` | haiku-4-5 | Extract vocab words, save to DB |

### Themes

5 unlockable themes defined in `ThemeContext`. Each theme provides a map of Tailwind color classes consumed by all dashboard components. Unlock conditions combine XP thresholds, streak counts, and activity milestones.
