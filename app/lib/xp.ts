import { supabase } from './supabase';
import { getLevelFromXP, getTitleForLevel } from '@/app/types/database';

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

// Give the user XP and update their level
export async function awardXP(userId: string, amount: number, reason: string) {
  // Record the XP in the log
  await supabase.from('xp_log').insert({ user_id: userId, amount, reason });

  // Get current totals
  const { data: profile } = await supabase
    .from('profiles')
    .select('xp, level')
    .eq('id', userId)
    .single();

  if (!profile) return;

  const newXP = profile.xp + amount;
  const newLevel = getLevelFromXP(newXP);
  const newTitle = getTitleForLevel(newLevel);

  // Update the profile
  await supabase
    .from('profiles')
    .update({ xp: newXP, level: newLevel, title: newTitle })
    .eq('id', userId);
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
  const today = new Date().toISOString().split('T')[0];

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
export async function updateStreak(userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('streak, longest_streak, last_writing_date')
    .eq('id', userId)
    .single();

  if (!profile) return;

  const today     = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

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
