'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useTheme, THEMES, ThemeName } from '@/app/context/ThemeContext';
import { supabase } from '@/app/lib/supabase';
import {
  Settings, Palette, Target, LogOut, Trash2, CheckCircle,
  Sparkles, Crown, Star, Shield, Flame, Trophy,
  PenLine, BookOpen, Zap, Bot, ArrowRight,
} from 'lucide-react';

/* ─── Theme swatch data ─── */
const THEME_SWATCHES: Record<ThemeName, {
  bg: string; card: string; accent: string; text: string;
  muted: string; xpBar: string; sbBg: string;
}> = {
  default:  { bg: '#09090b', card: '#121009', accent: '#f5c842', text: '#f4f4f5', muted: '#52525b', xpBar: '#f5c842',  sbBg: '#0b0904' },
  lavender: { bg: '#faf5ff', card: '#f3effe', accent: '#7c3aed', text: '#2e1065', muted: '#8b5cf6', xpBar: '#a78bfa',  sbBg: '#1a0533' },
  sunrise:  { bg: '#fff7ed', card: '#fff1e0', accent: '#ea580c', text: '#431407', muted: '#c2410c', xpBar: '#fb923c',  sbBg: '#2c0d03' },
  bubbles:  { bg: '#f0f9ff', card: '#e7f5fe', accent: '#0284c7', text: '#082f49', muted: '#0284c7', xpBar: '#38bdf8',  sbBg: '#061c2c' },
  golden:   { bg: '#fffbeb', card: '#fef6d8', accent: '#d97706', text: '#451a03', muted: '#b45309', xpBar: '#fbbf24',  sbBg: '#1c1002' },
};

/* ─── Mini theme preview ─── */
function ThemePreview({ s }: { s: typeof THEME_SWATCHES[ThemeName] }) {
  return (
    <div style={{
      width: 96, height: 64, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
      background: s.bg, border: `1.5px solid ${s.accent}30`,
      display: 'flex', gap: 3, padding: 4,
    }}>
      {/* Sidebar strip */}
      <div style={{
        width: 16, borderRadius: 4, background: s.sbBg,
        display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5px 0', gap: 3,
      }}>
        <div style={{ width: 7, height: 7, borderRadius: 2, background: s.accent }} />
        <div style={{ width: 7, height: 2, borderRadius: 1, background: `${s.accent}50` }} />
        <div style={{ width: 7, height: 2, borderRadius: 1, background: `${s.accent}35` }} />
        <div style={{ width: 7, height: 2, borderRadius: 1, background: `${s.accent}25` }} />
      </div>
      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, padding: '2px 0' }}>
        <div style={{ height: 3, width: '60%', borderRadius: 2, background: `${s.text}40` }} />
        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          <div style={{ flex: 1, borderRadius: 3, background: s.card, border: `0.5px solid ${s.accent}20` }}>
            <div style={{ width: '55%', height: 2, borderRadius: 1, background: s.accent, margin: '3px auto 0' }} />
          </div>
          <div style={{ flex: 1, borderRadius: 3, background: s.card, border: `0.5px solid ${s.accent}20` }}>
            <div style={{ width: '35%', height: 2, borderRadius: 1, background: `${s.accent}70`, margin: '3px auto 0' }} />
          </div>
        </div>
        {/* XP bar */}
        <div style={{ height: 3, borderRadius: 2, background: `${s.muted}25`, overflow: 'hidden' }}>
          <div style={{ width: '62%', height: '100%', borderRadius: 2, background: s.xpBar }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Card wrapper helper ─── */
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--t-card)',
      border: '1px solid var(--t-brd)',
      borderRadius: 24,
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, right }: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 24px',
      borderBottom: '1px solid var(--t-brd)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 12, flexShrink: 0,
          background: 'var(--t-acc-b)', border: '1px solid var(--t-brd-a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--t-tx)', margin: 0 }}>{title}</p>
          {subtitle && <p style={{ fontSize: 12, color: 'var(--t-tx3)', margin: '1px 0 0' }}>{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

/* ─── Main component ─── */
export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const { theme: activeTheme, setTheme } = useTheme();
  const router = useRouter();

  const [editingGoals, setEditingGoals] = useState(false);
  const [wordGoal,    setWordGoal]    = useState(profile?.daily_word_goal   ?? 300);
  const [vocabGoal,   setVocabGoal]   = useState(profile?.daily_vocab_goal  ?? 3);
  const [customGoal,  setCustomGoal]  = useState(profile?.custom_daily_goal ?? '');
  const [goalsSaved,  setGoalsSaved]  = useState(false);
  const [deleteStep,  setDeleteStep]  = useState(0);
  const [deleteInput, setDeleteInput] = useState('');

  const applyTheme = async (themeName: ThemeName) => {
    if (!profile) return;
    const alreadyUnlocked = (profile.unlocked_themes || []).includes(themeName);
    const newUnlocked = alreadyUnlocked
      ? profile.unlocked_themes
      : [...(profile.unlocked_themes || []), themeName];
    await supabase.from('profiles').update({ active_theme: themeName, unlocked_themes: newUnlocked }).eq('id', profile.id);
    setTheme(themeName);
    await refreshProfile();
  };

  const saveGoals = async () => {
    if (!profile) return;
    await supabase.from('profiles').update({
      daily_word_goal: wordGoal, daily_vocab_goal: vocabGoal, custom_daily_goal: customGoal,
    }).eq('id', profile.id);
    await refreshProfile();
    setEditingGoals(false);
    setGoalsSaved(true);
    setTimeout(() => setGoalsSaved(false), 2500);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (deleteStep < 2) { setDeleteStep(s => s + 1); return; }
    if (deleteInput === 'DELETE' && profile) {
      setDeleting(true);
      await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id }),
      });
      await supabase.auth.signOut();
      router.push('/login');
    }
  };

  if (!profile) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-bg)' }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--t-acc)', animation: 'pulse 1.5s infinite' }} />
    </div>
  );

  return (
    <div style={{ background: 'var(--t-bg)', minHeight: '100vh', padding: '2rem 2rem 5rem' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 18, flexShrink: 0,
            background: 'var(--t-acc-b)', border: '1px solid var(--t-brd-a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Settings style={{ width: 24, height: 24, color: 'var(--t-acc)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--t-tx)', margin: 0 }}>Settings</h1>
            <p style={{ color: 'var(--t-tx3)', fontSize: 14, margin: '3px 0 0' }}>Account, goals, themes &amp; preferences</p>
          </div>
        </div>

        {/* ══ ACCOUNT HERO ══ */}
        <Card>
          {/* Top: avatar + name */}
          <div style={{
            padding: '28px 28px 24px',
            background: 'linear-gradient(135deg, var(--t-acc-a) 0%, transparent 60%)',
            borderBottom: '1px solid var(--t-brd)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              {/* Avatar */}
              <div style={{
                width: 68, height: 68, borderRadius: 20, flexShrink: 0,
                background: 'linear-gradient(135deg, var(--t-acc-b), var(--t-acc))',
                border: '2px solid var(--t-acc-c)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 900, color: 'var(--t-btn-color)',
              }}>
                {profile.username[0]?.toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--t-tx)', margin: 0 }}>{profile.username}</p>
                <p style={{ fontSize: 13, color: 'var(--t-tx3)', margin: '3px 0 6px' }}>{profile.email}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                    background: 'var(--t-acc-a)', color: 'var(--t-acc)', border: '1px solid var(--t-brd-a)',
                  }}>Level {profile.level}</span>
                  <span style={{ fontSize: 12, color: 'var(--t-tx2)', fontWeight: 600 }}>{profile.title}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {[
              { icon: Star,      label: 'Total XP',    value: profile.xp.toLocaleString(), color: 'var(--t-acc)' },
              { icon: Flame,     label: 'Day Streak',  value: profile.streak,               color: '#fb923c' },
              { icon: Trophy,    label: 'Best Streak', value: profile.longest_streak,        color: '#4ade80' },
            ].map((s, i) => (
              <div key={s.label} style={{
                padding: '20px 24px', textAlign: 'center',
                borderLeft: i > 0 ? '1px solid var(--t-brd)' : 'none',
                borderTop: '1px solid var(--t-brd)',
                borderBottom: '1px solid var(--t-brd)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                  <s.icon style={{ width: 16, height: 16, color: s.color }} />
                  <span style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</span>
                </div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--t-tx3)', margin: 0 }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {/* Detail rows */}
          <div style={{ padding: '16px 28px', display: 'flex', flexWrap: 'wrap', gap: 20 }}>
            {profile.student_id && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield style={{ width: 14, height: 14, color: 'var(--t-acc)' }} />
                <span style={{ fontSize: 13, color: 'var(--t-tx3)' }}>Student ID:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-tx)' }}>{profile.student_id}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Crown style={{ width: 14, height: 14, color: 'var(--t-acc)' }} />
              <span style={{ fontSize: 13, color: 'var(--t-tx3)' }}>Plan:</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-tx)', textTransform: 'capitalize' }}>{profile.plan}</span>
            </div>
          </div>
        </Card>

        {/* ══ THEMES ══ */}
        <Card>
          <SectionHeader
            icon={<Palette style={{ width: 16, height: 16, color: 'var(--t-acc)' }} />}
            title="Appearance"
            subtitle="Choose your writing environment"
            right={
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
                padding: '4px 12px', borderRadius: 99,
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e',
              }}>All free</span>
            }
          />

          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(Object.keys(THEMES) as ThemeName[]).map(themeName => {
              const t        = THEMES[themeName];
              const s        = THEME_SWATCHES[themeName];
              const isActive = activeTheme === themeName;

              return (
                <button
                  key={themeName}
                  onClick={() => applyTheme(themeName)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 16,
                    padding: '12px 14px', borderRadius: 18, textAlign: 'left',
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: isActive ? `${s.accent}0e` : 'var(--t-card2)',
                    border: isActive ? `2px solid ${s.accent}55` : '2px solid var(--t-brd)',
                    boxShadow: isActive ? `0 0 0 3px ${s.accent}10` : 'none',
                  }}
                >
                  <ThemePreview s={s} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Color dots */}
                    <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.accent }} />
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.bg, border: `1.5px solid ${s.accent}40` }} />
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.card, border: `1.5px solid ${s.accent}30` }} />
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t-tx)', margin: 0 }}>{t.label}</p>
                    <p style={{ fontSize: 12, color: 'var(--t-tx3)', margin: '2px 0 0' }}>{t.description}</p>
                  </div>

                  {isActive ? (
                    <span style={{
                      flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 12,
                      background: `${s.accent}18`, border: `1px solid ${s.accent}35`, color: s.accent,
                    }}>
                      <CheckCircle style={{ width: 13, height: 13 }} /> Active
                    </span>
                  ) : (
                    <span style={{
                      flexShrink: 0, fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 12,
                      background: 'var(--t-bg)', border: '1px solid var(--t-brd)', color: 'var(--t-tx3)',
                    }}>Apply</span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* ══ DAILY GOALS ══ */}
        <Card>
          <SectionHeader
            icon={<Target style={{ width: 16, height: 16, color: 'var(--t-acc)' }} />}
            title="Daily Goals"
            right={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {goalsSaved && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CheckCircle style={{ width: 13, height: 13 }} /> Saved!
                  </span>
                )}
                {!editingGoals ? (
                  <button
                    onClick={() => { setEditingGoals(true); setWordGoal(profile.daily_word_goal); setVocabGoal(profile.daily_vocab_goal); setCustomGoal(profile.custom_daily_goal); }}
                    style={{
                      fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 10, cursor: 'pointer',
                      background: 'var(--t-bg)', border: '1px solid var(--t-brd)', color: 'var(--t-tx2)',
                    }}>
                    Edit Goals
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditingGoals(false)}
                      style={{ fontSize: 12, padding: '6px 14px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--t-brd)', color: 'var(--t-tx3)', background: 'transparent' }}>
                      Cancel
                    </button>
                    <button onClick={saveGoals}
                      style={{ fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 10, cursor: 'pointer', background: 'var(--t-btn)', color: 'var(--t-btn-color)', border: 'none' }}>
                      Save
                    </button>
                  </div>
                )}
              </div>
            }
          />

          <div style={{ padding: '20px 24px' }}>
            {editingGoals ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Daily Word Count Goal', value: wordGoal, onChange: (v: number) => setWordGoal(v), min: 50, max: 5000 },
                  { label: 'Daily Vocab Goal',       value: vocabGoal, onChange: (v: number) => setVocabGoal(v), min: 1, max: 10 },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--t-tx3)', display: 'block', marginBottom: 8 }}>
                      {f.label}
                    </label>
                    <input
                      type="number" value={f.value} min={f.min} max={f.max}
                      onChange={e => f.onChange(Number(e.target.value))}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'var(--t-bg)', border: '1px solid var(--t-brd)',
                        borderRadius: 12, padding: '10px 16px',
                        fontSize: 15, fontWeight: 600, color: 'var(--t-tx)', outline: 'none',
                      }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--t-tx3)', display: 'block', marginBottom: 8 }}>
                    Custom Goal
                  </label>
                  <input
                    type="text" value={customGoal} onChange={e => setCustomGoal(e.target.value)}
                    placeholder="e.g. Write for 10 minutes every day"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'var(--t-bg)', border: '1px solid var(--t-brd)',
                      borderRadius: 12, padding: '10px 16px',
                      fontSize: 14, color: 'var(--t-tx)', outline: 'none',
                    }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { icon: PenLine,  label: 'Words / Day',  value: `${profile.daily_word_goal}`,    color: '#60a5fa' },
                  { icon: BookOpen, label: 'Vocab / Day',  value: `${profile.daily_vocab_goal}`,   color: '#a78bfa' },
                  { icon: Target,   label: 'Custom Goal',  value: profile.custom_daily_goal || '—', color: 'var(--t-acc)' },
                ].map(g => (
                  <div key={g.label} style={{
                    background: 'var(--t-card2)', border: '1px solid var(--t-brd)',
                    borderTop: `2px solid ${g.color}`,
                    borderRadius: 16, padding: '16px',
                  }}>
                    <g.icon style={{ width: 16, height: 16, color: g.color, marginBottom: 10 }} />
                    <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--t-tx)', margin: 0, letterSpacing: '-0.02em' }}>{g.value}</p>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--t-tx3)', margin: '4px 0 0' }}>
                      {g.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* ══ PLAN ══ */}
        <Card>
          <SectionHeader
            icon={<Crown style={{ width: 16, height: 16, color: 'var(--t-acc)' }} />}
            title="Your Plan"
          />

          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* ── Free: compact "current" row ── */}
            <div style={{
              borderRadius: 16, padding: '14px 18px',
              background: profile.plan === 'free' ? 'var(--t-acc-a)' : 'var(--t-card2)',
              border: profile.plan === 'free' ? '1.5px solid var(--t-brd-a)' : '1.5px solid var(--t-brd)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              {/* Icon */}
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: 'var(--t-card)', border: '1px solid var(--t-brd)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BookOpen style={{ width: 18, height: 18, color: 'var(--t-tx3)' }} />
              </div>
              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--t-tx)' }}>Free</span>
                  {profile.plan === 'free' && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
                      padding: '2px 9px', borderRadius: 99,
                      background: 'var(--t-acc-b)', color: 'var(--t-acc)', border: '1px solid var(--t-acc-c)',
                    }}>Active</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                  {['All 5 writing styles', 'Basic AI feedback', 'Daily vocab & coach'].map(feat => (
                    <span key={feat} style={{ fontSize: 12, color: 'var(--t-tx3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CheckCircle style={{ width: 11, height: 11, color: '#22c55e' }} />
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
              <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--t-tx3)', flexShrink: 0 }}>$0</span>
            </div>

            {/* ── Plus: featured card with gradient border ── */}
            {/* Outer wrapper = the "gradient border" (2px of the btn gradient shows as border) */}
            <div style={{
              borderRadius: 20,
              background: 'var(--t-btn)',
              padding: 2,
              boxShadow: '0 4px 28px var(--t-acc-a)',
            }}>
              <div style={{
                borderRadius: 18,
                background: 'var(--t-card)',
                padding: '22px 22px 20px',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Subtle inner glow */}
                <div style={{
                  position: 'absolute', top: -50, right: -50,
                  width: 200, height: 200, borderRadius: '50%',
                  background: 'radial-gradient(circle, var(--t-acc-b) 0%, transparent 65%)',
                  pointerEvents: 'none',
                }} />

                <div style={{ position: 'relative' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
                        <Sparkles style={{ width: 18, height: 18, color: 'var(--t-acc)' }} />
                        <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--t-tx)' }}>Plus</span>
                        {profile.plan === 'plus' && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
                            padding: '2px 9px', borderRadius: 99,
                            background: 'var(--t-acc-b)', color: 'var(--t-acc)', border: '1px solid var(--t-acc-c)',
                          }}>Active</span>
                        )}
                        {profile.plan === 'free' && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
                            padding: '2px 9px', borderRadius: 99,
                            background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)',
                          }}>⭐ Upgrade</span>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--t-tx3)', margin: 0 }}>
                        More AI power for serious writers
                      </p>
                    </div>
                  </div>

                  {/* Features in 2-column grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                    {[
                      { icon: Bot,      text: '2 AI writing sessions/month', color: '#22d3ee' },
                      { icon: Crown,    text: 'Premium coach modes',          color: '#a78bfa' },
                      { icon: Zap,      text: 'Priority AI feedback',         color: '#fbbf24' },
                      { icon: Sparkles, text: 'Advanced analytics',           color: '#4ade80' },
                    ].map(f => (
                      <div key={f.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                          background: `${f.color}18`, border: `1px solid ${f.color}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <f.icon style={{ width: 13, height: 13, color: f.color }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--t-tx2)', lineHeight: 1.45, paddingTop: 7 }}>{f.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  {profile.plan === 'free' && (
                    <button style={{
                      width: '100%', padding: '13px', borderRadius: 14, border: 'none',
                      background: 'var(--t-btn)', color: 'var(--t-btn-color)',
                      fontSize: 14, fontWeight: 800, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                      <Sparkles style={{ width: 16, height: 16 }} />
                      Upgrade to Plus
                      <ArrowRight style={{ width: 15, height: 15 }} />
                    </button>
                  )}
                  {profile.plan === 'plus' && (
                    <button style={{
                      width: '100%', padding: '11px', borderRadius: 14,
                      background: 'transparent', border: '1.5px solid var(--t-acc-c)',
                      color: 'var(--t-acc)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>
                      Manage Subscription
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>
        </Card>

        {/* ══ SIGN OUT + DANGER ══ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Sign Out */}
          <div style={{
            background: 'var(--t-card)', border: '1px solid var(--t-brd)',
            borderRadius: 20, padding: '20px 24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <LogOut style={{ width: 14, height: 14, color: '#f87171' }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--t-tx)', margin: 0 }}>Sign Out</p>
            </div>
            <button onClick={handleLogout} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 12, cursor: 'pointer',
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', color: '#f87171',
            }}>
              <LogOut style={{ width: 13, height: 13 }} /> Sign out
            </button>
          </div>

          {/* Danger Zone */}
          <div style={{
            background: 'var(--t-card)', border: '1px solid rgba(239,68,68,0.18)',
            borderRadius: 20, padding: '20px 24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Trash2 style={{ width: 14, height: 14, color: '#f87171' }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#f87171', margin: 0 }}>Danger Zone</p>
            </div>

            {deleteStep === 0 && (
              <button onClick={() => setDeleteStep(1)} style={{
                fontSize: 12, fontWeight: 600, color: '#f87171', opacity: 0.7,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}>
                Delete my account…
              </button>
            )}
            {deleteStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#f87171', margin: 0 }}>This erases everything permanently.</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setDeleteStep(0)} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--t-brd)', color: 'var(--t-tx3)', background: 'transparent' }}>
                    Cancel
                  </button>
                  <button onClick={() => setDeleteStep(2)} style={{ fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 10, cursor: 'pointer', background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                    Continue
                  </button>
                </div>
              </div>
            )}
            {deleteStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>
                  Type <code style={{ background: 'rgba(239,68,68,0.1)', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>DELETE</code> to confirm:
                </p>
                <input
                  type="text" value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
                  placeholder="DELETE"
                  style={{
                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 10, padding: '8px 12px',
                    fontSize: 12, fontFamily: 'monospace', color: '#f87171', outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setDeleteStep(0); setDeleteInput(''); }} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--t-brd)', color: 'var(--t-tx3)', background: 'transparent' }}>
                    Cancel
                  </button>
                  <button onClick={handleDelete} disabled={deleteInput !== 'DELETE' || deleting} style={{
                    fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 10, cursor: 'pointer',
                    background: '#dc2626', color: '#fff', border: 'none', opacity: (deleteInput !== 'DELETE' || deleting) ? 0.3 : 1,
                  }}>
                    {deleting ? 'Deleting…' : 'Delete Account'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
