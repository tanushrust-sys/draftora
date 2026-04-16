'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  PenLine,
  Users,
  BookOpen,
  School,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/app/lib/supabase';
import { PromiseTimeoutError, withPromiseTimeout } from '@/app/lib/promise-with-timeout';
import { generateStudentCode } from '@/app/lib/student-code';
import {
  getAccountHomePath,
  writeAccountTypeOverride,
} from '@/app/lib/account-type';
import {
  isMissingAgeGroupColumnError,
  writeAgeGroupOverride,
} from '@/app/lib/age-group-storage';
import {
  normalizeWritingExperienceScore,
  writeWritingExperienceOverride,
  WRITING_EXPERIENCE_CHOICES,
} from '@/app/lib/writing-experience';
import {
  isMissingAccountTypeColumnError,
  isMissingWritingExperienceColumnError,
} from '@/app/lib/supabase-schema-errors';

type AccountTypeChoice = 'teacher' | 'student' | 'parent';
type OnboardingStep = 1 | 2 | 3 | 4;

const AGE_GROUP_OPTIONS = [
  { value: '5-7', label: '5 - 7', sub: 'Early Explorer' },
  { value: '8-10', label: '8 - 10', sub: 'Growing Writer' },
  { value: '11-13', label: '11 - 13', sub: 'Finding Your Voice' },
  { value: '14-17', label: '14 - 17', sub: 'Sharpening the Craft' },
  { value: '18-21', label: '18 - 21', sub: 'Rising Writer' },
  { value: '22+', label: '22+', sub: 'Experienced Writer' },
] as const;

const DAILY_GOAL_OPTIONS = [
  { value: 'habit', label: 'Build a daily writing habit', sub: 'Show up and write every day', dailyWordGoal: 150 },
  { value: 'vocab', label: 'Grow my vocabulary', sub: 'Use stronger words naturally', dailyWordGoal: 200 },
  { value: 'story', label: 'Write better stories', sub: 'Stronger plot, pacing, and scenes', dailyWordGoal: 300 },
  { value: 'essay', label: 'Improve essays and structure', sub: 'Clear arguments and flow', dailyWordGoal: 300 },
  { value: 'confidence', label: 'Write with more confidence', sub: 'Reduce hesitation and overthinking', dailyWordGoal: 250 },
  { value: 'finish', label: 'Finish more drafts', sub: 'Complete pieces consistently', dailyWordGoal: 400 },
] as const;

const ONBOARDING_COMPLETE_PREFIX = 'draftora-onboarding-complete-v1';

function getOnboardingCompleteKey(userId: string) {
  return `${ONBOARDING_COMPLETE_PREFIX}:${userId}`;
}

function readOnboardingComplete(userId?: string | null) {
  if (typeof window === 'undefined' || !userId) return false;
  try {
    return localStorage.getItem(getOnboardingCompleteKey(userId)) === '1';
  } catch {
    return false;
  }
}

function markOnboardingComplete(userId: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getOnboardingCompleteKey(userId), '1');
  } catch {
    // ignore storage failures
  }
}

function isValidAgeGroup(value?: string | null) {
  return AGE_GROUP_OPTIONS.some((option) => option.value === value);
}

function hasStudentSetupCompleted(profile: {
  account_type?: string | null;
  age_group?: string | null;
  daily_word_goal?: number | null;
  writing_experience_score?: number | null;
}) {
  if (profile.account_type === 'teacher' || profile.account_type === 'parent') return true;
  if (profile.account_type !== 'student') return false;

  const hasAgeGroup = isValidAgeGroup(profile.age_group);
  const hasDailyGoal = Number.isFinite(profile.daily_word_goal) && Number(profile.daily_word_goal) > 0;
  const hasExperience = Number.isFinite(profile.writing_experience_score);
  return hasAgeGroup && hasDailyGoal && hasExperience;
}

function getRoleCopy(choice: AccountTypeChoice) {
  if (choice === 'teacher') return 'Open teacher app';
  if (choice === 'parent') return 'Open parent app';
  return 'Continue to student setup';
}

export default function OnboardingModal() {
  const { profile, refreshProfile } = useAuth();
  const initializedUserIdRef = useRef<string | null>(null);

  const [ready, setReady] = useState(false);
  const [complete, setComplete] = useState(false);
  const [step, setStep] = useState<OnboardingStep>(1);
  const [saving, setSaving] = useState(false);
  const [busyChoice, setBusyChoice] = useState<AccountTypeChoice | null>(null);
  const [error, setError] = useState('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('');
  const [selectedDailyGoal, setSelectedDailyGoal] = useState<(typeof DAILY_GOAL_OPTIONS)[number]['value'] | null>(null);
  const [customGoalInput, setCustomGoalInput] = useState('');
  const [selectedExperience, setSelectedExperience] = useState<number | null>(null);

  useEffect(() => {
    if (!profile?.id) {
      setReady(false);
      setComplete(false);
      initializedUserIdRef.current = null;
      return;
    }

    const alreadyConfigured = hasStudentSetupCompleted(profile);
    const isNewUserContext = initializedUserIdRef.current !== profile.id;
    if (isNewUserContext) {
      initializedUserIdRef.current = profile.id;
      setStep(profile.account_type === 'student' ? 2 : 1);
      setSaving(false);
      setBusyChoice(null);
      setError('');
      setSelectedAgeGroup(profile.age_group || AGE_GROUP_OPTIONS[0].value);
      setSelectedDailyGoal(DAILY_GOAL_OPTIONS[0].value);
      setCustomGoalInput(
        profile.custom_daily_goal && !/^Write .+ each day$/i.test(profile.custom_daily_goal)
          ? profile.custom_daily_goal
          : '',
      );
      setSelectedExperience(normalizeWritingExperienceScore(profile.writing_experience_score));
    }

    const locallyCompleted = readOnboardingComplete(profile.id);
    const nextComplete = locallyCompleted || alreadyConfigured;
    if (nextComplete && !locallyCompleted) {
      markOnboardingComplete(profile.id);
    }
    setComplete(nextComplete);
    setReady(true);
  }, [
    profile?.id,
    profile?.account_type,
    profile?.age_group,
    profile?.daily_word_goal,
    profile?.writing_experience_score,
  ]);

  if (!profile || !ready || complete) return null;

  if (profile.account_type === 'teacher' || profile.account_type === 'parent') return null;

  const stepTitle =
    step === 1 ? 'Choose your app' :
    step === 2 ? 'Age group' :
    step === 3 ? 'Goal focus' :
    'Writing level';

  const stepDescription =
    step === 1
      ? 'Pick the workspace that should open after sign-in.'
      : step === 2
        ? 'This shapes prompts, vocabulary, and feedback.'
        : step === 3
          ? 'Pick one focus or write your own custom goal.'
          : 'This tunes the depth of coaching and feedback.';

  const stepCounter = step === 1 ? 'Start here' : `Step ${step - 1} of 3`;

  const goBack = () => {
    setError('');
    setStep((current) => (current > 1 ? ((current - 1) as OnboardingStep) : current));
  };

  const persistProfilePatch = async (patch: Record<string, unknown>) => {
    try {
      const { error: updateError } = await withPromiseTimeout(
        supabase.from('profiles').update(patch).eq('id', profile.id),
        15000,
        'Saving your setup took too long.',
      );

      return updateError ?? null;
    } catch (caught) {
      if (caught instanceof PromiseTimeoutError) {
        return caught;
      }
      throw caught;
    }
  };

  const completeStudentOnboarding = async () => {
    if (!profile) return;

    const nextAgeGroup = selectedAgeGroup || AGE_GROUP_OPTIONS[0].value;
    const selectedGoalOption = DAILY_GOAL_OPTIONS.find((option) => option.value === selectedDailyGoal) ?? DAILY_GOAL_OPTIONS[0];
    const nextDailyGoal = selectedGoalOption.dailyWordGoal;
    const nextGoalText = customGoalInput.trim() || selectedGoalOption.label;
    const nextExperience = normalizeWritingExperienceScore(selectedExperience ?? profile.writing_experience_score);

    setSaving(true);
    setError('');

    writeAccountTypeOverride(profile.id, 'student');
    writeAgeGroupOverride(profile.id, nextAgeGroup);
    writeWritingExperienceOverride(profile.id, nextExperience);

    const { error: metadataError } = await supabase.auth.updateUser({
      data: { account_type: 'student' },
    });

    if (metadataError) {
      setError(metadataError.message || 'Could not save your setup right now.');
      setSaving(false);
      return;
    }

    const updateError = await persistProfilePatch({
      account_type: 'student',
      student_id: profile.student_id ?? generateStudentCode(),
      age_group: nextAgeGroup,
      daily_word_goal: nextDailyGoal,
      custom_daily_goal: nextGoalText,
      writing_experience_score: nextExperience,
    }).catch((caught) => caught);

    if (updateError) {
      const message =
        updateError instanceof Error
          ? updateError.message
          : typeof updateError === 'object' && updateError !== null && 'message' in updateError
            ? String((updateError as { message?: unknown }).message ?? '')
            : '';
      const missingField =
        isMissingAccountTypeColumnError(message) ||
        isMissingAgeGroupColumnError(message) ||
        isMissingWritingExperienceColumnError(message);

      if (!missingField && !(updateError instanceof PromiseTimeoutError)) {
        setError('Could not save your student setup. Please try again.');
        setSaving(false);
        return;
      }
    }

    markOnboardingComplete(profile.id);
    setComplete(true);
    setSaving(false);
    void refreshProfile().catch(() => {});
  };

  const chooseAppType = async (choice: AccountTypeChoice) => {
    if (!profile || saving) return;

    setBusyChoice(choice);
    setError('');

    if (choice === 'student') {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { account_type: 'student' },
      });

      if (metadataError) {
        setError(metadataError.message || 'Could not open the student app yet.');
        setBusyChoice(null);
        return;
      }

      setStep(2);
      setBusyChoice(null);
      return;
    }

    writeAccountTypeOverride(profile.id, choice);

    const { error: metadataError } = await supabase.auth.updateUser({
      data: { account_type: choice },
    });

    if (metadataError) {
      setError(metadataError.message || 'Could not open that app right now.');
      setBusyChoice(null);
      return;
    }

    const updateError = await persistProfilePatch({ account_type: choice });
    if (updateError) {
      const message =
        updateError instanceof Error
          ? updateError.message
          : typeof updateError === 'object' && updateError !== null && 'message' in updateError
            ? String((updateError as { message?: unknown }).message ?? '')
            : '';
      const missingField = isMissingAccountTypeColumnError(message);

      if (!missingField && !(updateError instanceof PromiseTimeoutError)) {
        setError(message || 'Could not open that app right now.');
        setBusyChoice(null);
        return;
      }
    }

    markOnboardingComplete(profile.id);
    setComplete(true);
    setBusyChoice(null);
    void refreshProfile().catch(() => {});
    window.location.replace(getAccountHomePath(choice));
  };

  const finishStudentFlow = async () => {
    if (step < 4) {
      setStep((current) => ((current + 1) as OnboardingStep));
      return;
    }

    await completeStudentOnboarding();
  };

  const appChoices: Array<{
    value: AccountTypeChoice;
    title: string;
    description: string;
    icon: ReactNode;
    accent: string;
  }> = [
    {
      value: 'teacher',
      title: 'Teacher app',
      description: 'Classrooms, student reports, and batch setup.',
      icon: <School style={{ width: 18, height: 18 }} />,
      accent: '#60a5fa',
    },
    {
      value: 'student',
      title: 'Student app',
      description: 'Set up your writing space and daily routine.',
      icon: <BookOpen style={{ width: 18, height: 18 }} />,
      accent: '#67e8f9',
    },
    {
      value: 'parent',
      title: 'Parent app',
      description: 'Linked students, progress reports, and family settings.',
      icon: <Users style={{ width: 18, height: 18 }} />,
      accent: '#2dd4bf',
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'grid',
        placeItems: 'center',
        padding: '1rem',
        background: 'linear-gradient(180deg, rgba(2, 8, 20, 0.82) 0%, rgba(2, 8, 20, 0.9) 100%)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div
        style={{
          width: 'min(920px, calc(100vw - 1rem))',
          maxHeight: 'calc(100vh - 1rem)',
          overflowY: 'auto',
          borderRadius: 28,
          background: 'linear-gradient(180deg, rgba(3, 23, 38, 0.98) 0%, rgba(2, 12, 24, 0.98) 100%)',
          border: '1px solid rgba(45, 212, 191, 0.18)',
          boxShadow: '0 32px 90px rgba(2, 18, 38, 0.72)',
          color: '#e8fbff',
        }}
      >
        <div style={{ padding: '1.25rem 1.25rem 0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(103, 232, 249, 0.9)' }}>
                {stepCounter}
              </p>
              <h2 style={{ margin: '0.75rem 0 0', fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 0.96, color: '#ffffff' }}>
                {stepTitle}
              </h2>
              <p style={{ margin: '0.85rem 0 0', maxWidth: 760, color: 'rgba(199, 249, 255, 0.76)', lineHeight: 1.7, fontSize: 15 }}>
                {stepDescription}
              </p>
            </div>

            <button
              type="button"
              onClick={step > 1 ? goBack : undefined}
              disabled={step === 1}
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                border: '1px solid rgba(125, 211, 252, 0.2)',
                background: step === 1 ? 'rgba(3, 23, 38, 0.55)' : 'rgba(103, 232, 249, 0.1)',
                color: step === 1 ? 'rgba(199, 249, 255, 0.3)' : '#67e8f9',
                cursor: step === 1 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-label="Go back"
            >
              <ArrowLeft style={{ width: 17, height: 17 }} />
            </button>
          </div>

          <div style={{ marginTop: 18, height: 6, borderRadius: 999, background: 'rgba(125, 211, 252, 0.12)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${step * 25}%`,
                borderRadius: 999,
                background: 'linear-gradient(90deg, #0f766e, #14b8a6 45%, #67e8f9 100%)',
                transition: 'width 0.35s ease',
              }}
            />
          </div>
        </div>

        {error ? (
          <div style={{ margin: '0.9rem 1.25rem 0', padding: '0.9rem 1rem', borderRadius: 16, background: 'rgba(127, 29, 29, 0.2)', border: '1px solid rgba(248, 113, 113, 0.26)', color: '#fecaca', fontSize: 14, lineHeight: 1.55 }}>
            {error}
          </div>
        ) : null}

        <div style={{ padding: '1.1rem 1.25rem 1.25rem' }}>
          {step === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
              {appChoices.map((choice) => {
                const active = busyChoice === choice.value;
                return (
                  <button
                    key={choice.value}
                    type="button"
                    onClick={() => void chooseAppType(choice.value)}
                    disabled={saving || busyChoice !== null}
                    style={{
                      minHeight: 180,
                      padding: '1.1rem',
                      borderRadius: 22,
                      textAlign: 'left',
                      border: `1px solid ${choice.accent}33`,
                      background: `linear-gradient(180deg, color-mix(in srgb, ${choice.accent} 10%, rgba(3, 23, 38, 0.96)) 0%, rgba(3, 23, 38, 0.92) 100%)`,
                      boxShadow: active ? `0 18px 44px color-mix(in srgb, ${choice.accent} 18%, transparent)` : '0 16px 36px rgba(0,0,0,0.18)',
                      color: '#e8fbff',
                      cursor: saving || busyChoice !== null ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 16,
                      background: `linear-gradient(135deg, ${choice.accent}, color-mix(in srgb, ${choice.accent} 55%, white))`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      boxShadow: `0 10px 22px color-mix(in srgb, ${choice.accent} 22%, transparent)`,
                    }}>
                      {choice.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em' }}>
                        {choice.title}
                      </p>
                      <p style={{ margin: '0.5rem 0 0', color: 'rgba(199, 249, 255, 0.76)', lineHeight: 1.6, fontSize: 13.5 }}>
                        {choice.description}
                      </p>
                    </div>
                    <div style={{
                      marginTop: 'auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      color: choice.accent,
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}>
                      {active ? 'Opening...' : getRoleCopy(choice.value)}
                      <PenLine style={{ width: 13, height: 13 }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              {AGE_GROUP_OPTIONS.map((option) => {
                const selected = selectedAgeGroup === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedAgeGroup(option.value)}
                    style={{
                      borderRadius: 18,
                      padding: '1rem 1rem 0.95rem',
                      border: selected ? '1px solid rgba(103, 232, 249, 0.42)' : '1px solid rgba(125, 211, 252, 0.14)',
                      background: selected
                        ? 'linear-gradient(135deg, rgba(8, 145, 178, 0.32), rgba(3, 23, 38, 0.94))'
                        : 'rgba(3, 23, 38, 0.72)',
                      color: '#e8fbff',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>{option.label}</p>
                    <p style={{ margin: '0.45rem 0 0', color: 'rgba(199, 249, 255, 0.72)', fontSize: 13.5, lineHeight: 1.5 }}>
                      {option.sub}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                {DAILY_GOAL_OPTIONS.map((option) => {
                  const selected = selectedDailyGoal === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedDailyGoal(option.value)}
                      style={{
                        borderRadius: 18,
                        padding: '1rem 1rem 0.95rem',
                        border: selected ? '1px solid rgba(45, 212, 191, 0.5)' : '1px solid rgba(125, 211, 252, 0.14)',
                        background: selected
                          ? 'linear-gradient(135deg, rgba(20, 184, 166, 0.28), rgba(3, 23, 38, 0.94))'
                          : 'rgba(3, 23, 38, 0.72)',
                        color: '#e8fbff',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 17, fontWeight: 900, letterSpacing: '-0.01em' }}>{option.label}</p>
                      <p style={{ margin: '0.45rem 0 0', color: 'rgba(199, 249, 255, 0.72)', fontSize: 13.5, lineHeight: 1.5 }}>
                        {option.sub}
                      </p>
                      <p style={{ margin: '0.55rem 0 0', color: '#67e8f9', fontSize: 11.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Suggested pace: ~{option.dailyWordGoal} words/day
                      </p>
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  borderRadius: 18,
                  padding: '0.95rem 1rem 1rem',
                  border: '1px solid rgba(125, 211, 252, 0.2)',
                  background: 'linear-gradient(180deg, rgba(4, 31, 48, 0.88) 0%, rgba(3, 23, 38, 0.84) 100%)',
                }}
              >
                <p style={{ margin: 0, fontSize: 12, color: '#67e8f9', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  Or write your own goal
                </p>
                <input
                  type="text"
                  value={customGoalInput}
                  onChange={(event) => setCustomGoalInput(event.target.value)}
                  placeholder="Example: Finish one strong persuasive paragraph daily"
                  maxLength={120}
                  style={{
                    width: '100%',
                    marginTop: 10,
                    minHeight: 46,
                    borderRadius: 14,
                    border: '1px solid rgba(103, 232, 249, 0.26)',
                    background: 'rgba(2, 16, 29, 0.85)',
                    color: '#ecfeff',
                    padding: '0 0.9rem',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
                <p style={{ margin: '0.55rem 0 0', color: 'rgba(199, 249, 255, 0.68)', fontSize: 12.5 }}>
                  If you type your own, we will save that as your main goal.
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'grid', gap: 12 }}>
              {WRITING_EXPERIENCE_CHOICES.map((choice) => {
                const selected = selectedExperience === choice.score;
                return (
                  <button
                    key={choice.value}
                    type="button"
                    onClick={() => setSelectedExperience(choice.score)}
                    style={{
                      borderRadius: 18,
                      padding: '1rem 1rem 0.95rem',
                      border: selected ? '1px solid rgba(103, 232, 249, 0.42)' : '1px solid rgba(125, 211, 252, 0.14)',
                      background: selected
                        ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.28), rgba(3, 23, 38, 0.94))'
                        : 'rgba(3, 23, 38, 0.72)',
                      color: '#e8fbff',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>{choice.label}</p>
                    <p style={{ margin: '0.45rem 0 0', color: 'rgba(199, 249, 255, 0.72)', fontSize: 13.5, lineHeight: 1.5 }}>
                      {choice.description}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {step > 1 ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18 }}>
              <button
                type="button"
                onClick={() => {
                  void finishStudentFlow();
                }}
                disabled={saving}
                style={{
                  minWidth: 170,
                  minHeight: 48,
                  padding: '0 1.25rem',
                  borderRadius: 16,
                  border: 'none',
                  background: 'linear-gradient(135deg, #0f766e, #14b8a6 48%, #67e8f9 100%)',
                  color: '#ecfeff',
                  fontWeight: 800,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 16px 36px rgba(34, 211, 238, 0.18)',
                }}
              >
                {saving ? 'Saving...' : step === 4 ? 'Finish setup' : 'Continue'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
