// Shared vocab utilities — used by vocab page and dashboard

import { VOCAB_BY_AGE } from '@/app/data/vocab-by-age';

// eslint-disable-next-line @typescript-eslint/no-require-imports
let VOCAB_POOL_EXT: { word: string; meaning: string; example: string }[] = [];
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@/app/data/vocab-pool');
  VOCAB_POOL_EXT = mod.VOCAB_POOL;
} catch {
  // falls through to FALLBACK below
}

export const VOCAB_FALLBACK: { word: string; meaning: string; example: string }[] = [
  { word: 'Eloquent',     meaning: 'Fluent or persuasive in speaking or writing',          example: 'She gave an eloquent speech that moved the audience to tears.' },
  { word: 'Persevere',    meaning: 'Continue in a course of action despite difficulty',    example: 'He chose to persevere with his studies despite the challenges.' },
  { word: 'Meticulous',   meaning: 'Showing great attention to detail; very careful',      example: 'The meticulous scientist recorded every tiny observation.' },
  { word: 'Empathy',      meaning: "The ability to understand and share another's feelings", example: 'Her empathy helped her connect with students who were struggling.' },
  { word: 'Synthesise',   meaning: 'Combine different ideas into a coherent whole',        example: 'The essay aims to synthesise arguments from both sides.' },
  { word: 'Ambiguous',    meaning: 'Open to more than one interpretation; unclear',        example: "The poem's ending is deliberately ambiguous." },
  { word: 'Rhetoric',     meaning: 'The art of effective or persuasive speaking/writing',  example: 'Politicians often rely on rhetoric to sway public opinion.' },
  { word: 'Juxtapose',    meaning: 'Place two things side by side to highlight contrast',  example: 'The author juxtaposes wealth and poverty throughout the novel.' },
  { word: 'Lucid',        meaning: 'Expressed clearly; easy to understand',                example: 'Her lucid explanation made the difficult concept simple.' },
  { word: 'Tenacious',    meaning: 'Holding firmly to a goal; persistent',                 example: 'The tenacious student revised every day until the exam.' },
  { word: 'Nuance',       meaning: 'A subtle difference in meaning, tone, or expression',  example: 'Good writers appreciate the nuance of language.' },
  { word: 'Infer',        meaning: 'Deduce from evidence rather than explicit statement',  example: 'From the clues, we can infer that the author is cynical.' },
  { word: 'Cohesive',     meaning: 'Forming a unified whole; well-connected',              example: 'A cohesive essay flows logically from start to finish.' },
  { word: 'Evocative',    meaning: 'Bringing strong images, memories, or feelings to mind', example: 'The evocative description made the scene feel real.' },
  { word: 'Concise',      meaning: 'Giving much information clearly in few words',         example: 'A concise answer is more powerful than a rambling one.' },
  { word: 'Substantiate', meaning: 'Provide evidence to support a claim',                  example: 'You must substantiate your argument with examples.' },
  { word: 'Pragmatic',    meaning: 'Dealing with things sensibly and realistically',       example: 'A pragmatic writer uses the simplest word that fits.' },
  { word: 'Resonant',     meaning: 'Evoking a response; having lasting impact',            example: 'The final line of the poem is deeply resonant.' },
  { word: 'Explicit',     meaning: 'Stated clearly with no room for confusion',            example: 'The instructions were explicit — no phones during the test.' },
  { word: 'Illuminate',   meaning: 'Help to clarify or explain something',                 example: 'Examples illuminate abstract concepts for the reader.' },
  { word: 'Catalyst',     meaning: 'Something that causes or accelerates change',          example: 'The speech was a catalyst for social reform.' },
  { word: 'Profound',     meaning: 'Having deep meaning or great insight',                 example: 'The novel asks profound questions about identity and belonging.' },
  { word: 'Scrutinise',   meaning: 'Examine or inspect closely and critically',            example: 'The editor will scrutinise every sentence before publishing.' },
  { word: 'Disparity',    meaning: 'A great difference between things',                    example: 'The essay highlights the disparity between rich and poor.' },
  { word: 'Articulate',   meaning: 'Express thoughts clearly and effectively',             example: 'She could articulate her ideas better than anyone in class.' },
  { word: 'Deliberate',   meaning: 'Done consciously and intentionally',                   example: "The author's use of short sentences is deliberate and powerful." },
  { word: 'Vivid',        meaning: 'Producing powerful, clear mental images',              example: 'Vivid imagery draws readers into the story world.' },
  { word: 'Credible',     meaning: 'Able to be believed; convincing',                      example: 'A credible argument is supported with reliable evidence.' },
  { word: 'Succinct',     meaning: 'Briefly and clearly expressed',                        example: 'Keep your introduction succinct — one paragraph is enough.' },
  { word: 'Imply',        meaning: 'Suggest without stating directly',                     example: 'The story implies that the character knows more than they say.' },
  // Extra words for richer weekly variety
  { word: 'Astute',       meaning: 'Having sharp insight; shrewd',                         example: 'An astute reader will spot the hidden symbolism immediately.' },
  { word: 'Candid',       meaning: 'Truthful and straightforward',                         example: 'Her candid feedback helped the team improve the proposal.' },
  { word: 'Diligent',     meaning: 'Careful and hard-working',                             example: 'Diligent revision is the key to improving your writing skills.' },
  { word: 'Emulate',      meaning: 'Match or surpass through imitation',                   example: 'She studied great writers and tried to emulate their style.' },
  { word: 'Fervent',      meaning: 'Intensely passionate or enthusiastic',                 example: 'He was a fervent supporter of free public libraries.' },
  { word: 'Grapple',      meaning: 'Struggle with a difficult problem',                    example: 'The essay grapples with the complexity of modern identity.' },
  { word: 'Heed',         meaning: 'Pay careful attention to advice',                      example: 'Writers who heed feedback improve much faster.' },
  { word: 'Insightful',   meaning: 'Showing deep understanding',                           example: 'Her insightful critique revealed flaws no one else had spotted.' },
  { word: 'Jargon',       meaning: 'Specialised vocabulary of a particular group',         example: 'Avoid technical jargon when writing for a general audience.' },
  { word: 'Keen',         meaning: 'Enthusiastic; sharp or perceptive',                    example: 'A keen eye for detail separates good writing from great writing.' },
];

export const VOCAB_POOL = VOCAB_POOL_EXT.length > 0 ? VOCAB_POOL_EXT : VOCAB_FALLBACK;

/** Get the vocab pool for a given age group, falling back to the general pool. */
export function getVocabPool(ageGroup?: string): { word: string; meaning: string; example: string }[] {
  if (ageGroup && ageGroup !== '' && VOCAB_BY_AGE[ageGroup]?.length > 0) {
    return VOCAB_BY_AGE[ageGroup];
  }
  return VOCAB_POOL;
}

/** Get this week's vocab words (Mon–Thu, 3 per day) for a given age group. */
export function getWeekWords(ageGroup?: string): { word: string; meaning: string; example: string }[] {
  const pool = getVocabPool(ageGroup);
  const today = new Date();
  const dow = today.getDay(); // 0=Sun … 6=Sat
  const mondayOffset = dow === 0 ? 6 : dow - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const len = pool.length;
  const weekWords: { word: string; meaning: string; example: string }[] = [];
  for (let d = 0; d < 4; d++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + d);
    const dayNum = Math.floor(date.getTime() / 86400000);
    weekWords.push(pool[dayNum % len]);
    weekWords.push(pool[(dayNum + Math.floor(len / 3)) % len]);
    weekWords.push(pool[(dayNum + Math.floor(2 * len / 3)) % len]);
  }
  const seen = new Set<string>();
  return weekWords.filter(w => { if (seen.has(w.word)) return false; seen.add(w.word); return true; });
}
