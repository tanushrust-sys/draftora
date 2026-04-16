// Master prompt index. Age-aware prompt pools are built here so every topic
// resolves cleanly, even when a dedicated per-age file is missing entries.

import { PROMPTS_BY_AGE } from './prompts-by-age';

const AGE_GROUPS = ['5-7', '8-10', '11-13', '14-17', '18-21', '22+'] as const;

export const PROMPTS_PER_TOPIC = 300;

export const ALL_PROMPTS: Record<string, string[]> = {
  'Persuasive Essay': [],
  'Creative Story': [],
  'Blog Entry': [],
  Email: [],
  'Feature Article': [],
  Personal: [],
  Diary: [],
  Poetry: [],
  Other: [],
};

export const CATEGORIES = Object.keys(ALL_PROMPTS).filter((category) => category !== 'Diary');

const CATEGORY_ALIASES: Record<string, string[]> = {
  'Persuasive Essay': ['Persuasive Essay'],
  'Creative Story': ['Creative Story'],
  'Blog Entry': ['Blog Entry'],
  Email: ['Email'],
  'Feature Article': ['Feature Article'],
  Personal: ['Personal', 'Diary'],
  Diary: ['Diary', 'Personal'],
  Poetry: ['Poetry'],
  Other: ['Other'],
};

const AGE_GUIDANCE: Record<string, string> = {
  '5-7': 'Use simple words, clear actions, and playful ideas.',
  '8-10': 'Keep the writing lively, clear, and easy to follow.',
  '11-13': 'Add strong detail, feeling, and a clear structure.',
  '14-17': 'Aim for stronger voice, sharper structure, and more nuance.',
  '18-21': 'Take a mature, reflective, and well-structured approach.',
  '22+': 'Approach this with depth, nuance, and lived perspective.',
};

function localDayIndex(): number {
  const now = new Date();
  const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor(localMidnight.getTime() / 86400000);
}

function normalizePrompt(prompt: string) {
  return prompt.trim().replace(/\s+/g, ' ').toLowerCase();
}

function uniquePrompts(prompts: string[]) {
  const seen = new Set<string>();
  return prompts.filter((prompt) => {
    const key = normalizePrompt(prompt);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fillToCount(base: string[], count: number, offset = 0) {
  if (base.length >= count) return base.slice(0, count);
  if (base.length === 0) return base;
  const extra = Array.from({ length: count - base.length }, (_, index) => base[(offset + index) % base.length]);
  return [...base, ...extra];
}

function collectPrompts(category: string, source?: Record<string, string[]>) {
  const aliases = CATEGORY_ALIASES[category] ?? [category];
  return aliases.flatMap((alias) => source?.[alias] ?? []);
}

function withAgeGuidance(prompt: string, ageGroup?: string) {
  if (!ageGroup) return prompt;
  const guidance = AGE_GUIDANCE[ageGroup];
  if (!guidance) return prompt;
  return `${prompt} ${guidance}`;
}

const promptPoolCache = new Map<string, string[]>();

export function getPromptPool(category: string, ageGroup?: string): string[] {
  const cacheKey = `${ageGroup || 'generic'}::${category}`;
  const cached = promptPoolCache.get(cacheKey);
  if (cached) return cached;

  const genericPrompts = uniquePrompts(collectPrompts(category, ALL_PROMPTS));
  const agePrompts = ageGroup && ageGroup in PROMPTS_BY_AGE
    ? uniquePrompts(collectPrompts(category, PROMPTS_BY_AGE[ageGroup]))
    : [];

  let pool = agePrompts;

  if (ageGroup === '5-7' && pool.length > 0) {
    pool = fillToCount(pool, PROMPTS_PER_TOPIC, 7);
  }

  if (pool.length < PROMPTS_PER_TOPIC) {
    const fallbackPrompts = genericPrompts.map((prompt) => withAgeGuidance(prompt, ageGroup));
    pool = uniquePrompts([...pool, ...fallbackPrompts]);
  }

  if (pool.length === 0) {
    pool = ['Write about anything that inspires you today.'];
  }

  const finalPool = pool.slice(0, PROMPTS_PER_TOPIC);
  promptPoolCache.set(cacheKey, finalPool);
  return finalPool;
}

function hashParts(parts: string[]) {
  return parts.join('|').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export function getDailyPrompt(category: string, ageGroup?: string): string {
  const prompts = getPromptPool(category, ageGroup);
  const ageBucket = AGE_GROUPS.includes(ageGroup as (typeof AGE_GROUPS)[number]) ? ageGroup : '';
  const offset = hashParts([CATEGORY_ALIASES[category]?.[0] ?? category, ageBucket || 'generic']);
  return prompts[(localDayIndex() + offset) % prompts.length];
}

export function getPromptDifficulty(): 'beginner' | 'intermediate' | 'advanced' {
  const levels: ('beginner' | 'intermediate' | 'advanced')[] = ['beginner', 'intermediate', 'advanced'];
  return levels[localDayIndex() % 3];
}
