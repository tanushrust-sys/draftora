import { supabase } from './supabase';
import { getLevelFromXP, getTitleForLevel } from '@/app/types/database';
import { setProfileOverride } from '@/app/lib/profile-overrides';

// How much XP each action earns
// Balanced for 30-level system (50 base + 25/level increase, 11 600 XP total)
export const XP_REWARDS = {
  // ── Core writing ──────────────────────────
  WRITING_SUBMIT:       25,   // Submit a completed writing piece
  DAILY_WRITING:        10,   // First writing activity of the day
  WORD_COUNT_250:        5,   // Bonus: 250+ words in a session
  WORD_COUNT_500:       10,   // Bonus: 500+ words in a session

  // ── Feedback ──────────────────────────────
  AI_FEEDBACK:          10,   // Receive AI feedback on a submission

  // ── Vocabulary ────────────────────────────
  VOCAB_IN_WRITING:      3,   // Use a learned vocab word in writing
  VOCAB_SENTENCE:        8,   // Practice a vocab word with a sentence
  VOCAB_MASTERED:       20,   // Fully master a vocab word
  VOCAB_TEST_BASE:      15,   // Complete the weekly vocab test
  VOCAB_TEST_PER_CORRECT: 3,  // Bonus per correct answer on test

  // ── Goals ─────────────────────────────────
  DAILY_GOAL_MET:       15,   // Meet your daily word/vocab goal

  // ── Streak bonuses (one-time at milestone) ─
  STREAK_3:             15,   // 3-day streak
  STREAK_7:             40,   // 7-day streak — one week!
  STREAK_14:            85,   // 14-day streak — two weeks!
  STREAK_30:           200,   // 30-day streak — one month!
  STREAK_60:           400,   // 60-day streak — two months!
  STREAK_100:          800,   // 100-day streak — legendary!
} as const;

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function msUntilNextLocalMidnight() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export type RewardEventType =
  | 'writing_submit'
  | 'ai_feedback_received'
  | 'vocab_sentence_success'
  | 'vocab_mastered'
  | 'vocab_drill_completed'
  | 'vocab_test_completed'
  | 'daily_goal_met'
  | 'streak_checkin';

export type RewardAwardResponse = {
  ok: true;
  idempotentReplay: boolean;
  eventId: string;
  eventType: RewardEventType;
  deltas: { xp: number };
  balances: {
    xp: number;
    level: number;
    title: string;
    streak: number;
    longestStreak: number;
  };
  celebrations: {
    levelUp: { fromLevel: number; toLevel: number; title: string } | null;
    streakMilestone: { streak: number; xp: number } | null;
  };
  cap: { applied: boolean; reason: string | null };
  practiceMode: boolean;
};

export const REWARD_AWARDED_EVENT = 'draftora:reward-awarded';

type AwardRewardEventInput = {
  token: string;
  eventType: RewardEventType;
  idempotencyKey: string;
  sourceRef?: string | null;
  metadata?: Record<string, unknown>;
  eventSource?: string;
};

function normalizeKeyPart(part: string | number | boolean) {
  return String(part).replace(/[^a-zA-Z0-9:_\\.-]/g, '-');
}

export function createIdempotencyKey(parts: Array<string | number | boolean | null | undefined>) {
  const compact = parts
    .filter((part): part is string | number | boolean => part !== null && part !== undefined && `${part}`.trim().length > 0)
    .map(normalizeKeyPart);

  const raw = compact.join(':').slice(0, 120);
  return raw.length >= 8 ? raw : `reward:${raw.padEnd(8, '0')}`;
}

export async function awardRewardEvent(input: AwardRewardEventInput): Promise<RewardAwardResponse> {
  if (!input.token) throw new Error('Missing session token.');

  const response = await fetch('/api/rewards/award', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.token}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify({
      eventType: input.eventType,
      sourceRef: input.sourceRef ?? null,
      metadata: input.metadata ?? {},
      eventSource: input.eventSource ?? 'client',
    }),
  });

  const payload = await response.json().catch(() => ({} as { error?: string }));
  if (!response.ok) {
    throw new Error(payload?.error || `Reward API failed (${response.status})`);
  }

  const reward = payload as RewardAwardResponse;
  if (typeof window !== 'undefined' && !reward.idempotentReplay) {
    window.dispatchEvent(new CustomEvent<RewardAwardResponse>(REWARD_AWARDED_EVENT, { detail: reward }));
  }

  return reward;
}

// Give the user XP and update their level
// Deprecated path retained as a fallback while Rewards 2.0 rolls out.
export async function awardXP(userId: string, amount: number, reason: string) {
  try {
    const { data: profileSnapshot } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', userId)
      .single()
      .then(res => res, () => ({ data: null }));

    const nextXP = (profileSnapshot?.xp ?? 0) + amount;
    setProfileOverride(userId, 'xp', nextXP);

    await supabase.from('xp_log').insert({ user_id: userId, amount, reason }).then(() => null, () => null);

    const newLevel = getLevelFromXP(nextXP);
    const newTitle = getTitleForLevel(newLevel);

    await supabase
      .from('profiles')
      .update({ xp: nextXP, level: newLevel, title: newTitle })
      .eq('id', userId)
      .then(() => null, () => null);
  } catch (error) {
    console.error('awardXP error:', error);
  }
}

// Track what the user did today (words written, vocab used, etc.)
export async function updateDailyStats(
  userId: string,
  updates: {
    words_written?: number;
    vocab_words_used?: number;
    vocab_words_learned?: number;
    writings_completed?: number;
    xp_earned?: number;
    custom_goal_completed?: boolean;
  }
) {
  const today = getLocalDateKey();

  const { data: existing } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (existing) {
    // Add to today's existing stats
    await supabase.from('daily_stats').update({
      words_written:       existing.words_written       + (updates.words_written       || 0),
      vocab_words_used:    existing.vocab_words_used    + (updates.vocab_words_used    || 0),
      vocab_words_learned: existing.vocab_words_learned + (updates.vocab_words_learned || 0),
      writings_completed:  existing.writings_completed  + (updates.writings_completed  || 0),
      xp_earned:           existing.xp_earned           + (updates.xp_earned           || 0),
      custom_goal_completed: updates.custom_goal_completed ?? existing.custom_goal_completed,
    }).eq('id', existing.id);
  } else {
    // First activity of the day — create a new record
    await supabase.from('daily_stats').insert({ user_id: userId, date: today, ...updates });
  }
}

// Update the user's writing streak
// Deprecated path retained as a fallback while Rewards 2.0 rolls out.
export async function updateStreak(userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('streak, longest_streak, last_writing_date')
    .eq('id', userId)
    .single();

  if (!profile) return;

  const today = getLocalDateKey();
  const yesterday = getLocalDateKey(new Date(Date.now() - 86400000));

  // Already counted today
  if (profile.last_writing_date === today) return;

  // Streak continues if they wrote yesterday, otherwise reset to 1
  const newStreak = profile.last_writing_date === yesterday ? profile.streak + 1 : 1;
  const newLongest = Math.max(newStreak, profile.longest_streak);

  await supabase.from('profiles').update({
    streak: newStreak,
    longest_streak: newLongest,
    last_writing_date: today,
  }).eq('id', userId);

  // Award streak milestone bonuses
  const bonuses: Record<number, number> = {
    3: 15, 7: 40, 14: 85, 30: 200, 60: 400, 100: 800,
  };
  if (bonuses[newStreak]) {
    await awardXP(userId, bonuses[newStreak], `${newStreak}-day streak bonus!`);
  }

  return newStreak;
}
