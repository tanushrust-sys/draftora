export type ProgressScoringWriting = {
  id: string;
  title?: string | null;
  content?: string | null;
  prompt?: string | null;
  word_count?: number | null;
  strengths?: string | null;
  improvements?: string | null;
  feedback?: string | null;
  created_at?: string | null;
  category?: string | null;
};

export type ProgressScore = {
  id: string;
  score: number;
  note: string;
};

type AgeBand = 'children' | 'teens' | 'adults' | 'seniors';

function mapAgeBand(ageGroup?: string | null): AgeBand {
  switch (ageGroup) {
    case '5-7':
    case '8-10':
      return 'children';
    case '11-13':
    case '14-17':
      return 'teens';
    case '22+':
      return 'seniors';
    default:
      return 'adults';
  }
}

// Age settings define what "good", "strong", and "excellent" mean for each group.
// All ages share the same 0–100 scale — a strong piece in any age group scores similarly.
// The thresholds differ so that a 5-year-old's 90-word story is judged on 5-year-old
// expectations, not adult ones.
function getAgeSettings(ageGroup?: string | null) {
  const ageBand = mapAgeBand(ageGroup);
  switch (ageGroup) {
    case '5-7':
      return { ageBand, okayWords: 30, strongWords: 70,  excellentWords: 120, goodSentences: 3, strongSentences: 6,  targetParagraphs: 1, uniqueWordFloor: 0.40, uniqueWordStrong: 0.60, excellentNoteThreshold: 88, strongNoteThreshold: 72 };
    case '8-10':
      return { ageBand, okayWords: 45, strongWords: 100, excellentWords: 180, goodSentences: 4, strongSentences: 8,  targetParagraphs: 2, uniqueWordFloor: 0.40, uniqueWordStrong: 0.60, excellentNoteThreshold: 88, strongNoteThreshold: 72 };
    case '11-13':
      return { ageBand, okayWords: 70, strongWords: 160, excellentWords: 280, goodSentences: 5, strongSentences: 10, targetParagraphs: 2, uniqueWordFloor: 0.38, uniqueWordStrong: 0.56, excellentNoteThreshold: 88, strongNoteThreshold: 72 };
    case '14-17':
      return { ageBand, okayWords: 100, strongWords: 200, excellentWords: 350, goodSentences: 6, strongSentences: 12, targetParagraphs: 3, uniqueWordFloor: 0.36, uniqueWordStrong: 0.54, excellentNoteThreshold: 88, strongNoteThreshold: 72 };
    case '18-21':
      return { ageBand, okayWords: 120, strongWords: 220, excellentWords: 400, goodSentences: 6, strongSentences: 13, targetParagraphs: 3, uniqueWordFloor: 0.34, uniqueWordStrong: 0.50, excellentNoteThreshold: 88, strongNoteThreshold: 72 };
    case '22+':
      return { ageBand, okayWords: 130, strongWords: 250, excellentWords: 450, goodSentences: 7, strongSentences: 14, targetParagraphs: 3, uniqueWordFloor: 0.32, uniqueWordStrong: 0.48, excellentNoteThreshold: 88, strongNoteThreshold: 72 };
    default:
      return { ageBand, okayWords: 120, strongWords: 220, excellentWords: 400, goodSentences: 6, strongSentences: 13, targetParagraphs: 3, uniqueWordFloor: 0.34, uniqueWordStrong: 0.50, excellentNoteThreshold: 88, strongNoteThreshold: 72 };
  }
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string) {
  return normalize(text).split(' ').filter(Boolean);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function countSentences(text: string) {
  const matches = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  return matches?.map((sentence) => sentence.trim()).filter(Boolean).length ?? 0;
}

function countParagraphs(text: string) {
  return text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean).length;
}

function uniqueWordRatio(text: string) {
  const tokens = tokenize(text);
  if (tokens.length === 0) return 0;
  return new Set(tokens).size / tokens.length;
}

function overlapRatio(a: string[], b: string[]) {
  if (a.length === 0 || b.length === 0) return 0;
  const aSet = new Set(a);
  const bSet = new Set(b);
  let intersection = 0;
  for (const word of aSet) {
    if (bSet.has(word)) intersection += 1;
  }
  const union = new Set([...aSet, ...bSet]).size || 1;
  return intersection / union;
}

function promptCopySeverity(content?: string | null, prompt?: string | null) {
  const normalizedContent = normalize(content ?? '');
  const normalizedPrompt = normalize(prompt ?? '');

  if (!normalizedContent || !normalizedPrompt) return 0;
  if (normalizedContent === normalizedPrompt) return 1;
  if (normalizedContent.startsWith(normalizedPrompt)) {
    const extraWords = tokenize(normalizedContent.slice(normalizedPrompt.length)).length;
    if (extraWords <= 6) return 0.95;
    if (extraWords <= 14) return 0.8;
  }

  const contentTokens = tokenize(normalizedContent);
  const promptTokens = tokenize(normalizedPrompt);
  const overlap = overlapRatio(contentTokens, promptTokens);
  const wordDiff = Math.abs(contentTokens.length - promptTokens.length);

  if (overlap >= 0.9 && wordDiff <= 6) return 0.92;
  if (overlap >= 0.8 && wordDiff <= 10) return 0.82;
  if (overlap >= 0.65 && wordDiff <= 16) return 0.6;
  return 0;
}

function hasHardFailureFeedback(writing: ProgressScoringWriting) {
  const text = `${writing.feedback ?? ''} ${writing.improvements ?? ''}`.toLowerCase();
  return [
    'does not contain any narrative content',
    'merely a restatement of the writing prompt',
    'no creative writing present',
    'no actual story present',
    'copied the prompt',
    'cannot see your story yet',
    'did not answer the prompt yet',
    'too short to evaluate',
  ].some((phrase) => text.includes(phrase));
}

// Component scores — max values sum to 90, base is 10, total max = 100.
// Each function scores 0..max based on how close the piece is to the age-group's target.

// Max 30: word count relative to excellentWords
function lengthBandScore(words: number, excellentWords: number) {
  return clamp((words / excellentWords) * 30, 0, 30);
}

// Max 20: sentence count relative to strongSentences
function sentenceBandScore(sentences: number, goodSentences: number, strongSentences: number) {
  if (sentences <= 0) return 0;
  if (sentences >= strongSentences) return 20;
  if (sentences >= goodSentences) return 12 + ((sentences - goodSentences) / Math.max(1, strongSentences - goodSentences)) * 8;
  return clamp((sentences / goodSentences) * 12, 0, 12);
}

// Max 15: paragraph structure relative to targetParagraphs
function paragraphBandScore(paragraphs: number, targetParagraphs: number) {
  if (paragraphs <= 0) return 0;
  if (paragraphs >= targetParagraphs) return 15;
  return clamp((paragraphs / targetParagraphs) * 15, 0, 15);
}

// Max 15: vocabulary variety (unique word ratio)
function varietyBandScore(ratio: number, floor: number, strong: number) {
  if (ratio <= floor) return clamp((ratio / Math.max(0.01, floor)) * 7, 0, 7);
  if (ratio >= strong) return 15;
  return 7 + ((ratio - floor) / Math.max(0.01, strong - floor)) * 8;
}

// Max 10: feedback completeness (has feedback/strengths/improvements from AI review)
function feedbackDepthScore(writing: ProgressScoringWriting) {
  let score = 0;
  if (writing.feedback) score += 4;
  if (writing.improvements) score += 3;
  if (writing.strengths) score += 3;
  return score;
}

function realismNote(score: number, copiedPrompt: number, settings: ReturnType<typeof getAgeSettings>) {
  if (copiedPrompt >= 0.8) {
    return settings.ageBand === 'children' ? 'Mostly copied the prompt' : 'Prompt copied or barely changed';
  }
  if (score >= settings.excellentNoteThreshold) return 'Excellent for this age group';
  if (score >= settings.strongNoteThreshold) return 'Strong progress for this age group';
  if (score >= 55) return 'Developing well';
  if (score >= 30) return 'Needs more detail and structure';
  return settings.ageBand === 'children' ? 'Needs a real story, not just the prompt' : 'Needs original writing, not the prompt itself';
}

function finalScore(score: number, copiedPrompt: number, settings: ReturnType<typeof getAgeSettings>) {
  if (copiedPrompt >= 0.6) return Math.min(Math.round(score), 24);
  const topScore = settings.ageBand === 'seniors' ? 98 : 100;
  return clamp(Math.round(score), 10, topScore);
}

export function buildProgressScores(writings: ProgressScoringWriting[], ageGroup?: string | null): ProgressScore[] {
  const settings = getAgeSettings(ageGroup);

  return writings.map((writing) => {
    const content = (writing.content ?? '').trim();
    const words = writing.word_count ?? tokenize(content).length;
    const sentences = countSentences(content);
    const paragraphs = countParagraphs(content);
    const uniqueRatio = uniqueWordRatio(content);
    const copiedPrompt = promptCopySeverity(content, writing.prompt);
    const hardFailure = hasHardFailureFeedback(writing);

    if (hardFailure || copiedPrompt >= 0.8) {
      const score = copiedPrompt >= 0.95 || hardFailure ? 10 : 12;
      return {
        id: writing.id,
        score,
        note: realismNote(score, copiedPrompt, settings),
      };
    }

    // Base 10 + components max 90 = max 100
    let score =
      10 +
      lengthBandScore(words, settings.excellentWords) +
      sentenceBandScore(sentences, settings.goodSentences, settings.strongSentences) +
      paragraphBandScore(paragraphs, settings.targetParagraphs) +
      varietyBandScore(uniqueRatio, settings.uniqueWordFloor, settings.uniqueWordStrong) +
      feedbackDepthScore(writing);

    // Penalties for clearly under-developed pieces
    if (words < settings.okayWords * 0.5) score -= 20;
    else if (words < settings.okayWords) score -= 10;

    if (sentences < 2) score -= 18;
    else if (sentences < Math.max(2, settings.goodSentences - 2)) score -= 8;

    if (paragraphs <= 1 && words > settings.strongWords) score -= 8;
    if (uniqueRatio < settings.uniqueWordFloor * 0.8) score -= 15;
    else if (uniqueRatio < settings.uniqueWordFloor) score -= 8;

    score = finalScore(score, copiedPrompt, settings);

    return {
      id: writing.id,
      score,
      note: realismNote(score, copiedPrompt, settings),
    };
  });
}

export function buildAgeAwareProgressAnalysis(
  writings: ProgressScoringWriting[],
  ageGroup?: string | null,
) {
  if (writings.length === 0) return null;

  const settings = getAgeSettings(ageGroup);
  const sorted = [...writings].sort((a, b) => Date.parse(a.created_at ?? '') - Date.parse(b.created_at ?? ''));
  const scores = buildProgressScores(sorted, ageGroup);
  const avgScore = Math.round(scores.reduce((sum, item) => sum + item.score, 0) / scores.length);
  const totalWords = sorted.reduce((sum, item) => sum + (item.word_count || 0), 0);
  const avgWords = Math.round(totalWords / sorted.length);
  const trend = scores.length >= 2 ? scores[scores.length - 1].score - scores[0].score : 0;
  const copiedCount = sorted.filter((writing) => promptCopySeverity(writing.content, writing.prompt) >= 0.8 || hasHardFailureFeedback(writing)).length;
  const categories = new Set(sorted.map((item) => item.category).filter(Boolean));

  const childTone = settings.ageBand === 'children';

  return {
    summary: childTone
      ? `You have ${sorted.length} reviewed piece${sorted.length === 1 ? '' : 's'} with an average score of ${avgScore}/100. Your writing changed ${trend >= 0 ? `up by ${trend}` : `down by ${Math.abs(trend)}`} points from the first piece to the latest one.`
      : `You have ${sorted.length} reviewed piece${sorted.length === 1 ? '' : 's'} with an average score of ${avgScore}/100. Your drafts average about ${avgWords} words, and your trend is ${trend >= 0 ? `up ${trend}` : `down ${Math.abs(trend)}`} points from the first piece to the latest one.`,
    strengths: [
      avgScore >= 80
        ? childTone ? 'Your best piece shows strong writing for your age.' : 'Your strongest piece is performing at a very high level for this age group.'
        : childTone ? 'You are practicing and building your writing skills.' : 'You are building a consistent review history, which makes the trend meaningful.',
      categories.size > 1
        ? childTone ? `You are trying ${categories.size} kinds of writing.` : `You are working across ${categories.size} writing categories, which gives the graph more range.`
        : childTone ? 'You are building confidence in one writing style.' : 'You are building consistency in a focused writing style.',
      copiedCount < sorted.length
        ? childTone ? 'At least one piece shows your own real ideas, not just the prompt.' : 'Your stronger submissions show original thinking rather than prompt repetition.'
        : childTone ? 'You are still showing up and practicing.' : 'You are still creating a review trail we can use to measure improvement.',
    ],
    areasToImprove: [
      copiedCount > 0
        ? childTone ? 'Do not copy the prompt. Add your own story words.' : 'The biggest issue is prompt-copying. Pieces that mostly repeat the prompt should score near the bottom.'
        : childTone ? 'Add more of your own ideas in each piece.' : 'Push each piece beyond the prompt so the score reflects your own thinking.',
      avgWords < settings.strongWords
        ? childTone ? 'Make each story a little longer with one more detail or event.' : 'Most pieces need more development for this age group, especially in the middle.'
        : childTone ? 'Break long pieces into clear parts.' : 'Even longer pieces will score better if they are broken into cleaner paragraphs.',
      childTone ? 'Use clear beginning, middle, and end.' : 'Focus on stronger structure: clearer openings, fuller middles, and endings that feel complete.',
    ],
    writingPatterns: childTone
      ? `Your pieces average ${avgWords} words. ${copiedCount > 0 ? `${copiedCount} piece${copiedCount === 1 ? '' : 's'} mostly repeated the prompt, which pulled the graph down.` : 'Your scores mostly change when you add more of your own ideas.'}`
      : `Your pieces average ${avgWords} words. ${copiedCount > 0 ? `${copiedCount} piece${copiedCount === 1 ? '' : 's'} looked too close to the prompt itself, so those scores were heavily reduced.` : 'The graph mostly rises when your drafts show more original content and clearer structure.'}`,
    vocabularyTrend: childTone
      ? 'The score goes up when you use your own words instead of repeating the prompt.'
      : 'The scoring now reacts strongly to originality, so repeating the prompt will drop vocabulary and progress signals sharply.',
    recommendation: childTone
      ? 'For your next piece, do not copy the prompt. Write 3 new sentences that tell your own story.'
      : 'For your next piece, treat the prompt as a starting idea only, then add original detail, structure, and a clear point of view.',
  };
}
