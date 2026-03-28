// Master prompt index — flat arrays (legacy) + age-specific arrays
// getDailyPrompt prefers age-specific content when available.

import { PERSUASIVE_ESSAY_PROMPTS, CREATIVE_STORY_PROMPTS, BLOG_ENTRY_PROMPTS } from './prompts-1';
import { EMAIL_PROMPTS, FEATURE_ARTICLE_PROMPTS, PERSONAL_PROMPTS } from './prompts-2';
import { POETRY_PROMPTS, OTHER_PROMPTS } from './prompts-3';
import { PROMPTS_BY_AGE } from './prompts-by-age';

export const ALL_PROMPTS: Record<string, string[]> = {
  'Persuasive Essay': PERSUASIVE_ESSAY_PROMPTS,
  'Creative Story':   CREATIVE_STORY_PROMPTS,
  'Blog Entry':       BLOG_ENTRY_PROMPTS,
  'Email':            EMAIL_PROMPTS,
  'Feature Article':  FEATURE_ARTICLE_PROMPTS,
  'Personal':         PERSONAL_PROMPTS,
  'Diary':            PERSONAL_PROMPTS,
  'Poetry':           POETRY_PROMPTS,
  'Other':            OTHER_PROMPTS,
};

export const CATEGORIES = Object.keys(ALL_PROMPTS).filter(k => k !== 'Diary');

/**
 * Returns a day number that increments at the user's LOCAL midnight.
 */
function localDayIndex(): number {
  const now = new Date();
  const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor(localMidnight.getTime() / 86400000);
}

/**
 * Get today's prompt for a given category, optionally age-group-specific.
 * Falls back to flat arrays if no age-specific content exists.
 */
export function getDailyPrompt(category: string, ageGroup?: string): string {
  const dayIdx  = localDayIndex();
  const offset  = category.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);

  // Try age-specific prompts first
  if (ageGroup && ageGroup !== '') {
    const ageBucket = PROMPTS_BY_AGE[ageGroup];
    if (ageBucket) {
      const prompts = ageBucket[category] ?? ageBucket['Creative Story'] ?? [];
      if (prompts.length > 0) return prompts[(dayIdx + offset) % prompts.length];
    }
  }

  // Fall back to flat per-category arrays
  const prompts = ALL_PROMPTS[category];
  if (!prompts || prompts.length === 0) return 'Write about anything that inspires you today.';
  return prompts[(dayIdx + offset) % prompts.length];
}

/**
 * Get a difficulty level based on the local day index.
 */
export function getPromptDifficulty(): 'beginner' | 'intermediate' | 'advanced' {
  const levels: ('beginner' | 'intermediate' | 'advanced')[] = ['beginner', 'intermediate', 'advanced'];
  return levels[localDayIndex() % 3];
}
