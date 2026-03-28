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
type ThemePreviewPalette = (typeof THEMES)[ThemeName]['preview'];

/* ─── Rich theme preview — full-size mock UI ─── */
function ThemePreview({ s, label }: { s: ThemePreviewPalette; label: string }) {
  return (
    <div style={{
      width: '100%', aspectRatio: '16/9', borderRadius: 18, overflow: 'hidden',
      background: s.bg,
      border: `1.5px solid ${s.accent}30`,
      boxShadow: `0 12px 40px ${s.accent}18, 0 2px 8px rgba(0,0,0,0.22)`,
      display: 'flex', position: 'relative',
    }}>
      {/* ── Sidebar ── */}
      <div style={{
        width: '22%', background: s.sidebar, flexShrink: 0,
        display: 'flex', flexDirection: 'column', padding: '10px 0 8px', gap: 6,
        borderRight: `1px solid ${s.accent}18`,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 8px', marginBottom: 4 }}>
          <div style={{ width: 14, height: 14, borderRadius: 5, background: s.accent, flexShrink: 0 }} />
          <div style={{ flex: 1, height: 4, borderRadius: 99, background: `${s.text}50` }} />
        </div>
        {/* User chip */}
        <div style={{ margin: '0 6px', borderRadius: 8, background: `${s.accent}14`, border: `1px solid ${s.accent}22`, padding: '5px 6px' }}>
          <div style={{ width: 14, height: 14, borderRadius: 5, background: `${s.accent}55`, margin: '0 auto 3px' }} />
          <div style={{ height: 2, borderRadius: 99, background: `${s.text}55`, margin: '0 4px 2px' }} />
          <div style={{ height: 3, borderRadius: 99, background: `${s.xpBar}bb`, overflow: 'hidden' }}>
            <div style={{ width: '55%', height: '100%', background: s.xpBar }} />
          </div>
        </div>
        {/* Nav items */}
        {[s.write, s.vocab, s.coach, s.rewards].map((c, i) => (
          <div key={i} style={{
            margin: '0 5px', borderRadius: 6, padding: '3px 5px',
            background: i === 0 ? `${s.accent}22` : 'transparent',
            border: i === 0 ? `1px solid ${s.accent}28` : '1px solid transparent',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 3, background: `${c}cc`, flexShrink: 0 }} />
            <div style={{ flex: 1, height: 2, borderRadius: 99, background: `${s.text}45` }} />
          </div>
        ))}
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <div style={{
          height: 20, background: s.topbar, borderBottom: `1px solid ${s.accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ width: 40, height: 3, borderRadius: 99, background: `${s.text}70` }} />
            <div style={{ width: 26, height: 2, borderRadius: 99, background: `${s.muted}90` }} />
          </div>
          <div style={{ width: 16, height: 7, borderRadius: 5, background: `${s.accent}40`, border: `1px solid ${s.accent}50` }} />
        </div>

        {/* Content area */}
        <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Hero card */}
          <div style={{
            borderRadius: 10, padding: '7px 9px',
            background: `linear-gradient(135deg, ${s.accent}1a, ${s.card}ee)`,
            border: `1px solid ${s.accent}28`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
              <div style={{ width: 16, height: 16, borderRadius: 6, background: `${s.accent}40` }} />
              <div style={{ flex: 1, height: 4, borderRadius: 99, background: `${s.text}75` }} />
              <div style={{ width: 20, height: 4, borderRadius: 99, background: `${s.accent}80` }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
              {[s.write, s.vocab, s.rewards].map((c, i) => (
                <div key={i} style={{ borderRadius: 7, padding: '4px 5px', background: `${c}18`, border: `1px solid ${c}30` }}>
                  <div style={{ height: 3, borderRadius: 99, background: `${c}aa`, marginBottom: 3 }} />
                  <div style={{ height: 5, borderRadius: 99, background: `${s.text}55` }} />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            <div style={{ borderRadius: 9, padding: 6, background: s.card, border: `1px solid ${s.accent}18` }}>
              <div style={{ height: 2, borderRadius: 99, background: `${s.coach}aa`, marginBottom: 3, width: '60%' }} />
              <div style={{ height: 2, borderRadius: 99, background: `${s.text}40`, marginBottom: 5, width: '80%' }} />
              <div style={{ height: 4, borderRadius: 99, background: `${s.text}12`, overflow: 'hidden' }}>
                <div style={{ width: '62%', height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${s.xpBar}, ${s.accent})` }} />
              </div>
            </div>
            <div style={{
              borderRadius: 9, padding: 6,
              background: `linear-gradient(135deg, ${s.rewards}22, ${s.card}cc)`,
              border: `1px solid ${s.rewards}30`,
              display: 'flex', flexDirection: 'column', gap: 3,
            }}>
              <div style={{ height: 2, borderRadius: 99, background: `${s.rewards}aa`, width: '50%' }} />
              <div style={{ height: 8, borderRadius: 4, background: `${s.rewards}18`, border: `1px solid ${s.rewards}25` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Theme label badge */}
      <div style={{
        position: 'absolute', bottom: 8, right: 8,
        padding: '3px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700,
        background: `${s.accent}30`, border: `1px solid ${s.accent}50`,
        color: s.accent, backdropFilter: 'blur(6px)',
        letterSpacing: '0.04em',
      }}>
        {label}
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
              { icon: Flame,     label: 'Day Streak',  value: profile.streak,               color: 'var(--t-warning)' },
              { icon: Trophy,    label: 'Best Streak', value: profile.longest_streak,        color: 'var(--t-success)' },
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
                background: 'color-mix(in srgb, var(--t-success) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--t-success) 26%, transparent)',
                color: 'var(--t-success)',
              }}>All free</span>
            }
          />

          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {(Object.keys(THEMES) as ThemeName[]).map(themeName => {
              const t        = THEMES[themeName];
              const s        = t.preview;
              const isActive = activeTheme === themeName;

              return (
                <button
                  key={themeName}
                  onClick={() => applyTheme(themeName)}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 0,
                    padding: 0, borderRadius: 22, textAlign: 'left',
                    cursor: 'pointer', transition: 'all 0.2s',
                    background: 'var(--t-card2)',
                    border: isActive ? `2px solid ${s.accent}70` : '2px solid var(--t-brd)',
                    boxShadow: isActive ? `0 0 0 4px ${s.accent}14, 0 8px 32px ${s.accent}20` : '0 2px 8px rgba(0,0,0,0.12)',
                    overflow: 'hidden',
                    transform: isActive ? 'scale(1.01)' : 'scale(1)',
                  }}
                >
                  {/* ── Big preview ── */}
                  <div style={{ padding: '10px 10px 0' }}>
                    <ThemePreview s={s} label={t.label} />
                  </div>

                  {/* ── Info row ── */}
                  <div style={{ padding: '12px 14px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Palette swatches */}
                    <div style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
                      {[s.accent, s.write, s.vocab, s.coach, s.rewards].map((c, i) => (
                        <div key={i} style={{
                          width: 14, height: 14, borderRadius: '50%', background: c,
                          marginLeft: i > 0 ? -4 : 0,
                          border: '1.5px solid var(--t-card2)',
                          boxShadow: `0 1px 4px ${c}50`,
                        }} />
                      ))}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--t-tx)', margin: 0, lineHeight: 1.2 }}>{t.label}</p>
                      <p style={{ fontSize: 10, color: 'var(--t-tx3)', margin: '2px 0 0', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</p>
                    </div>

                    {isActive ? (
                      <span style={{
                        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 11, fontWeight: 800, padding: '5px 12px', borderRadius: 10,
                        background: `${s.accent}22`, border: `1.5px solid ${s.accent}50`, color: s.accent,
                        letterSpacing: '0.02em',
                      }}>
                        <CheckCircle style={{ width: 11, height: 11 }} /> On
                      </span>
                    ) : (
                      <span style={{
                        flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 10,
                        background: 'var(--t-bg)', border: '1.5px solid var(--t-brd)', color: 'var(--t-tx3)',
                      }}>Apply</span>
                    )}
                  </div>
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
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-success)', display: 'flex', alignItems: 'center', gap: 5 }}>
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
                    My Writing Goal
                  </label>
                  <textarea
                    value={customGoal} onChange={e => setCustomGoal(e.target.value)}
                    placeholder="e.g. Improve my essay writing, write more creatively…"
                    rows={3}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'var(--t-bg)', border: '1px solid var(--t-brd)',
                      borderRadius: 12, padding: '10px 16px',
                      fontSize: 14, color: 'var(--t-tx)', outline: 'none',
                      resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
                    }}
                  />
                  <p style={{ fontSize: 11, color: 'var(--t-tx3)', marginTop: 6 }}>
                    This goal powers your Coach&apos;s "My Goal" mode — update it any time.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { icon: PenLine,  label: 'Words / Day',  value: `${profile.daily_word_goal}`,    color: 'var(--t-mod-write)' },
                  { icon: BookOpen, label: 'Vocab / Day',  value: `${profile.daily_vocab_goal}`,   color: 'var(--t-mod-vocab)' },
                  { icon: Target,   label: 'Writing Goal', value: profile.custom_daily_goal || '—', color: 'var(--t-acc)' },
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
                      <CheckCircle style={{ width: 11, height: 11, color: 'var(--t-success)' }} />
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
                            background: 'color-mix(in srgb, var(--t-mod-rewards) 14%, transparent)',
                            color: 'var(--t-mod-rewards)',
                            border: '1px solid color-mix(in srgb, var(--t-mod-rewards) 28%, transparent)',
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
                      { icon: Bot,      text: '2 AI writing sessions/month', color: 'var(--t-mod-write)' },
                      { icon: Crown,    text: 'Premium coach modes',          color: 'var(--t-mod-coach)' },
                      { icon: Zap,      text: 'Priority AI feedback',         color: 'var(--t-mod-rewards)' },
                      { icon: Sparkles, text: 'Advanced analytics',           color: 'var(--t-success)' },
                    ].map(f => (
                      <div key={f.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                          background: `color-mix(in srgb, ${f.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${f.color} 26%, transparent)`,
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
                background: 'color-mix(in srgb, var(--t-danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--t-danger) 24%, transparent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <LogOut style={{ width: 14, height: 14, color: 'var(--t-danger)' }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--t-tx)', margin: 0 }}>Sign Out</p>
            </div>
            <button onClick={handleLogout} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 12, cursor: 'pointer',
              background: 'color-mix(in srgb, var(--t-danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--t-danger) 24%, transparent)', color: 'var(--t-danger)',
            }}>
              <LogOut style={{ width: 13, height: 13 }} /> Sign out
            </button>
          </div>

          {/* Danger Zone */}
          <div style={{
            background: 'var(--t-card)', border: '1px solid color-mix(in srgb, var(--t-danger) 24%, transparent)',
            borderRadius: 20, padding: '20px 24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'color-mix(in srgb, var(--t-danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--t-danger) 20%, transparent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Trash2 style={{ width: 14, height: 14, color: 'var(--t-danger)' }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--t-danger)', margin: 0 }}>Danger Zone</p>
            </div>

            {deleteStep === 0 && (
              <button onClick={() => setDeleteStep(1)} style={{
                fontSize: 12, fontWeight: 600, color: 'var(--t-danger)', opacity: 0.7,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}>
                Delete my account…
              </button>
            )}
            {deleteStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-danger)', margin: 0 }}>This erases everything permanently.</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setDeleteStep(0)} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--t-brd)', color: 'var(--t-tx3)', background: 'transparent' }}>
                    Cancel
                  </button>
                  <button onClick={() => setDeleteStep(2)} style={{ fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 10, cursor: 'pointer', background: 'color-mix(in srgb, var(--t-danger) 12%, transparent)', color: 'var(--t-danger)', border: '1px solid color-mix(in srgb, var(--t-danger) 24%, transparent)' }}>
                    Continue
                  </button>
                </div>
              </div>
            )}
            {deleteStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 12, color: 'var(--t-danger)', margin: 0 }}>
                  Type <code style={{ background: 'rgba(239,68,68,0.1)', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>DELETE</code> to confirm:
                </p>
                <input
                  type="text" value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
                  placeholder="DELETE"
                  style={{
                    background: 'color-mix(in srgb, var(--t-danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--t-danger) 20%, transparent)',
                    borderRadius: 10, padding: '8px 12px',
                    fontSize: 12, fontFamily: 'monospace', color: 'var(--t-danger)', outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setDeleteStep(0); setDeleteInput(''); }} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--t-brd)', color: 'var(--t-tx3)', background: 'transparent' }}>
                    Cancel
                  </button>
                  <button onClick={handleDelete} disabled={deleteInput !== 'DELETE' || deleting} style={{
                    fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 10, cursor: 'pointer',
                    background: 'var(--t-danger)', color: '#fff', border: 'none', opacity: (deleteInput !== 'DELETE' || deleting) ? 0.3 : 1,
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
