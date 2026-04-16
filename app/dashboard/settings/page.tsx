'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useTheme, THEMES, ThemeName } from '@/app/context/ThemeContext';
import { PromiseTimeoutError, withPromiseTimeout } from '@/app/lib/promise-with-timeout';
import { hardSignOut, supabase } from '@/app/lib/supabase';
import { clearAgeGroupOverride, isMissingAgeGroupColumnError, writeAgeGroupOverride } from '@/app/lib/age-group-storage';
import { clearAccountTypeOverride } from '@/app/lib/account-type';
import { clearWritingExperienceOverride } from '@/app/lib/writing-experience';
import { clearProfileOverrides } from '@/app/lib/profile-overrides';
import { generateStudentCode } from '@/app/lib/student-code';
import { isDevAccount } from '@/app/lib/dev-account';
import { getLevelFromXP, getTitleForLevel } from '@/app/types/database';
import {
  Settings, Palette, Target, LogOut, Trash2, CheckCircle, Copy,
  Star, Shield, Flame, Trophy,
  PenLine, BookOpen, Zap, Users,
} from 'lucide-react';

const AGE_GROUPS = [
  { value: '5-7',   label: '5 – 7',   sub: 'Early Explorer',      emoji: '🌱' },
  { value: '8-10',  label: '8 – 10',  sub: 'Growing Writer',      emoji: '✏️' },
  { value: '11-13', label: '11 – 13', sub: 'Finding Your Voice',  emoji: '📚' },
  { value: '14-17', label: '14 – 17', sub: 'Sharpening the Craft',emoji: '🎯' },
  { value: '18-21', label: '18 – 21', sub: 'Rising Writer',       emoji: '🚀' },
  { value: '22+',   label: '22+',    sub: 'Experienced Writer',   emoji: '✨' },
];

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
  const { user, profile, refreshProfile } = useAuth();
  const { theme: activeTheme, setTheme } = useTheme();
  const router = useRouter();

  const [editingGoals, setEditingGoals] = useState(false);
  const [wordGoal,    setWordGoal]    = useState(profile?.daily_word_goal   ?? 300);
  const [vocabGoal,   setVocabGoal]   = useState(profile?.daily_vocab_goal  ?? 3);
  const [customGoal,  setCustomGoal]  = useState(profile?.custom_daily_goal ?? '');
  const [goalsSaved,  setGoalsSaved]  = useState(false);
  const [editingAge,  setEditingAge]  = useState(false);
  const [selectedAge, setSelectedAge] = useState(profile?.age_group ?? '');
  const [displayAgeGroup, setDisplayAgeGroup] = useState(profile?.age_group ?? '');
  const [ageSaved,    setAgeSaved]    = useState(false);
  const [savingAge,   setSavingAge]   = useState(false);
  const [ageError,    setAgeError]    = useState('');
  const [deleteStep,  setDeleteStep]  = useState(0);
  const [deleteInput, setDeleteInput] = useState('');
  const [studentCode, setStudentCode] = useState(profile?.student_id ?? '');
  const [studentCodeSaving, setStudentCodeSaving] = useState(false);
  const [studentCodeCopied, setStudentCodeCopied] = useState(false);
  const [studentCodeError, setStudentCodeError] = useState('');
  const studentCodeInitRef = useRef<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    if (!editingGoals) {
      setWordGoal(profile.daily_word_goal ?? 300);
      setVocabGoal(profile.daily_vocab_goal ?? 3);
      setCustomGoal(profile.custom_daily_goal ?? '');
    }
    if (!editingAge) {
      const nextAge = profile.age_group ?? '';
      if (nextAge) {
        setSelectedAge(nextAge);
        setDisplayAgeGroup(nextAge);
      }
    }
    setStudentCode(profile.student_id ?? '');
    setStudentCodeError('');
    setStudentCodeCopied(false);
  }, [profile, editingAge, editingGoals]);

  useEffect(() => {
    if (!profile || profile.account_type !== 'student') return;

    if (profile.student_id) {
      studentCodeInitRef.current = profile.id;
      setStudentCode(profile.student_id);
      setStudentCodeError('');
      return;
    }

    if (studentCodeInitRef.current === profile.id) return;
    studentCodeInitRef.current = profile.id;

    const nextCode = generateStudentCode();
    setStudentCode(nextCode);
    setStudentCodeSaving(true);
    setStudentCodeError('');

    void (async () => {
      try {
        const { error } = await supabase.from('profiles').update({ student_id: nextCode }).eq('id', profile.id);
        if (error) {
          setStudentCodeError(error.message || 'Could not generate your student code right now.');
          return;
        }
        setStudentCode(nextCode);
        void refreshProfile().catch(() => {});
      } finally {
        setStudentCodeSaving(false);
      }
    })();
  }, [profile, refreshProfile]);

  const copyStudentCode = async () => {
    if (!studentCode) return;
    try {
      await navigator.clipboard.writeText(studentCode);
      setStudentCodeCopied(true);
      window.setTimeout(() => setStudentCodeCopied(false), 2000);
    } catch {
      setStudentCodeError('Could not copy the student code.');
    }
  };

  const applyTheme = async (themeName: ThemeName) => {
    if (!profile) return;
    const alreadyUnlocked = (profile.unlocked_themes || []).includes(themeName);
    const newUnlocked = alreadyUnlocked
      ? profile.unlocked_themes
      : [...(profile.unlocked_themes || []), themeName];
    setTheme(themeName);
    void (async () => {
      try {
        await supabase.from('profiles')
          .update({ active_theme: themeName, unlocked_themes: newUnlocked })
          .eq('id', profile.id);
      } catch {
        // keep the local theme change even if cloud sync lags
      }
      void refreshProfile().catch(() => {});
    })();
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

  const saveAgeGroup = async () => {
    if (!selectedAge || savingAge) return;
    if (!profile) {
      setAgeError('Your session is not ready right now. Refresh the page and try again.');
      return;
    }

    setSavingAge(true);
    setAgeError('');

    try {
      const { data, error } = await withPromiseTimeout(
        supabase
          .from('profiles')
          .update({ age_group: selectedAge })
          .eq('id', profile.id)
          .select('age_group')
          .single(),
        20000,
        'Saving your age group took too long.',
      );

      if (error) {
        if (isMissingAgeGroupColumnError(error.message)) {
          writeAgeGroupOverride(profile.id, selectedAge);
          setSelectedAge(selectedAge);
          setDisplayAgeGroup(selectedAge);
          void refreshProfile().catch(() => {});
          setEditingAge(false);
          setAgeSaved(true);
          setSavingAge(false);
          setTimeout(() => setAgeSaved(false), 2500);
          return;
        }
        setAgeError(error.message || 'Could not save your age group.');
        setSavingAge(false);
        return;
      }

      writeAgeGroupOverride(profile.id, data?.age_group ?? selectedAge);
      const savedAge = data?.age_group ?? selectedAge;
      setSelectedAge(savedAge);
      setDisplayAgeGroup(savedAge);
      await withPromiseTimeout(refreshProfile(), 5000, 'Refreshing your profile took too long.').catch(() => {});
      setEditingAge(false);
      setAgeSaved(true);
      setSavingAge(false);
      setTimeout(() => setAgeSaved(false), 2500);
    } catch (error) {
      if (error instanceof PromiseTimeoutError) {
        writeAgeGroupOverride(profile.id, selectedAge);
        setSelectedAge(selectedAge);
        setDisplayAgeGroup(selectedAge);
        void refreshProfile().catch(() => {});
        setEditingAge(false);
        setAgeSaved(true);
        setSavingAge(false);
        setTimeout(() => setAgeSaved(false), 2500);
        return;
      }
      setAgeError('Could not save your age group.');
      setSavingAge(false);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('draftora-profile-v1');
      if (profile) {
        clearAgeGroupOverride(profile.id);
        clearAccountTypeOverride(profile.id);
        clearWritingExperienceOverride(profile.id);
        clearProfileOverrides(profile.id);
      }
    } catch {
      // ignore cache cleanup issues
    }
    router.replace('/login');
    window.location.replace('/login');
    void hardSignOut();
  };

  const [deleting, setDeleting] = useState(false);
  const canUseDevPanel = isDevAccount(profile, user?.id);

  /* ─── Dev panel state (dev account only) ─── */
  const [devXP,          setDevXP]          = useState(0);
  const [devStreak,      setDevStreak]      = useState(0);
  const [devLongest,     setDevLongest]     = useState(0);
  const [devCoach,       setDevCoach]       = useState(0);
  const [devWritings,    setDevWritings]    = useState(0);
  const [devVocab,       setDevVocab]       = useState(0);
  const [devSaved,       setDevSaved]       = useState(false);
  const [devSaving,      setDevSaving]      = useState(false);
  const [devOpen,        setDevOpen]        = useState(false);

  // Sync dev fields when profile loads or changes
  useEffect(() => {
    if (!canUseDevPanel || !profile) {
      setDevOpen(false);
      return;
    }

    setDevXP(profile.xp);
    setDevStreak(profile.streak);
    setDevLongest(profile.longest_streak);
    setDevCoach(profile.coach_messages_used);
    setDevWritings(profile.writings_created);
    setDevVocab(profile.vocab_words_saved);
  }, [canUseDevPanel, profile]);

  const saveDevOverrides = async () => {
    if (!profile || devSaving || !canUseDevPanel) return;
    setDevSaving(true);
    const newLevel = getLevelFromXP(devXP);
    const newTitle = getTitleForLevel(newLevel);
    const { error } = await supabase.from('profiles').update({
      xp: devXP,
      level: newLevel,
      title: newTitle,
      streak: devStreak,
      longest_streak: devLongest,
      coach_messages_used: devCoach,
      writings_created: devWritings,
      vocab_words_saved: devVocab,
    }).eq('id', profile.id);
    if (error) {
      setDevSaving(false);
      return;
    }
    await refreshProfile();
    setDevSaving(false);
    setDevSaved(true);
    setTimeout(() => setDevSaved(false), 2500);
  };

  const handleDelete = async () => {
    if (deleteStep < 2) { setDeleteStep(s => s + 1); return; }
    if (deleteInput === 'DELETE' && profile) {
      setDeleting(true);
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setDeleting(false);
        return;
      }

      try {
        const response = await fetch('/api/delete-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        });
        if (!response.ok) {
          throw new Error('Could not delete the account.');
        }
      } catch {
        setDeleting(false);
        return;
      }

      try {
        clearAgeGroupOverride(profile.id);
        clearAccountTypeOverride(profile.id);
        clearWritingExperienceOverride(profile.id);
        clearProfileOverrides(profile.id);
        localStorage.removeItem('draftora-profile-v1');
      } catch {
        // ignore cleanup issues
      }

      router.replace('/login');
      window.location.replace('/login');
      void hardSignOut();
    }
  };

  if (!profile) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, background: 'var(--t-bg)' }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--t-acc)', animation: 'pulse 1.5s infinite' }} />
      <p style={{ color: 'var(--t-tx3)', fontSize: 13 }}>Loading settings…</p>
      <button
        onClick={handleLogout}
        style={{ marginTop: 8, background: 'var(--t-card)', border: '1px solid var(--t-brd)', color: 'var(--t-tx3)', borderRadius: 12, padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <LogOut style={{ width: 14, height: 14 }} /> Sign out
      </button>
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
              { icon: Star,      label: 'XP Stash',    value: profile.xp.toLocaleString(), color: 'var(--t-acc)' },
              { icon: Flame,     label: 'Hot Streak',  value: profile.streak,               color: 'var(--t-warning)' },
              { icon: Trophy,    label: 'Best Run',    value: profile.longest_streak,        color: 'var(--t-success)' },
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
          </div>
        </Card>

        <Card>
          <SectionHeader
            icon={<Shield style={{ width: 16, height: 16, color: 'var(--t-acc)' }} />}
            title="Student Code"
            subtitle="Share this code with a parent so they can link to your account"
            right={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {studentCodeCopied && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-success)' }}>
                    Copied!
                  </span>
                )}
                <button
                  type="button"
                  onClick={copyStudentCode}
                  disabled={!studentCode || studentCodeSaving}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '6px 16px',
                    borderRadius: 10,
                    cursor: (!studentCode || studentCodeSaving) ? 'not-allowed' : 'pointer',
                    background: 'var(--t-btn)',
                    color: 'var(--t-btn-color)',
                    border: 'none',
                    opacity: (!studentCode || studentCodeSaving) ? 0.65 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                  }}
                >
                  <Copy style={{ width: 13, height: 13 }} />
                  Copy code
                </button>
              </div>
            }
          />

          <div style={{ padding: '22px 24px' }}>
            {studentCodeError ? (
              <div style={{
                marginBottom: 14,
                padding: '10px 12px',
                borderRadius: 12,
                background: 'color-mix(in srgb, var(--t-danger) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--t-danger) 20%, transparent)',
                color: 'var(--t-danger)',
                fontSize: 12,
                fontWeight: 600,
              }}>
                {studentCodeError}
              </div>
            ) : null}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '18px 20px',
              borderRadius: 18,
              background: 'linear-gradient(135deg, var(--t-acc-a) 0%, var(--t-card2) 100%)',
              border: '1px solid var(--t-brd-a)',
              flexWrap: 'wrap',
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--t-tx3)' }}>
                  Your code
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 950, letterSpacing: '0.12em', color: 'var(--t-tx)' }}>
                  {studentCodeSaving ? 'Generating...' : (studentCode || 'Not ready yet')}
                </p>
                <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--t-tx3)' }}>
                  Parents can enter this in their app to link to your student profile.
                </p>
              </div>

              <button
                type="button"
                onClick={copyStudentCode}
                disabled={!studentCode || studentCodeSaving}
                style={{
                  minWidth: 132,
                  minHeight: 44,
                  padding: '0 16px',
                  borderRadius: 14,
                  border: 'none',
                  background: studentCodeSaving ? 'var(--t-brd)' : 'var(--t-btn)',
                  color: studentCodeSaving ? 'var(--t-tx3)' : 'var(--t-btn-color)',
                  fontWeight: 800,
                  cursor: (!studentCode || studentCodeSaving) ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Copy style={{ width: 14, height: 14 }} />
                {studentCodeCopied ? 'Copied' : 'Copy code'}
              </button>
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
                  type="button"
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
                    type="button"
                    onClick={() => { setEditingGoals(true); setWordGoal(profile.daily_word_goal); setVocabGoal(profile.daily_vocab_goal); setCustomGoal(profile.custom_daily_goal); }}
                    style={{
                      fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 10, cursor: 'pointer',
                      background: 'var(--t-bg)', border: '1px solid var(--t-brd)', color: 'var(--t-tx2)',
                    }}>
                    Edit Goals
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => setEditingGoals(false)}
                      style={{ fontSize: 12, padding: '6px 14px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--t-brd)', color: 'var(--t-tx3)', background: 'transparent' }}>
                      Cancel
                    </button>
                    <button type="button" onClick={saveGoals}
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
                  { icon: PenLine,  label: 'Word Goal',   value: `${profile.daily_word_goal}`,    color: 'var(--t-mod-write)' },
                  { icon: BookOpen, label: 'Vocab Goal',  value: `${profile.daily_vocab_goal}`,   color: 'var(--t-mod-vocab)' },
                  { icon: Target,   label: 'Focus Goal',   value: profile.custom_daily_goal || '—', color: 'var(--t-acc)' },
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

        {/* ══ AGE GROUP ══ */}
        <Card>
          <SectionHeader
            icon={<Users style={{ width: 16, height: 16, color: 'var(--t-acc)' }} />}
            title="Age Group"
            subtitle="Tailors prompts, vocab, and feedback to your level"
            right={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {ageSaved && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-success)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CheckCircle style={{ width: 13, height: 13 }} /> Saved!
                  </span>
                )}
                {!editingAge ? (
                  <button
                    type="button"
                    onClick={() => { setEditingAge(true); setSelectedAge(displayAgeGroup || profile.age_group || ''); setAgeError(''); }}
                    style={{
                      fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 10, cursor: 'pointer',
                      background: 'var(--t-bg)', border: '1px solid var(--t-brd)', color: 'var(--t-tx2)',
                    }}>
                    Change
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => { setEditingAge(false); setAgeError(''); }}
                      style={{ fontSize: 12, padding: '6px 14px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--t-brd)', color: 'var(--t-tx3)', background: 'transparent' }}>
                      Cancel
                    </button>
                    <button type="button" onClick={saveAgeGroup} disabled={!selectedAge || savingAge || selectedAge === (displayAgeGroup || profile.age_group || '')}
                      style={{ fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 10, cursor: (!selectedAge || savingAge || selectedAge === (displayAgeGroup || profile.age_group || '')) ? 'not-allowed' : 'pointer', background: (!selectedAge || savingAge || selectedAge === (displayAgeGroup || profile.age_group || '')) ? 'var(--t-brd)' : 'var(--t-btn)', color: (!selectedAge || savingAge || selectedAge === (displayAgeGroup || profile.age_group || '')) ? 'var(--t-tx3)' : 'var(--t-btn-color)', border: 'none', opacity: (!selectedAge || savingAge || selectedAge === (displayAgeGroup || profile.age_group || '')) ? 0.6 : 1 }}>
                      {savingAge ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
            }
          />

          <div style={{ padding: '20px 24px' }}>
            {ageError && (
              <div style={{
                marginBottom: 14,
                padding: '10px 12px',
                borderRadius: 12,
                background: 'color-mix(in srgb, var(--t-danger) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--t-danger) 20%, transparent)',
                color: 'var(--t-danger)',
                fontSize: 12,
                fontWeight: 600,
              }}>
                {ageError}
              </div>
            )}
            {editingAge ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {AGE_GROUPS.map(ag => {
                  const selected = selectedAge === ag.value;
                  return (
                    <button
                      key={ag.value}
                      onClick={() => { setSelectedAge(ag.value); setAgeError(''); }}
                      style={{
                        borderRadius: 16, padding: '14px 12px', cursor: 'pointer',
                        textAlign: 'center', border: 'none', transition: 'all 0.15s',
                        background: selected
                          ? 'linear-gradient(135deg, var(--t-acc-b), var(--t-acc-a))'
                          : 'var(--t-card2)',
                        outline: selected ? '2px solid var(--t-acc)' : '2px solid transparent',
                        outlineOffset: 2,
                        boxShadow: selected ? '0 4px 16px var(--t-acc-a)' : '0 1px 4px rgba(0,0,0,0.08)',
                      }}
                    >
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{ag.emoji}</div>
                      <p style={{ fontSize: 14, fontWeight: 800, color: selected ? 'var(--t-acc)' : 'var(--t-tx)', margin: 0, lineHeight: 1 }}>{ag.label}</p>
                      <p style={{ fontSize: 10, color: selected ? 'var(--t-acc)' : 'var(--t-tx3)', margin: '4px 0 0', fontWeight: 600, opacity: selected ? 0.8 : 1 }}>{ag.sub}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              (() => {
                const currentAge = displayAgeGroup || profile.age_group || '';
                const current = AGE_GROUPS.find(ag => ag.value === currentAge);
                return current ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 54, height: 54, borderRadius: 16, flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--t-acc-b), var(--t-acc-a))',
                      border: '1px solid var(--t-brd-a)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 26,
                    }}>
                      {current.emoji}
                    </div>
                    <div>
                      <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--t-tx)', margin: 0, letterSpacing: '-0.02em' }}>
                        Age {current.label}
                      </p>
                      <p style={{ fontSize: 13, color: 'var(--t-tx3)', margin: '3px 0 0', fontWeight: 500 }}>
                        {current.sub} — prompts &amp; vocab are matched to this range
                      </p>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--t-tx3)', margin: 0 }}>
                    No age group set — click <strong>Change</strong> to configure it.
                  </p>
                );
              })()
            )}
          </div>
        </Card>

        {/* ══ DEV PANEL (dev account only) ══ */}
        {canUseDevPanel && (
          <div style={{
            background: 'var(--t-card)',
            border: '1.5px solid #f0c84650',
            borderRadius: 20,
            overflow: 'hidden',
          }}>
            {/* Header */}
            <button
              type="button"
              onClick={() => setDevOpen(o => !o)}
              style={{
                width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                padding: '18px 24px',
                borderBottom: devOpen ? '1px solid var(--t-brd)' : 'none',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                background: '#f0c84620', border: '1px solid #f0c84640',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap style={{ width: 16, height: 16, color: '#f0c846' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#f0c846', margin: 0 }}>Dev Controls</p>
                <p style={{ fontSize: 12, color: 'var(--t-tx3)', margin: '1px 0 0' }}>Override profile values directly — dev account only</p>
              </div>
              <span style={{ fontSize: 12, color: 'var(--t-tx3)', fontWeight: 600 }}>{devOpen ? '▲ Hide' : '▼ Show'}</span>
            </button>

            {devOpen && (
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Numeric fields */}
                {[
                  { label: 'XP',                  value: devXP,       setter: setDevXP,       min: 0,   max: 20000 },
                  { label: 'Streak (days)',         value: devStreak,   setter: setDevStreak,   min: 0,   max: 9999  },
                  { label: 'Longest Streak (days)', value: devLongest,  setter: setDevLongest,  min: 0,   max: 9999  },
                  { label: 'Coach Messages Used',   value: devCoach,    setter: setDevCoach,    min: 0,   max: 9999  },
                  { label: 'Writings Created',      value: devWritings, setter: setDevWritings, min: 0,   max: 9999  },
                  { label: 'Vocab Words Saved',     value: devVocab,    setter: setDevVocab,    min: 0,   max: 9999  },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--t-tx3)', display: 'block', marginBottom: 6 }}>
                      {f.label}
                    </label>
                    <input
                      type="number"
                      value={f.value}
                      min={f.min}
                      max={f.max}
                      onChange={e => f.setter(Number(e.target.value))}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'var(--t-bg)', border: '1px solid #f0c84640',
                        borderRadius: 12, padding: '10px 16px',
                        fontSize: 15, fontWeight: 600, color: '#e0b424', outline: 'none',
                      }}
                    />
                  </div>
                ))}

                {/* Derived preview */}
                <div style={{
                  padding: '12px 14px', borderRadius: 12,
                  background: '#f0c84610', border: '1px solid #f0c84628',
                  fontSize: 12, color: 'var(--t-tx3)', lineHeight: 1.7,
                }}>
                  Level will be recalculated from XP automatically on save.
                </div>

                {/* Save button */}
                <button
                  type="button"
                  onClick={saveDevOverrides}
                  disabled={devSaving}
                  style={{
                    padding: '11px', borderRadius: 13, border: 'none', cursor: devSaving ? 'not-allowed' : 'pointer',
                    background: '#f0c846', color: '#000', fontSize: 14, fontWeight: 800,
                    opacity: devSaving ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {devSaving ? 'Saving…' : devSaved ? '✓ Saved!' : 'Apply Dev Overrides'}
                </button>
              </div>
            )}
          </div>
        )}

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
            <button type="button" onClick={handleLogout} style={{
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
              <button type="button" onClick={() => setDeleteStep(1)} style={{
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
                  <button type="button" onClick={() => setDeleteStep(0)} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--t-brd)', color: 'var(--t-tx3)', background: 'transparent' }}>
                    Cancel
                  </button>
                  <button type="button" onClick={() => setDeleteStep(2)} style={{ fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 10, cursor: 'pointer', background: 'color-mix(in srgb, var(--t-danger) 12%, transparent)', color: 'var(--t-danger)', border: '1px solid color-mix(in srgb, var(--t-danger) 24%, transparent)' }}>
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
                  <button type="button" onClick={() => { setDeleteStep(0); setDeleteInput(''); }} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--t-brd)', color: 'var(--t-tx3)', background: 'transparent' }}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleDelete} disabled={deleteInput !== 'DELETE' || deleting} style={{
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
