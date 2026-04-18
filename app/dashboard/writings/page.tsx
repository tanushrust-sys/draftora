'use client';

// WRITING STUDIO — Write, Journal, and Progress in one place
// Three tabs: Write (editor + AI feedback) | Journal (all writings) | My Progress (improvement chart)

import { useState, useEffect, useCallback, useMemo, useRef, Suspense, startTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { fetchWithTimeout, FetchTimeoutError } from '@/app/lib/fetch-with-timeout';
import { PromiseTimeoutError, withPromiseTimeout } from '@/app/lib/promise-with-timeout';
import { ensureActiveSessionGracefully, supabase } from '@/app/lib/supabase';
import {
  mergeStoredWritingHistory,
  readStoredWritingHistory,
  removeStoredWritingHistory,
  upsertStoredWritingHistory,
} from '@/app/lib/writing-history-storage';
import { awardXP, getLocalDateKey, msUntilNextLocalMidnight, updateDailyStats, updateStreak, XP_REWARDS } from '@/app/lib/xp';
import { getExperienceIncreaseForAction, persistWritingExperienceScore, readWritingExperienceOverride } from '@/app/lib/writing-experience';
import { incrementProfileOverride } from '@/app/lib/profile-overrides';
import { buildAgeAwareProgressAnalysis, buildProgressScores } from '@/app/lib/progress-scoring';
import type { Writing } from '@/app/types/database';
import { getDailyPrompt, getPromptPool } from '@/app/data/prompts';
import {
  PenLine, Send, Sparkles, CheckCircle, AlertCircle,
  RotateCcw, Tag, Save, TrendingUp, Calendar,
  BookMarked, Heart, Trash2, ChevronDown, ChevronUp,
  FileText, Clock, Filter, Eye, Star, BarChart2, Search,
  Zap, BookOpen, Trophy, X,
} from 'lucide-react';

/** Returns the ratio of unique words to total words (0–1).
 *  Low ratio = spam/repeated filler. Threshold for blocking: < 0.12 */
function uniqueWordRatio(text: string): number {
  const words = text.toLowerCase().match(/\b\w+\b/g) ?? [];
  if (words.length === 0) return 1;
  return new Set(words).size / words.length;
}

const CATEGORIES = [
  'Persuasive Essay', 'Creative Story', 'Blog Entry',
  'Email', 'Feature Article', 'Personal', 'Poetry', 'Other', 'Free Writing',
];
const JOURNAL_CATEGORIES = ['All', ...CATEGORIES];
const FREE_WRITING_CATEGORY = 'Free Writing';
const FREE_WRITING_PROMPT = 'Write anything you like!';
type ActiveTab = 'write' | 'journal' | 'progress';
type TimeRange = 'week' | 'month' | '3m' | 'year' | 'all';
type WritingFeedback = { overall: string; paragraph_feedback: string; rewritten_version: string };
type AssistSuggestion = { type: 'tip' | 'example'; label: string; detail: string };
type AssistResponse = { tips?: AssistSuggestion[]; examples?: AssistSuggestion[] };
type EditorBackup = {
  writingId?: string | null;
  title?: string | null;
  content?: string | null;
  prompt?: string | null;
  category?: string | null;
  updatedAt?: string | null;
};
type EditorPreference = {
  category?: string | null;
  prompt?: string | null;
};

function isUnavailableFeedback(feedback: WritingFeedback | null | undefined) {
  if (!feedback) return false;
  const overall = feedback.overall.toLowerCase();
  const paragraphFeedback = feedback.paragraph_feedback.toLowerCase();
  return (
    overall.includes('unable to generate feedback right now') ||
    paragraphFeedback.includes('feedback system hit an unexpected error')
  );
}

const tone = (color: string, amount: number) => `color-mix(in srgb, ${color} ${amount}%, transparent)`;

const reviewedBadgeStyle = {
  color: 'var(--t-success)',
  background: tone('var(--t-success)', 8),
  border: `1px solid ${tone('var(--t-success)', 18)}`,
};

const savedBadgeStyle = {
  color: 'var(--t-warning)',
  background: tone('var(--t-warning)', 8),
  border: `1px solid ${tone('var(--t-warning)', 18)}`,
};

const AI_FEEDBACK_TIMEOUT_MS = 90000;
const JOURNAL_LOAD_TIMEOUT_MS = 20000;
const WRITING_SAVE_TIMEOUT_MS = 20000;
const PROFILE_REFRESH_TIMEOUT_MS = 20000;
const AUTOSAVE_DELAY_MS = 1600;

function writingStatusTheme(status: Writing['status']) {
  if (status === 'reviewed') {
    return {
      color: 'var(--t-success)',
      background: tone('var(--t-success)', 10),
      border: `1px solid ${tone('var(--t-success)', 20)}`,
    };
  }
  if (status === 'submitted') {
    return {
      color: 'var(--t-mod-write)',
      background: tone('var(--t-mod-write)', 10),
      border: `1px solid ${tone('var(--t-mod-write)', 20)}`,
    };
  }
  return {
    color: 'var(--t-warning)',
    background: tone('var(--t-warning)', 10),
    border: `1px solid ${tone('var(--t-warning)', 20)}`,
  };
}

function createAbortController(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJsonSafely<T>(response: Response): Promise<{ data: T | null; rawText: string }> {
  const rawText = await response.text();
  if (!rawText) return { data: null, rawText: '' };

  try {
    return { data: JSON.parse(rawText) as T, rawText };
  } catch {
    return { data: null, rawText };
  }
}

function isAbortLikeError(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Event && error.type === 'abort') return true;
  if (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: string }).name === 'AbortError'
  ) {
    return true;
  }
  return false;
}

function isExpectedUserFacingError(error: unknown): error is Error {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('ai feedback is unavailable right now') ||
    message.includes('failed to generate feedback')
  );
}

function logSafeError(label: string, error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  if (isAbortLikeError(error)) return;
  if (isExpectedUserFacingError(error)) {
    console.warn(label, errorMessage);
    return;
  }
  if (error instanceof Error) {
    console.error(label, errorMessage);
    return;
  }
  console.error(label, error);
}

function getRequestedTab(searchParams: URLSearchParams | null | undefined): ActiveTab {
  const requestedTab = searchParams?.get('tab');
  if (requestedTab === 'journal' || requestedTab === 'progress') return requestedTab;
  return 'write';
}

function upsertWriting(list: Writing[], next: Writing) {
  const index = list.findIndex(w => w.id === next.id);
  if (index === -1) return [next, ...list];
  const copy = [...list];
  copy[index] = next;
  return copy;
}

function getTimeRangeStart(range: TimeRange, end = new Date()) {
  const start = new Date(end);
  if (range === 'week') start.setDate(start.getDate() - 6);
  else if (range === 'month') start.setDate(start.getDate() - 29);
  else if (range === '3m') start.setDate(start.getDate() - 89);
  else if (range === 'year') start.setFullYear(start.getFullYear() - 1);
  else start.setFullYear(2000);
  start.setHours(0, 0, 0, 0);
  return start;
}

function buildDraftSignature(input: {
  title: string;
  content: string;
  prompt: string;
  category: string;
}) {
  return JSON.stringify(input);
}

function resolvePromptForCategory(category: string, ageGroup?: string) {
  if (category === FREE_WRITING_CATEGORY) return FREE_WRITING_PROMPT;
  return getDailyPrompt(category, ageGroup);
}

function getAlternatePrompt(category: string, currentPrompt: string, ageGroup?: string) {
  if (category === FREE_WRITING_CATEGORY) return FREE_WRITING_PROMPT;
  const pool = getPromptPool(category, ageGroup);
  if (pool.length <= 1) return resolvePromptForCategory(category, ageGroup);
  const candidates = pool.filter((item) => item !== currentPrompt);
  if (candidates.length === 0) return resolvePromptForCategory(category, ageGroup);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function getEditorBackupKey(userId: string) {
  return `draftora:writing-editor-backup:${userId}`;
}

function getEditorPreferenceKey(userId: string) {
  return `draftora:writing-editor-preference:${userId}`;
}

function parseEditorPreference(rawPreference: string): EditorPreference | null {
  try {
    const parsedPreference = JSON.parse(rawPreference) as EditorPreference | string;
    if (typeof parsedPreference === 'string') {
      const legacyCategory = parsedPreference.trim();
      if (!legacyCategory || !CATEGORIES.includes(legacyCategory)) return null;
      return { category: legacyCategory };
    }

    const preferredCategory = (parsedPreference?.category || '').trim();
    if (!preferredCategory || !CATEGORIES.includes(preferredCategory)) return null;

    const preferredPrompt = typeof parsedPreference?.prompt === 'string'
      ? parsedPreference.prompt.trim()
      : '';

    return {
      category: preferredCategory,
      prompt: preferredPrompt || null,
    };
  } catch {
    // Support legacy plain-string values saved without JSON encoding.
    const legacyCategory = rawPreference.trim();
    if (!legacyCategory || !CATEGORIES.includes(legacyCategory)) return null;
    return { category: legacyCategory };
  }
}

function readEditorPreference(userId: string | undefined | null) {
  if (!userId || typeof window === 'undefined') return null;
  try {
    const rawPreference = window.localStorage.getItem(getEditorPreferenceKey(userId));
    if (!rawPreference) return null;
    return parseEditorPreference(rawPreference);
  } catch {
    return null;
  }
}

function persistEditorPreference(userId: string | undefined | null, nextPreference: EditorPreference) {
  if (!userId || typeof window === 'undefined') return;
  const nextCategory = (nextPreference.category || '').trim();
  if (!nextCategory || !CATEGORIES.includes(nextCategory)) return;

  const nextPrompt = typeof nextPreference.prompt === 'string'
    ? nextPreference.prompt.trim()
    : '';

  try {
    window.localStorage.setItem(
      getEditorPreferenceKey(userId),
      JSON.stringify({
        category: nextCategory,
        prompt: nextPrompt || null,
      }),
    );
  } catch {
    // Preference save is best-effort only.
  }
}

function buildTimeAxisTicks(range: TimeRange, start: Date, end: Date) {
  const ticks: Date[] = [];
  const cursor = new Date(start);

  if (range === 'all') {
    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
    const stepDays = totalDays <= 30 ? 7 : totalDays <= 120 ? 30 : totalDays <= 370 ? 60 : Math.max(90, Math.round(totalDays / 4));
    while (cursor <= end) {
      ticks.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + stepDays);
    }
  } else if (range === 'week') {
    while (cursor <= end) {
      ticks.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (range === 'month') {
    while (cursor <= end) {
      ticks.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
  } else if (range === '3m') {
    while (cursor <= end) {
      ticks.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 14);
    }
  } else {
    while (cursor <= end) {
      ticks.push(new Date(cursor));
      cursor.setMonth(cursor.getMonth() + 2);
    }
  }

  const endTick = new Date(end);
  endTick.setHours(0, 0, 0, 0);
  if (!ticks.some(tick => tick.getTime() === endTick.getTime())) {
    ticks.push(endTick);
  }

  return ticks;
}

/* ─── SVG Progress Chart ─────────────────────────────────────── */
function ProgressChart({ data, timeRange }: { data: { date: string; score: number; title: string; id: string }[]; timeRange: TimeRange }) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (data.length === 0) return null;
  if (data.length === 1) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--t-tx3)', fontSize: 13 }}>
        Need at least 2 pieces to show a trend. Keep writing!
      </div>
    );
  }

  const W = 700, H = 200;
  const PAD = { top: 20, right: 20, bottom: 32, left: 40 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const timestamps = data.map(d => new Date(d.date).getTime());
  const endDate = timeRange === 'all'
    ? new Date(Math.max(...timestamps))
    : new Date();
  const startDate = timeRange === 'all'
    ? new Date(Math.min(...timestamps))
    : getTimeRangeStart(timeRange, endDate);
  const xMin = startDate.getTime();
  const xMax = Math.max(endDate.getTime(), Math.max(...timestamps));
  const xTicks = buildTimeAxisTicks(timeRange, startDate, endDate);

  const toX = (d: string) =>
    PAD.left + ((new Date(d).getTime() - xMin) / (xMax - xMin || 1)) * cW;
  const toY = (s: number) =>
    PAD.top + cH - (Math.max(0, Math.min(100, s)) / 100) * cH;

  const pts = data.map(d => ({ x: toX(d.date), y: toY(d.score), ...d }));

  // Smooth bezier path
  const buildPath = () => pts.map((p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const cpX = ((p.x + prev.x) / 2).toFixed(1);
    return `C ${cpX} ${prev.y.toFixed(1)}, ${cpX} ${p.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }).join(' ');

  const linePath = buildPath();
  const last = pts[pts.length - 1];
  const first = pts[0];
  const areaPath = `${linePath} L ${last.x.toFixed(1)} ${(PAD.top + cH).toFixed(1)} L ${first.x.toFixed(1)} ${(PAD.top + cH).toFixed(1)} Z`;

  const yLines = [0, 25, 50, 75, 100];
  const formatTick = (date: Date) => {
    if (timeRange === 'week') return date.toLocaleDateString('en-US', { weekday: 'short' });
    if (timeRange === 'year') return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const hoveredPoint = hovered !== null ? pts[hovered] : null;
  const tooltipLeft = hoveredPoint ? Math.max(4, Math.min(hoveredPoint.x - 65, W - 140)) : 0;
  const tooltipTop = hoveredPoint ? hoveredPoint.y - 48 : 0;

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 200, overflow: 'visible' }}>
        <defs>
          <linearGradient id="pgGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--t-acc)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--t-acc)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {yLines.map(y => (
          <g key={y}>
            <line
              x1={PAD.left} y1={toY(y)} x2={W - PAD.right} y2={toY(y)}
              stroke="var(--t-brd)" strokeWidth="1"
              strokeDasharray={y > 0 ? '3 4' : undefined}
            />
            <text x={PAD.left - 6} y={toY(y) + 4} textAnchor="end" fontSize="9" fill="var(--t-tx3)">{y}</text>
          </g>
        ))}

        {xTicks.map((tick) => {
          const x = PAD.left + ((tick.getTime() - xMin) / (xMax - xMin || 1)) * cW;
          return (
            <line
              key={tick.toISOString()}
              x1={x}
              y1={PAD.top}
              x2={x}
              y2={PAD.top + cH}
              stroke="var(--t-brd)"
              strokeWidth="1"
              strokeDasharray="3 4"
              opacity={0.45}
            />
          );
        })}

        {/* Area + line */}
        <path d={areaPath} fill="url(#pgGrad)" />
        <path d={linePath} fill="none" stroke="var(--t-acc)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {pts.map((p, i) => (
          <g key={i} style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}>
            {hovered === i && (
              <circle
                cx={p.x}
                cy={p.y}
                r={9}
                fill="none"
                stroke="color-mix(in srgb, var(--t-acc) 30%, transparent)"
                strokeWidth="4"
                pointerEvents="none"
              />
            )}
            <circle cx={p.x} cy={p.y} r={5}
              fill="var(--t-acc)" stroke="var(--t-card)" strokeWidth="2.5" />
          </g>
        ))}

        {/* X axis date labels */}
        {xTicks.map((tick) => {
          const x = PAD.left + ((tick.getTime() - xMin) / (xMax - xMin || 1)) * cW;
          return (
          <text key={tick.toISOString()} x={x} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--t-tx3)">
            {formatTick(tick)}
          </text>
          );
        })}
      </svg>
      {hoveredPoint && (
        <div
          style={{
            position: 'absolute',
            left: tooltipLeft,
            top: tooltipTop,
            width: 130,
            borderRadius: 8,
            padding: '8px 10px',
            background: 'var(--t-card)',
            border: '1px solid var(--t-brd)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {hoveredPoint.title.length > 16 ? hoveredPoint.title.slice(0, 16) + '…' : hoveredPoint.title}
          </div>
          <div style={{ marginTop: 3, fontSize: 10, color: 'var(--t-acc)' }}>
            Score: {hoveredPoint.score}/100
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
function WritingsContent() {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<ActiveTab>('write');

  // ── Write tab state ──
  const [title, setTitle]       = useState('');
  const [content, setContent]   = useState('');
  const [category, setCategory] = useState('Creative Story');
  const [prompt, setPrompt]     = useState('');
  const [status, setStatus]     = useState<'idle' | 'saving' | 'submitting' | 'reviewing' | 'done'>('idle');
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [writingId, setWritingId] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [xpEarned, setXpEarned]  = useState(0);
  const [error, setError]        = useState('');
  const [aiAssistOpen, setAiAssistOpen] = useState(false);
  const [aiAssistLoading, setAiAssistLoading] = useState(false);
  const [aiAssistTips, setAiAssistTips] = useState<AssistSuggestion[]>([]);
  const [aiAssistExamples, setAiAssistExamples] = useState<AssistSuggestion[]>([]);
  const [aiAssistCopied, setAiAssistCopied] = useState(false);
  const [todayWords, setTodayWords] = useState(0);
  const [weekWords, setWeekWords]   = useState(0);
  // (daily limit removed — users can write unlimited pieces per day up to their total cap)

  // ── Journal tab state ──
  const [writings, setWritings] = useState<Writing[]>([]);
  const [journalLoading, setJournalLoading] = useState(false);
  const [journalError, setJournalError] = useState('');
  const [journalTab, setJournalTab] = useState<'all' | 'favorites'>('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [journalSearch, setJournalSearch] = useState('');
  const [journalSort, setJournalSort] = useState<'recent' | 'oldest' | 'longest' | 'shortest' | 'score'>('recent');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showFeedbackId, setShowFeedbackId] = useState<string | null>(null);
  const [expandedContentLoadingId, setExpandedContentLoadingId] = useState<string | null>(null);

  // ── Progress tab state ──
  const [progressScores, setProgressScores] = useState<{ id: string; score: number; note: string }[]>([]);
  const [progressAnalysis, setProgressAnalysis] = useState<{
    summary: string; strengths: string[]; areasToImprove: string[];
    writingPatterns: string; vocabularyTrend: string; recommendation: string;
  } | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressAnalysisLoading, setProgressAnalysisLoading] = useState(false);
  const [progressError, setProgressError] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [reviewedWritings, setReviewedWritings] = useState<Writing[]>([]);
  const [progressRefreshToken, setProgressRefreshToken] = useState(0);
  const progressLoadInFlight = useRef(false);
  const aiAnalysisFetched = useRef<string | null>(null); // tracks last fetched writing IDs hash
  const hasAutoExpandedRef = useRef(false);
  const hasAttemptedDraftRestoreRef = useRef(false);
  const restoringDraftRef = useRef(false);
  const latestEditorStateRef = useRef({
    title: '',
    content: '',
    prompt: '',
    category: 'Creative Story',
  });
  const previousActiveTabRef = useRef<ActiveTab>('write');
  const writingMutationLock = useRef(false);
  const writingReleaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiAssistCopyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedDraftSignatureRef = useRef('');
  const writingRewardsGrantedRef = useRef(false);
  const journalLoadedRef = useRef(false);
  const progressLoadedRef = useRef(false);
  const progressLoadedTokenRef = useRef(-1);
  const categoryPreferenceHydratedRef = useRef(false);
  const skipNextPreferencePersistRef = useRef(false);

  const switchTab = useCallback((nextTab: ActiveTab) => {
    startTransition(() => {
      setActiveTab(nextTab);
    });
    if (typeof window === 'undefined') return;

    const nextParams = new URLSearchParams(searchParams.toString());
    if (nextTab === 'write') nextParams.delete('tab');
    else nextParams.set('tab', nextTab);

    const nextQuery = nextParams.toString();
    const nextUrl = `${pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  const clearPromptContextFromUrl = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    const hadPromptContext = nextParams.has('prompt') || nextParams.has('category');
    if (!hadPromptContext) return;

    nextParams.delete('prompt');
    nextParams.delete('category');
    const nextQuery = nextParams.toString();
    const nextUrl = `${pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  const incrementWritingsCreated = useCallback(async () => {
    if (!profile) return;

    try {
      const nextCount = (profile.writings_created ?? 0) + 1;
      incrementProfileOverride(profile.id, 'writings_created', 1);
      await withPromiseTimeout(
        supabase.from('profiles')
          .update({ writings_created: nextCount })
          .eq('id', profile.id),
        PROFILE_REFRESH_TIMEOUT_MS,
        'Updating the writings counter took too long.',
      );
      await withPromiseTimeout(
        refreshProfile(),
        PROFILE_REFRESH_TIMEOUT_MS,
        'Refreshing your profile took too long.',
      );
    } catch {
      // Keep the writing saved even if the lifetime counter fails to refresh.
    }
  }, [profile, refreshProfile]);

  const syncStoredWriting = useCallback((writing: Writing) => {
    if (!profile) return;
    upsertStoredWritingHistory(profile.id, writing);
  }, [profile]);

  const restoreLatestInProgressDraft = useCallback(async () => {
    if (!profile) return;
    if (restoringDraftRef.current) return;
    if (writingId || content.trim() || feedback || status !== 'idle') return;
    restoringDraftRef.current = true;

    const applyDraft = (draft: {
      id?: string | null;
      title?: string | null;
      content?: string | null;
      prompt?: string | null;
      category?: string | null;
    }) => {
      const preferredEditorPreference = readEditorPreference(profile.id);
      const preferredCategory = preferredEditorPreference?.category || null;
      const preferredPrompt = preferredEditorPreference?.prompt || null;
      const nextCategory = draft.category || preferredCategory || 'Creative Story';
      const resolvedPrompt = (draft.prompt || '').trim()
        || (
          preferredPrompt &&
          preferredCategory === nextCategory
            ? preferredPrompt
            : resolvePromptForCategory(nextCategory, profile.age_group ?? undefined)
        );
      setTitle(draft.title || '');
      setContent(draft.content || '');
      setCategory(nextCategory);
      setPrompt(resolvedPrompt);
      setWritingId(draft.id ?? null);
      lastSavedDraftSignatureRef.current = buildDraftSignature({
        title: draft.title || 'Untitled Draft',
        content: draft.content || '',
        prompt: resolvedPrompt,
        category: nextCategory,
      });
    };

    try {
      const localBackupRaw = window.localStorage.getItem(getEditorBackupKey(profile.id));
      let localBackup: EditorBackup | null = null;
      const todayKey = getLocalDateKey();

      if (localBackupRaw) {
        try {
          const parsed = JSON.parse(localBackupRaw) as EditorBackup;
          const backupDateKey = parsed?.updatedAt ? getLocalDateKey(new Date(parsed.updatedAt)) : '';
          const isBackupFromToday = backupDateKey === todayKey;
          if (parsed?.content && parsed.content.trim() && isBackupFromToday) {
            localBackup = parsed;
          } else if (!isBackupFromToday) {
            window.localStorage.removeItem(getEditorBackupKey(profile.id));
          }
        } catch {
          // Ignore malformed local backup.
        }
      }

      let localAppliedSignature: string | null = null;
      if (localBackup) {
        applyDraft({
          id: localBackup.writingId ?? null,
          title: localBackup.title ?? '',
          content: localBackup.content ?? '',
          prompt: localBackup.prompt ?? '',
          category: localBackup.category ?? 'Creative Story',
        });
        localAppliedSignature = buildDraftSignature({
          title: localBackup.title || 'Untitled Draft',
          content: localBackup.content || '',
          prompt: localBackup.prompt || '',
          category: localBackup.category || 'Creative Story',
        });
      }

      let cloudDraft: Writing | null = null;
      try {
        const { data, error } = await supabase
          .from('writings')
          .select('id,title,content,prompt,category,status,word_count,feedback,strengths,improvements,created_at,updated_at')
          .eq('user_id', profile.id)
          .eq('status', 'in_progress')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!error && data?.content?.trim()) {
          const draftDateKey = getLocalDateKey(new Date(data.updated_at || data.created_at || ''));
          if (draftDateKey === todayKey) {
            cloudDraft = data as Writing;
          } else {
            // Expire stale in-progress drafts from previous days.
            await supabase
              .from('writings')
              .delete()
              .eq('id', data.id)
              .eq('user_id', profile.id)
              .eq('status', 'in_progress');
          }
        }
      } catch {
        // Ignore cloud errors and use local fallback.
      }

      if (cloudDraft && localBackup) {
        const currentEditorSignature = buildDraftSignature({
          title: latestEditorStateRef.current.title || 'Untitled Draft',
          content: latestEditorStateRef.current.content || '',
          prompt: latestEditorStateRef.current.prompt || '',
          category: latestEditorStateRef.current.category || 'Creative Story',
        });
        if (localAppliedSignature && currentEditorSignature !== localAppliedSignature) {
          return;
        }

        const cloudUpdatedAt = Date.parse(cloudDraft.updated_at || cloudDraft.created_at || '');
        const localUpdatedAt = Date.parse(localBackup.updatedAt || '');
        if (!Number.isFinite(localUpdatedAt) || cloudUpdatedAt > localUpdatedAt) {
          applyDraft(cloudDraft);
        }
        return;
      }

      if (cloudDraft) {
        applyDraft(cloudDraft);
        return;
      }
    } finally {
      restoringDraftRef.current = false;
    }
  }, [content, feedback, profile, status, writingId]);

  const grantWritingSubmitRewards = useCallback(async () => {
    if (!profile || writingRewardsGrantedRef.current) return;

    try {
      const ratio = uniqueWordRatio(content);
      const effectiveWords = ratio >= 0.35 ? wordCount : Math.round(wordCount * (ratio / 0.35));

      await awardXP(profile.id, XP_REWARDS.WRITING_SUBMIT, 'Completed writing session');
      await awardXP(profile.id, XP_REWARDS.AI_FEEDBACK, 'Received AI feedback');
      await updateDailyStats(profile.id, {
        words_written: effectiveWords,
        writings_completed: 1,
        xp_earned: XP_REWARDS.WRITING_SUBMIT + XP_REWARDS.AI_FEEDBACK,
      });
      await updateStreak(profile.id);
      writingRewardsGrantedRef.current = true;
      void persistWritingExperienceScore(
        profile.id,
        (readWritingExperienceOverride(profile.id) ?? profile.writing_experience_score ?? 0) + getExperienceIncreaseForAction('writing'),
      ).catch(() => {});
      await withPromiseTimeout(
        refreshProfile(),
        PROFILE_REFRESH_TIMEOUT_MS,
        'Refreshing your profile took too long.',
      ).catch(() => {});
      setTodayWords(prev => prev + effectiveWords);
      setWeekWords(prev => prev + effectiveWords);
    } catch (sideEffectError) {
      logSafeError('grantWritingSubmitRewards error:', sideEffectError);
    }
  }, [content, profile, refreshProfile, wordCount]);

  const recoverTimedOutWriting = useCallback(async (fallbackTitle: string) => {
    if (!profile || !content.trim()) return null;

    try {
      const { data, error } = await supabase
        .from('writings')
        .select('*')
        .eq('user_id', profile.id)
        .eq('title', fallbackTitle)
        .eq('content', content)
        .eq('category', category)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return data as Writing;
    } catch {
      return null;
    }
  }, [profile, content, category]);

  const recoverTimedOutWritingWithRetry = useCallback(async (fallbackTitle: string) => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const recovered = await recoverTimedOutWriting(fallbackTitle);
      if (recovered) return recovered;
      if (attempt < 3) {
        await wait(2000);
      }
    }
    return null;
  }, [recoverTimedOutWriting]);

  // ── Read URL params without overriding an already-restored draft ──
  useEffect(() => {
    const p = searchParams.get('prompt');
    const c = searchParams.get('category');
    const hasExplicitPrompt = Boolean(p);
    const hasExplicitCategory = Boolean(c);
    const hasActiveDraftState = Boolean(writingId || content.trim() || title.trim() || feedback);

    if (!hasExplicitPrompt && !hasExplicitCategory) {
      setActiveTab(getRequestedTab(searchParams));
      return;
    }

    // If there is already draft/editor state, never let stale URL prompt/category
    // override the in-editor category/prompt selection.
    if (hasActiveDraftState) {
      setActiveTab(getRequestedTab(searchParams));
      return;
    }

    const savedPreference = profile ? readEditorPreference(profile.id) : null;
    const savedCategory = (savedPreference?.category || '').trim();
    const savedPrompt = (savedPreference?.prompt || '').trim();
    const hasSavedPreference = Boolean(savedCategory && CATEGORIES.includes(savedCategory));
    if (hasSavedPreference) {
      setCategory(savedCategory);
      setPrompt(savedPrompt || resolvePromptForCategory(savedCategory, profile?.age_group ?? undefined));
      setActiveTab(getRequestedTab(searchParams));

      if (hasExplicitPrompt || hasExplicitCategory) {
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete('prompt');
        nextParams.delete('category');
        const nextQuery = nextParams.toString();
        const nextUrl = `${pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
        router.replace(nextUrl, { scroll: false });
      }
      return;
    }

    const resolvedCategory = c ? decodeURIComponent(c) : 'Creative Story';

    setCategory(resolvedCategory);
    setPrompt(
      resolvedCategory === FREE_WRITING_CATEGORY
        ? FREE_WRITING_PROMPT
        : (p ? decodeURIComponent(p) : resolvePromptForCategory(resolvedCategory, profile?.age_group ?? undefined)),
    );
    setActiveTab(getRequestedTab(searchParams));
  }, [profile, profile?.age_group, searchParams, writingId, content, title, feedback, pathname, router]);

  useEffect(() => {
    const hasPromptContext = searchParams.has('prompt') || searchParams.has('category');
    const hasDraftState = Boolean(writingId || content.trim() || title.trim() || feedback);
    if (!hasPromptContext || !hasDraftState) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('prompt');
    nextParams.delete('category');
    const nextQuery = nextParams.toString();
    const nextUrl = `${pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
    router.replace(nextUrl, { scroll: false });
  }, [searchParams, writingId, content, title, feedback, pathname, router]);

  useEffect(() => {
    if (!content.trim()) return;
    if (!searchParams.has('prompt') && !searchParams.has('category')) return;
    clearPromptContextFromUrl();
  }, [content, searchParams, clearPromptContextFromUrl]);

  useEffect(() => {
    if (searchParams.get('prompt')) return;
    if (writingId || content.trim() || title.trim() || feedback) return;

    const savedPreference = profile ? readEditorPreference(profile.id) : null;
    const savedCategory = (savedPreference?.category || '').trim();
    const savedPrompt = (savedPreference?.prompt || '').trim();
    if (categoryPreferenceHydratedRef.current && savedPrompt && savedCategory === category) {
      setPrompt(savedPrompt);
      return;
    }

    setPrompt(resolvePromptForCategory(category, profile?.age_group ?? undefined));
  }, [category, profile?.age_group, profile?.id, searchParams, writingId, content, title, feedback]);

  // ── Live word count ──
  useEffect(() => {
    setWordCount(content.trim() ? content.trim().split(/\s+/).length : 0);
  }, [content]);

  // ── Load daily + weekly progress ──
  const loadProgress = useCallback(async () => {
    if (!profile) return;
    const today = getLocalDateKey();
    // Week starts on Monday
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);

    // Fetch today + week stats in parallel
    const [todayResult, weekResult] = await Promise.all([
      supabase.from('daily_stats').select('words_written')
        .eq('user_id', profile.id).eq('date', today).single(),
      supabase.from('daily_stats').select('words_written')
        .eq('user_id', profile.id).gte('date', getLocalDateKey(monday)),
    ]);

    setTodayWords(todayResult.data?.words_written ?? 0);
    setWeekWords((weekResult.data || []).reduce((s, d) => s + d.words_written, 0));
  }, [profile]);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  useEffect(() => {
    latestEditorStateRef.current = {
      title,
      content,
      prompt,
      category,
    };
  }, [title, content, prompt, category]);

  useEffect(() => {
    hasAttemptedDraftRestoreRef.current = false;
    categoryPreferenceHydratedRef.current = false;
    skipNextPreferencePersistRef.current = false;
  }, [profile?.id]);

  useEffect(() => {
    if (!profile) return;
    if (categoryPreferenceHydratedRef.current) return;

    try {
      const savedPreference = readEditorPreference(profile.id);
      const preferredCategory = savedPreference?.category;
      if (preferredCategory) {
        const preferredPrompt = (savedPreference?.prompt || '').trim();
        // Prevent the immediate post-hydration persist cycle from writing stale
        // initial state (Creative Story) before these state updates apply.
        skipNextPreferencePersistRef.current = true;
        setCategory(preferredCategory);
        setPrompt(
          preferredPrompt || resolvePromptForCategory(preferredCategory, profile.age_group ?? undefined),
        );
      }
    } catch {
      // Ignore malformed local preferences.
    } finally {
      categoryPreferenceHydratedRef.current = true;
    }
  }, [profile]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProgress();
    }, msUntilNextLocalMidnight() + 1000);
    return () => clearTimeout(timer);
  }, [loadProgress, profile?.id]);

  // ── Load journal writings ──
  const loadJournal = useCallback(async () => {
    if (!profile) return;
    const storedWritings = readStoredWritingHistory(profile.id);
    if (storedWritings.length > 0) {
      setWritings(storedWritings);
      setJournalError('');
      setJournalLoading(false);
    } else {
      setJournalLoading(true);
    }

    const { controller, timeoutId } = createAbortController(JOURNAL_LOAD_TIMEOUT_MS);

    try {
      const { data, error } = await supabase
        .from('writings')
        .select('id,title,prompt,category,status,word_count,feedback,strengths,improvements,is_favorite,created_at,updated_at,xp_earned')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .abortSignal(controller.signal);

      if (error) throw error;

      const storedById = new Map(storedWritings.map(writing => [writing.id, writing] as const));
      const merged = mergeStoredWritingHistory(profile.id, (data || []).map((writing) => ({
        ...writing,
        content: storedById.get(writing.id)?.content ?? '',
      })) as Writing[]);
      setWritings(merged);
      setJournalError('');

      if (!hasAutoExpandedRef.current) {
        const todayStr = getLocalDateKey();
        const todayEntry = merged.find(w => w.created_at.startsWith(todayStr) && ['submitted', 'reviewed'].includes(w.status));
        if (todayEntry) {
          hasAutoExpandedRef.current = true;
          setExpanded(todayEntry.id);
          setShowFeedbackId(todayEntry.id);
        }
      }
    } catch (error) {
      if (isAbortLikeError(error)) {
        setWritings(storedWritings);
        setJournalError(
          storedWritings.length > 0
            ? 'Showing journal history saved on this device while cloud sync catches up.'
            : 'Loading your journal took too long. Please try again in a moment.',
        );
        return;
      }
      logSafeError('loadJournal error:', error);
      setWritings(storedWritings);
      setJournalError(
        storedWritings.length > 0
          ? 'Showing journal history saved on this device while cloud sync catches up.'
          : 'We could not load your journal right now. Please refresh or try again in a moment.',
      );
    } finally {
      clearTimeout(timeoutId);
      setJournalLoading(false);
    }
  }, [profile]);

  // Debounced journal reload — avoids hammering Supabase after every write operation
  const ensureJournalContent = useCallback(async (writing: Writing) => {
    if (!profile || writing.content.trim()) return writing.content;

    const { data, error } = await supabase
      .from('writings')
      .select('content,updated_at')
      .eq('user_id', profile.id)
      .eq('id', writing.id)
      .single();

    if (error) throw error;

    const nextWriting = {
      ...writing,
      content: data?.content ?? '',
      updated_at: data?.updated_at ?? writing.updated_at,
    };

    setWritings(prev => prev.map(item => item.id === writing.id ? nextWriting : item));
    syncStoredWriting(nextWriting);
    return nextWriting.content;
  }, [profile, syncStoredWriting]);

  const journalReloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedLoadJournal = useCallback(() => {
    if (journalReloadTimer.current) clearTimeout(journalReloadTimer.current);
    journalReloadTimer.current = setTimeout(() => { void loadJournal(); }, 2000);
  }, [loadJournal]);

  useEffect(() => {
    if (activeTab === 'journal' && profile && !journalLoadedRef.current) {
      journalLoadedRef.current = true;
      void loadJournal();
    }
  }, [activeTab, loadJournal, profile]);

  useEffect(() => {
    if (activeTab !== 'write') return;
    if (!profile) return;
    if (hasAttemptedDraftRestoreRef.current) return;
    hasAttemptedDraftRestoreRef.current = true;
    void restoreLatestInProgressDraft();
  }, [activeTab, profile, restoreLatestInProgressDraft]);

  // ── Load progress data ──
  const loadProgressData = useCallback(async () => {
    if (!profile || progressLoadInFlight.current) return;
    progressLoadInFlight.current = true;
    setProgressError('');
    const storedReviewed = readStoredWritingHistory(profile.id).filter(writing => writing.status === 'reviewed');
    if (storedReviewed.length > 0) {
      setReviewedWritings(storedReviewed);
      setProgressScores(buildProgressScores(storedReviewed, profile.age_group));
      setProgressLoading(false);
    } else {
      setProgressLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('writings')
        .select('id,title,content,prompt,category,status,word_count,feedback,strengths,improvements,created_at,updated_at')
        .eq('user_id', profile.id)
        .eq('status', 'reviewed')
        .order('created_at', { ascending: true })

      if (error) throw error;

      const reviewed = (data || []) as Writing[];
      setReviewedWritings(reviewed);
      setProgressScores(buildProgressScores(reviewed, profile.age_group));
      setProgressError('');

      // Only fetch AI analysis if the set of writings has changed
      const writingHash = reviewed.map(w => w.id).sort().join(',');
      if (reviewed.length > 0 && aiAnalysisFetched.current !== writingHash) {
        aiAnalysisFetched.current = writingHash;
        setProgressAnalysisLoading(true);
        fetch('/api/ai-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ writings: reviewed, ageGroup: profile.age_group }),
        })
          .then(r => r.json())
          .then(result => {
            if (result.analysis) setProgressAnalysis(result.analysis);
            if (result.scores?.length) setProgressScores(result.scores);
          })
          .catch(() => { setProgressAnalysis(buildAgeAwareProgressAnalysis(reviewed, profile.age_group)); })
          .finally(() => setProgressAnalysisLoading(false));
      }

    } catch (error) {
      logSafeError('loadProgressData error:', error);
      if (storedReviewed.length > 0) {
        setReviewedWritings(storedReviewed);
        setProgressScores(buildProgressScores(storedReviewed, profile.age_group));
        setProgressAnalysis(buildAgeAwareProgressAnalysis(storedReviewed, profile.age_group));
        setProgressError('Showing saved progress from this device while cloud sync catches up.');
      } else {
        setReviewedWritings([]);
        setProgressScores([]);
        setProgressAnalysis(null);
        setProgressError('We could not load your progress right now. Please refresh or try again in a moment.');
      }
    } finally {
      setProgressLoading(false);
      progressLoadInFlight.current = false;
    }
  }, [profile]);

  useEffect(() => {
    if (activeTab === 'progress' && profile && !progressLoadedRef.current) {
      progressLoadedRef.current = true;
      progressLoadedTokenRef.current = progressRefreshToken;
      void loadProgressData();
      return;
    }

    if (
      activeTab === 'progress' &&
      profile &&
      progressLoadedRef.current &&
      progressLoadedTokenRef.current !== progressRefreshToken
    ) {
      progressLoadedTokenRef.current = progressRefreshToken;
      void loadProgressData();
    }
  }, [activeTab, loadProgressData, profile, progressRefreshToken]);

  // ── Write tab actions ──
  const saveDraft = useCallback(async () => {
    if (writingMutationLock.current) return false;
    if (!content.trim()) return false;
    if (!profile) {
      setError('Your session is not ready right now. Refresh the page and try again.');
      return false;
    }
    writingMutationLock.current = true;
    setStatus('saving');
    setError('');
    try {
      const session = await ensureActiveSessionGracefully();
      if (!session) {
        console.warn('saveDraft continuing without a confirmed session.');
      }
    } catch (sessionError) {
      logSafeError('saveDraft session error:', sessionError);
      console.warn('saveDraft session check failed, continuing anyway:', sessionError);
    }

    if (writingReleaseTimer.current) {
      clearTimeout(writingReleaseTimer.current);
    }
    writingReleaseTimer.current = setTimeout(() => {
      writingMutationLock.current = false;
      setStatus(current => current === 'saving' ? 'idle' : current);
    }, WRITING_SAVE_TIMEOUT_MS + 3000);
    const data = {
      user_id: profile.id,
      title: title || 'Untitled Draft',
      content,
      prompt: prompt || null,
      category,
      status: 'in_progress' as const,
      word_count: wordCount,
    };

    try {
      let persistedWriting: Writing | null = null;
      if (writingId) {
        const { data: updated, error: updateError } = await supabase
          .from('writings')
          .update(data)
          .eq('id', writingId)
          .select()
          .single();
        if (updateError || !updated) throw updateError ?? new Error('Draft was not updated.');
        persistedWriting = updated as Writing;
      } else {
        const { data: created, error: createError } = await supabase
          .from('writings').insert(data).select().single();
        if (createError || !created) throw createError ?? new Error('Draft was not created.');

        setWritingId(created.id);
        persistedWriting = created as Writing;
        void incrementWritingsCreated();
      }

      if (persistedWriting) {
        lastSavedDraftSignatureRef.current = buildDraftSignature({
          title: title || 'Untitled Draft',
          content,
          prompt: prompt || '',
          category,
        });
        syncStoredWriting(persistedWriting);
        setWritings(prev => upsertWriting(prev, persistedWriting as Writing));
        debouncedLoadJournal();
      }
      return true;
    } catch (error) {
      logSafeError('saveDraft error:', error);
      if (error instanceof PromiseTimeoutError) {
        const recoveredWriting = await recoverTimedOutWritingWithRetry(title || 'Untitled Draft');
        if (recoveredWriting) {
          setWritingId(recoveredWriting.id);
          lastSavedDraftSignatureRef.current = buildDraftSignature({
            title: title || 'Untitled Draft',
            content,
            prompt: prompt || '',
            category,
          });
          syncStoredWriting(recoveredWriting);
          setWritings(prev => upsertWriting(prev, recoveredWriting as Writing));
          debouncedLoadJournal();
          setError('');
          return true;
        }
      }
      setError(
        error instanceof PromiseTimeoutError
          ? 'Saving took too long, so the editor was released. Please try again in a moment.'
          : 'Could not save your draft right now. Please try again.',
      );
      return false;
    } finally {
      if (writingReleaseTimer.current) {
        clearTimeout(writingReleaseTimer.current);
        writingReleaseTimer.current = null;
      }
      writingMutationLock.current = false;
      setStatus('idle');
    }
  }, [profile, content, title, prompt, category, wordCount, writingId, incrementWritingsCreated, syncStoredWriting, loadJournal, recoverTimedOutWriting]);

  const clearInProgressDraft = useCallback(async (clearEditor = false) => {
    if (!profile) return;

    try {
      window.localStorage.removeItem(getEditorBackupKey(profile.id));
    } catch {
      // Ignore local cleanup failures.
    }

    const currentWritingId = writingId;
    if (currentWritingId) {
      try {
        const { error: deleteError } = await supabase
          .from('writings')
          .delete()
          .eq('id', currentWritingId)
          .eq('user_id', profile.id)
          .eq('status', 'in_progress');

        if (!deleteError) {
          setWritings(prev => prev.filter(item => item.id !== currentWritingId));
          removeStoredWritingHistory(profile.id, currentWritingId);
        }
      } catch {
        // Keep editor responsive even if cleanup fails.
      }
    }

    setWritingId(null);
    lastSavedDraftSignatureRef.current = '';

    if (clearEditor) {
      setTitle('');
      setContent('');
      setPrompt(resolvePromptForCategory(category, profile.age_group ?? undefined));
      setError('');
    }
  }, [profile, writingId, category]);

  useEffect(() => {
    if (activeTab !== 'write') return;
    if (!profile) return;
    if (!content.trim()) return;
    if (status !== 'idle') return;
    if (feedback) return;

    const signature = buildDraftSignature({
      title: title || 'Untitled Draft',
      content,
      prompt: prompt || '',
      category,
    });

    if (signature === lastSavedDraftSignatureRef.current) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(() => {
      void saveDraft();
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [activeTab, profile, content, title, prompt, category, status, feedback, saveDraft]);

  useEffect(() => {
    if (activeTab !== 'write') return;
    if (!profile) return;
    if (status !== 'idle') return;
    if (feedback) return;
    if (content.trim()) return;
    if (!writingId) return;
    void clearInProgressDraft(false);
  }, [activeTab, clearInProgressDraft, content, feedback, profile, status, writingId]);

  useEffect(() => {
    const previousTab = previousActiveTabRef.current;
    if (previousTab === 'write' && activeTab !== 'write') {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }

      if (profile && content.trim() && status === 'idle' && !feedback) {
        const signature = buildDraftSignature({
          title: title || 'Untitled Draft',
          content,
          prompt: prompt || '',
          category,
        });
        if (signature !== lastSavedDraftSignatureRef.current) {
          void saveDraft();
        }
      }
    }

    previousActiveTabRef.current = activeTab;
  }, [activeTab, profile, content, title, prompt, category, status, feedback, saveDraft]);

  useEffect(() => {
    if (!profile) return;

    const key = getEditorBackupKey(profile.id);
    if (feedback || !content.trim()) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore local cleanup errors.
      }
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify({
        writingId: writingId ?? null,
        title,
        content,
        prompt,
        category,
        updatedAt: new Date().toISOString(),
      }));
    } catch {
      // Local backup is best-effort only.
    }
  }, [profile, title, content, prompt, category, writingId, feedback, status]);

  useEffect(() => {
    if (!profile) return;
    if (!categoryPreferenceHydratedRef.current) return;
    if (skipNextPreferencePersistRef.current) {
      skipNextPreferencePersistRef.current = false;
      return;
    }
    persistEditorPreference(profile.id, { category, prompt });
  }, [profile, category, prompt]);

  useEffect(() => {
    const flushPendingDraft = () => {
      if (activeTab !== 'write') return;
      if (!profile) return;
      if (!content.trim()) {
        if (writingId && status === 'idle' && !feedback) {
          void clearInProgressDraft(false);
        }
        return;
      }
      if (status !== 'idle') return;

      const signature = buildDraftSignature({
        title: title || 'Untitled Draft',
        content,
        prompt: prompt || '',
        category,
      });
      if (signature === lastSavedDraftSignatureRef.current) return;

      try {
        window.localStorage.setItem(getEditorBackupKey(profile.id), JSON.stringify({
          writingId: writingId ?? null,
          title,
          content,
          prompt,
          category,
          updatedAt: new Date().toISOString(),
        }));
      } catch {
        // Local backup is best-effort only.
      }

      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      void saveDraft();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushPendingDraft();
    };

    const handlePageHide = () => {
      flushPendingDraft();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [activeTab, category, content, profile, prompt, saveDraft, status, title, writingId, feedback, clearInProgressDraft]);

  useEffect(() => {
    if (!profile) return;
    const timer = setTimeout(() => {
      if (status !== 'idle' || feedback) return;
      if (!content.trim() && !writingId) return;
      void clearInProgressDraft(true);
    }, msUntilNextLocalMidnight() + 1000);

    return () => clearTimeout(timer);
  }, [profile, status, feedback, content, writingId, clearInProgressDraft]);

  // (Legacy submitForFeedback removed — submitForFeedbackSafe is the active path)

  const submitForFeedbackSafe = async () => {
    if (writingMutationLock.current) return;
    if (!profile) {
      setError('Your session is not ready right now. Refresh the page and try again.');
      return;
    }
    if (wordCount < 20) {
      setError('Write at least 20 words before submitting.');
      return;
    }
    if (wordCount >= 30 && uniqueWordRatio(content) < 0.12) {
      setError('Your writing looks repetitive, but I am still sending it for feedback so you can improve it.');
    }

    writingMutationLock.current = true;
    writingRewardsGrantedRef.current = false;
    setStatus('submitting');
    setTimeout(() => {
      setStatus(current => (writingMutationLock.current && current === 'submitting') ? 'reviewing' : current);
    }, 0);
    setError('');
    setFeedback(null);
    setXpEarned(0);

    if (writingReleaseTimer.current) {
      clearTimeout(writingReleaseTimer.current);
    }
    writingReleaseTimer.current = setTimeout(() => {
      writingMutationLock.current = false;
      setStatus(current => (current === 'submitting' || current === 'reviewing') ? 'idle' : current);
    }, AI_FEEDBACK_TIMEOUT_MS + WRITING_SAVE_TIMEOUT_MS + 5000);

    let id = writingId;
    let savedWriting: Writing | null = null;
    let latestFeedback: WritingFeedback | null = null;
    let feedbackSaved = false;

    const persistReviewedFeedback = async (writingIdToUpdate: string, feedbackData: WritingFeedback) => {
      const { data: reviewedWriting, error: reviewError } = await supabase.from('writings').update({
        status: 'reviewed',
        feedback: feedbackData.overall,
        strengths: feedbackData.rewritten_version,
        improvements: feedbackData.paragraph_feedback,
        xp_earned: XP_REWARDS.WRITING_SUBMIT + XP_REWARDS.AI_FEEDBACK,
      }).eq('id', writingIdToUpdate).select().single();

      if (!reviewError && reviewedWriting) {
        feedbackSaved = true;
        syncStoredWriting(reviewedWriting as Writing);
        setWritings(prev => upsertWriting(prev, reviewedWriting as Writing));
        setReviewedWritings(prev => upsertWriting(prev, reviewedWriting as Writing));
        setProgressRefreshToken(token => token + 1);
        debouncedLoadJournal();
      }

      return { reviewedWriting, reviewError };
    };

    void (async () => {
      setStatus('reviewing');
      try {
        const res = await fetchWithTimeout('/api/ai-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, category, prompt, wordCount, ageGroup: profile?.age_group, writingExperienceScore: profile?.writing_experience_score ?? 0 }),
        }, AI_FEEDBACK_TIMEOUT_MS);
        const { data, rawText } = await readJsonSafely<{ error?: string; feedback?: WritingFeedback }>(res);

        if (!res.ok) {
          const serverMessage =
            data?.error?.trim()
            || (res.status >= 500 ? 'AI feedback is unavailable right now.' : rawText.trim())
            || 'Failed to generate feedback.';
          throw new Error(serverMessage);
        }

        if (!data?.feedback || isUnavailableFeedback(data.feedback)) {
          throw new Error(data?.error || 'Failed to generate feedback.');
        }

        latestFeedback = data.feedback;
        setFeedback(data.feedback);
        setXpEarned(XP_REWARDS.WRITING_SUBMIT + XP_REWARDS.AI_FEEDBACK);
        setStatus('done');

        if (id && !feedbackSaved) {
          await persistReviewedFeedback(id, data.feedback);
        }
      } catch (error) {
        logSafeError('submitForFeedback AI error:', error);
        if (error instanceof FetchTimeoutError) {
          setError('Your writing was saved, but AI feedback took too long. You can keep going and try feedback again later.');
        } else {
          setError('Your writing was saved, but AI feedback is unavailable right now.');
        }
        setStatus('done');
      }
    })();

    try {
      if (!id) {
        const { data, error: createError } = await supabase.from('writings')
          .insert({
            user_id: profile.id,
            title: title || 'Untitled',
            content,
            prompt: prompt || null,
            category,
            status: 'submitted',
            word_count: wordCount,
          })
          .select()
          .single();

        if (createError || !data) {
          throw createError ?? new Error('Writing was not created.');
        }

        id = data.id;
        setWritingId(data.id);
        savedWriting = data as Writing;
        void incrementWritingsCreated();
      } else {
        const { data: updated, error: updateError } = await supabase.from('writings')
          .update({
            title: title || 'Untitled',
            content,
            prompt: prompt || null,
            category,
            status: 'submitted',
            word_count: wordCount,
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError || !updated) {
          throw updateError ?? new Error('Writing was not updated.');
        }

        savedWriting = updated as Writing;
      }

      if (savedWriting) {
        syncStoredWriting(savedWriting);
        debouncedLoadJournal();
      }

      void grantWritingSubmitRewards().catch(() => {});

      if (latestFeedback && id && !feedbackSaved) {
        await persistReviewedFeedback(id, latestFeedback).catch(() => {});
      }
    } catch (error) {
      logSafeError('submitForFeedback save error:', error);
      if (error instanceof PromiseTimeoutError) {
        setError('Saving is taking longer than usual. Feedback will still try to load.');
        void (async () => {
          const recoveredWriting = await recoverTimedOutWritingWithRetry(title || 'Untitled');
          if (recoveredWriting) {
            id = recoveredWriting.id;
            setWritingId(recoveredWriting.id);
            savedWriting = recoveredWriting;
            syncStoredWriting(recoveredWriting);
            debouncedLoadJournal();
            void grantWritingSubmitRewards().catch(() => {});
            if (latestFeedback && !feedbackSaved) {
              void persistReviewedFeedback(recoveredWriting.id, latestFeedback).catch(() => {});
            }
          }
        })();
      } else {
        setError('Could not save your writing right now. Please try again.');
      }
    } finally {

      if (writingReleaseTimer.current) {
        clearTimeout(writingReleaseTimer.current);
        writingReleaseTimer.current = null;
      }
      writingMutationLock.current = false;
    }
  };

  const runAiAssist = useCallback(async () => {
    setAiAssistOpen(true);
    setAiAssistLoading(true);
    setAiAssistCopied(false);

    try {
      const response = await fetch('/api/ai-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistMode: true,
          prompt,
          content,
          category,
        }),
      });

      const payload = await response.json() as AssistResponse;
      const tips = Array.isArray(payload?.tips)
        ? payload.tips
            .filter((item) =>
              item &&
              item.type === 'tip' &&
              typeof item.label === 'string' &&
              typeof item.detail === 'string')
            .slice(0, 4)
        : [];
      const examples = Array.isArray(payload?.examples)
        ? payload.examples
            .filter((item) =>
              item &&
              item.type === 'example' &&
              typeof item.label === 'string' &&
              typeof item.detail === 'string')
            .slice(0, 4)
        : [];

      setAiAssistTips(tips);
      setAiAssistExamples(examples);
    } catch (assistError) {
      logSafeError('runAiAssist error:', assistError);
      setAiAssistTips([]);
      setAiAssistExamples([]);
    } finally {
      setAiAssistLoading(false);
    }
  }, [category, content, prompt]);

  const copyAiAssistTip = useCallback(async (detail: string) => {
    try {
      await navigator.clipboard.writeText(detail);
      setAiAssistCopied(true);
      if (aiAssistCopyTimer.current) clearTimeout(aiAssistCopyTimer.current);
      aiAssistCopyTimer.current = setTimeout(() => setAiAssistCopied(false), 1300);
    } catch {
      // Clipboard failures are non-fatal for writing flow.
    }
  }, []);

  useEffect(() => {
    return () => {
      if (aiAssistCopyTimer.current) clearTimeout(aiAssistCopyTimer.current);
    };
  }, []);

  const startFresh = () => {
    if (profile) {
      try {
        window.localStorage.removeItem(getEditorBackupKey(profile.id));
      } catch {
        // Ignore local cleanup errors.
      }
    }
    setTitle(''); setContent(''); setCategory('Creative Story');
    setPrompt(resolvePromptForCategory('Creative Story', profile?.age_group ?? undefined));
    lastSavedDraftSignatureRef.current = '';
    hasAttemptedDraftRestoreRef.current = true;
    writingRewardsGrantedRef.current = false;
    setAiAssistLoading(false);
    setAiAssistTips([]);
    setAiAssistExamples([]);
    setAiAssistCopied(false);
    setFeedback(null); setWritingId(null); setStatus('idle'); setXpEarned(0); setError('');
    loadProgress();
  };

  const handleCategoryChange = useCallback((nextCategory: string) => {
    const nextPrompt = resolvePromptForCategory(nextCategory, profile?.age_group ?? undefined);
    setCategory(nextCategory);
    setPrompt(nextPrompt);

    if (profile) {
      persistEditorPreference(profile.id, { category: nextCategory, prompt: nextPrompt });
    }

    clearPromptContextFromUrl();
  }, [profile, clearPromptContextFromUrl]);

  const getNewPrompt = useCallback(() => {
    const next = getAlternatePrompt(category, prompt, profile?.age_group ?? undefined);
    setPrompt(next);
    if (profile) {
      persistEditorPreference(profile.id, { category, prompt: next });
    }
    clearPromptContextFromUrl();
  }, [category, prompt, profile, profile?.age_group, clearPromptContextFromUrl]);

  // ── Journal actions ──
  const toggleFavorite = async (w: Writing) => {
    const { data: updated, error } = await supabase
      .from('writings')
      .update({ is_favorite: !w.is_favorite })
      .eq('id', w.id)
      .select()
      .single();

    if (error || !updated) {
      setJournalError('Could not update favorites right now. Please try again.');
      return;
    }

    const next = updated as Writing;
    syncStoredWriting(next);
    setWritings(prev => prev.map(x => x.id === w.id ? next : x));
  };
  const deleteWriting = async (id: string) => {
    if (!confirm('Delete this writing permanently?')) return;
    const { error } = await supabase.from('writings').delete().eq('id', id);
    if (error) {
      setJournalError('Could not delete this writing right now. Please try again.');
      return;
    }

    if (profile) {
      removeStoredWritingHistory(profile.id, id);
    }
    setWritings(prev => prev.filter(w => w.id !== id));
    setReviewedWritings(prev => prev.filter(w => w.id !== id));
    setProgressScores(prev => prev.filter(score => score.id !== id));
    setProgressRefreshToken(token => token + 1);
    if (expanded === id) setExpanded(null);
    if (showFeedbackId === id) setShowFeedbackId(null);
    if (writingId === id) setWritingId(null);
  };

  // ── Computed values ──
  const wordGoal   = profile?.daily_word_goal ?? 300;
  const totalToday = todayWords + (status === 'done' ? wordCount : 0);
  const goalPct    = Math.min((totalToday / wordGoal) * 100, 100);
  const sessionPct = Math.min((wordCount / wordGoal) * 100, 100);
  const journalTotalWords = writings.reduce((s, w) => s + w.word_count, 0);
  const journalReviewedCount = writings.filter(w => w.status === 'reviewed').length;
  const lifetimePieces = profile?.writings_created ?? writings.length;
  const favoriteCount = writings.filter(w => w.is_favorite).length;
  const avgJournalWords = writings.length ? Math.round(journalTotalWords / writings.length) : 0;
  const latestWriting = writings[0] ?? null;
  const hasSearchOrCategoryFilters = Boolean(journalSearch.trim()) || categoryFilter !== 'All';
  const journalEmptyTitle = hasSearchOrCategoryFilters
    ? 'No matches found'
    : journalTab === 'favorites'
      ? 'No favorites yet'
      : 'No writings yet';
  const journalEmptyBody = hasSearchOrCategoryFilters
    ? 'Try a different search term or clear the filters.'
    : journalTab === 'favorites'
      ? 'Heart a piece to save it here'
      : 'Submit a writing piece to build your journal';
  const reviewedById = useMemo(() => {
    const map = new Map<string, Writing>();
    reviewedWritings.forEach(writing => {
      map.set(writing.id, writing);
    });
    return map;
  }, [reviewedWritings]);

  const filteredWritings = useMemo(() => {
    const query = journalSearch.trim().toLowerCase();
    return writings.filter(w => {
      if (journalTab === 'favorites' && !w.is_favorite) return false;
      if (categoryFilter !== 'All' && w.category !== categoryFilter) return false;
      if (!query) return true;
      const haystack = [
        w.title,
        w.prompt ?? '',
        w.category,
        w.status,
        w.feedback ?? '',
        w.strengths ?? '',
        w.improvements ?? '',
        w.content ?? '',
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [categoryFilter, journalSearch, journalTab, writings]);

  const visibleWritings = useMemo(() => {
    const sorted = [...filteredWritings];
    sorted.sort((a, b) => {
      if (journalSort === 'oldest') return Date.parse(a.created_at) - Date.parse(b.created_at);
      if (journalSort === 'longest') return (b.word_count || 0) - (a.word_count || 0);
      if (journalSort === 'shortest') return (a.word_count || 0) - (b.word_count || 0);
      if (journalSort === 'score') {
        const aScore = a.status === 'reviewed' ? 2 : a.status === 'submitted' ? 1 : 0;
        const bScore = b.status === 'reviewed' ? 2 : b.status === 'submitted' ? 1 : 0;
        if (bScore !== aScore) return bScore - aScore;
        return Date.parse(b.updated_at || b.created_at) - Date.parse(a.updated_at || a.created_at);
      }
      return Date.parse(b.updated_at || b.created_at) - Date.parse(a.updated_at || a.created_at);
    });
    return sorted;
  }, [filteredWritings, journalSort]);

  // ── Progress chart data (filtered by time range) ──
  const chartData = useMemo(() => {
    if (!progressScores.length) return [];
    const end = new Date();
    const cutoff = getTimeRangeStart(timeRange, end);

    return progressScores
      .map(s => {
        const w = reviewedById.get(s.id);
        return w ? { id: s.id, score: s.score, note: s.note, date: w.created_at, title: w.title } : null;
      })
      .filter((x): x is NonNullable<typeof x> => {
        if (!x) return false;
        if (timeRange === 'all') return true;
        const pointTime = new Date(x.date).getTime();
        return pointTime >= cutoff.getTime() && pointTime <= end.getTime();
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [progressScores, reviewedById, timeRange]);

  const avgScore = useMemo(() => (chartData.length > 0 ? Math.round(chartData.reduce((s, d) => s + d.score, 0) / chartData.length) : 0), [chartData]);
  const bestScore = useMemo(() => (chartData.length > 0 ? Math.max(...chartData.map(d => d.score)) : 0), [chartData]);
  const reviewedWordTotal = useMemo(() => reviewedWritings.reduce((s, w) => s + (w.word_count || 0), 0), [reviewedWritings]);
  const trend = useMemo(() => (chartData.length >= 2 ? chartData[chartData.length - 1].score - chartData[0].score : 0), [chartData]);
  if (!profile) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: 16, background: 'var(--t-btn)', animation: 'pulse 1.5s infinite' }} />
    </div>
  );

  return (
    <div style={{ padding: '2rem 2rem 4rem', background: 'var(--t-bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--t-acc-a), var(--t-acc-b))',
            border: '1px solid var(--t-acc-b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PenLine style={{ width: 24, height: 24, color: 'var(--t-acc)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--t-tx)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              Writing Studio
            </h1>
            <p style={{ color: 'var(--t-tx3)', fontSize: 13, marginTop: 4 }}>
              Write · Review your journal · Track your improvement
            </p>
          </div>
          {/* New Piece button after finishing a submission */}
          {activeTab === 'write' && status === 'done' && (
            <button onClick={startFresh} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'transparent', border: '1px solid var(--t-brd)',
              color: 'var(--t-tx2)', borderRadius: 14,
              padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <RotateCcw style={{ width: 14, height: 14 }} /> New Piece
            </button>
          )}
        </div>

        {/* ── TAB NAV ── */}
        <div style={{
          display: 'flex', gap: 4,
          background: 'var(--t-card)',
          border: '1px solid var(--t-brd)',
          borderRadius: 18, padding: 4,
          alignSelf: 'flex-start',
        }}>
          {([
            { id: 'write', icon: PenLine, label: 'Write' },
            { id: 'journal', icon: BookMarked, label: 'My Writings' },
            { id: 'progress', icon: BarChart2, label: 'My Progress' },
          ] as { id: ActiveTab; icon: typeof PenLine; label: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', borderRadius: 14, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: activeTab === tab.id
                  ? 'linear-gradient(135deg, var(--t-acc-b), var(--t-acc-a))'
                  : 'transparent',
                color: activeTab === tab.id ? 'var(--t-acc)' : 'var(--t-tx3)',
                boxShadow: activeTab === tab.id ? '0 2px 12px var(--t-acc-a)' : 'none',
              }}
            >
              <tab.icon style={{ width: 15, height: 15 }} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════
            TAB 1: WRITE
        ══════════════════════════════════════ */}
        {activeTab === 'write' && (
          <>
            <>

            {/* Progress cards — shown while writing */}
            {status !== 'done' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div style={{
                  background: 'var(--t-card)',
                  border: '1px solid var(--t-brd)',
                  borderRadius: 20, padding: '1.25rem',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: tone('var(--t-mod-write)', 12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <TrendingUp style={{ width: 17, height: 17, color: 'var(--t-mod-write)' }} />
                    </div>
                    <p style={{ color: 'var(--t-mod-write)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Words Written Today</p>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--t-mod-write)', lineHeight: 1, marginBottom: 4 }}>
                    {totalToday} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--t-tx3)' }}>/ {wordGoal} daily goal</span>
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--t-tx3)', marginBottom: 12 }}>
                    {goalPct >= 100 ? '🎉 Goal reached!' : goalPct > 0 ? `${Math.round(goalPct)}% of your daily goal` : `${wordGoal} words to hit your goal`}
                  </p>
                  <div style={{ height: 6, background: 'var(--t-xp-track)', borderRadius: 99, overflow: 'hidden', width: '100%' }}>
                    <div style={{ height: '100%', width: `${goalPct}%`, background: 'var(--t-xp)', borderRadius: 99, transition: 'width 0.5s' }} />
                  </div>
                </div>
                <div style={{
                  background: 'var(--t-card)',
                  border: '1px solid var(--t-brd)',
                  borderRadius: 20, padding: '1.25rem',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--t-acc-a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Calendar style={{ width: 17, height: 17, color: 'var(--t-acc)' }} />
                    </div>
                    <p style={{ color: 'var(--t-acc)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Words Written This Week</p>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--t-acc)', lineHeight: 1, marginBottom: 4 }}>
                    {weekWords.toLocaleString()}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--t-tx3)' }}>total words across all pieces this week</p>
                  {wordCount > 0 && (
                    <p style={{ fontSize: 12, color: 'var(--t-acc)', fontWeight: 600, marginTop: 8 }}>+ {wordCount} in this session</p>
                  )}
                </div>
              </div>
            )}

            {(status !== 'done' ? (
              /* ── EDITOR ── */
              <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 28, overflow: 'hidden' }}>

                {/* Prompt banner — always visible at top of editor when set */}
                {prompt && (
                  <div style={{
                    background: 'linear-gradient(135deg, var(--t-acc-b), var(--t-acc-a))',
                    borderBottom: '1px solid var(--t-brd-a)',
                    padding: '14px 20px',
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'var(--t-acc-c)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: 1,
                    }}>
                      <Sparkles style={{ width: 14, height: 14, color: 'var(--t-acc)' }} />
                    </div>
                    <div>
                      <p style={{ color: 'var(--t-acc)', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>
                        Your Prompt
                      </p>
                      <p style={{ color: 'var(--t-tx)', fontSize: 14, lineHeight: 1.55, fontWeight: 500 }}>{prompt}</p>
                    </div>
                  </div>
                )}

                {/* Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 20px', borderBottom: '1px solid var(--t-brd)' }}>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Give your piece a title..."
                    style={{ flex: 1, minWidth: 160, background: 'transparent', color: 'var(--t-tx)', fontSize: 15, fontWeight: 600, border: 'none', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Tag style={{ width: 13, height: 13, color: 'var(--t-tx3)' }} />
                    <select
                      value={category}
                      onChange={e => { handleCategoryChange(e.target.value); }}
                      style={{ background: 'var(--t-bg)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--t-brd)', color: 'var(--t-tx2)', fontSize: 12, outline: 'none', cursor: 'pointer' }}
                    >
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <button
                      onClick={getNewPrompt}
                      type="button"
                      style={{
                        background: 'var(--t-card)',
                        border: '1px solid var(--t-brd)',
                        color: 'var(--t-tx2)',
                        borderRadius: 8,
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <RotateCcw style={{ width: 12, height: 12 }} />
                      Get New Prompt
                    </button>
                  </div>
                  <span style={{ color: wordCount > 3000 ? 'var(--t-danger)' : 'var(--t-tx3)', fontSize: 12, padding: '4px 10px', background: 'var(--t-bg)', borderRadius: 8, border: `1px solid ${wordCount > 3000 ? 'var(--t-danger)' : 'var(--t-brd)'}` }}>
                    {wordCount} / 3000 words
                  </span>
                  {wordCount > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                      <div style={{ width: 72, height: 5, background: 'var(--t-xp-track)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${sessionPct}%`, background: 'var(--t-xp)', borderRadius: 99, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ color: 'var(--t-tx3)', fontSize: 11 }}>{Math.round(sessionPct)}%</span>
                    </div>
                  )}
                </div>

                {/* Text area */}
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder={prompt ? 'Write your response to the prompt above…' : 'Start writing here…'}
                  disabled={status !== 'idle'}
                  style={{
                    width: '100%', minHeight: 300,
                    background: 'transparent', color: 'var(--t-tx2)',
                    fontSize: 15, lineHeight: 1.85, padding: '1.5rem',
                    border: 'none', outline: 'none', resize: 'none',
                    fontFamily: 'Georgia, serif',
                  }}
                />

                {/* Bottom bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--t-brd)', padding: '14px 20px', gap: 16 }}>
                  {error ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--t-danger)', fontSize: 12 }}>
                      <AlertCircle style={{ width: 14, height: 14 }} /> {error}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--t-tx3)', fontSize: 12 }}>
                      {wordCount >= 20 ? 'Ready to submit for AI feedback ✓' : `${20 - wordCount} more words needed`}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                    <button onClick={saveDraft} disabled={status !== 'idle' || !content.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid var(--t-brd)', color: 'var(--t-tx2)', borderRadius: 12, padding: '8px 16px', fontSize: 13, cursor: 'pointer', opacity: (status !== 'idle' || !content.trim()) ? 0.35 : 1 }}>
                      <Save style={{ width: 14, height: 14 }} />
                      {status === 'saving' ? 'Saving…' : 'Save Draft'}
                    </button>
                    <button
                      onClick={runAiAssist}
                      disabled={status !== 'idle' || aiAssistLoading}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        minWidth: 122,
                        justifyContent: 'center',
                        backgroundColor: '#f4c94b',
                        background: 'linear-gradient(135deg, #fff3bf 0%, #f8d35d 35%, #efb73a 68%, #d8971f 100%)',
                        color: '#4a3200',
                        border: '1px solid #c88d1e',
                        borderRadius: 12,
                        padding: '8px 16px',
                        fontSize: 13,
                        fontWeight: 700,
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75), 0 8px 18px rgba(218,156,36,0.35)',
                        cursor: (status !== 'idle' || aiAssistLoading) ? 'not-allowed' : 'pointer',
                        opacity: (status !== 'idle' || aiAssistLoading) ? 0.6 : 1,
                      }}
                    >
                      <Sparkles style={{ width: 15, height: 15 }} />
                      {aiAssistLoading ? 'Thinking…' : 'AI Assist'}
                    </button>
                    <button onClick={submitForFeedbackSafe} disabled={status !== 'idle' || wordCount < 20} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--t-btn)', color: 'var(--t-btn-color)', borderRadius: 12, padding: '8px 20px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', opacity: (status !== 'idle' || wordCount < 20) ? 0.4 : 1 }}>
                      {['submitting', 'reviewing'].includes(status)
                        ? <><Sparkles style={{ width: 15, height: 15 }} />{status === 'reviewing' ? 'Getting Feedback…' : 'Submitting…'}</>
                        : <><Send style={{ width: 15, height: 15 }} />Submit for Feedback</>
                      }
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    padding: aiAssistOpen ? '12px 20px 16px' : '0 20px',
                    maxHeight: aiAssistOpen ? 320 : 0,
                    opacity: aiAssistOpen ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.22s ease, opacity 0.22s ease, padding 0.22s ease',
                  }}
                >
                  <div style={{
                    borderRadius: 16,
                    border: '1px solid var(--t-brd)',
                    background: 'linear-gradient(160deg, var(--t-card2), color-mix(in srgb, var(--t-acc-a) 16%, var(--t-card) 84%))',
                    padding: 12,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div>
                        <strong style={{ fontSize: 13 }}>AI Assist Studio</strong>
                        <p style={{ margin: '2px 0 0', fontSize: 11, opacity: 0.75 }}>4 focused tips + 4 ready-to-adapt examples</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAiAssistOpen(false)}
                        aria-label="Close AI Assist"
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, padding: 4, border: '1px solid var(--t-brd)' }}
                      >
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                    </div>

                    {aiAssistCopied && (
                      <div style={{ marginBottom: 10, fontSize: 12 }}>
                        Tip copied!
                      </div>
                    )}

                    <div style={{ maxHeight: 220, overflowY: 'auto', paddingRight: 2 }}>
                      {aiAssistLoading ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                          {Array.from({ length: 2 }).map((_, col) => (
                            <div key={col}>
                              <div style={{ height: 12, width: 90, borderRadius: 6, background: 'currentColor', opacity: 0.32, marginBottom: 8 }} />
                              <div style={{ display: 'grid', gap: 8 }}>
                                {Array.from({ length: 4 }).map((__, index) => (
                                  <div key={`${col}-${index}`} style={{ borderRadius: 12, padding: 10, border: '1px solid var(--t-brd)', opacity: 0.5 }}>
                                    <div style={{ height: 12, marginBottom: 8, borderRadius: 6, background: 'currentColor', opacity: 0.28 }} />
                                    <div style={{ height: 10, borderRadius: 6, background: 'currentColor', opacity: 0.18 }} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        (aiAssistTips.length > 0 || aiAssistExamples.length > 0) ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Tips</div>
                              <div style={{ display: 'grid', gap: 8 }}>
                                {aiAssistTips.map((tip, index) => (
                                  <button
                                    key={`tip-${tip.label}-${index}`}
                                    type="button"
                                    onClick={() => { void copyAiAssistTip(tip.detail); }}
                                    style={{ textAlign: 'left', borderRadius: 12, padding: 10, border: '1px solid var(--t-brd)', background: 'var(--t-card)', cursor: 'pointer' }}
                                  >
                                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 5 }}>{tip.label}</div>
                                    <div style={{ fontSize: 12, opacity: 0.8 }}>{tip.detail}</div>
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Examples</div>
                              <div style={{ display: 'grid', gap: 8 }}>
                                {aiAssistExamples.map((example, index) => (
                                  <button
                                    key={`example-${example.label}-${index}`}
                                    type="button"
                                    onClick={() => { void copyAiAssistTip(example.detail); }}
                                    style={{ textAlign: 'left', borderRadius: 12, padding: 10, border: '1px solid var(--t-brd)', background: 'var(--t-card)', cursor: 'pointer' }}
                                  >
                                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 5 }}>{example.label}</div>
                                    <div style={{ fontSize: 12, opacity: 0.8 }}>{example.detail}</div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p style={{ fontSize: 12, margin: 0 }}>No AI assist suggestions right now. Please try again.</p>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ── FEEDBACK VIEW ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* XP banner */}
                {xpEarned > 0 && (
                  <div style={{ background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 20, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--t-acc-b)', border: '1px solid var(--t-brd-a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Zap style={{ width: 20, height: 20, color: 'var(--t-acc)' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 900, fontSize: 18, color: 'var(--t-acc)' }}>+{xpEarned} XP Earned!</p>
                      <p style={{ fontSize: 12, color: 'var(--t-tx3)', marginTop: 2 }}>Writing session complete — Dashboard updated</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: tone('var(--t-warning)', 8), border: `1px solid ${tone('var(--t-warning)', 18)}`, borderRadius: 20, padding: '14px 18px', color: 'var(--t-warning)' }}>
                    <AlertCircle style={{ width: 16, height: 16 }} />
                    <p style={{ fontSize: 13, color: 'var(--t-tx2)' }}>{error}</p>
                  </div>
                )}

                {/* Prompt used */}
                {prompt && (
                  <div style={{ background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 20, padding: '14px 18px' }}>
                    <p style={{ color: 'var(--t-acc)', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>Prompt Used</p>
                    <p style={{ color: 'var(--t-tx2)', fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' }}>{prompt}</p>
                  </div>
                )}

                {/* Writing preview */}
                <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 28, padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                    <h2 style={{ fontWeight: 800, fontSize: 18, color: 'var(--t-tx)' }}>{title || 'Your Writing'}</h2>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ background: 'var(--t-acc-a)', color: 'var(--t-acc)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600, border: '1px solid var(--t-brd-a)' }}>{category}</span>
                      <span style={{ fontSize: 12, color: 'var(--t-tx3)' }}>{wordCount} words</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: feedback ? reviewedBadgeStyle.color : savedBadgeStyle.color, background: feedback ? reviewedBadgeStyle.background : savedBadgeStyle.background, border: feedback ? reviewedBadgeStyle.border : savedBadgeStyle.border, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                        {feedback ? <CheckCircle style={{ width: 11, height: 11 }} /> : <Save style={{ width: 11, height: 11 }} />}
                        {feedback ? 'Reviewed' : 'Saved'}
                      </span>
                    </div>
                  </div>
                  <div style={{ background: 'var(--t-bg)', border: '1px solid var(--t-brd)', borderRadius: 16, padding: 16, maxHeight: 160, overflowY: 'auto' }}>
                    <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--t-tx2)', whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif' }}>{content}</p>
                  </div>
                </div>

                {/* AI Feedback */}
                {feedback && (
                  <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 28, padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--t-acc-a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Sparkles style={{ width: 17, height: 17, color: 'var(--t-acc)' }} />
                      </div>
                      <h2 style={{ fontWeight: 800, fontSize: 18, color: 'var(--t-tx)' }}>AI Feedback</h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, alignItems: 'start' }}>
                      {/* Overall Feedback — structured */}
                      {(() => {
                        const clean = (s: string) => s.replace(/"/g, '').replace(/[•\[\]]/g, '').replace(/\s{2,}/g, ' ').trim();
                        const toParas = (s: string) => clean(s).split(/\n+|(?<=[.!?])\s+(?=[A-Z])/).map(l => l.trim()).filter(Boolean);
                        const blocks = feedback.overall.split(/\n(?=SUMMARY:|STRENGTHS:|IMPROVEMENTS:|NEXT STEP:)/);
                        return (
                          <div style={{ background: 'var(--t-bg)', border: '1px solid var(--t-brd)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column' }}>
                            <p style={{ color: 'var(--t-tx3)', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, flexShrink: 0 }}>Overall Feedback</p>
                            <div style={{ overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 0, maxHeight: '18rem' }}>
                              {blocks.map((block, i) => {
                                const colonIdx = block.indexOf(':');
                                if (colonIdx === -1) return <p key={i} style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--t-tx2)', margin: 0 }}>{clean(block)}</p>;
                                const label = block.slice(0, colonIdx).trim();
                                const rawBody = block.slice(colonIdx + 1).trim();
                                const labelColor = label === 'STRENGTHS' ? 'var(--t-success)' : label === 'IMPROVEMENTS' ? 'var(--t-warning)' : label === 'NEXT STEP' ? 'var(--t-acc)' : 'var(--t-tx2)';
                                const paras = toParas(rawBody);
                                return (
                                  <div key={i} style={{ paddingTop: i > 0 ? 14 : 0, marginTop: i > 0 ? 14 : 0, borderTop: i > 0 ? '1px solid color-mix(in srgb, var(--t-brd) 50%, transparent)' : 'none' }}>
                                    <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: labelColor, textTransform: 'uppercase', marginBottom: 7 }}>{label}</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                      {paras.map((para, j) => (
                                        <p key={j} style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--t-tx2)', margin: 0 }}>{para}</p>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Section by Section */}
                      <div style={{ background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column' }}>
                        <p style={{ color: 'var(--t-acc)', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, flexShrink: 0 }}>Section by Section</p>
                        <div style={{ overflowY: 'auto', paddingRight: 4, maxHeight: '18rem' }}>
                          {feedback.paragraph_feedback.replace(/"/g, '').split(/\n\s*\n/).map((section, i, arr) => (
                            <div key={i} style={{ marginBottom: i < arr.length - 1 ? '1rem' : 0 }}>
                              {section.trim().split(/(?<=[.!?])\s+(?=[A-Z])/).map((sent, j) => (
                                <p key={j} style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--t-tx2)', margin: 0, marginBottom: 6 }}>{sent.trim()}</p>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Rewritten Version */}
                      <div style={{ background: tone('var(--t-success)', 6), border: `1px solid ${tone('var(--t-success)', 16)}`, borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column' }}>
                        <p style={{ color: '#34d399', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, flexShrink: 0 }}>Rewritten Version</p>
                        <div style={{ background: tone('var(--t-success)', 10), border: `1px solid ${tone('var(--t-success)', 18)}`, borderRadius: 12, padding: '10px 12px', overflowY: 'auto', paddingRight: 8, maxHeight: '18rem' }}>
                          {(() => {
                            const text = feedback.rewritten_version.replace(/"/g, '');
                            // Split on blank lines first; if AI returned one block, chunk every 3 sentences
                            let paras = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
                            if (paras.length === 1) {
                              const sentences = paras[0].split(/(?<=[.!?])\s+/);
                              paras = [];
                              for (let i = 0; i < sentences.length; i += 3) {
                                paras.push(sentences.slice(i, i + 3).join(' '));
                              }
                            }
                            return paras.map((para, i) => (
                              <p key={i} style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--t-tx2)', margin: 0, marginBottom: i < paras.length - 1 ? 12 : 0 }}>{para}</p>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            ))}
            </> {/* end normal content */}
          </>
        )}

        {/* ══════════════════════════════════════
            TAB 2: JOURNAL
        ══════════════════════════════════════ */}
        {activeTab === 'journal' && (
          <>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {[
                { label: 'Reviewed Pieces', value: journalReviewedCount, color: 'var(--t-success)' },
                { label: 'Average Length', value: avgJournalWords ? `${avgJournalWords} words` : 'No data yet', color: 'var(--t-mod-vocab)' },
                { label: 'Latest Update', value: latestWriting ? new Date(latestWriting.updated_at || latestWriting.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'None yet', color: 'var(--t-acc)' },
              ].map(item => (
                <div key={item.label} style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 18, padding: '0.95rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--t-tx3)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, marginBottom: 4 }}>{item.label}</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: item.color }}>{item.value}</p>
                  </div>
                  <div style={{ width: 10, height: 10, borderRadius: 99, background: item.color, boxShadow: `0 0 16px ${item.color}` }} />
                </div>
              ))}
            </div>

            {/* Filter bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 14, padding: 4 }}>
                {(['all', 'favorites'] as const).map(t => (
                  <button key={t} onClick={() => setJournalTab(t)} style={{ padding: '8px 16px', borderRadius: 11, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: 6, background: journalTab === t ? 'var(--t-acc)' : 'transparent', color: journalTab === t ? 'var(--t-btn-color)' : 'var(--t-tx2)' }}>
                    {t === 'favorites' && <Star style={{ width: 13, height: 13 }} />}
                    {t === 'all' ? 'All' : 'Favorites'}
                  </button>
                ))}
              </div>
              <div style={{ flex: '1 1 280px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 14, padding: '8px 12px' }}>
                <Search style={{ width: 14, height: 14, color: 'var(--t-tx3)' }} />
                <input
                  value={journalSearch}
                  onChange={e => setJournalSearch(e.target.value)}
                  placeholder="Search titles, prompts, feedback, and content"
                  style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--t-tx2)', fontSize: 13, outline: 'none' }}
                />
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Filter style={{ width: 14, height: 14, color: 'var(--t-tx3)' }} />
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', color: 'var(--t-tx2)', borderRadius: 10, padding: '7px 12px', fontSize: 13, outline: 'none' }}>
                  {JOURNAL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <select value={journalSort} onChange={e => setJournalSort(e.target.value as typeof journalSort)} style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', color: 'var(--t-tx2)', borderRadius: 10, padding: '7px 12px', fontSize: 13, outline: 'none' }}>
                  <option value="recent">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="score">Best match</option>
                  <option value="longest">Longest</option>
                  <option value="shortest">Shortest</option>
                </select>
              </div>
            </div>

            {journalError && (
              <div style={{ background: tone('var(--t-danger)', 8), border: `1px solid ${tone('var(--t-danger)', 18)}`, color: 'var(--t-danger)', borderRadius: 14, padding: '12px 14px', fontSize: 12, fontWeight: 600 }}>
                {journalError}
              </div>
            )}

            {/* Writings list */}
            {journalLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map(i => <div key={i} style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 20, height: 80 }} />)}
              </div>
            ) : visibleWritings.length === 0 ? (
              <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 28, padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--t-acc-a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <BookMarked style={{ width: 26, height: 26, color: 'var(--t-acc)' }} />
                </div>
                <p style={{ color: 'var(--t-tx)', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
                  {journalEmptyTitle}
                </p>
                <p style={{ color: 'var(--t-tx3)', fontSize: 14, marginBottom: 20 }}>
                  {journalEmptyBody}
                </p>
                <button onClick={() => switchTab('write')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--t-btn)', color: 'var(--t-btn-color)', borderRadius: 14, padding: '10px 24px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                  <PenLine style={{ width: 15, height: 15 }} /> Start Writing
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {visibleWritings.map(w => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isToday = w.created_at.startsWith(todayStr);
                  return (
                  <div key={w.id} style={{ background: 'var(--t-card)', border: isToday ? '1px solid var(--t-acc-c)' : '1px solid var(--t-brd)', borderRadius: 22, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                          <h3 style={{ fontWeight: 700, color: 'var(--t-tx)', fontSize: 15, margin: 0 }}>{w.title}</h3>
                          {isToday && <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '2px 8px', borderRadius: 99, background: 'var(--t-acc-a)', color: 'var(--t-acc)', border: '1px solid var(--t-brd-a)' }}>Today</span>}
                          <span style={{ ...writingStatusTheme(w.status), fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {w.status === 'reviewed' ? <CheckCircle style={{ width: 11, height: 11 }} /> : w.status === 'submitted' ? <FileText style={{ width: 11, height: 11 }} /> : <Clock style={{ width: 11, height: 11 }} />}
                            {w.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--t-tx3)', flexWrap: 'wrap' }}>
                          <span>{new Date(w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span>·</span><span>{w.word_count} words</span>
                          <span>·</span><span style={{ color: 'var(--t-acc)', fontWeight: 600 }}>{w.category}</span>
                          {w.xp_earned > 0 && <><span>·</span><span style={{ color: '#fbbf24', fontWeight: 600 }}>+{w.xp_earned} XP</span></>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => toggleFavorite(w)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 10, color: w.is_favorite ? 'var(--t-danger)' : 'var(--t-tx3)' }}>
                          <Heart style={{ width: 16, height: 16, fill: w.is_favorite ? 'currentColor' : 'none' }} />
                        </button>
                        <button onClick={async () => {
                          if (expanded === w.id) {
                            hasAutoExpandedRef.current = true;
                            setExpanded(null);
                            return;
                          }

                          setExpanded(w.id);
                          if (!w.content.trim()) {
                            setExpandedContentLoadingId(w.id);
                            try {
                              await ensureJournalContent(w);
                            } catch (error) {
                              logSafeError('ensureJournalContent error:', error);
                              setJournalError('Could not load the full writing yet. The rest of the journal is still available.');
                            } finally {
                              setExpandedContentLoadingId(current => current === w.id ? null : current);
                            }
                          }
                        }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: 'var(--t-acc)', cursor: 'pointer' }}>
                          <Eye style={{ width: 13, height: 13 }} /> View
                          {expanded === w.id ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
                        </button>
                        <button onClick={() => deleteWriting(w.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 10, color: 'var(--t-tx3)' }}>
                          <Trash2 style={{ width: 15, height: 15 }} />
                        </button>
                      </div>
                    </div>
                    {expanded === w.id && (
                      <div style={{ borderTop: '1px solid var(--t-brd)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {w.prompt && (
                          <div style={{ background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 14, padding: '10px 14px' }}>
                            <p style={{ color: 'var(--t-acc)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>Prompt</p>
                            <p style={{ fontSize: 13, color: 'var(--t-tx2)', lineHeight: 1.5, fontStyle: 'italic' }}>{w.prompt}</p>
                          </div>
                        )}
                        <div style={{ background: 'var(--t-bg)', border: '1px solid var(--t-brd)', borderRadius: 16, padding: 16, maxHeight: 200, overflowY: 'auto' }}>
                          <p style={{ color: 'var(--t-tx3)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Your Writing</p>
                          {expandedContentLoadingId === w.id && !w.content.trim() ? (
                            <p style={{ fontSize: 14, color: 'var(--t-tx3)', lineHeight: 1.7 }}>Loading full writing…</p>
                          ) : (
                            <p style={{ fontSize: 14, color: 'var(--t-tx2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{w.content || 'No content saved.'}</p>
                          )}
                        </div>
                        {w.feedback ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <p style={{ color: 'var(--t-acc)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Sparkles style={{ width: 11, height: 11 }} /> AI Feedback
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, alignItems: 'start' }}>
                              {(() => {
                                const clean = (s: string) => s.replace(/"/g, '').replace(/[•\[\]]/g, '').replace(/\s{2,}/g, ' ').trim();
                                const toParas = (s: string) => clean(s).split(/\n+|(?<=[.!?])\s+(?=[A-Z])/).map(l => l.trim()).filter(Boolean);
                                const blocks = w.feedback.split(/\n(?=SUMMARY:|STRENGTHS:|IMPROVEMENTS:|NEXT STEP:)/);

                                return (
                                  <div style={{ background: 'var(--t-bg)', border: '1px solid var(--t-brd)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column' }}>
                                    <p style={{ color: 'var(--t-tx3)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, flexShrink: 0 }}>Overall Feedback</p>
                                    <div style={{ overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 0, maxHeight: '18rem' }}>
                                      {blocks.map((block, i) => {
                                        const colonIdx = block.indexOf(':');
                                        if (colonIdx === -1) {
                                          return <p key={i} style={{ fontSize: 13, lineHeight: 1.75, color: 'var(--t-tx2)', margin: 0 }}>{clean(block)}</p>;
                                        }

                                        const label = block.slice(0, colonIdx).trim();
                                        const rawBody = block.slice(colonIdx + 1).trim();
                                        const labelColor = label === 'STRENGTHS' ? 'var(--t-success)' : label === 'IMPROVEMENTS' ? 'var(--t-warning)' : label === 'NEXT STEP' ? 'var(--t-acc)' : 'var(--t-tx2)';
                                        const paras = toParas(rawBody);

                                        return (
                                          <div key={i} style={{ paddingTop: i > 0 ? 12 : 0, marginTop: i > 0 ? 12 : 0, borderTop: i > 0 ? '1px solid color-mix(in srgb, var(--t-brd) 50%, transparent)' : 'none' }}>
                                            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', color: labelColor, textTransform: 'uppercase', marginBottom: 7 }}>{label}</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                              {paras.map((para, j) => (
                                                <p key={j} style={{ fontSize: 13, lineHeight: 1.72, color: 'var(--t-tx2)', margin: 0 }}>{para}</p>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}

                              <div style={{ background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column' }}>
                                <p style={{ color: 'var(--t-acc)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, flexShrink: 0 }}>Section by Section</p>
                                <div style={{ overflowY: 'auto', paddingRight: 4, maxHeight: '18rem' }}>
                                  {(w.improvements || '').replace(/"/g, '').split(/\n\s*\n/).filter(Boolean).map((section, i, arr) => (
                                    <div key={i} style={{ marginBottom: i < arr.length - 1 ? '1rem' : 0 }}>
                                      {section.trim().split(/(?<=[.!?])\s+(?=[A-Z])/).map((sent, j) => (
                                        <p key={j} style={{ fontSize: 13, lineHeight: 1.72, color: 'var(--t-tx2)', margin: 0, marginBottom: 6 }}>{sent.trim()}</p>
                                      ))}
                                    </div>
                                  ))}
                                  {!w.improvements && <p style={{ fontSize: 13, lineHeight: 1.72, color: 'var(--t-tx3)', margin: 0 }}>No section-by-section notes saved.</p>}
                                </div>
                              </div>

                              <div style={{ background: tone('var(--t-success)', 6), border: `1px solid ${tone('var(--t-success)', 16)}`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column' }}>
                                <p style={{ color: '#34d399', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, flexShrink: 0 }}>Rewritten Version</p>
                                <div style={{ background: tone('var(--t-success)', 10), border: `1px solid ${tone('var(--t-success)', 18)}`, borderRadius: 12, padding: '10px 12px', overflowY: 'auto', paddingRight: 8, maxHeight: '18rem' }}>
                                  {(() => {
                                    const text = (w.strengths || '').replace(/"/g, '');
                                    let paras = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
                                    if (paras.length === 1) {
                                      const sentences = paras[0].split(/(?<=[.!?])\s+/);
                                      paras = [];
                                      for (let i = 0; i < sentences.length; i += 3) {
                                        paras.push(sentences.slice(i, i + 3).join(' '));
                                      }
                                    }

                                    if (paras.length === 0) {
                                      return <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--t-tx3)', margin: 0 }}>No rewritten example saved.</p>;
                                    }

                                    return paras.map((para, i) => (
                                      <p key={i} style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--t-tx2)', margin: 0, marginBottom: i < paras.length - 1 ? 12 : 0 }}>{para}</p>
                                    ));
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : <p style={{ fontSize: 12, color: 'var(--t-tx3)', fontStyle: 'italic' }}>No AI feedback yet — submit to get feedback.</p>}
                      </div>
                    )}
                  </div>
                ); })}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════
            TAB 3: MY PROGRESS
        ══════════════════════════════════════ */}
        {activeTab === 'progress' && (
          <>
            {progressError && (
              <div style={{ background: tone('var(--t-warning)', 8), border: `1px solid ${tone('var(--t-warning)', 18)}`, color: 'var(--t-warning)', borderRadius: 14, padding: '12px 14px', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
                {progressError}
              </div>
            )}
            {progressLoading ? (
              <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 28, padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--t-acc-a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Sparkles style={{ width: 20, height: 20, color: 'var(--t-acc)' }} />
                </div>
                <p style={{ color: 'var(--t-tx)', fontWeight: 700, marginBottom: 6 }}>Loading your progress…</p>
                <p style={{ color: 'var(--t-tx3)', fontSize: 13 }}>We are syncing your reviewed pieces and charts</p>
              </div>
            ) : reviewedWritings.length === 0 ? (
              <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 28, padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--t-acc-a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <BarChart2 style={{ width: 26, height: 26, color: 'var(--t-acc)' }} />
                </div>
                <p style={{ color: 'var(--t-tx)', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>No data yet</p>
                <p style={{ color: 'var(--t-tx3)', fontSize: 14, marginBottom: 20 }}>Submit at least one reviewed writing to see your progress chart</p>
                <button onClick={() => switchTab('write')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--t-btn)', color: 'var(--t-btn-color)', borderRadius: 14, padding: '10px 24px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                  <PenLine style={{ width: 15, height: 15 }} /> Start Writing
                </button>
              </div>
            ) : (
              <>
                {/* ── Stat cards (4 columns) ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                  {[
                    { label: 'Pieces Written', value: `${reviewedWritings.length}`, suffix: '', color: 'var(--t-mod-write)', icon: FileText },
                    { label: 'Total Words', value: reviewedWordTotal >= 1000 ? `${(reviewedWordTotal / 1000).toFixed(1)}k` : `${reviewedWordTotal}`, suffix: '', color: 'var(--t-mod-vocab)', icon: BookOpen },
                    { label: 'Avg Score', value: `${avgScore}`, suffix: '/100', color: 'var(--t-acc)', icon: Star },
                    { label: 'Trend', value: trend >= 0 ? `+${trend}` : `${trend}`, suffix: ' pts', color: trend >= 0 ? 'var(--t-success)' : 'var(--t-danger)', icon: TrendingUp },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 20, padding: '1.1rem 1rem',
                      position: 'relative', overflow: 'hidden',
                    }}>
                      <div style={{ position: 'absolute', top: -6, right: -6, width: 40, height: 40, borderRadius: '50%', background: tone(s.color, 10), filter: 'blur(12px)', pointerEvents: 'none' }} />
                      <s.icon style={{ width: 16, height: 16, color: s.color, marginBottom: 8 }} />
                      <p style={{ fontSize: 24, fontWeight: 900, color: s.color, letterSpacing: '-0.04em', lineHeight: 1 }}>
                        {s.value}<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-tx3)' }}>{s.suffix}</span>
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--t-tx3)', marginTop: 4 }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* ── AI Deep Analysis card ── */}
                {progressAnalysisLoading && !progressAnalysis && (
                  <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 28, padding: '2rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Sparkles style={{ width: 18, height: 18, color: 'var(--t-acc)', flexShrink: 0 }} />
                    <p style={{ fontSize: 14, color: 'var(--t-tx3)', fontWeight: 500 }}>Analyzing your writing history…</p>
                  </div>
                )}
                {progressAnalysis && (
                  <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 28, padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: tone('var(--t-acc)', 6), filter: 'blur(30px)', pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, var(--t-acc-a), var(--t-acc-b))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Sparkles style={{ width: 18, height: 18, color: 'var(--t-acc)' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-acc)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>AI Coach Analysis</p>
                        <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--t-tx)' }}>Your Writing Journey</p>
                      </div>
                    </div>

                    {/* Summary */}
                    <p style={{ fontSize: 14, color: 'var(--t-tx2)', lineHeight: 1.65, marginBottom: 20 }}>
                      {progressAnalysis.summary}
                    </p>

                    {/* Strengths + Areas to Improve grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                      <div style={{ background: tone('var(--t-success)', 5), border: `1px solid ${tone('var(--t-success)', 15)}`, borderRadius: 18, padding: '16px 14px' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-success)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Your Strengths</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {progressAnalysis.strengths.map((s, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                              <CheckCircle style={{ width: 14, height: 14, color: 'var(--t-success)', flexShrink: 0, marginTop: 2 }} />
                              <p style={{ fontSize: 13, color: 'var(--t-tx2)', lineHeight: 1.45 }}>{s}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ background: tone('var(--t-warning)', 5), border: `1px solid ${tone('var(--t-warning)', 15)}`, borderRadius: 18, padding: '16px 14px' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-warning)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Areas to Grow</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {progressAnalysis.areasToImprove.map((a, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                              <Zap style={{ width: 14, height: 14, color: 'var(--t-warning)', flexShrink: 0, marginTop: 2 }} />
                              <p style={{ fontSize: 13, color: 'var(--t-tx2)', lineHeight: 1.45 }}>{a}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Patterns + Vocab + Recommendation */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {progressAnalysis.writingPatterns && (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: tone('var(--t-acc)', 4), borderRadius: 14, padding: '12px 14px' }}>
                          <Eye style={{ width: 15, height: 15, color: 'var(--t-acc)', flexShrink: 0, marginTop: 1 }} />
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-acc)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Writing Patterns</p>
                            <p style={{ fontSize: 13, color: 'var(--t-tx2)', lineHeight: 1.5 }}>{progressAnalysis.writingPatterns}</p>
                          </div>
                        </div>
                      )}
                      {progressAnalysis.vocabularyTrend && (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: tone('var(--t-mod-vocab)', 4), borderRadius: 14, padding: '12px 14px' }}>
                          <BookOpen style={{ width: 15, height: 15, color: 'var(--t-mod-vocab)', flexShrink: 0, marginTop: 1 }} />
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-mod-vocab)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vocabulary Growth</p>
                            <p style={{ fontSize: 13, color: 'var(--t-tx2)', lineHeight: 1.5 }}>{progressAnalysis.vocabularyTrend}</p>
                          </div>
                        </div>
                      )}
                      {progressAnalysis.recommendation && (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: tone('var(--t-mod-rewards)', 6), border: `1px solid ${tone('var(--t-mod-rewards)', 18)}`, borderRadius: 14, padding: '12px 14px' }}>
                          <Trophy style={{ width: 15, height: 15, color: 'var(--t-mod-rewards)', flexShrink: 0, marginTop: 1 }} />
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-mod-rewards)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Next Step</p>
                            <p style={{ fontSize: 13, color: 'var(--t-tx2)', lineHeight: 1.5 }}>{progressAnalysis.recommendation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Chart card ── */}
                <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 28, padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <p style={{ color: 'var(--t-acc)', fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>Writing Quality</p>
                      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t-tx)' }}>Your Improvement Over Time</h2>
                    </div>
                    <div style={{ display: 'flex', background: 'var(--t-bg)', border: '1px solid var(--t-brd)', borderRadius: 12, padding: 3, gap: 2 }}>
                      {(['week', 'month', '3m', 'year', 'all'] as TimeRange[]).map(r => (
                        <button
                          key={r}
                          onClick={() => setTimeRange(r)}
                          style={{
                            padding: '5px 12px', borderRadius: 9, fontSize: 11, fontWeight: 700,
                            border: 'none', cursor: 'pointer',
                            background: timeRange === r ? 'var(--t-acc)' : 'transparent',
                            color: timeRange === r ? 'var(--t-btn-color)' : 'var(--t-tx3)',
                          }}
                        >
                          {r === '3m' ? '3M' : r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {chartData.length === 0 ? (
                    <p style={{ color: 'var(--t-tx3)', fontSize: 13, textAlign: 'center', padding: '2rem' }}>No data in this time range — try a wider range.</p>
                  ) : (
                    <ProgressChart data={chartData} timeRange={timeRange} />
                  )}
                </div>

              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function WritingsPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: 16, background: 'var(--t-btn)' }} />
      </div>
    }>
      <WritingsContent />
    </Suspense>
  );
}
