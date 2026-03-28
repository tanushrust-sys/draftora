'use client';

import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import { PenLine, ChevronRight, Sparkles, Check } from 'lucide-react';

const AGE_GROUPS = [
  { value: '5-7',   label: '5 – 7',   sub: 'Early Explorer',     emoji: '🌱' },
  { value: '8-10',  label: '8 – 10',  sub: 'Growing Writer',     emoji: '✏️' },
  { value: '11-13', label: '11 – 13', sub: 'Finding Your Voice',  emoji: '📚' },
  { value: '14-17', label: '14 – 17', sub: 'Sharpening the Craft',emoji: '🎯' },
  { value: '18-21', label: '18 – 21', sub: 'Rising Writer',       emoji: '🚀' },
  { value: '22+',   label: '22 +',    sub: 'Lifelong Learner',    emoji: '⭐' },
];

const GOAL_CHIPS = [
  'Improve my essay writing',
  'Write more creatively',
  'Build a stronger vocabulary',
  'Get better at storytelling',
  'Prepare for school exams',
  'Write for fun and expression',
  'Improve my blog writing',
  'Write professional emails',
];

export default function OnboardingModal() {
  const { profile, refreshProfile } = useAuth();
  const [step, setStep]           = useState(1);
  const [ageGroup, setAgeGroup]   = useState('');
  const [goal, setGoal]           = useState('');
  const [saving, setSaving]       = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show only for users who haven't completed onboarding.
  // Use custom_daily_goal as the indicator (always exists) — default is 'Write for 10 minutes'.
  // Also respect local dismissed flag so the modal closes instantly without waiting for DB.
  const DEFAULTS = ['Write for 10 minutes', 'Skipped onboarding', ''];
  const needsOnboarding = profile && DEFAULTS.includes(profile.custom_daily_goal);
  if (dismissed || !needsOnboarding) return null;

  const handleSave = async () => {
    if (!goal.trim()) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ custom_daily_goal: goal.trim(), age_group: ageGroup })
      .eq('id', profile!.id);
    await refreshProfile();
    setSaving(false);
    setDismissed(true);
  };

  const handleSkip = () => {
    setDismissed(true);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 580,
          borderRadius: 28,
          background: 'var(--t-card)',
          border: '1px solid var(--t-brd)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* ── Gradient header ── */}
        <div style={{
          padding: '28px 32px 22px',
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--t-acc) 18%, var(--t-card)), var(--t-card))',
          borderBottom: '1px solid var(--t-brd)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16,
              background: 'linear-gradient(135deg, var(--t-acc-b), var(--t-acc-a))',
              border: '1px solid var(--t-brd-a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PenLine style={{ width: 22, height: 22, color: 'var(--t-acc)' }} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-acc)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 3 }}>
                Welcome to Draftly
              </p>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--t-tx)', lineHeight: 1.2 }}>
                {step === 1 ? 'Let\'s personalise your journey' : 'What\'s your writing goal?'}
              </h1>
            </div>
          </div>

          {/* Step bar */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {[1, 2].map(s => (
              <div key={s} style={{
                height: 5, borderRadius: 99, flex: 1,
                background: s <= step ? 'var(--t-acc)' : 'var(--t-brd)',
                transition: 'background 0.3s',
                boxShadow: s <= step ? '0 0 8px var(--t-acc-a)' : 'none',
              }} />
            ))}
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-tx3)', marginLeft: 8, whiteSpace: 'nowrap' }}>
              Step {step} of 2
            </span>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '24px 32px 28px' }}>

          {/* ── STEP 1: Age group ── */}
          {step === 1 && (
            <>
              <p style={{ fontSize: 14, color: 'var(--t-tx3)', marginBottom: 18 }}>
                This helps us tailor feedback, prompts, and lessons to suit your level.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
                {AGE_GROUPS.map(ag => {
                  const selected = ageGroup === ag.value;
                  return (
                    <button
                      key={ag.value}
                      onClick={() => setAgeGroup(ag.value)}
                      style={{
                        padding: '14px 12px',
                        borderRadius: 16,
                        border: selected ? '2px solid var(--t-acc)' : '1.5px solid var(--t-brd)',
                        background: selected ? 'var(--t-acc-a)' : 'var(--t-bg)',
                        cursor: 'pointer', textAlign: 'center',
                        transition: 'all 0.15s',
                        position: 'relative',
                      }}
                    >
                      {selected && (
                        <div style={{
                          position: 'absolute', top: 8, right: 8,
                          width: 18, height: 18, borderRadius: 99,
                          background: 'var(--t-acc)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Check style={{ width: 11, height: 11, color: '#fff' }} />
                        </div>
                      )}
                      <div style={{ fontSize: 26, marginBottom: 6 }}>{ag.emoji}</div>
                      <p style={{ fontSize: 15, fontWeight: 800, color: selected ? 'var(--t-acc)' : 'var(--t-tx)', lineHeight: 1 }}>{ag.label}</p>
                      <p style={{ fontSize: 10, color: 'var(--t-tx3)', marginTop: 4, lineHeight: 1.3 }}>{ag.sub}</p>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleSkip}
                  style={{
                    padding: '12px 20px', borderRadius: 14, fontSize: 13, fontWeight: 600,
                    border: '1px solid var(--t-brd)', background: 'transparent',
                    color: 'var(--t-tx3)', cursor: 'pointer',
                  }}
                >
                  Skip for now
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!ageGroup}
                  style={{
                    flex: 1, padding: '13px 20px', borderRadius: 14,
                    background: ageGroup ? 'var(--t-btn)' : 'var(--t-bg)',
                    color: ageGroup ? 'var(--t-btn-color)' : 'var(--t-tx3)',
                    border: 'none', fontSize: 15, fontWeight: 700,
                    cursor: ageGroup ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.15s',
                  }}
                >
                  Continue <ChevronRight style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: Writing goal ── */}
          {step === 2 && (
            <>
              <p style={{ fontSize: 14, color: 'var(--t-tx3)', marginBottom: 16 }}>
                Your coach will use this to give personalised guidance and track your progress toward your goal.
              </p>

              {/* Quick chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {GOAL_CHIPS.map(chip => {
                  const selected = goal === chip;
                  return (
                    <button
                      key={chip}
                      onClick={() => setGoal(chip)}
                      style={{
                        padding: '7px 14px', borderRadius: 99,
                        border: selected ? '1.5px solid var(--t-acc)' : '1.5px solid var(--t-brd)',
                        background: selected ? 'var(--t-acc-a)' : 'transparent',
                        color: selected ? 'var(--t-acc)' : 'var(--t-tx3)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>

              <textarea
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="Or write your own goal…"
                rows={3}
                style={{
                  width: '100%', borderRadius: 14,
                  background: 'var(--t-bg)',
                  border: '1.5px solid var(--t-brd)',
                  color: 'var(--t-tx)',
                  fontSize: 15, padding: '12px 16px',
                  resize: 'none', outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  lineHeight: 1.6,
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--t-brd-a)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--t-brd)'; }}
              />

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    padding: '12px 20px', borderRadius: 14, fontSize: 13, fontWeight: 600,
                    border: '1px solid var(--t-brd)', background: 'transparent',
                    color: 'var(--t-tx3)', cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={!goal.trim() || saving}
                  style={{
                    flex: 1, padding: '13px 20px', borderRadius: 14,
                    background: goal.trim() ? 'var(--t-btn)' : 'var(--t-bg)',
                    color: goal.trim() ? 'var(--t-btn-color)' : 'var(--t-tx3)',
                    border: 'none', fontSize: 15, fontWeight: 700,
                    cursor: goal.trim() && !saving ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.15s',
                  }}
                >
                  {saving
                    ? 'Saving…'
                    : <><Sparkles style={{ width: 16, height: 16 }} /> Start my journey</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
