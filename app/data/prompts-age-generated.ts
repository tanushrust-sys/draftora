import { PROMPTS_5_7 as RAW_PROMPTS_5_7 } from './prompts-age-5-7';

type PromptBank = Record<string, string[]>;
type AgeGroup = '5-7' | '8-10' | '11-13' | '14-17' | '18-21' | '22+';

const PROMPTS_PER_SECTION_5_7 = 200;
const PROMPTS_PER_SECTION = 100;
const PROMPTS_PER_SECTION_14_PLUS = 150;

const SECTION_SOURCES: Array<[string, string[]]> = [
  ['Creative Story', []],
  ['Persuasive Essay', []],
  ['Blog Entry', []],
  ['Email', []],
  ['Feature Article', []],
  ['Diary', []],
  ['Poetry', []],
];

function slicePrompts(source: string[], offset: number, count = PROMPTS_PER_SECTION) {
  if (source.length === 0) return [];
  return Array.from({ length: count }, (_, index) => source[(offset + index) % source.length]);
}

function normalizeKey(text: string) {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

function uniquePrompts(prompts: string[]) {
  const seen = new Set<string>();
  return prompts.filter((prompt) => {
    const key = normalizeKey(prompt);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fillToCount(base: string[], fallback: string[], count: number, offset = 0) {
  if (base.length >= count) return base.slice(0, count);
  if (fallback.length === 0) return base;
  const needed = count - base.length;
  const extra = Array.from({ length: needed }, (_, index) => fallback[(offset + index) % fallback.length]);
  return [...base, ...extra];
}

function buildKidSafeBank(raw: PromptBank, count = PROMPTS_PER_SECTION): PromptBank {
  const fallback = uniquePrompts(Object.values(raw).flat());
  return Object.fromEntries(
    SECTION_SOURCES.map(([section], index) => {
      const base = uniquePrompts(raw[section] ?? []);
      const filled = fillToCount(base, fallback, count, index * 17);
      return [section, filled];
    }),
  ) as PromptBank;
}

function buildAgeBank(seed: number, count = PROMPTS_PER_SECTION): PromptBank {
  return Object.fromEntries(
    SECTION_SOURCES.map(([section, source], index) => [section, slicePrompts(source, seed + index * 17, count)])
  ) as PromptBank;
}

function capPromptBank(bank: PromptBank, count = PROMPTS_PER_SECTION): PromptBank {
  return Object.fromEntries(
    Object.entries(bank).map(([section, prompts]) => [section, prompts.slice(0, count)])
  ) as PromptBank;
}

export const PROMPTS_5_7: PromptBank = buildKidSafeBank(RAW_PROMPTS_5_7, PROMPTS_PER_SECTION_5_7);
export const PROMPTS_8_10: PromptBank = buildAgeBank(24);
export const PROMPTS_11_13: PromptBank = buildAgeBank(48);
export const PROMPTS_14_17: PromptBank = buildAgeBank(72, PROMPTS_PER_SECTION_14_PLUS);
export const PROMPTS_18_21: PromptBank = buildAgeBank(96, PROMPTS_PER_SECTION_14_PLUS);
export const PROMPTS_22PLUS: PromptBank = buildAgeBank(120, PROMPTS_PER_SECTION_14_PLUS);
