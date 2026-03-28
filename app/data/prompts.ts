// Master prompt index — combines all category prompt files
// Each category has 300 prompts, rotating daily at the user's local midnight

import { PERSUASIVE_ESSAY_PROMPTS, CREATIVE_STORY_PROMPTS, BLOG_ENTRY_PROMPTS } from './prompts-1';
import { EMAIL_PROMPTS, FEATURE_ARTICLE_PROMPTS, PERSONAL_PROMPTS } from './prompts-2';
import { POETRY_PROMPTS, OTHER_PROMPTS } from './prompts-3';

export const ALL_PROMPTS: Record<string, string[]> = {
  'Persuasive Essay': PERSUASIVE_ESSAY_PROMPTS,
  'Creative Story': CREATIVE_STORY_PROMPTS,
  'Blog Entry': BLOG_ENTRY_PROMPTS,
  'Email': EMAIL_PROMPTS,
  'Feature Article': FEATURE_ARTICLE_PROMPTS,
  'Personal': PERSONAL_PROMPTS,
  'Poetry': POETRY_PROMPTS,
  'Other': OTHER_PROMPTS,
};

export const CATEGORIES = Object.keys(ALL_PROMPTS);

/**
 * Returns a day number that increments at the user's LOCAL midnight.
 * new Date(y, m, d) creates a timestamp at 00:00:00 in the browser's timezone,
 * so dividing by 86400000 gives a consistent local-day index.
 */
function localDayIndex(): number {
  const now = new Date();
  const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor(localMidnight.getTime() / 86400000);
}

/**
 * Get today's prompt for a given category.
 * Deterministic per user-local day: rotates at the user's midnight, not UTC midnight.
 */
export function getDailyPrompt(category: string): string {
  const prompts = ALL_PROMPTS[category];
  if (!prompts || prompts.length === 0) return 'Write about anything that inspires you today.';
  // Per-category offset so different categories don't cycle in sync
  const categoryOffset = category.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return prompts[(localDayIndex() + categoryOffset) % prompts.length];
}

/**
 * Get a difficulty level based on the local day index (cycles beginner → intermediate → advanced).
 */
export function getPromptDifficulty(category: string): 'beginner' | 'intermediate' | 'advanced' {
  const levels: ('beginner' | 'intermediate' | 'advanced')[] = ['beginner', 'intermediate', 'advanced'];
  return levels[localDayIndex() % 3];
}
