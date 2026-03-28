'use client';

// WRITING STUDIO — Write, Journal, and Progress in one place
// Three tabs: Write (editor + AI feedback) | Journal (all writings) | My Progress (improvement chart)

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/app/lib/supabase';
import { awardXP, updateDailyStats, updateStreak, XP_REWARDS } from '@/app/lib/xp';
import { getTrialStatus, TRIAL_LIMITS } from '@/app/lib/trial';
import UpgradeModal, { FeatureBlockWall, LimitWarningBanner } from '@/app/components/UpgradeModal';
import type { Writing } from '@/app/types/database';
import { getDailyPrompt } from '@/app/data/prompts';
import {
  PenLine, Send, Sparkles, CheckCircle, AlertCircle,
  RotateCcw, Tag, Save, TrendingUp, Calendar,
  BookMarked, Heart, Trash2, ChevronDown, ChevronUp,
  FileText, Clock, Filter, Eye, Star, BarChart2,
  Zap, BookOpen, Trophy,
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
  'Email', 'Feature Article', 'Personal', 'Poetry', 'Other',
];
const JOURNAL_CATEGORIES = ['All', ...CATEGORIES];
type ActiveTab = 'write' | 'journal' | 'progress';
type TimeRange = 'week' | 'month' | '3m' | 'year' | 'all';

const tone = (color: string, amount: number) => `color-mix(in srgb, ${color} ${amount}%, transparent)`;

const reviewedBadgeStyle = {
  color: 'var(--t-success)',
  background: tone('var(--t-success)', 8),
  border: `1px solid ${tone('var(--t-success)', 18)}`,
};

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

/* ─── SVG Progress Chart ─────────────────────────────────────── */
function ProgressChart({ data }: { data: { date: string; score: number; title: string; id: string }[] }) {
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
  const xMin = Math.min(...timestamps);
  const xMax = Math.max(...timestamps);

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
  // Show date labels for at most 5 evenly spaced points
  const labelIdx = pts.length <= 5
    ? pts.map((_, i) => i)
    : [0, Math.floor(pts.length / 4), Math.floor(pts.length / 2), Math.floor(3 * pts.length / 4), pts.length - 1];

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

        {/* Area + line */}
        <path d={areaPath} fill="url(#pgGrad)" />
        <path d={linePath} fill="none" stroke="var(--t-acc)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {pts.map((p, i) => (
          <g key={i} style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}>
            <circle cx={p.x} cy={p.y} r={hovered === i ? 7 : 5}
              fill="var(--t-acc)" stroke="var(--t-card)" strokeWidth="2.5" />
            {hovered === i && (
              <g>
                <rect
                  x={Math.max(4, Math.min(p.x - 65, W - 140))} y={p.y - 48}
                  width={130} height={38} rx={8}
                  fill="var(--t-card)" stroke="var(--t-brd)" strokeWidth="1"
                />
                <text
                  x={Math.max(4, Math.min(p.x - 65, W - 140)) + 65}
                  y={p.y - 33} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--t-tx)">
                  {p.title.length > 16 ? p.title.slice(0, 16) + '…' : p.title}
                </text>
                <text
                  x={Math.max(4, Math.min(p.x - 65, W - 140)) + 65}
                  y={p.y - 18} textAnchor="middle" fontSize="10" fill="var(--t-acc)">
                  Score: {p.score}/100
                </text>
              </g>
            )}
          </g>
        ))}

        {/* X axis date labels */}
        {labelIdx.map(i => (
          <text key={i} x={pts[i].x} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--t-tx3)">
            {new Date(pts[i].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </text>
        ))}
      </svg>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
function WritingsContent() {
  const { profile, refreshProfile } = useAuth();
  const searchParams = useSearchParams();

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const t = searchParams.get('tab');
    if (t === 'journal' || t === 'progress') return t;
    return 'write';
  });

  // ── Write tab state ──
  const [title, setTitle]       = useState('');
  const [content, setContent]   = useState('');
  const [category, setCategory] = useState('Creative Story');
  const [prompt, setPrompt]     = useState('');
  const [status, setStatus]     = useState<'idle' | 'saving' | 'submitting' | 'reviewing' | 'done'>('idle');
  const [feedback, setFeedback] = useState<{ strengths: string; improvements: string; overall: string } | null>(null);
  const [writingId, setWritingId] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [xpEarned, setXpEarned]  = useState(0);
  const [error, setError]        = useState('');
  const [todayWords, setTodayWords] = useState(0);
  const [weekWords, setWeekWords]   = useState(0);
  // today's already-submitted piece (1-piece-per-day enforcement)
  const [todayWriting, setTodayWriting] = useState<Writing | null>(null);

  // ── Journal tab state ──
  const [writings, setWritings] = useState<Writing[]>([]);
  const [journalLoading, setJournalLoading] = useState(false);
  const [journalTab, setJournalTab] = useState<'all' | 'favorites'>('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showFeedbackId, setShowFeedbackId] = useState<string | null>(null);

  // ── Progress tab state ──
  const [progressScores, setProgressScores] = useState<{ id: string; score: number; note: string }[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [reviewedWritings, setReviewedWritings] = useState<Writing[]>([]);
  const progressLoaded = useRef(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // ── Read URL params; lock prompt to today's daily prompt ──
  useEffect(() => {
    const p = searchParams.get('prompt');
    const c = searchParams.get('category');
    const t = searchParams.get('tab');
    const resolvedCategory = c ? decodeURIComponent(c) : 'Creative Story';
    if (c) setCategory(resolvedCategory);
    // Always use today's daily prompt (from URL or auto-derived from category)
    setPrompt(p ? decodeURIComponent(p) : getDailyPrompt(resolvedCategory, (profile as { age_group?: string })?.age_group));
    if (t === 'journal') setActiveTab('journal');
    if (t === 'progress') setActiveTab('progress');
  }, [searchParams, profile]);

  // ── Live word count ──
  useEffect(() => {
    setWordCount(content.trim() ? content.trim().split(/\s+/).length : 0);
  }, [content]);

  // ── Load daily + weekly progress ──
  const loadProgress = useCallback(async () => {
    if (!profile) return;
    const today = new Date().toISOString().split('T')[0];
    const { data: todayData } = await supabase
      .from('daily_stats').select('words_written')
      .eq('user_id', profile.id).eq('date', today).single();
    setTodayWords(todayData?.words_written ?? 0);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: weekData } = await supabase
      .from('daily_stats').select('words_written')
      .eq('user_id', profile.id)
      .gte('date', weekAgo.toISOString().split('T')[0]);
    setWeekWords((weekData || []).reduce((s, d) => s + d.words_written, 0));

    // Check if user already submitted a piece today (1-piece-per-day)
    const { data: todayPiece } = await supabase
      .from('writings').select('*')
      .eq('user_id', profile.id)
      .in('status', ['submitted', 'reviewed'])
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    setTodayWriting(todayPiece ?? null);
  }, [profile]);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  // ── Load journal writings ──
  const loadJournal = useCallback(async () => {
    if (!profile) return;
    setJournalLoading(true);
    let q = supabase.from('writings').select('*').eq('user_id', profile.id).order('created_at', { ascending: false });
    if (journalTab === 'favorites') q = q.eq('is_favorite', true);
    if (categoryFilter !== 'All') q = q.eq('category', categoryFilter);
    const { data } = await q;
    const list = data || [];
    setWritings(list);
    // Auto-expand today's entry so user can see their piece + feedback
    const todayStr = new Date().toISOString().split('T')[0];
    const todayEntry = list.find(w => w.created_at.startsWith(todayStr) && ['submitted', 'reviewed'].includes(w.status));
    if (todayEntry) { setExpanded(todayEntry.id); setShowFeedbackId(todayEntry.id); }
    setJournalLoading(false);
  }, [profile, journalTab, categoryFilter]);

  useEffect(() => {
    if (activeTab === 'journal') loadJournal();
  }, [activeTab, loadJournal]);

  // ── Load progress data ──
  const loadProgressData = useCallback(async () => {
    if (!profile || progressLoaded.current) return;
    setProgressLoading(true);
    const { data } = await supabase
      .from('writings').select('*')
      .eq('user_id', profile.id)
      .eq('status', 'reviewed')
      .order('created_at', { ascending: true });
    const reviewed = data || [];
    setReviewedWritings(reviewed);
    if (reviewed.length > 0) {
      try {
        const res = await fetch('/api/ai-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ writings: reviewed }),
        });
        const json = await res.json();
        setProgressScores(json.scores || []);
        progressLoaded.current = true;
      } catch {
        setProgressScores([]);
      }
    }
    setProgressLoading(false);
  }, [profile]);

  useEffect(() => {
    if (activeTab === 'progress') loadProgressData();
  }, [activeTab, loadProgressData]);

  // ── Write tab actions ──
  const saveDraft = useCallback(async () => {
    if (!profile || !content.trim()) return;

    // ── Trial gate: check before first creation ──
    if (!writingId) {
      const ts = getTrialStatus(profile);
      if (ts.writingsBlocked) { setShowUpgradeModal(true); return; }
    }

    setStatus('saving');
    const data = {
      user_id: profile.id,
      title: title || 'Untitled Draft',
      content,
      prompt: prompt || null,
      category,
      status: 'in_progress' as const,
      word_count: wordCount,
    };
    if (writingId) {
      await supabase.from('writings').update(data).eq('id', writingId);
    } else {
      const { data: created } = await supabase.from('writings').insert(data).select().single();
      if (created) {
        setWritingId(created.id);
        // Increment writings_created counter
        if (profile.plan !== 'plus') {
          await supabase.from('profiles')
            .update({ writings_created: (profile.writings_created ?? 0) + 1 })
            .eq('id', profile.id);
          await refreshProfile();
        }
      }
    }
    setStatus('idle');
  }, [profile, content, title, prompt, category, wordCount, writingId, refreshProfile]);

  const submitForFeedback = async () => {
    if (!profile || wordCount < 20) { setError('Write at least 20 words before submitting.'); return; }
    if (wordCount >= 30 && uniqueWordRatio(content) < 0.12) {
      setError('Your writing looks like repeated text — write real sentences to earn progress!');
      return;
    }

    // ── Trial gate ──
    if (!writingId) {
      const ts = getTrialStatus(profile);
      if (ts.writingsBlocked) { setShowUpgradeModal(true); return; }
    }

    setStatus('submitting');
    setError('');
    let id = writingId;
    if (!id) {
      const { data } = await supabase.from('writings')
        .insert({ user_id: profile.id, title: title || 'Untitled', content, prompt: prompt || null, category, status: 'submitted', word_count: wordCount })
        .select().single();
      if (data) {
        id = data.id;
        setWritingId(data.id);
        // Increment writings_created counter (if not already counted by saveDraft)
        if (profile.plan !== 'plus') {
          await supabase.from('profiles')
            .update({ writings_created: (profile.writings_created ?? 0) + 1 })
            .eq('id', profile.id);
        }
      }
    } else {
      await supabase.from('writings').update({ status: 'submitted', word_count: wordCount }).eq('id', id);
    }
    setStatus('reviewing');
    try {
      const res = await fetch('/api/ai-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, category, prompt, wordCount }),
      });
      const data = await res.json();
      if (data.feedback && id) {
        await supabase.from('writings').update({
          status: 'reviewed',
          feedback: data.feedback.overall,
          strengths: data.feedback.strengths,
          improvements: data.feedback.improvements,
          xp_earned: XP_REWARDS.WRITING_SUBMIT,
        }).eq('id', id);
        await awardXP(profile.id, XP_REWARDS.WRITING_SUBMIT,  'Completed writing session');
        await awardXP(profile.id, XP_REWARDS.AI_FEEDBACK,     'Received AI feedback');
        const ratio = uniqueWordRatio(content);
        const effectiveWords = ratio >= 0.35 ? wordCount : Math.round(wordCount * (ratio / 0.35));
        await updateDailyStats(profile.id, { words_written: effectiveWords, writings_completed: 1, xp_earned: XP_REWARDS.WRITING_SUBMIT + XP_REWARDS.AI_FEEDBACK });
        await updateStreak(profile.id);
        await refreshProfile();
        setFeedback(data.feedback);
        setXpEarned(XP_REWARDS.WRITING_SUBMIT + XP_REWARDS.AI_FEEDBACK);
        progressLoaded.current = false; // invalidate cached progress
        fetch('/api/extract-vocab', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, userId: profile.id, writingId: id }),
        });
      }
    } catch {
      setError('Could not get AI feedback — your writing has been saved.');
    }
    setStatus('done');
  };

  const startFresh = () => {
    setTitle(''); setContent(''); setCategory('Creative Story');
    setPrompt(getDailyPrompt('Creative Story'));
    setFeedback(null); setWritingId(null); setStatus('idle'); setXpEarned(0); setError('');
    loadProgress();
  };

  // ── Journal actions ──
  const toggleFavorite = async (w: Writing) => {
    await supabase.from('writings').update({ is_favorite: !w.is_favorite }).eq('id', w.id);
    setWritings(prev => prev.map(x => x.id === w.id ? { ...x, is_favorite: !x.is_favorite } : x));
  };
  const deleteWriting = async (id: string) => {
    if (!confirm('Delete this writing permanently?')) return;
    await supabase.from('writings').delete().eq('id', id);
    setWritings(prev => prev.filter(w => w.id !== id));
  };

  // ── Computed values ──
  const wordGoal   = profile?.daily_word_goal ?? 300;
  const totalToday = todayWords + (status === 'done' ? wordCount : 0);
  const goalPct    = Math.min((totalToday / wordGoal) * 100, 100);
  const sessionPct = Math.min((wordCount / wordGoal) * 100, 100);
  const totalWords = writings.reduce((s, w) => s + w.word_count, 0);

  // ── Progress chart data (filtered by time range) ──
  const chartData = (() => {
    if (!progressScores.length) return [];
    const cutoff = new Date();
    if (timeRange === 'week')  cutoff.setDate(cutoff.getDate() - 7);
    else if (timeRange === 'month') cutoff.setDate(cutoff.getDate() - 30);
    else if (timeRange === '3m')   cutoff.setDate(cutoff.getDate() - 90);
    else if (timeRange === 'year') cutoff.setFullYear(cutoff.getFullYear() - 1);
    else cutoff.setFullYear(2000);

    return progressScores
      .map(s => {
        const w = reviewedWritings.find(rw => rw.id === s.id);
        return w ? { id: s.id, score: s.score, note: s.note, date: w.created_at, title: w.title } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && new Date(x.date) >= cutoff);
  })();

  const avgScore = chartData.length > 0 ? Math.round(chartData.reduce((s, d) => s + d.score, 0) / chartData.length) : 0;
  const bestScore = chartData.length > 0 ? Math.max(...chartData.map(d => d.score)) : 0;
  const trend = chartData.length >= 2
    ? chartData[chartData.length - 1].score - chartData[0].score
    : 0;

  if (!profile) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: 16, background: 'var(--t-btn)', animation: 'pulse 1.5s infinite' }} />
    </div>
  );

  const trialStatus = getTrialStatus(profile);

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
          {/* New piece only available if today's quota not yet used */}
          {activeTab === 'write' && status === 'done' && !todayWriting && (
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
            { id: 'journal', icon: BookMarked, label: 'My Journal' },
            { id: 'progress', icon: BarChart2, label: 'My Progress' },
          ] as { id: ActiveTab; icon: typeof PenLine; label: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
            {/* Upgrade modal (shown when limit hit) */}
            {showUpgradeModal && (
              <UpgradeModal reason="writings" status={trialStatus} onClose={() => setShowUpgradeModal(false)} />
            )}

            {/* ── Writings limit reached: block new writing ── */}
            {trialStatus.writingsBlocked && !writingId && (
              <FeatureBlockWall
                reason="writings"
                status={trialStatus}
                onUpgradeClick={() => setShowUpgradeModal(true)}
              />
            )}

            {/* ── Normal write tab content (not blocked or editing existing) ── */}
            {(!trialStatus.writingsBlocked || !!writingId) && (<>

            {/* Approaching-limit warning */}
            {!trialStatus.isPlus && (
              <LimitWarningBanner
                left={trialStatus.writingsLeft}
                total={TRIAL_LIMITS.WRITINGS}
                label="Writings"
                color="var(--t-mod-write)"
              />
            )}

            {/* ── ALREADY SUBMITTED TODAY ── */}
            {todayWriting && status !== 'done' && (() => {
              const tw = todayWriting;
              const twFeedback = tw.strengths || tw.improvements || tw.feedback
                ? { strengths: tw.strengths || '', improvements: tw.improvements || '', overall: tw.feedback || '' }
                : null;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 20, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--t-acc-b)', border: '1px solid var(--t-brd-a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle style={{ width: 20, height: 20, color: 'var(--t-acc)' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 900, fontSize: 16, color: 'var(--t-acc)' }}>Today&apos;s piece already submitted!</p>
                      <p style={{ fontSize: 12, color: 'var(--t-tx3)', marginTop: 2 }}>Come back tomorrow to write your next piece.</p>
                    </div>
                  </div>
                  {tw.prompt && (
                    <div style={{ background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 20, padding: '14px 18px' }}>
                      <p style={{ color: 'var(--t-acc)', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>Prompt Used</p>
                      <p style={{ color: 'var(--t-tx2)', fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' }}>{tw.prompt}</p>
                    </div>
                  )}
                  <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 28, padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                      <h2 style={{ fontWeight: 800, fontSize: 18, color: 'var(--t-tx)' }}>{tw.title || 'Your Writing'}</h2>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ background: 'var(--t-acc-a)', color: 'var(--t-acc)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600, border: '1px solid var(--t-brd-a)' }}>{tw.category}</span>
                        <span style={{ fontSize: 12, color: 'var(--t-tx3)' }}>{tw.word_count} words</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: reviewedBadgeStyle.color, background: reviewedBadgeStyle.background, border: reviewedBadgeStyle.border, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                          <CheckCircle style={{ width: 11, height: 11 }} /> Reviewed
                        </span>
                      </div>
                    </div>
                    <div style={{ background: 'var(--t-bg)', border: '1px solid var(--t-brd)', borderRadius: 16, padding: 16, maxHeight: 200, overflowY: 'auto' }}>
                      <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--t-tx2)', whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif' }}>{tw.content}</p>
                    </div>
                  </div>
                  {twFeedback && (
                    <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 28, padding: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--t-acc-a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Sparkles style={{ width: 17, height: 17, color: 'var(--t-acc)' }} />
                        </div>
                        <h2 style={{ fontWeight: 800, fontSize: 18, color: 'var(--t-tx)' }}>AI Feedback</h2>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {twFeedback.strengths && <div style={{ background: tone('var(--t-success)', 6), border: `1px solid ${tone('var(--t-success)', 16)}`, borderRadius: 16, padding: 16 }}>
                          <p style={{ color: '#34d399', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Well done on…</p>
                          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--t-tx2)' }}>{twFeedback.strengths}</p>
                        </div>}
                        {twFeedback.improvements && <div style={{ background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 16, padding: 16 }}>
                          <p style={{ color: 'var(--t-acc)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Next, work on…</p>
                          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--t-tx2)' }}>{twFeedback.improvements}</p>
                        </div>}
                        {twFeedback.overall && <div style={{ background: 'var(--t-bg)', border: '1px solid var(--t-brd)', borderRadius: 16, padding: 16 }}>
                          <p style={{ color: 'var(--t-tx3)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Overall</p>
                          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--t-tx2)' }}>{twFeedback.overall}</p>
                        </div>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Progress cards — shown while writing */}
            {!todayWriting && status !== 'done' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div style={{
                  background: 'var(--t-card)',
                  border: '1px solid var(--t-brd)',
                  borderRadius: 20, padding: '1.25rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: tone('var(--t-mod-write)', 12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <TrendingUp style={{ width: 17, height: 17, color: 'var(--t-mod-write)' }} />
                    </div>
                    <p style={{ color: 'var(--t-mod-write)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Daily Goal</p>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--t-mod-write)', lineHeight: 1, marginBottom: 4 }}>
                    {totalToday} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--t-tx3)' }}>/ {wordGoal}</span>
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--t-tx3)', marginBottom: 12 }}>
                    {goalPct >= 100 ? '🎉 Daily goal complete!' : goalPct > 0 ? `${Math.round(goalPct)}% toward your goal` : `${wordGoal} words = daily goal`}
                  </p>
                  <div style={{ height: 6, background: 'var(--t-xp-track)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${goalPct}%`, background: 'var(--t-xp)', borderRadius: 99, transition: 'width 0.5s' }} />
                  </div>
                </div>
                <div style={{
                  background: 'var(--t-card)',
                  border: '1px solid var(--t-brd)',
                  borderRadius: 20, padding: '1.25rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--t-acc-a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Calendar style={{ width: 17, height: 17, color: 'var(--t-acc)' }} />
                    </div>
                    <p style={{ color: 'var(--t-acc)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>This Week</p>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--t-acc)', lineHeight: 1, marginBottom: 4 }}>
                    {weekWords.toLocaleString()}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--t-tx3)' }}>words written this week</p>
                  {wordCount > 0 && (
                    <p style={{ fontSize: 12, color: 'var(--t-acc)', fontWeight: 600, marginTop: 8 }}>+ {wordCount} in this session</p>
                  )}
                </div>
              </div>
            )}

            {!todayWriting && (status !== 'done' ? (
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
                      onChange={e => { setCategory(e.target.value); setPrompt(getDailyPrompt(e.target.value)); }}
                      style={{ background: 'var(--t-bg)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--t-brd)', color: 'var(--t-tx2)', fontSize: 12, outline: 'none', cursor: 'pointer' }}
                    >
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <span style={{ color: 'var(--t-tx3)', fontSize: 12, padding: '4px 10px', background: 'var(--t-bg)', borderRadius: 8, border: '1px solid var(--t-brd)' }}>
                    {wordCount} words
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
                  disabled={!['idle', 'saving'].includes(status)}
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
                    <button onClick={saveDraft} disabled={status === 'saving' || !content.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid var(--t-brd)', color: 'var(--t-tx2)', borderRadius: 12, padding: '8px 16px', fontSize: 13, cursor: 'pointer', opacity: (status === 'saving' || !content.trim()) ? 0.35 : 1 }}>
                      <Save style={{ width: 14, height: 14 }} />
                      {status === 'saving' ? 'Saving…' : 'Save Draft'}
                    </button>
                    <button onClick={submitForFeedback} disabled={['submitting', 'reviewing'].includes(status) || wordCount < 20} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--t-btn)', color: 'var(--t-btn-color)', borderRadius: 12, padding: '8px 20px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', opacity: (['submitting', 'reviewing'].includes(status) || wordCount < 20) ? 0.4 : 1 }}>
                      {['submitting', 'reviewing'].includes(status)
                        ? <><Sparkles style={{ width: 15, height: 15 }} />{status === 'reviewing' ? 'Getting Feedback…' : 'Submitting…'}</>
                        : <><Send style={{ width: 15, height: 15 }} />Submit for Feedback</>
                      }
                    </button>
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
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: reviewedBadgeStyle.color, background: reviewedBadgeStyle.background, border: reviewedBadgeStyle.border, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                        <CheckCircle style={{ width: 11, height: 11 }} /> Reviewed
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ background: tone('var(--t-success)', 6), border: `1px solid ${tone('var(--t-success)', 16)}`, borderRadius: 16, padding: 16 }}>
                        <p style={{ color: '#34d399', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Well done on…</p>
                        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--t-tx2)' }}>{feedback.strengths}</p>
                      </div>
                      <div style={{ background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 16, padding: 16 }}>
                        <p style={{ color: 'var(--t-acc)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Next, work on…</p>
                        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--t-tx2)' }}>{feedback.improvements}</p>
                      </div>
                      <div style={{ background: 'var(--t-bg)', border: '1px solid var(--t-brd)', borderRadius: 16, padding: 16 }}>
                        <p style={{ color: 'var(--t-tx3)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Overall</p>
                        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--t-tx2)' }}>{feedback.overall}</p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            ))}
            </>)} {/* end normal content conditional */}
          </>
        )}

        {/* ══════════════════════════════════════
            TAB 2: JOURNAL
        ══════════════════════════════════════ */}
        {activeTab === 'journal' && (
          <>
            {/* Journal stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {[
                { label: 'Total Entries', value: writings.length, color: 'var(--t-mod-write)', icon: FileText },
                { label: 'Words Written', value: totalWords.toLocaleString(), color: 'var(--t-acc)', icon: BookOpen },
                { label: 'Favorites', value: writings.filter(w => w.is_favorite).length, color: 'var(--t-success)', icon: Heart },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 20, padding: '1.25rem' }}>
                  <s.icon style={{ width: 18, height: 18, color: s.color, marginBottom: 10 }} />
                  <p style={{ fontSize: 28, fontWeight: 900, color: s.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{s.value}</p>
                  <p style={{ fontSize: 12, color: 'var(--t-tx3)', marginTop: 4 }}>{s.label}</p>
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
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Filter style={{ width: 14, height: 14, color: 'var(--t-tx3)' }} />
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', color: 'var(--t-tx2)', borderRadius: 10, padding: '7px 12px', fontSize: 13, outline: 'none' }}>
                  {JOURNAL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Writings list */}
            {journalLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map(i => <div key={i} style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 20, height: 80 }} />)}
              </div>
            ) : writings.length === 0 ? (
              <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 28, padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--t-acc-a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <BookMarked style={{ width: 26, height: 26, color: 'var(--t-acc)' }} />
                </div>
                <p style={{ color: 'var(--t-tx)', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
                  {journalTab === 'favorites' ? 'No favorites yet' : 'No writings yet'}
                </p>
                <p style={{ color: 'var(--t-tx3)', fontSize: 14, marginBottom: 20 }}>
                  {journalTab === 'favorites' ? 'Heart a piece to save it here' : 'Submit a writing piece to build your journal'}
                </p>
                <button onClick={() => setActiveTab('write')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--t-btn)', color: 'var(--t-btn-color)', borderRadius: 14, padding: '10px 24px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                  <PenLine style={{ width: 15, height: 15 }} /> Start Writing
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {writings.map(w => {
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
                        <button onClick={() => setExpanded(expanded === w.id ? null : w.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: 'var(--t-acc)', cursor: 'pointer' }}>
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
                          <p style={{ fontSize: 14, color: 'var(--t-tx2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{w.content || 'No content saved.'}</p>
                        </div>
                        {w.feedback ? (
                          <div>
                            <button onClick={() => setShowFeedbackId(showFeedbackId === w.id ? null : w.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t-acc)', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                              <Sparkles style={{ width: 13, height: 13 }} />
                              {showFeedbackId === w.id ? 'Hide' : 'Show'} AI Feedback
                              {showFeedbackId === w.id ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
                            </button>
                            {showFeedbackId === w.id && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {w.strengths && <div style={{ background: tone('var(--t-success)', 6), border: `1px solid ${tone('var(--t-success)', 16)}`, borderRadius: 14, padding: 14 }}>
                                  <p style={{ color: '#34d399', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Strengths</p>
                                  <p style={{ fontSize: 13, color: 'var(--t-tx2)', lineHeight: 1.6 }}>{w.strengths}</p>
                                </div>}
                                {w.improvements && <div style={{ background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 14, padding: 14 }}>
                                  <p style={{ color: 'var(--t-acc)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Improve</p>
                                  <p style={{ fontSize: 13, color: 'var(--t-tx2)', lineHeight: 1.6 }}>{w.improvements}</p>
                                </div>}
                                {w.feedback && <div style={{ background: 'var(--t-bg)', border: '1px solid var(--t-brd)', borderRadius: 14, padding: 14 }}>
                                  <p style={{ color: 'var(--t-tx3)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Overall</p>
                                  <p style={{ fontSize: 13, color: 'var(--t-tx2)', lineHeight: 1.6 }}>{w.feedback}</p>
                                </div>}
                              </div>
                            )}
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
            {progressLoading ? (
              <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 28, padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--t-acc-a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Sparkles style={{ width: 20, height: 20, color: 'var(--t-acc)' }} />
                </div>
                <p style={{ color: 'var(--t-tx)', fontWeight: 700, marginBottom: 6 }}>Analysing your writing journey…</p>
                <p style={{ color: 'var(--t-tx3)', fontSize: 13 }}>AI is reviewing your past pieces to chart your improvement</p>
              </div>
            ) : reviewedWritings.length === 0 ? (
              <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 28, padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--t-acc-a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <BarChart2 style={{ width: 26, height: 26, color: 'var(--t-acc)' }} />
                </div>
                <p style={{ color: 'var(--t-tx)', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>No data yet</p>
                <p style={{ color: 'var(--t-tx3)', fontSize: 14, marginBottom: 20 }}>Submit at least one writing piece with AI feedback to see your progress chart</p>
                <button onClick={() => setActiveTab('write')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--t-btn)', color: 'var(--t-btn-color)', borderRadius: 14, padding: '10px 24px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                  <PenLine style={{ width: 15, height: 15 }} /> Start Writing
                </button>
              </div>
            ) : (
              <>
                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  {[
                    { label: 'Avg Score', value: avgScore, suffix: '/100', color: 'var(--t-acc)', icon: Star },
                    { label: 'Best Score', value: bestScore, suffix: '/100', color: 'var(--t-success)', icon: Trophy },
                    { label: 'Overall Trend', value: trend >= 0 ? `+${trend}` : `${trend}`, suffix: ' pts', color: trend >= 0 ? 'var(--t-success)' : 'var(--t-danger)', icon: TrendingUp },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 20, padding: '1.25rem' }}>
                      <s.icon style={{ width: 18, height: 18, color: s.color, marginBottom: 10 }} />
                      <p style={{ fontSize: 28, fontWeight: 900, color: s.color, letterSpacing: '-0.04em', lineHeight: 1 }}>
                        {s.value}<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--t-tx3)' }}>{s.suffix}</span>
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--t-tx3)', marginTop: 4 }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Chart card */}
                <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 28, padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <p style={{ color: 'var(--t-acc)', fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>Writing Quality</p>
                      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t-tx)' }}>Your Improvement Over Time</h2>
                    </div>
                    {/* Time range selector */}
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
                    <ProgressChart data={chartData} />
                  )}
                </div>

                {/* Notes from AI for each piece */}
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--t-tx)', marginBottom: 12 }}>Piece-by-Piece Insights</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {chartData.map((d, i) => (
                      <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 18, padding: '14px 18px' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--t-acc)' }}>{d.score}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, color: 'var(--t-tx)', fontSize: 14, marginBottom: 2 }}>{d.title}</p>
                          <p style={{ fontSize: 12, color: 'var(--t-tx3)' }}>
                            {progressScores.find(s => s.id === d.id)?.note || ''}
                            <span style={{ marginLeft: 10 }}>{new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </p>
                        </div>
                        {i > 0 && (() => {
                          const prev = chartData[i - 1].score;
                          const diff = d.score - prev;
                          return (
                            <span style={{ fontSize: 12, fontWeight: 700, color: diff >= 0 ? '#34d399' : '#f87171', flexShrink: 0 }}>
                              {diff >= 0 ? '▲' : '▼'} {Math.abs(diff)}
                            </span>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
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
