// Trial / plan gating logic
// Free users get a 30-day trial with per-feature caps.

import type { Profile } from '@/app/types/database';

export const TRIAL_LIMITS = {
  COACH_MESSAGES : 50,
  WRITINGS       : 30,
  VOCAB_WORDS    : 90,
  DAYS           : 30,
} as const;

export type TrialStatus = {
  isPlus         : boolean;
  daysLeft       : number;
  daysUsed       : number;
  coachLeft      : number;
  writingsLeft   : number;
  vocabLeft      : number;
  coachBlocked   : boolean;
  writingsBlocked: boolean;
  vocabBlocked   : boolean;
  /** true when trial fully expired OR all three limits hit */
  fullBlocked    : boolean;
  /** specifically the 30-day expiry (vs all-limits-hit) */
  expired        : boolean;
};

export function getTrialStatus(profile: Profile): TrialStatus {
  if (profile.plan === 'plus') {
    return {
      isPlus: true,
      daysLeft: 9999, daysUsed: 0,
      coachLeft: 9999, writingsLeft: 9999, vocabLeft: 9999,
      coachBlocked: false, writingsBlocked: false, vocabBlocked: false,
      fullBlocked: false, expired: false,
    };
  }

  const msPerDay  = 1000 * 60 * 60 * 24;
  const daysUsed  = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / msPerDay);
  const daysLeft  = Math.max(0, TRIAL_LIMITS.DAYS - daysUsed);
  const expired   = daysUsed >= TRIAL_LIMITS.DAYS;

  const coachUsed    = profile.coach_messages_used ?? 0;
  const writingsUsed = profile.writings_created    ?? 0;
  const vocabUsed    = profile.vocab_words_saved   ?? 0;

  const coachLeft     = Math.max(0, TRIAL_LIMITS.COACH_MESSAGES - coachUsed);
  const writingsLeft  = Math.max(0, TRIAL_LIMITS.WRITINGS        - writingsUsed);
  const vocabLeft     = Math.max(0, TRIAL_LIMITS.VOCAB_WORDS     - vocabUsed);

  const coachBlocked    = coachLeft    === 0;
  const writingsBlocked = writingsLeft === 0;
  const vocabBlocked    = vocabLeft    === 0;
  const allLimitsHit    = coachBlocked && writingsBlocked && vocabBlocked;
  const fullBlocked     = expired || allLimitsHit;

  return {
    isPlus: false,
    daysLeft, daysUsed,
    coachLeft, writingsLeft, vocabLeft,
    coachBlocked, writingsBlocked, vocabBlocked,
    fullBlocked, expired,
  };
}
