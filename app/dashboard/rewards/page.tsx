'use client';

import { useAuth } from '@/app/context/AuthContext';
import { getXPProgress, getTitleForLevel, LEVEL_XP, TITLES, MAX_LEVEL } from '@/app/types/database';
import {
  Trophy, Zap, PenLine, BookOpen, Bot, Flame,
  Star, CheckCircle2, Lock, TrendingUp, Sparkles,
  Target, Award, Crown, Feather, GraduationCap,
  type LucideIcon,
} from 'lucide-react';

/* ─── XP Sources ───────────────────────────────────────────────── */
type XPSource = { icon: LucideIcon; title: string; desc: string; xp: string; color: string };

const XP_SOURCES: XPSource[] = [
  { icon: PenLine,      title: 'Submit Writing',   desc: 'Complete and submit a writing piece',         xp: '+25 XP',    color: '#fb923c' },
  { icon: Feather,      title: 'Daily Writing',    desc: 'First writing session of the day',            xp: '+10 XP',    color: '#a78bfa' },
  { icon: Bot,          title: 'AI Feedback',      desc: 'Get AI feedback on your submission',          xp: '+10 XP',    color: '#22d3ee' },
  { icon: Target,       title: 'Daily Goal Met',   desc: 'Reach your daily word or vocab goal',         xp: '+15 XP',    color: '#4ade80' },
  { icon: BookOpen,     title: 'Vocab in Writing', desc: 'Use a learned vocab word in your piece',      xp: '+3 XP ea.', color: '#60a5fa' },
  { icon: Zap,          title: 'Vocab Sentence',   desc: 'Practice a word with a new sentence',         xp: '+8 XP',     color: '#f472b6' },
  { icon: GraduationCap,title: 'Master a Word',    desc: 'Fully master a vocabulary word',              xp: '+20 XP',    color: '#fbbf24' },
  { icon: Star,         title: 'Vocab Test',       desc: 'Complete weekly test + bonus per correct',    xp: '+15+3/Q',   color: '#818cf8' },
];

/* ─── Streak milestones ─────────────────────────────────────────── */
const STREAK_MILESTONES = [
  { days: 3,   xp: 15,  label: '3 Days',    emoji: '🔥' },
  { days: 7,   xp: 40,  label: '1 Week',    emoji: '⚡' },
  { days: 14,  xp: 85,  label: '2 Weeks',   emoji: '🌟' },
  { days: 30,  xp: 200, label: '1 Month',   emoji: '💫' },
  { days: 60,  xp: 400, label: '2 Months',  emoji: '🏅' },
  { days: 100, xp: 800, label: 'Legendary', emoji: '👑' },
];

/* ─── Title colours (one per level milestone, low→high) ──────────── */
const TITLE_COLORS = [
  '#fb923c','#4ade80','#60a5fa','#f472b6','#a78bfa',
  '#22d3ee','#fbbf24','#f87171','#818cf8','#34d399',
  '#f472b6','#fb923c','#c084fc','#38bdf8','#facc15',
];

const LEVEL_MILESTONES = [...TITLES]
  .reverse()
  .map(([minLevel, title], i) => ({
    level: minLevel,
    title,
    xpNeeded: LEVEL_XP[minLevel - 1] ?? 0,
    color: TITLE_COLORS[i] ?? '#a78bfa',
  }));

/* ─── Component ─────────────────────────────────────────────────── */
export default function RewardsPage() {
  const { profile } = useAuth();

  if (!profile) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-bg)' }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--t-acc)', animation: 'pulse 1.5s infinite' }} />
    </div>
  );

  const xp          = getXPProgress(profile.xp);
  const title       = getTitleForLevel(profile.level);
  const isMaxLevel  = profile.level >= MAX_LEVEL;
  const nextStreak  = STREAK_MILESTONES.find(m => profile.streak < m.days);
  const daysToNext  = nextStreak ? nextStreak.days - profile.streak : 0;
  const nextTitle   = LEVEL_MILESTONES.find(m => profile.level < m.level);

  return (
    <div style={{ background: 'var(--t-bg)', minHeight: '100vh', padding: '2rem 2rem 5rem' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 18, flexShrink: 0,
            background: 'var(--t-acc-b)', border: '1px solid var(--t-brd-a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Trophy style={{ width: 24, height: 24, color: 'var(--t-acc)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--t-tx)', margin: 0 }}>
              Rewards &amp; XP
            </h1>
            <p style={{ color: 'var(--t-tx3)', fontSize: 14, margin: '3px 0 0' }}>
              Level up, unlock titles, and track your writing journey
            </p>
          </div>
        </div>

        {/* ══ LEVEL HERO CARD ══ */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: 'var(--t-card)', border: '1px solid var(--t-brd-a)',
          borderRadius: 28, padding: '2rem',
        }}>
          {/* Glow */}
          <div style={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, var(--t-acc-b) 0%, transparent 65%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2rem', alignItems: 'center' }}>
            {/* Level badge */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 100, height: 100, borderRadius: 24,
                background: 'var(--t-acc-b)', border: '2px solid var(--t-acc-c)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 32px var(--t-acc-a)',
              }}>
                <span style={{ fontSize: 44, fontWeight: 900, color: 'var(--t-acc)', lineHeight: 1 }}>{profile.level}</span>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--t-acc)', opacity: 0.7 }}>LEVEL</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-tx)', marginTop: 10 }}>{title}</p>
              <p style={{ fontSize: 11, color: 'var(--t-tx3)', marginTop: 2 }}>
                {isMaxLevel ? 'Max rank!' : 'Current rank'}
              </p>
            </div>

            {/* XP bar + stats */}
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 32, fontWeight: 900, color: 'var(--t-tx)', letterSpacing: '-0.03em' }}>
                    {profile.xp.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 15, color: 'var(--t-tx3)', marginLeft: 8 }}>total XP</span>
                </div>
                <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--t-acc)' }}>{Math.round(xp.percent)}%</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--t-tx3)', marginBottom: 12 }}>
                {isMaxLevel ? 'Maximum level — incredible!' : `${xp.current} / ${xp.needed} XP to Level ${profile.level + 1}`}
              </p>
              <div style={{ height: 12, background: 'var(--t-xp-track)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${xp.percent}%`, background: 'var(--t-xp)', borderRadius: 99, transition: 'width 0.7s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--t-tx3)' }}>
                <span>Level {profile.level}</span>
                <span>{isMaxLevel ? 'MAX' : `Level ${profile.level + 1}`}</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{
            position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem',
            borderTop: '1px solid var(--t-brd)',
          }}>
            {[
              { icon: Flame, label: 'Day Streak',  value: profile.streak,          color: 'var(--t-acc)' },
              { icon: Star,  label: 'Total XP',    value: profile.xp.toLocaleString(), color: 'var(--t-acc)' },
              { icon: TrendingUp, label: 'Best Streak', value: profile.longest_streak, color: '#4ade80' },
            ].map((s, i) => (
              <div key={s.label} style={{
                textAlign: 'center',
                borderLeft: i > 0 ? '1px solid var(--t-brd)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                  <s.icon style={{ width: 18, height: 18, color: s.color }} />
                  <span style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</span>
                </div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--t-tx3)' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ══ HOW TO EARN XP ══ */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Sparkles style={{ width: 18, height: 18, color: 'var(--t-acc)' }} />
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--t-tx)', margin: 0 }}>How to Earn XP</h2>
          </div>
          <p style={{ color: 'var(--t-tx3)', fontSize: 13, marginBottom: '1.25rem' }}>
            Every action in Draftly earns XP toward your next level.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {XP_SOURCES.map(src => {
              const Icon = src.icon;
              return (
                <div key={src.title} style={{
                  background: 'var(--t-card)',
                  border: '1px solid var(--t-brd)',
                  borderLeft: `3px solid ${src.color}`,
                  borderRadius: 16,
                  padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  {/* Icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: `${src.color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon style={{ width: 18, height: 18, color: src.color }} />
                  </div>
                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t-tx)', margin: 0 }}>{src.title}</p>
                      <span style={{
                        fontSize: 12, fontWeight: 800, flexShrink: 0,
                        background: 'var(--t-acc-a)', color: 'var(--t-acc)',
                        border: '1px solid var(--t-brd-a)',
                        borderRadius: 8, padding: '3px 10px',
                      }}>{src.xp}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--t-tx3)', margin: '3px 0 0' }}>{src.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Word count bonuses */}
          <div style={{
            marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem',
          }}>
            {[
              { label: '250+ Words', sub: '+5 bonus XP per submission', color: '#60a5fa', n: '250' },
              { label: '500+ Words', sub: '+10 bonus XP per submission', color: '#a78bfa', n: '500' },
            ].map(b => (
              <div key={b.n} style={{
                background: 'var(--t-card)', border: '1px solid var(--t-brd)',
                borderLeft: `3px solid ${b.color}`,
                borderRadius: 16, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: `${b.color}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <PenLine style={{ width: 18, height: 18, color: b.color }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t-tx)', margin: 0 }}>{b.label}</p>
                  <p style={{ fontSize: 12, color: 'var(--t-tx3)', margin: '3px 0 0' }}>{b.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ STREAK BONUSES ══ */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Flame style={{ width: 18, height: 18, color: '#fb923c' }} />
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--t-tx)', margin: 0 }}>Streak Bonuses</h2>
          </div>
          <p style={{ color: 'var(--t-tx3)', fontSize: 13, marginBottom: '1.25rem' }}>
            {nextStreak
              ? daysToNext === 0
                ? 'You just hit a milestone! Keep going for the next one.'
                : `${daysToNext} more day${daysToNext === 1 ? '' : 's'} until your next streak bonus (+${nextStreak.xp} XP)`
              : "You've hit all streak milestones — legendary!"}
          </p>

          <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 24, overflow: 'hidden' }}>
            {STREAK_MILESTONES.map((m, i) => {
              const reached = profile.streak >= m.days;
              const isNext  = nextStreak?.days === m.days;
              const pct     = Math.min((profile.streak / m.days) * 100, 100);

              return (
                <div key={m.days} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '16px 20px',
                  borderBottom: i < STREAK_MILESTONES.length - 1 ? '1px solid var(--t-brd)' : 'none',
                  borderLeft: reached ? '3px solid #4ade80' : isNext ? '3px solid var(--t-acc)' : '3px solid transparent',
                  background: isNext ? 'var(--t-acc-a)' : 'transparent',
                }}>
                  {/* Emoji */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                    background: reached ? 'rgba(74,222,128,0.1)' : isNext ? 'var(--t-acc-a)' : 'var(--t-card2)',
                    border: reached ? '1px solid rgba(74,222,128,0.2)' : isNext ? '1px solid var(--t-acc-c)' : '1px solid var(--t-brd)',
                    opacity: reached || isNext ? 1 : 0.45,
                  }}>
                    {m.emoji}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: reached || isNext ? 'var(--t-tx)' : 'var(--t-tx3)', margin: 0 }}>
                        {m.label}
                      </p>
                      <span style={{ fontSize: 12, color: 'var(--t-tx3)' }}>({m.days} days)</span>
                      {isNext && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                          background: 'var(--t-acc-a)', color: 'var(--t-acc)',
                          border: '1px solid var(--t-brd-a)', borderRadius: 99, padding: '2px 8px',
                        }}>Next</span>
                      )}
                    </div>
                    {reached && <p style={{ fontSize: 12, color: '#4ade80', margin: 0 }}>Bonus earned ✓</p>}
                    {!reached && !isNext && <p style={{ fontSize: 12, color: 'var(--t-tx3)', margin: 0 }}>{m.days - profile.streak} days to go</p>}
                    {isNext && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ height: 5, background: 'var(--t-xp-track)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--t-xp)', borderRadius: 99 }} />
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--t-tx3)', marginTop: 4 }}>{profile.streak} / {m.days} days</p>
                      </div>
                    )}
                  </div>

                  {/* XP + check */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: reached ? '#4ade80' : isNext ? 'var(--t-acc)' : 'var(--t-tx3)', opacity: reached || isNext ? 1 : 0.35 }}>
                      +{m.xp} XP
                    </span>
                    {reached
                      ? <CheckCircle2 style={{ width: 18, height: 18, color: '#4ade80' }} />
                      : <Lock style={{ width: 15, height: 15, color: 'var(--t-tx3)', opacity: isNext ? 0.5 : 0.25 }} />
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══ TITLE PROGRESSION ══ */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Crown style={{ width: 18, height: 18, color: 'var(--t-acc)' }} />
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--t-tx)', margin: 0 }}>Title Progression</h2>
          </div>
          <p style={{ color: 'var(--t-tx3)', fontSize: 13, marginBottom: '1rem' }}>
            {nextTitle
              ? `Next: "${nextTitle.title}" at Level ${nextTitle.level}`
              : "You've unlocked every title — you are a legend!"}
          </p>

          {/* Current title banner */}
          <div style={{
            background: 'var(--t-acc-b)', border: '1px solid var(--t-brd-a)',
            borderRadius: 18, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1rem',
          }}>
            <Award style={{ width: 26, height: 26, color: 'var(--t-acc)', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--t-acc)', margin: 0 }}>Your Current Title</p>
              <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--t-tx)', margin: '2px 0 0' }}>{title}</p>
            </div>
          </div>

          {/* All titles */}
          <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 24, overflow: 'hidden' }}>
            {/* Level 1 default */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 20px', borderBottom: '1px solid var(--t-brd)',
              borderLeft: '3px solid #a1a1aa',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: 'rgba(161,161,170,0.12)',
                border: '1px solid rgba(161,161,170,0.2)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--t-tx3)', lineHeight: 1 }}>1</span>
                <span style={{ fontSize: 7, fontWeight: 700, color: 'var(--t-tx3)', letterSpacing: '0.15em', opacity: 0.6 }}>LVL</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t-tx)', margin: 0 }}>Novice Writer</p>
                <p style={{ fontSize: 12, color: 'var(--t-tx3)', margin: '2px 0 0' }}>Starting title — your journey begins</p>
              </div>
              <CheckCircle2 style={{ width: 18, height: 18, color: '#4ade80', flexShrink: 0 }} />
            </div>

            {LEVEL_MILESTONES.map((m, i) => {
              const reached   = profile.level >= m.level;
              const isCurrent = title === m.title;
              const isNext    = nextTitle?.level === m.level;
              const isLast    = i === LEVEL_MILESTONES.length - 1;

              return (
                <div key={m.level} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px',
                  borderBottom: isLast ? 'none' : '1px solid var(--t-brd)',
                  borderLeft: isCurrent ? `3px solid var(--t-acc)` : reached ? `3px solid ${m.color}` : '3px solid transparent',
                  background: isCurrent ? 'var(--t-acc-a)' : 'transparent',
                  opacity: !reached && !isNext ? 0.45 : 1,
                }}>
                  {/* Level badge */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                    background: reached ? `${m.color}18` : 'var(--t-card2)',
                    border: `1px solid ${reached ? m.color + '35' : 'var(--t-brd)'}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: reached ? m.color : 'var(--t-tx3)', lineHeight: 1 }}>{m.level}</span>
                    <span style={{ fontSize: 7, fontWeight: 700, color: reached ? m.color : 'var(--t-tx3)', letterSpacing: '0.15em', opacity: 0.6 }}>LVL</span>
                  </div>

                  {/* Title info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: reached ? 'var(--t-tx)' : 'var(--t-tx3)', margin: 0 }}>
                        {m.title}
                      </p>
                      {isCurrent && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                          background: 'var(--t-acc-a)', color: 'var(--t-acc)',
                          border: '1px solid var(--t-brd-a)', borderRadius: 99, padding: '2px 8px',
                        }}>Current</span>
                      )}
                      {isNext && !isCurrent && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                          background: `${m.color}15`, color: m.color,
                          border: `1px solid ${m.color}30`, borderRadius: 99, padding: '2px 8px',
                        }}>Next</span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--t-tx3)', margin: 0 }}>
                      {reached ? 'Unlocked ✓' : `Requires ${m.xpNeeded.toLocaleString()} total XP`}
                    </p>
                  </div>

                  {/* Status */}
                  <div style={{ flexShrink: 0 }}>
                    {reached
                      ? <CheckCircle2 style={{ width: 18, height: 18, color: '#4ade80' }} />
                      : <Lock style={{ width: 15, height: 15, color: 'var(--t-tx3)', opacity: 0.4 }} />
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
