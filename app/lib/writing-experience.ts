import type { Profile } from '@/app/types/database';
import { supabase } from '@/app/lib/supabase';
import { PromiseTimeoutError, withPromiseTimeout } from '@/app/lib/promise-with-timeout';
import { isMissingWritingExperienceColumnError } from '@/app/lib/supabase-schema-errors';

export type WritingExperienceBand = 'starter' | 'developing' | 'confident' | 'advanced';

export type WritingExperienceChoice = {
  value: WritingExperienceBand;
  label: string;
  description: string;
  score: number;
};

export const WRITING_EXPERIENCE_CHOICES: WritingExperienceChoice[] = [
  {
    value: 'starter',
    label: 'Just starting',
    description: 'I am learning the basics and want simple guidance.',
    score: 0,
  },
  {
    value: 'developing',
    label: 'Some experience',
    description: 'I have written before and want steady improvement.',
    score: 25,
  },
  {
    value: 'confident',
    label: 'Confident writer',
    description: 'I can write well and want sharper feedback.',
    score: 50,
  },
  {
    value: 'advanced',
    label: 'Advanced writer',
    description: 'I want detailed, high-level critique.',
    score: 75,
  },
];

const WRITING_EXPERIENCE_STORAGE_PREFIX = 'draftora-writing-experience-v1';

function getStorageKey(userId: string) {
  return `${WRITING_EXPERIENCE_STORAGE_PREFIX}:${userId}`;
}

export function normalizeWritingExperienceScore(score?: number | null) {
  if (typeof score !== 'number' || Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getWritingExperienceBand(score?: number | null): WritingExperienceBand {
  const value = normalizeWritingExperienceScore(score);
  if (value >= 75) return 'advanced';
  if (value >= 50) return 'confident';
  if (value >= 25) return 'developing';
  return 'starter';
}

export function getWritingExperienceLabel(score?: number | null) {
  return WRITING_EXPERIENCE_CHOICES.find(choice => choice.value === getWritingExperienceBand(score))?.label ?? 'Just starting';
}

export function getWritingExperienceDescription(score?: number | null) {
  return WRITING_EXPERIENCE_CHOICES.find(choice => choice.value === getWritingExperienceBand(score))?.description ?? 'I am learning the basics and want simple guidance.';
}

export function getWritingExperiencePromptContext(score?: number | null) {
  const band = getWritingExperienceBand(score);

  switch (band) {
    case 'starter':
      return 'Treat this as an early-stage writer who needs simple explanations, clear examples, and direct guidance on basics.';
    case 'developing':
      return 'Treat this as a writer with some practice. Focus on building structure, clarity, and control without dumbing the feedback down.';
    case 'confident':
      return 'Treat this as a capable writer. Expect solid control and give more nuanced craft feedback.';
    case 'advanced':
      return 'Treat this as an advanced writer. Give detailed, high-level critique and avoid oversimplifying the response.';
    default:
      return 'Treat this as a writer whose experience should shape the depth of the feedback.';
  }
}

export function getExperienceIncreaseForAction(action: 'writing' | 'vocab' | 'coach') {
  switch (action) {
    case 'writing':
      return 4;
    case 'vocab':
      return 2;
    case 'coach':
      return 1;
    default:
      return 1;
  }
}

export function readWritingExperienceOverride(userId?: string | null) {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? normalizeWritingExperienceScore(parsed) : null;
  } catch {
    return null;
  }
}

export function writeWritingExperienceOverride(userId: string, score: number) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(getStorageKey(userId), String(normalizeWritingExperienceScore(score)));
  } catch {
    // ignore storage failures
  }
}

export function clearWritingExperienceOverride(userId?: string | null) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.removeItem(getStorageKey(userId));
  } catch {
    // ignore storage failures
  }
}

export function applyWritingExperienceOverride(profile: Profile | null): Profile | null {
  if (!profile) return null;

  const override = readWritingExperienceOverride(profile.id);
  if (override !== null) {
    return { ...profile, writing_experience_score: override };
  }

  return {
    ...profile,
    writing_experience_score: normalizeWritingExperienceScore(profile.writing_experience_score),
  };
}

export async function persistWritingExperienceScore(userId: string, score: number) {
  const nextScore = normalizeWritingExperienceScore(score);
  writeWritingExperienceOverride(userId, nextScore);

  try {
    const { error } = await withPromiseTimeout(
      supabase.from('profiles')
        .update({ writing_experience_score: nextScore })
        .eq('id', userId),
      20000,
      'Updating writing experience took too long.',
    );

    if (error) {
      if (isMissingWritingExperienceColumnError(error.message)) {
        return;
      }
      console.error('Failed to persist writing experience:', error.message);
    }
  } catch (error) {
    if (error instanceof PromiseTimeoutError) {
      return;
    }
    console.error('Failed to persist writing experience:', error);
  }
}

