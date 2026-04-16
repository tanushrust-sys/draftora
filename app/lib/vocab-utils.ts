// Shared vocab utilities used by vocab page and dashboard.

import { VOCAB_BY_AGE } from '@/app/data/vocab-by-age';

type VocabEntry = { word: string; meaning: string; example: string };

const USER_AGE_GROUP_ORDER = ['5-7', '8-10', '11-13', '14-17', '18-21', '22+'] as const;
const USER_AGE_GROUP_INDEX = new Map(USER_AGE_GROUP_ORDER.map((age, index) => [age, index]));

export const DAILY_VOCAB_COUNT = 3;
export const AGE_VOCAB_POOL_SIZE = 1000;

// eslint-disable-next-line @typescript-eslint/no-require-imports
let VOCAB_POOL_EXT: VocabEntry[] = [];
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@/app/data/vocab-pool');
  VOCAB_POOL_EXT = mod.VOCAB_POOL;
} catch {
  // falls through to the fallback list below
}

export const VOCAB_FALLBACK: VocabEntry[] = [
  { word: 'Eloquent', meaning: 'Fluent or persuasive in speaking or writing', example: 'She gave an eloquent speech that moved the audience to tears.' },
  { word: 'Persevere', meaning: 'Continue in a course of action despite difficulty', example: 'He chose to persevere with his studies despite the challenges.' },
  { word: 'Meticulous', meaning: 'Showing great attention to detail; very careful', example: 'The meticulous scientist recorded every tiny observation.' },
  { word: 'Empathy', meaning: "The ability to understand and share another's feelings", example: 'Her empathy helped her connect with students who were struggling.' },
  { word: 'Synthesise', meaning: 'Combine different ideas into a coherent whole', example: 'The essay aims to synthesise arguments from both sides.' },
  { word: 'Ambiguous', meaning: 'Open to more than one interpretation; unclear', example: "The poem's ending is deliberately ambiguous." },
  { word: 'Rhetoric', meaning: 'The art of effective or persuasive speaking/writing', example: 'Politicians often rely on rhetoric to sway public opinion.' },
  { word: 'Juxtapose', meaning: 'Place two things side by side to highlight contrast', example: 'The author juxtaposes wealth and poverty throughout the novel.' },
  { word: 'Lucid', meaning: 'Expressed clearly; easy to understand', example: 'Her lucid explanation made the difficult concept simple.' },
  { word: 'Tenacious', meaning: 'Holding firmly to a goal; persistent', example: 'The tenacious student revised every day until the exam.' },
  { word: 'Nuance', meaning: 'A subtle difference in meaning, tone, or expression', example: 'Good writers appreciate the nuance of language.' },
  { word: 'Infer', meaning: 'Deduce from evidence rather than explicit statement', example: 'From the clues, we can infer that the author is cynical.' },
  { word: 'Cohesive', meaning: 'Forming a unified whole; well-connected', example: 'A cohesive essay flows logically from start to finish.' },
  { word: 'Evocative', meaning: 'Bringing strong images, memories, or feelings to mind', example: 'The evocative description made the scene feel real.' },
  { word: 'Concise', meaning: 'Giving much information clearly in few words', example: 'A concise answer is more powerful than a rambling one.' },
  { word: 'Substantiate', meaning: 'Provide evidence to support a claim', example: 'You must substantiate your argument with examples.' },
  { word: 'Pragmatic', meaning: 'Dealing with things sensibly and realistically', example: 'A pragmatic writer uses the simplest word that fits.' },
  { word: 'Resonant', meaning: 'Evoking a response; having lasting impact', example: 'The final line of the poem is deeply resonant.' },
  { word: 'Explicit', meaning: 'Stated clearly with no room for confusion', example: 'The instructions were explicit - no phones during the test.' },
  { word: 'Illuminate', meaning: 'Help to clarify or explain something', example: 'Examples illuminate abstract concepts for the reader.' },
  { word: 'Catalyst', meaning: 'Something that causes or accelerates change', example: 'The speech was a catalyst for social reform.' },
  { word: 'Profound', meaning: 'Having deep meaning or great insight', example: 'The novel asks profound questions about identity and belonging.' },
  { word: 'Scrutinise', meaning: 'Examine or inspect closely and critically', example: 'The editor will scrutinise every sentence before publishing.' },
  { word: 'Disparity', meaning: 'A great difference between things', example: 'The essay highlights the disparity between rich and poor.' },
  { word: 'Articulate', meaning: 'Express thoughts clearly and effectively', example: 'She could articulate her ideas better than anyone in class.' },
  { word: 'Deliberate', meaning: 'Done consciously and intentionally', example: "The author's use of short sentences is deliberate and powerful." },
  { word: 'Vivid', meaning: 'Producing powerful, clear mental images', example: 'Vivid imagery draws readers into the story world.' },
  { word: 'Credible', meaning: 'Able to be believed; convincing', example: 'A credible argument is supported with reliable evidence.' },
  { word: 'Succinct', meaning: 'Briefly and clearly expressed', example: 'Keep your introduction succinct - one paragraph is enough.' },
  { word: 'Imply', meaning: 'Suggest without stating directly', example: 'The story implies that the character knows more than they say.' },
  { word: 'Astute', meaning: 'Having sharp insight; shrewd', example: 'An astute reader will spot the hidden symbolism immediately.' },
  { word: 'Candid', meaning: 'Truthful and straightforward', example: 'Her candid feedback helped the team improve the proposal.' },
  { word: 'Diligent', meaning: 'Careful and hard-working', example: 'Diligent revision is the key to improving your writing skills.' },
  { word: 'Emulate', meaning: 'Match or surpass through imitation', example: 'She studied great writers and tried to emulate their style.' },
  { word: 'Fervent', meaning: 'Intensely passionate or enthusiastic', example: 'He was a fervent supporter of free public libraries.' },
  { word: 'Grapple', meaning: 'Struggle with a difficult problem', example: 'The essay grapples with the complexity of modern identity.' },
  { word: 'Heed', meaning: 'Pay careful attention to advice', example: 'Writers who heed feedback improve much faster.' },
  { word: 'Insightful', meaning: 'Showing deep understanding', example: 'Her insightful critique revealed flaws no one else had spotted.' },
  { word: 'Jargon', meaning: 'Specialised vocabulary of a particular group', example: 'Avoid technical jargon when writing for a general audience.' },
  { word: 'Keen', meaning: 'Enthusiastic; sharp or perceptive', example: 'A keen eye for detail separates good writing from great writing.' },
];

export const VOCAB_POOL = VOCAB_POOL_EXT.length > 0 ? VOCAB_POOL_EXT : VOCAB_FALLBACK;

export function simplifyMeaning(meaning: string) {
  const cleaned = meaning
    .replace(/\s+/g, ' ')
    .replace(/\s*[—–-]\s*.*$/, '')
    .replace(/\s*\([^)]*\)/g, '')
    .trim();

  const replacements: Array<[RegExp, string]> = [
    [/^The quality of being\s+/i, 'Being '],
    [/^The quality of\s+/i, ''],
    [/^The ability to\s+/i, 'Able to '],
    [/^The act of\s+/i, 'Doing '],
    [/^The process of\s+/i, 'The process of '],
    [/^A feeling of\s+/i, 'Feeling of '],
    [/^A state of\s+/i, 'A state of '],
    [/^A person who\s+/i, 'Someone who '],
    [/^A person or thing that is\s+/i, 'Someone or something that is '],
    [/^Something that\s+/i, 'Something that '],
    [/^Done\s+/i, 'Done '],
    [/^Showing\s+/i, 'Showing '],
    [/^Having\s+/i, 'Having '],
    [/^Very\s+/i, 'Very '],
    [/^Capable of\s+/i, 'Able to '],
    [/^Made up of\s+/i, 'Made of '],
    [/^Forming\s+/i, 'Forming '],
    [/^Relating to\s+/i, 'About '],
    [/^Concerned with\s+/i, 'About '],
    [/^Used to\s+/i, 'Used to '],
    [/^The state of being\s+/i, 'Being '],
  ];

  let text = cleaned;
  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  text = text.replace(/\butilising\b/gi, 'using');
  text = text.replace(/\butilizing\b/gi, 'using');
  text = text.replace(/\bsubstantiate\b/gi, 'prove');
  text = text.replace(/\babstract\b/gi, 'not physical');
  text = text.replace(/\bpersevering\b/gi, 'keep going');

  return text || meaning.trim();
}

function isKnownAgeGroup(ageGroup?: string): ageGroup is (typeof USER_AGE_GROUP_ORDER)[number] {
  return !!ageGroup && USER_AGE_GROUP_INDEX.has(ageGroup as (typeof USER_AGE_GROUP_ORDER)[number]);
}

function normalizeWord(word: string) {
  return word.trim().toLowerCase();
}

function dedupeEntries(entries: VocabEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = normalizeWord(entry.word);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function localDayIndex(date = new Date()) {
  const localMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(localMidnight.getTime() / 86400000);
}

function getRotatingWords(pool: VocabEntry[], dayIdx: number, count = DAILY_VOCAB_COUNT) {
  if (pool.length === 0) return VOCAB_FALLBACK.slice(0, count);
  const offsets = Array.from({ length: count }, (_, index) => Math.floor((pool.length * index) / count));
  return offsets.map((offset) => pool[(dayIdx + offset) % pool.length]);
}

const vocabPoolCache = new Map<string, VocabEntry[]>();

export function getVocabPool(ageGroup?: string): VocabEntry[] {
  const normalizedAgeGroup = ageGroup?.trim() || '';
  const cacheKey = normalizedAgeGroup || 'generic';
  const cached = vocabPoolCache.get(cacheKey);
  if (cached) return cached;

  let pool: VocabEntry[];

  if (isKnownAgeGroup(normalizedAgeGroup)) {
    pool = dedupeEntries(VOCAB_BY_AGE[normalizedAgeGroup] ?? []).slice(0, AGE_VOCAB_POOL_SIZE);
  } else {
    pool = dedupeEntries(VOCAB_POOL.length > 0 ? VOCAB_POOL : VOCAB_FALLBACK).slice(0, AGE_VOCAB_POOL_SIZE);
  }

  if (pool.length === 0) {
    pool = VOCAB_FALLBACK.slice(0, AGE_VOCAB_POOL_SIZE);
  }

  const simplifiedPool = pool.map((entry) => ({
    ...entry,
    meaning: simplifyMeaning(entry.meaning),
  }));

  vocabPoolCache.set(cacheKey, simplifiedPool);
  return simplifiedPool;
}

export function getDailyWords(ageGroup?: string, count = DAILY_VOCAB_COUNT): VocabEntry[] {
  return getRotatingWords(getVocabPool(ageGroup), localDayIndex(), count);
}

export function getWeekWords(ageGroup?: string): VocabEntry[] {
  const pool = getVocabPool(ageGroup);
  const today = new Date();
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? 6 : dow - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const weekWords: VocabEntry[] = [];
  for (let d = 0; d < 4; d += 1) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + d);
    weekWords.push(...getRotatingWords(pool, localDayIndex(date), DAILY_VOCAB_COUNT));
  }

  return dedupeEntries(weekWords);
}
