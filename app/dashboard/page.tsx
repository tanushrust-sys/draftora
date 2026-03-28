'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BookMarked,
  CheckCircle2,
  FileText,
  Flame,
  Sparkles,
  Star,
  Target,
  Trophy,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/app/lib/supabase';
import { getTitleForLevel, getXPProgress } from '@/app/types/database';
import type { DailyStats } from '@/app/types/database';
import { CATEGORIES, getDailyPrompt, getPromptDifficulty } from '@/app/data/prompts';
import { getWeekWords } from '@/app/lib/vocab-utils';
import { pageCache } from '@/app/lib/page-cache';

export default function DashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const ageGroup = (profile as { age_group?: string } | null)?.age_group;

  // Initialise from cache so the page renders immediately on re-visit
  const cacheKey = profile ? `dash-stats-${profile.id}` : '';
  const cached = cacheKey ? pageCache.get<{ stats: DailyStats | null; vocabSaved: number }>(cacheKey) : null;

  const [todayStats, setTodayStats] = useState<DailyStats | null>(cached?.stats ?? null);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [showCategories, setShowCategories] = useState(false);
  const [weekVocabSaved, setWeekVocabSaved] = useState(cached?.vocabSaved ?? 0);

  const loadData = useCallback(async () => {
    if (!profile) return;
    const date = new Date().toISOString().split('T')[0];

    // Run both queries in parallel for speed
    const [statsRes, vocabRes] = await Promise.all([
      supabase.from('daily_stats').select('*').eq('user_id', profile.id).eq('date', date).single(),
      supabase.from('vocab_words').select('word').eq('user_id', profile.id),
    ]);

    const stats = statsRes.data as DailyStats | null;
    setTodayStats(stats);

    const ww = getWeekWords(ageGroup);
    let vocabSaved = 0;
    if (ww.length > 0) {
      const wordList = ww.map(w => w.word.toLowerCase());
      const savedSet = new Set((vocabRes.data || []).map((sw: { word: string }) => sw.word.toLowerCase()));
      vocabSaved = wordList.filter(w => savedSet.has(w)).length;
    }
    setWeekVocabSaved(vocabSaved);

    // Cache for instant re-visit
    if (cacheKey) pageCache.set(cacheKey, { stats, vocabSaved }, 90_000);
  }, [ageGroup, cacheKey, profile]);

  useEffect(() => { loadData(); }, [loadData]);

  const promptText = getDailyPrompt(selectedCategory, ageGroup);
  const difficulty = getPromptDifficulty();

  const startWriting = () => {
    router.push(
      `/dashboard/writings?prompt=${encodeURIComponent(promptText)}&category=${encodeURIComponent(selectedCategory)}`,
    );
  };

  // Profile comes from localStorage cache on revisits → renders instantly.
  // On first-ever visit it may be null for ~1 s while Supabase responds.
  if (!profile) return null;

  const title = getTitleForLevel(profile.level);
  const xp = getXPProgress(profile.xp);
  const words = todayStats?.words_written ?? 0;
  const wordGoal = 300;
  const weekGoalTotal = getWeekWords(ageGroup).length;
  const wordPct = Math.min((words / wordGoal) * 100, 100);
  const vocabPct = weekGoalTotal > 0 ? Math.min((weekVocabSaved / weekGoalTotal) * 100, 100) : 0;
  const streakTone = 'var(--t-warning)';
  const xpTone = 'var(--t-mod-rewards)';
  const wordsTone = 'var(--t-mod-write)';
  const difficultyTheme = difficulty === 'beginner'
    ? { background: 'color-mix(in srgb, var(--t-success) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--t-success) 22%, transparent)', color: 'var(--t-success)' }
    : difficulty === 'intermediate'
      ? { background: 'color-mix(in srgb, var(--t-warning) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--t-warning) 22%, transparent)', color: 'var(--t-warning)' }
      : { background: 'color-mix(in srgb, var(--t-danger) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--t-danger) 22%, transparent)', color: 'var(--t-danger)' };

  return (
    <div style={{ background: 'var(--t-bg)', minHeight: '100vh', padding: '2rem 2rem 4rem' }}>
      <div style={{ maxWidth: 1260, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* ── HERO ── */}
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--t-card)',
          border: '1px solid var(--t-brd-a)',
          borderRadius: 32,
          padding: '2.75rem 3rem',
        }}>
          {/* glow orbs */}
          <div style={{ position: 'absolute', top: -80, right: -80, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, var(--t-acc-b) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, color-mix(in srgb, var(--t-mod-write) 16%, transparent) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ color: 'var(--t-acc)', fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 14 }}>Overview</p>
              <h1 style={{ fontSize: 'clamp(2.2rem, 4.5vw, 4rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.95, color: 'var(--t-tx)', marginBottom: 14 }}>
                Welcome back,{' '}
                <span className="themed-shimmer">{profile.username}</span>
              </h1>
              <p style={{ color: 'var(--t-tx2)', fontSize: 15, lineHeight: 1.6 }}>
                {title} &nbsp;·&nbsp; Level {profile.level} &nbsp;·&nbsp; Keep your streak alive
              </p>
            </div>

            <Link
              href="/dashboard/writings?tab=journal"
              title="Open journal"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 42, height: 42,
                background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)',
                color: 'var(--t-acc)', borderRadius: 14,
                textDecoration: 'none', flexShrink: 0,
              }}
            >
              <BookMarked style={{ width: 18, height: 18 }} />
            </Link>
          </div>

          {/* XP bar */}
          {xp && (
            <div style={{ position: 'relative', marginTop: 32, maxWidth: 520 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--t-tx2)', fontSize: 13, fontWeight: 600 }}>Level {profile.level} → {profile.level + 1}</span>
                <span style={{ color: 'var(--t-acc)', fontSize: 13, fontWeight: 700 }}>{xp.current} / {xp.needed} XP &nbsp;·&nbsp; {Math.round(xp.percent)}%</span>
              </div>
              <div style={{ height: 10, background: 'var(--t-xp-track)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${xp.percent}%`,
                  background: 'var(--t-xp)', borderRadius: 99,
                  boxShadow: '0 0 18px var(--t-acc-b)',
                  transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                }} />
              </div>
            </div>
          )}
        </div>

        {/* ── STAT CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          {/* Streak */}
          <div style={{
            background: `linear-gradient(145deg, color-mix(in srgb, ${streakTone} 16%, transparent) 0%, color-mix(in srgb, ${streakTone} 7%, transparent) 100%)`,
            border: `1px solid color-mix(in srgb, ${streakTone} 24%, transparent)`,
            borderRadius: 28, padding: '1.75rem 2rem',
            boxShadow: `0 8px 40px color-mix(in srgb, ${streakTone} 10%, transparent)`,
          }}>
            <div style={{ width: 50, height: 50, borderRadius: 18, background: `color-mix(in srgb, ${streakTone} 14%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <Flame style={{ color: streakTone, width: 24, height: 24 }} />
            </div>
            <p style={{ color: streakTone, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6, opacity: 0.8 }}>Current streak</p>
            <p style={{ fontSize: 52, fontWeight: 900, letterSpacing: '-0.05em', color: streakTone, lineHeight: 1, marginBottom: 6 }}>{profile.streak ?? 0}</p>
            <p style={{ color: 'var(--t-tx3)', fontSize: 13 }}>days in a row</p>
          </div>

          {/* XP */}
          <div style={{
            background: `color-mix(in srgb, ${xpTone} 13%, transparent)`,
            border: `1px solid color-mix(in srgb, ${xpTone} 24%, transparent)`,
            borderRadius: 28, padding: '1.75rem 2rem',
            boxShadow: `0 8px 40px color-mix(in srgb, ${xpTone} 10%, transparent)`,
          }}>
            <div style={{ width: 50, height: 50, borderRadius: 18, background: `color-mix(in srgb, ${xpTone} 18%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <Star style={{ color: xpTone, width: 24, height: 24 }} />
            </div>
            <p style={{ color: xpTone, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6, opacity: 0.8 }}>Total XP</p>
            <p style={{ fontSize: 52, fontWeight: 900, letterSpacing: '-0.05em', color: xpTone, lineHeight: 1, marginBottom: 6 }}>{profile.xp ?? 0}</p>
            <p style={{ color: 'var(--t-tx3)', fontSize: 13 }}>experience points</p>
          </div>

          {/* Words */}
          <div style={{
            background: `linear-gradient(145deg, color-mix(in srgb, ${wordsTone} 14%, transparent) 0%, color-mix(in srgb, ${wordsTone} 6%, transparent) 100%)`,
            border: `1px solid color-mix(in srgb, ${wordsTone} 22%, transparent)`,
            borderRadius: 28, padding: '1.75rem 2rem',
            boxShadow: `0 8px 40px color-mix(in srgb, ${wordsTone} 8%, transparent)`,
          }}>
            <div style={{ width: 50, height: 50, borderRadius: 18, background: `color-mix(in srgb, ${wordsTone} 14%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <FileText style={{ color: wordsTone, width: 24, height: 24 }} />
            </div>
            <p style={{ color: wordsTone, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6, opacity: 0.8 }}>Words today</p>
            <p style={{ fontSize: 52, fontWeight: 900, letterSpacing: '-0.05em', color: wordsTone, lineHeight: 1, marginBottom: 6 }}>{words}</p>
            <p style={{ color: 'var(--t-tx3)', fontSize: 13 }}>of 300 word goal</p>
          </div>
        </div>

        {/* ── BOTTOM ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: '1.25rem' }}>

          {/* Prompt card */}
          <div style={{
            background: 'var(--t-card)',
            border: '1px solid var(--t-brd)',
            borderRadius: 28,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '1.5rem 2rem',
              background: 'linear-gradient(135deg, var(--t-acc-a) 0%, transparent 80%)',
              borderBottom: '1px solid var(--t-brd)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            }}>
              <div>
                <p style={{ color: 'var(--t-acc)', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>Prompt of the day</p>
                <h2 style={{ color: 'var(--t-tx)', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Start with something worth writing.</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCategories(true)}
                style={{
                  background: 'var(--t-acc-b)', color: 'var(--t-acc)',
                  border: '1px solid var(--t-brd-a)', borderRadius: 99,
                  padding: '0.45rem 1.1rem', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                Browse
              </button>
            </div>

            <div style={{ padding: '1.75rem 2rem' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                <span style={{ background: 'var(--t-acc-a)', color: 'var(--t-acc)', borderRadius: 99, padding: '4px 14px', fontSize: 12, fontWeight: 700 }}>
                  {selectedCategory}
                </span>
                <span style={{
                  background: difficultyTheme.background,
                  border: difficultyTheme.border,
                  color: difficultyTheme.color,
                  borderRadius: 99, padding: '4px 14px', fontSize: 12, fontWeight: 700, textTransform: 'capitalize',
                }}>
                  {difficulty}
                </span>
              </div>
              <p style={{ color: 'var(--t-tx2)', fontSize: 16, lineHeight: 1.75, marginBottom: 28 }}>
                {promptText}
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={startWriting} className="auth-primary-btn" style={{ flex: 1 }}>
                  Start writing
                </button>
                <button type="button" onClick={() => setShowCategories(true)} className="auth-secondary-btn-modern" style={{ flex: 1 }}>
                  Change category
                </button>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Daily goals */}
            <div style={{
              background: 'var(--t-card)',
              border: '1px solid var(--t-brd)',
              borderRadius: 28,
              padding: '1.75rem',
              flex: 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, background: 'var(--t-acc-a)', color: 'var(--t-acc)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Target style={{ width: 19, height: 19 }} />
                </div>
                <div>
                  <p style={{ color: 'var(--t-acc)', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 2 }}>Daily goals</p>
                  <h2 style={{ color: 'var(--t-tx)', fontSize: 17, fontWeight: 800 }}>Keep today balanced</h2>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: 'var(--t-tx2)', fontSize: 13 }}>Words written</span>
                    <span style={{ color: 'var(--t-tx)', fontSize: 13, fontWeight: 700 }}>{words}/{wordGoal}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--t-xp-track)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${wordPct}%`, background: `linear-gradient(90deg, ${wordsTone}, var(--t-info))`, borderRadius: 99 }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: 'var(--t-tx2)', fontSize: 13 }}>Weekly words</span>
                    <span style={{ color: 'var(--t-tx)', fontSize: 13, fontWeight: 700 }}>{weekVocabSaved}/{weekGoalTotal}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--t-xp-track)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${vocabPct}%`, background: 'var(--t-xp)', borderRadius: 99 }} />
                  </div>
                </div>

                <div style={{ background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 16, padding: '0.875rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <Sparkles style={{ color: 'var(--t-acc)', width: 14, height: 14 }} />
                    <span style={{ color: 'var(--t-tx)', fontSize: 13, fontWeight: 600 }}>Custom goal</span>
                  </div>
                  <p style={{ color: 'var(--t-tx2)', fontSize: 13, lineHeight: 1.5 }}>
                    {profile.custom_daily_goal || 'Set a custom goal in Settings.'}
                  </p>
                  {todayStats?.custom_goal_completed && (
                    <p style={{ color: 'var(--t-success)', fontSize: 12, fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CheckCircle2 style={{ width: 13, height: 13 }} /> Completed today
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Rewards link */}
            <Link
              href="/dashboard/rewards"
              style={{
                background: 'linear-gradient(135deg, color-mix(in srgb, var(--t-mod-rewards) 14%, transparent) 0%, var(--t-card) 100%)',
                border: '1px solid color-mix(in srgb, var(--t-mod-rewards) 24%, transparent)',
                borderRadius: 28,
                padding: '1.5rem 1.75rem',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                transition: 'opacity 0.15s',
              }}
            >
              <div style={{ width: 46, height: 46, borderRadius: 16, background: 'color-mix(in srgb, var(--t-mod-rewards) 16%, transparent)', color: 'var(--t-mod-rewards)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trophy style={{ width: 21, height: 21 }} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ color: 'var(--t-tx)', fontSize: 16, fontWeight: 700, marginBottom: 3 }}>Review rewards</h2>
                <p style={{ color: 'var(--t-tx2)', fontSize: 13 }}>Level milestones & streak bonuses</p>
              </div>
              <ArrowRight style={{ color: 'var(--t-mod-rewards)', width: 18, height: 18, flexShrink: 0 }} />
            </Link>
          </div>
        </div>
      </div>

      {/* Category modal */}
      {showCategories && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-overlay)', backdropFilter: 'blur(10px)', padding: 16 }}
          onClick={() => setShowCategories(false)}
        >
          <div
            style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 28, padding: '1.75rem', width: '100%', maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ color: 'var(--t-acc)', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Browse prompts</p>
            <h2 style={{ color: 'var(--t-tx)', fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 20 }}>Pick a category</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(category);
                    setShowCategories(false);
                  }}
                  style={{
                    background: selectedCategory === category ? 'var(--t-acc)' : 'var(--t-acc-a)',
                    color: selectedCategory === category ? 'var(--t-btn-color)' : 'var(--t-tx)',
                    border: '1px solid var(--t-brd-a)', borderRadius: 16,
                    padding: '0.9rem 1.25rem', textAlign: 'left',
                    fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
