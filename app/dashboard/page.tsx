'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Award,
  BookOpen,
  CheckCircle2,
  FileText,
  Flame,
  PenLine,
  Sparkles,
  Star,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useTheme } from '@/app/context/ThemeContext';
import { StudentHomeworkWidget } from '@/app/components/student-homework-widget';
import { supabase } from '@/app/lib/supabase';
import { getTitleForLevel, getXPProgress } from '@/app/types/database';
import type { DailyStats } from '@/app/types/database';
import { getWeekWords } from '@/app/lib/vocab-utils';
import { getLocalDateKey, msUntilNextLocalMidnight } from '@/app/lib/xp';
import { pageCache } from '@/app/lib/page-cache';

type DashCache = {
  stats: DailyStats | null;
  vocabSaved: number;
  vocabMastered: number;
  vocabTotal: number;
  weekStats: DailyStats[];
};

type DashboardRole = 'student' | 'teacher' | 'parent';

export default function DashboardPage() {
  const { profile, session } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const ageGroup = profile?.age_group ?? '';
  const accountType: DashboardRole = pathname === '/dashboard/teacher'
    ? 'teacher'
    : pathname === '/dashboard/parent'
      ? 'parent'
      : profile?.account_type === 'teacher'
        ? 'teacher'
        : profile?.account_type === 'parent'
          ? 'parent'
          : 'student';
  const cacheKey = profile ? `dash-v2-${profile.id}-${ageGroup || 'default'}` : '';
  const cached = cacheKey ? pageCache.get<DashCache>(cacheKey) : null;

  const [todayStats, setTodayStats]             = useState<DailyStats | null>(cached?.stats ?? null);
  const [weekVocabSaved, setWeekVocabSaved]     = useState(cached?.vocabSaved ?? 0);
  const [vocabMastered, setVocabMastered]       = useState(cached?.vocabMastered ?? 0);
  const [vocabTotal, setVocabTotal]             = useState(cached?.vocabTotal ?? 0);
  const [weekStats, setWeekStats]               = useState<DailyStats[]>(cached?.weekStats ?? []);

  const loadData = useCallback(async () => {
    if (!profile) return;
    const date = getLocalDateKey();
    const last7Dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return getLocalDateKey(d);
    });
    const [statsRes, vocabRes, weekStatsRes] = await Promise.all([
      supabase.from('daily_stats').select('*').eq('user_id', profile.id).eq('date', date).maybeSingle(),
      supabase.from('vocab_words').select('word, mastered').eq('user_id', profile.id),
      supabase.from('daily_stats').select('*').eq('user_id', profile.id).in('date', last7Dates),
    ]);
    const stats = statsRes.data as DailyStats | null;
    setTodayStats(stats);
    const allVocab = (vocabRes.data || []) as { word: string; mastered: boolean }[];
    const ww = getWeekWords(ageGroup);
    let vocabSaved = 0;
    if (ww.length > 0) {
      const wordList = ww.map(w => w.word.toLowerCase());
      const savedSet = new Set(allVocab.map(sw => sw.word.toLowerCase()));
      vocabSaved = wordList.filter(w => savedSet.has(w)).length;
    }
    setWeekVocabSaved(vocabSaved);
    setVocabTotal(allVocab.length);
    setVocabMastered(allVocab.filter(v => v.mastered).length);
    setWeekStats((weekStatsRes.data || []) as DailyStats[]);
    if (cacheKey) {
      pageCache.set(cacheKey, {
        stats, vocabSaved,
        vocabMastered: allVocab.filter(v => v.mastered).length,
        vocabTotal: allVocab.length, weekStats: weekStatsRes.data || [],
      } as DashCache, 90_000);
    }
  }, [ageGroup, cacheKey, profile]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const timer = setTimeout(() => loadData(), msUntilNextLocalMidnight() + 1000);
    return () => clearTimeout(timer);
  }, [loadData, profile?.id]);

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderRadius: 16, background: 'var(--t-card)', border: '1px solid var(--t-brd)', boxShadow: '0 18px 50px rgba(0,0,0,0.18)' }}>
          <div style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--t-acc)', animation: 'pulse 1.4s infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-tx2)' }}>Loading your dashboard…</span>
        </div>
      </div>
    );
  }

  const title       = getTitleForLevel(profile.level);
  const xp          = getXPProgress(profile.xp);
  const words       = todayStats?.words_written ?? 0;
  const wordGoal    = profile.daily_word_goal ?? 300;
  const weekGoalTotal = getWeekWords(ageGroup).length;
  const wordPct     = Math.min((words / wordGoal) * 100, 100);
  const vocabPct    = weekGoalTotal > 0 ? Math.min((weekVocabSaved / weekGoalTotal) * 100, 100) : 0;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = getLocalDateKey(d);
    const stat = weekStats.find(s => s.date === key);
    const active = !!stat && (stat.words_written > 0 || stat.vocab_words_learned > 0);
    return {
      key, active,
      words: stat?.words_written ?? 0,
      dayLabel: d.toLocaleDateString('en', { weekday: 'short' }).substring(0, 1),
      isToday: i === 6,
    };
  });

  const activeDays  = last7Days.filter(d => d.active).length;
  const streakTone  = 'var(--t-warning)';
  const xpTone      = 'var(--t-mod-rewards)';
  const wordsTone   = 'var(--t-mod-write)';
  const vocabTone   = 'var(--t-mod-vocab)';

  const isDarkTheme = theme === 'midnight-blue' || theme === 'midnight-bloom';

  const greetingLine = activeDays === 7
    ? 'Perfect week — you wrote every single day.'
    : activeDays >= 4
      ? `Strong week — ${activeDays} days active.`
      : activeDays > 0
        ? `${activeDays} active ${activeDays === 1 ? 'day' : 'days'} this week.`
        : 'Start today and build your habit.';

  const roleLine = accountType === 'teacher'
    ? 'Keep classes, feedback, and student progress moving from one workspace.'
    : accountType === 'parent'
      ? 'Track progress, encourage practice, and stay close to the journey.'
      : greetingLine;
  const authToken = session?.access_token ?? '';
  const cardSurface = {
    background: 'linear-gradient(165deg, color-mix(in srgb, var(--t-card) 92%, var(--t-acc) 8%) 0%, var(--t-card) 62%)',
    border: '1px solid color-mix(in srgb, var(--t-brd) 72%, var(--t-acc) 28%)',
    boxShadow: '0 18px 46px color-mix(in srgb, var(--t-shadow) 18%, transparent), inset 0 1px 0 rgba(255,255,255,0.42)',
  } as const;

  return (
    <div style={{ minHeight: '100vh', padding: '1.3125rem 2.4rem 5rem', background: 'var(--t-bg)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* ── HERO ── */}
        <div style={{
          ...cardSurface,
          borderRadius: 30,
          padding: '1.7rem 2.05rem',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, color-mix(in srgb, var(--t-card) 84%, var(--t-acc) 16%) 0%, color-mix(in srgb, var(--t-card) 70%, var(--t-acc-light) 30%) 100%)',
          border: '1px solid color-mix(in srgb, var(--t-acc) 30%, var(--t-brd))',
          boxShadow: '0 18px 40px color-mix(in srgb, var(--t-shadow) 24%, transparent)',
        }}>
          <div style={{ position: 'absolute', top: -90, right: -60, width: 260, height: 260, borderRadius: '50%', background: 'color-mix(in srgb, var(--t-acc) 26%, transparent)', filter: 'blur(26px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -95, left: -20, width: 220, height: 220, borderRadius: '50%', background: 'color-mix(in srgb, var(--t-acc-light) 18%, transparent)', filter: 'blur(24px)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.4rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 360px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: '0.7rem' }}>
                {profile.streak > 0 && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `linear-gradient(180deg, color-mix(in srgb, ${streakTone} 22%, white) 0%, color-mix(in srgb, ${streakTone} 14%, var(--t-card2)) 100%)`, border: `1px solid color-mix(in srgb, ${streakTone} 30%, transparent)`, borderRadius: 99, padding: '6px 14px' }}>
                    <Flame style={{ width: 12, height: 12, color: streakTone }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: streakTone }}>{profile.streak}-day streak</span>
                  </div>
                )}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(180deg, color-mix(in srgb, var(--t-acc) 24%, white) 0%, color-mix(in srgb, var(--t-acc) 14%, var(--t-card2)) 100%)', border: '1px solid color-mix(in srgb, var(--t-acc) 34%, transparent)', borderRadius: 99, padding: '6px 14px' }}>
                  <Award style={{ width: 12, height: 12, color: 'var(--t-acc)' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-acc)' }}>Level {profile.level} · {title}</span>
                </div>
              </div>

              <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.08, color: 'var(--t-tx)', marginBottom: '0.75rem', textShadow: '0 6px 18px color-mix(in srgb, var(--t-shadow) 18%, transparent)' }}>
                Welcome back, <span className="themed-shimmer" style={{ textTransform: 'capitalize' }}>{profile.username}</span>
              </h1>
              <p style={{ color: 'var(--t-tx2)', fontSize: 15, lineHeight: 1.6, maxWidth: 500, marginBottom: 0 }}>{roleLine}</p>
            </div>

            {xp && (
              <div style={{ flex: '0 1 420px', width: 'min(100%, 420px)', background: 'linear-gradient(180deg, color-mix(in srgb, var(--t-card2) 94%, white 6%) 0%, color-mix(in srgb, var(--t-card2) 86%, black 14%) 100%)', border: '1px solid color-mix(in srgb, var(--t-brd) 72%, transparent)', borderRadius: 16, padding: '0.65rem 0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <span style={{ color: 'var(--t-tx3)', fontSize: 12, fontWeight: 600 }}>Level {profile.level} → {profile.level + 1}</span>
                  <span style={{ color: 'var(--t-acc)', fontSize: 12, fontWeight: 700 }}>{xp.current} / {xp.needed} XP</span>
                </div>
                <div style={{ height: 10, background: 'color-mix(in srgb, var(--t-xp-track) 84%, white 16%)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${xp.percent}%`, background: 'linear-gradient(90deg, color-mix(in srgb, var(--t-acc) 80%, #ffffff) 0%, color-mix(in srgb, var(--t-acc-light) 70%, #ffffff) 100%)', borderRadius: 99, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 4 STAT CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.55rem' }}>
          {([
            { tone: streakTone, Icon: Flame,    label: 'Streak',    value: profile.streak ?? 0,  sub: 'days' },
            { tone: xpTone,     Icon: Star,     label: 'Total XP',  value: profile.xp ?? 0,      sub: `Level ${profile.level}` },
            { tone: wordsTone,  Icon: FileText, label: 'Today',     value: words,                sub: `of ${wordGoal} words` },
            { tone: vocabTone,  Icon: BookOpen, label: 'Word Bank', value: vocabTotal,           sub: `${vocabMastered} mastered` },
          ] as const).map(({ tone, Icon, label, value, sub }) => (
            <div key={label} style={{
              background: isDarkTheme
                ? `linear-gradient(165deg, color-mix(in srgb, ${tone} 24%, var(--t-card)) 0%, color-mix(in srgb, ${tone} 10%, var(--t-card)) 100%)`
                : `linear-gradient(165deg, color-mix(in srgb, ${tone} 16%, transparent) 0%, color-mix(in srgb, var(--t-card) 80%, transparent) 100%)`,
              border: isDarkTheme
                ? `1px solid color-mix(in srgb, ${tone} 52%, var(--t-brd))`
                : `1px solid color-mix(in srgb, ${tone} 30%, var(--t-brd))`,
              borderRadius: 16,
              padding: '1.1rem 1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              minHeight: 122,
              boxShadow: isDarkTheme
                ? `0 16px 34px color-mix(in srgb, ${tone} 14%, transparent), inset 0 1px 0 rgba(255,255,255,0.14)`
                : '0 16px 34px color-mix(in srgb, var(--t-shadow) 18%, transparent), inset 0 1px 0 rgba(255,255,255,0.55)',
              backdropFilter: 'blur(12px) saturate(1.08)',
              WebkitBackdropFilter: 'blur(12px) saturate(1.08)',
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                background: isDarkTheme
                  ? `linear-gradient(180deg, color-mix(in srgb, ${tone} 42%, white) 0%, color-mix(in srgb, ${tone} 18%, var(--t-card2)) 100%)`
                  : `linear-gradient(180deg, color-mix(in srgb, ${tone} 22%, white) 0%, color-mix(in srgb, ${tone} 10%, transparent) 100%)`,
                border: isDarkTheme
                  ? `1px solid color-mix(in srgb, ${tone} 68%, transparent)`
                  : `1px solid color-mix(in srgb, ${tone} 40%, transparent)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon style={{ color: isDarkTheme ? `color-mix(in srgb, ${tone} 88%, white)` : tone, width: 19, height: 19 }} />
              </div>
              <div>
                <p style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--t-tx)', lineHeight: 1, marginBottom: 4 }}>{value.toLocaleString()}</p>
                <p style={{ color: isDarkTheme ? 'color-mix(in srgb, var(--t-tx) 92%, white 8%)' : 'var(--t-tx2)', fontSize: 13, fontWeight: 800, marginBottom: 2 }}>{label}</p>
                <p style={{ color: isDarkTheme ? 'color-mix(in srgb, var(--t-mod-write) 90%, white 10%)' : wordsTone, fontSize: 12, fontWeight: 700, opacity: 0.92 }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── QUICK NAV ── */}
        <div style={{
          ...cardSurface,
          borderRadius: 26,
          padding: '1.35rem',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(165deg, color-mix(in srgb, var(--t-card) 90%, var(--t-acc) 10%) 0%, color-mix(in srgb, var(--t-card) 78%, var(--t-acc) 22%) 100%)',
        }}>
          <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            {([
              { href: '/dashboard/writings', label: 'Writing', phrase: 'Check your drafts and start something new.', Icon: PenLine, tone: wordsTone },
              { href: '/dashboard/vocab', label: 'Vocab', phrase: 'Learn new vocab and master saved words.', Icon: BookOpen, tone: vocabTone },
              { href: '/dashboard/coach', label: 'Coach', phrase: 'Get feedback and sharpen your next piece.', Icon: Sparkles, tone: 'var(--t-acc)' },
              { href: '/dashboard/rewards', label: 'Rewards', phrase: 'Look at your XP bar and unlocks.', Icon: Star, tone: xpTone },
              { href: '/dashboard/settings', label: 'Settings', phrase: 'Tune your goals and daily practice.', Icon: Target, tone: 'var(--t-success)' },
            ] as const).map(({ href, label, phrase, Icon, tone }) => (
              <button
                key={href}
                type="button"
                onClick={() => router.push(href)}
                style={{
                  minHeight: 136,
                  borderRadius: 18,
                  padding: '1rem',
                  background: isDarkTheme
                    ? `linear-gradient(165deg, color-mix(in srgb, ${tone} 20%, var(--t-card2)) 0%, color-mix(in srgb, var(--t-card2) 86%, black 14%) 100%)`
                    : `linear-gradient(165deg, color-mix(in srgb, ${tone} 13%, var(--t-card2)) 0%, color-mix(in srgb, var(--t-card2) 84%, white 16%) 100%)`,
                  border: `1px solid color-mix(in srgb, ${tone} 28%, var(--t-brd))`,
                  boxShadow: '0 12px 26px color-mix(in srgb, var(--t-shadow) 12%, transparent), inset 0 1px 0 rgba(255,255,255,0.32)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  textAlign: 'left',
                  gap: 14,
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 14, background: `color-mix(in srgb, ${tone} 16%, transparent)`, border: `1px solid color-mix(in srgb, ${tone} 34%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon style={{ width: 19, height: 19, color: tone }} />
                </div>
                <div>
                  <h3 style={{ color: 'var(--t-tx)', fontSize: 17, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 6 }}>{label}</h3>
                  <p style={{ color: 'var(--t-tx2)', fontSize: 12.5, fontWeight: 650, lineHeight: 1.45 }}>{phrase}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── BOTTOM ROW: activity + goals ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

          {/* 7-day activity */}
          <div style={{ ...cardSurface, borderRadius: 26, padding: '1.8rem 1.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.6rem' }}>
              <div>
                <p style={{ color: 'var(--t-acc)', fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 5 }}>This week</p>
                <h3 style={{ color: 'var(--t-tx)', fontSize: 16, fontWeight: 800 }}>Writing activity</h3>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-tx2)' }}>{activeDays} / 7 days</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {last7Days.map(({ key, active, words: w, isToday, dayLabel }) => (
                <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                  <div style={{
                    width: '100%', aspectRatio: '1', borderRadius: 14,
                    background: active
                      ? `color-mix(in srgb, ${streakTone} 28%, var(--t-card2))`
                      : isToday ? 'color-mix(in srgb, var(--t-acc) 14%, var(--t-card2))' : 'var(--t-card2)',
                    border: active
                      ? `1.5px solid color-mix(in srgb, ${streakTone} 42%, transparent)`
                      : isToday ? '1.5px solid color-mix(in srgb, var(--t-acc) 34%, transparent)' : '1px solid var(--t-brd)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                  }}>
                    {active && <Flame style={{ width: 14, height: 14, color: streakTone }} />}
                    {!active && isToday && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--t-acc)', opacity: 0.6 }} />}
                    {w > 0 && (
                      <div style={{ position: 'absolute', bottom: -3, right: -3, width: 13, height: 13, borderRadius: '50%', background: wordsTone, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <PenLine style={{ width: 7, height: 7, color: '#fff' }} />
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: active ? 'var(--t-tx2)' : isToday ? 'var(--t-acc)' : 'var(--t-tx3)', fontWeight: active || isToday ? 700 : 500 }}>{dayLabel}</span>
                </div>
              ))}
            </div>
          </div>

          {accountType === 'student' ? (
            <StudentHomeworkWidget authToken={authToken} />
          ) : (
            <div style={{ ...cardSurface, borderRadius: 26, padding: '1.8rem 1.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.6rem' }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, background: 'var(--t-acc-a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Target style={{ width: 18, height: 18, color: 'var(--t-acc)' }} />
                </div>
                <div>
                  <p style={{ color: 'var(--t-acc)', fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 3 }}>Today&apos;s goals</p>
                  <h3 style={{ color: 'var(--t-tx)', fontSize: 16, fontWeight: 800 }}>Keep today balanced</h3>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 9 }}>
                    <span style={{ color: 'var(--t-tx2)', fontSize: 13, fontWeight: 600 }}>Words written</span>
                    <span style={{ color: wordPct >= 100 ? wordsTone : 'var(--t-tx)', fontSize: 13, fontWeight: 700 }}>{words} / {wordGoal}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--t-xp-track)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${wordPct}%`, background: wordsTone, borderRadius: 99, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 9 }}>
                    <span style={{ color: 'var(--t-tx2)', fontSize: 13, fontWeight: 600 }}>Weekly vocab</span>
                    <span style={{ color: vocabPct >= 100 ? vocabTone : 'var(--t-tx)', fontSize: 13, fontWeight: 700 }}>{weekVocabSaved} / {weekGoalTotal}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--t-xp-track)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${vocabPct}%`, background: vocabTone, borderRadius: 99, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
                <div style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--t-card2) 92%, white 8%) 0%, color-mix(in srgb, var(--t-card2) 82%, black 18%) 100%)', border: '1px solid color-mix(in srgb, var(--t-brd) 72%, transparent)', borderRadius: 16, padding: '1rem 1.2rem', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <Sparkles style={{ color: 'var(--t-acc)', width: 13, height: 13, flexShrink: 0 }} />
                    <span style={{ color: 'var(--t-tx2)', fontSize: 12, fontWeight: 700 }}>Custom goal</span>
                    {todayStats?.custom_goal_completed && <CheckCircle2 style={{ width: 13, height: 13, color: 'var(--t-success)', marginLeft: 'auto' }} />}
                  </div>
                  <p style={{ color: 'var(--t-tx3)', fontSize: 12.5, lineHeight: 1.6 }}>{profile.custom_daily_goal || 'Set a custom goal in Settings.'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
