import { XP_REWARDS } from '@/app/lib/xp';

export type RewardEventType =
  | 'writing_submit'
  | 'ai_feedback_received'
  | 'vocab_sentence_success'
  | 'vocab_mastered'
  | 'vocab_drill_completed'
  | 'vocab_test_completed'
  | 'daily_goal_met'
  | 'streak_checkin';

export type RewardMetadata = Record<string, unknown>;

export type RewardResolution = {
  xp: number;
  reason: string;
};

export type CapRule = {
  perDay?: number;
  perWeek?: number;
};

const BASE_RULES: Record<Exclude<RewardEventType, 'vocab_drill_completed' | 'vocab_test_completed' | 'streak_checkin'>, RewardResolution> = {
  writing_submit: {
    xp: XP_REWARDS.WRITING_SUBMIT,
    reason: 'Completed writing session',
  },
  ai_feedback_received: {
    xp: XP_REWARDS.AI_FEEDBACK,
    reason: 'Received AI feedback',
  },
  vocab_sentence_success: {
    xp: XP_REWARDS.VOCAB_SENTENCE,
    reason: 'Vocab sentence practice',
  },
  vocab_mastered: {
    xp: XP_REWARDS.VOCAB_MASTERED,
    reason: 'Vocabulary word mastered',
  },
  daily_goal_met: {
    xp: XP_REWARDS.DAILY_GOAL_MET,
    reason: 'Daily goal met',
  },
};

const EVENT_CAPS: Partial<Record<RewardEventType, CapRule>> = {
  writing_submit: { perDay: 3 },
  ai_feedback_received: { perDay: 6 },
  vocab_sentence_success: { perDay: 12 },
  vocab_drill_completed: { perDay: 3 },
  vocab_test_completed: { perWeek: 1 },
};

function numberFromMetadata(metadata: RewardMetadata, key: string) {
  const value = metadata[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toInt(value: number) {
  return Math.round(value);
}

function resolveDrill(metadata: RewardMetadata): RewardResolution {
  const correctCount = clamp(numberFromMetadata(metadata, 'correctCount'), 0, 200);
  const totalCount = clamp(numberFromMetadata(metadata, 'totalCount') || correctCount, 1, 200);

  return {
    xp: toInt(correctCount * 6),
    reason: `Word bank drill: ${correctCount}/${totalCount} correct`,
  };
}

function resolveVocabTest(metadata: RewardMetadata): RewardResolution {
  const score = clamp(numberFromMetadata(metadata, 'score'), 0, 200);
  const totalQuestions = clamp(numberFromMetadata(metadata, 'totalQuestions') || 10, 1, 200);
  const ratio = clamp(score / totalQuestions, 0, 1);

  return {
    xp: XP_REWARDS.VOCAB_TEST_BASE + toInt(ratio * 40),
    reason: `Weekly vocab test: ${score}/${totalQuestions}`,
  };
}

function resolveWritingSubmit(metadata: RewardMetadata): RewardResolution {
  const score = clamp(numberFromMetadata(metadata, 'score'), 0, 100);

  if (score <= 20) return { xp: 5, reason: `Writing submitted (score ${score}/100)` };
  if (score <= 50) return { xp: 10, reason: `Writing submitted (score ${score}/100)` };
  if (score <= 75) return { xp: 15, reason: `Writing submitted (score ${score}/100)` };
  if (score <= 90) return { xp: 25, reason: `Writing submitted (score ${score}/100)` };
  return { xp: 30, reason: `Writing submitted (score ${score}/100)` };
}

export function resolveReward(eventType: RewardEventType, metadata: RewardMetadata): RewardResolution {
  if (eventType === 'writing_submit') return resolveWritingSubmit(metadata);
  if (eventType === 'vocab_drill_completed') return resolveDrill(metadata);
  if (eventType === 'vocab_test_completed') return resolveVocabTest(metadata);

  if (eventType === 'streak_checkin') {
    return {
      xp: 0,
      reason: 'Daily streak check-in',
    };
  }

  return BASE_RULES[eventType];
}

export function getEventCaps(eventType: RewardEventType) {
  return EVENT_CAPS[eventType] ?? null;
}

export const STREAK_BONUS_XP: Record<number, number> = {
  3: XP_REWARDS.STREAK_3,
  7: XP_REWARDS.STREAK_7,
  14: XP_REWARDS.STREAK_14,
  30: XP_REWARDS.STREAK_30,
  60: XP_REWARDS.STREAK_60,
  100: XP_REWARDS.STREAK_100,
};
