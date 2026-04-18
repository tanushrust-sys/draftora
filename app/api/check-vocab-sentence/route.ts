// API route: POST /api/check-vocab-sentence
// Checks if a user's sentence correctly uses a vocabulary word

import { NextResponse } from 'next/server';
import { chat, extractJSON } from '@/app/lib/ai-provider';
import { getWritingExperienceBand, getWritingExperienceLabel, getWritingExperiencePromptContext } from '@/app/lib/writing-experience';

type SentenceFeedbackGrade = 'correct' | 'mostly correct' | 'mostly incorrect' | 'incorrect';

type SentenceFeedback = {
  grade: SentenceFeedbackGrade;
  correct: boolean;
  strengths: string;
  improvements: string;
  summary: string;
  suggestion: string;
  vocabularySuggestions: string[];
};

const FALLBACK_FEEDBACK: SentenceFeedback = {
  grade: 'incorrect',
  correct: false,
  strengths: '',
  improvements: 'Live AI feedback is unavailable right now, so try again in a moment for a full check.',
  summary: 'Your progress is still safe.',
  suggestion: '',
  vocabularySuggestions: ['precise', 'vivid', 'descriptive', 'compelling'],
};

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'because', 'but', 'by', 'for', 'from', 'has', 'have',
  'he', 'her', 'his', 'i', 'in', 'is', 'it', 'its', 'just', 'like', 'me', 'my', 'not', 'of', 'on',
  'or', 'our', 'she', 'so', 'that', 'the', 'their', 'them', 'there', 'they', 'this', 'to', 'was',
  'we', 'were', 'with', 'you', 'your',
]);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildWordVariantRegex(word: string) {
  const base = word.trim().toLowerCase();
  if (!base) return null;

  const stems = new Set<string>([base]);
  if (base.endsWith('y') && base.length > 2) stems.add(`${base.slice(0, -1)}i`);
  if (base.endsWith('e') && base.length > 2) stems.add(base.slice(0, -1));

  const suffixes = '(?:s|es|ed|d|ing|er|est|ly|ness|ment|ful|less|able|ible|tion|sion|al)?';
  const stemPattern = Array.from(stems).map(escapeRegExp).join('|');
  return new RegExp(`\\b(?:${stemPattern})${suffixes}\\b`, 'i');
}

function sentenceUsesTargetWord(sentence: string, word: string) {
  const matcher = buildWordVariantRegex(word);
  return matcher ? matcher.test(sentence) : false;
}

function tokenize(text: string) {
  return text.toLowerCase().match(/[a-z']+/g)?.filter(Boolean) ?? [];
}

function extractKeywords(text: string) {
  return tokenize(text).filter(token => token.length > 3 && !STOPWORDS.has(token));
}

function gradeFromCorrect(correct: boolean): SentenceFeedbackGrade {
  return correct ? 'correct' : 'incorrect';
}

function correctFromGrade(grade: SentenceFeedbackGrade) {
  return grade === 'correct' || grade === 'mostly correct';
}

function createFeedback(grade: SentenceFeedbackGrade, strengths: string, improvements: string, summary: string, suggestion = ''): SentenceFeedback {
  return {
    grade,
    correct: correctFromGrade(grade),
    strengths,
    improvements,
    summary,
    suggestion,
    vocabularySuggestions: [],
  };
}

function normalizeSuggestionWord(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z-]/g, '');
}

function toWordSet(text: string) {
  return new Set(tokenize(text).map(normalizeSuggestionWord).filter(Boolean));
}

function parseVocabularySuggestions(value: unknown): string[] {
  const rawItems: string[] = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : typeof value === 'string'
      ? value.split(/[,\n;/]+/)
      : [];

  const seen = new Set<string>();
  const output: string[] = [];
  for (const raw of rawItems) {
    const candidate = normalizeSuggestionWord(raw);
    if (!candidate || candidate.length < 3) continue;
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    output.push(candidate);
    if (output.length >= 8) break;
  }
  return output;
}

function buildVocabularySuggestions(word: string, meaning: string, sentence: string, seed: string[] = [], limit = 4) {
  const usedWords = toWordSet(sentence);
  const target = normalizeSuggestionWord(word);
  const keywordPool = extractKeywords(meaning)
    .map(normalizeSuggestionWord)
    .filter(Boolean);
  const fallbackPool = [
    'precise', 'vivid', 'descriptive', 'compelling', 'dynamic', 'evocative', 'detailed', 'powerful',
    'turbulent', 'ominous', 'resilient', 'cohesive',
  ];

  const combined = [...seed, ...keywordPool, ...fallbackPool];
  const unique = new Set<string>();
  const suggestions: string[] = [];
  for (const item of combined) {
    const normalized = normalizeSuggestionWord(item);
    if (!normalized || normalized.length < 3) continue;
    if (normalized === target) continue;
    if (usedWords.has(normalized)) continue;
    if (unique.has(normalized)) continue;
    unique.add(normalized);
    suggestions.push(normalized);
    if (suggestions.length >= limit) break;
  }

  if (suggestions.length < limit) {
    for (const item of fallbackPool) {
      if (suggestions.length >= limit) break;
      const normalized = normalizeSuggestionWord(item);
      if (!normalized || normalized === target || usedWords.has(normalized) || unique.has(normalized)) continue;
      unique.add(normalized);
      suggestions.push(normalized);
    }
  }

  return suggestions.slice(0, limit);
}

function normalizeGrade(value: unknown): SentenceFeedbackGrade | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (normalized === 'correct') return 'correct';
  if (normalized === 'mostly correct' || normalized === 'almost correct' || normalized === 'partially correct' || normalized === 'nearly correct') {
    return 'mostly correct';
  }
  if (normalized === 'mostly incorrect' || normalized === 'mostly wrong' || normalized === 'almost incorrect' || normalized === 'partially incorrect' || normalized === 'partially wrong') {
    return 'mostly incorrect';
  }
  if (normalized === 'incorrect' || normalized === 'wrong' || normalized === 'false') return 'incorrect';
  return null;
}

function buildHeuristicFeedback(word: string, meaning: string, sentence: string, ageGroup?: string): SentenceFeedback {
  const trimmed = sentence.trim();
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const includesWord = sentenceUsesTargetWord(trimmed, word);
  const hasEndingPunctuation = /[.!?]$/.test(trimmed);
  const uniqueRatio = tokens.length ? new Set(tokens.map(token => token.toLowerCase())).size / tokens.length : 1;
  const repeatedChunk = /(.)\1{4,}/i.test(trimmed);
  const suspiciousTokens = tokens.filter(token => /[a-z]/i.test(token) && token.length >= 6 && !/[aeiou]/i.test(token));
  const meaningKeywords = extractKeywords(meaning);
  const meaningHits = meaningKeywords.filter(keyword => new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i').test(trimmed));
  const meaningOverlap = meaningKeywords.length ? meaningHits.length / meaningKeywords.length : 0;
  const clearAttempt = tokens.length >= 6 || includesWord || meaningOverlap >= 0.2;
  const isYoungLearner = ageGroup === '5-7' || ageGroup === '8-10' || ageGroup === '11-13';

  if (repeatedChunk || suspiciousTokens.length >= 1 || (tokens.length >= 6 && uniqueRatio < 0.34)) {
    return createFeedback('incorrect', '', `Give it another go! Try writing a clear sentence using "${word}" with a subject and action.`, 'You can do it!');
  }

  if (includesWord) {
    if (tokens.length < 5) {
      return createFeedback('mostly correct', `Good start using "${word}" correctly.`, 'Add one more detail to make the idea clearer.', 'Good start!');
    }

    if (!hasEndingPunctuation || tokens.length < 8 || uniqueRatio < 0.5) {
      return createFeedback('mostly correct', `"${word}" fits well in your sentence.`, 'Add a little more detail or punctuation to make it polished.', 'Almost there!');
    }

    return createFeedback('correct', `Lovely sentence — "${word}" is used naturally and clearly.`, '', 'Well done!');
  }

  if (meaningOverlap >= 0.4 || (clearAttempt && meaningOverlap >= 0.2)) {
    return createFeedback(
      'mostly incorrect',
      meaningOverlap >= 0.3 ? 'You captured part of the idea correctly.' : 'You made a real attempt to show the meaning.',
      `Try using "${word}" more directly so the meaning comes through clearly.`,
      'Close, but not quite.',
    );
  }

  if (!includesWord) {
    return createFeedback(
      isYoungLearner && clearAttempt ? 'mostly incorrect' : 'incorrect',
      '',
      `Almost there — just make sure to include the word "${word}" in your sentence.`,
      'Nearly there!',
    );
  }

  return createFeedback('incorrect', '', `Try writing a clearer sentence using "${word}" to show the meaning more directly.`, 'Try again!');
}

function buildPositiveStrength(word: string, sentence: string) {
  const trimmed = sentence.trim();
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const includesWord = sentenceUsesTargetWord(trimmed, word);

  if (tokens.length >= 10) {
    return includesWord
      ? `Well done. You used "${word}" in a complete sentence with enough context to show the meaning clearly.`
      : `Well done. This is a clear, complete sentence with enough detail to show strong control.`;
  }

  if (tokens.length >= 6) {
    return includesWord
      ? `Nice work. You used "${word}" correctly in a clear sentence.`
      : 'Nice work. This is a clear sentence with a sensible structure.';
  }

  return includesWord
    ? `Good job using "${word}" in the sentence correctly.`
    : 'Good job. The sentence is clear and readable.';
}

function parseFeedbackPayload(raw: string) {
  const cleaned = extractJSON(raw).trim();
  const candidates = [cleaned];

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(cleaned.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // Try the next candidate shape.
    }
  }

  return null;
}

function normalizeFeedback(value: unknown): SentenceFeedback | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Record<string, unknown>;
  const grade = normalizeGrade(candidate.grade)
    ?? normalizeGrade(candidate.status)
    ?? normalizeGrade(candidate.level)
    ?? (() => {
      const correctValue = candidate.correct;
      if (typeof correctValue === 'boolean') {
        return gradeFromCorrect(correctValue);
      }
      if (typeof correctValue === 'string') {
        const lowered = correctValue.toLowerCase();
        if (['true', 'yes', 'correct'].includes(lowered)) return 'correct';
        if (['mostly correct', 'almost correct', 'partially correct'].includes(lowered)) return 'mostly correct';
        if (['mostly incorrect', 'almost incorrect', 'partially incorrect'].includes(lowered)) return 'mostly incorrect';
        return 'incorrect';
      }
      return null;
    })();

  if (!grade) return null;

  const strengths = typeof candidate.strengths === 'string' ? candidate.strengths.trim() : '';
  const improvements = typeof candidate.improvements === 'string' ? candidate.improvements.trim() : '';
  const summary = typeof candidate.summary === 'string' ? candidate.summary.trim() : '';
  const suggestion = typeof candidate.suggestion === 'string' ? candidate.suggestion.trim() : '';
  const vocabularySuggestions = parseVocabularySuggestions(
    (candidate as { vocabularySuggestions?: unknown; vocabulary_suggestions?: unknown }).vocabularySuggestions
      ?? (candidate as { vocabulary_suggestions?: unknown }).vocabulary_suggestions,
  );

  if (!summary) {
    return null;
  }

  return {
    grade,
    correct: correctFromGrade(grade),
    strengths,
    improvements,
    summary,
    suggestion,
    vocabularySuggestions,
  };
}

function mapAgeGroup(ageGroup?: string) {
  switch (ageGroup) {
    case '5-7':
      return 'children (ages 5-7)';
    case '8-10':
      return 'children (ages 8-10)';
    case '11-13':
      return 'teens (ages 11-13)';
    case '14-17':
      return 'teens (ages 14-17)';
    case '18-21':
      return 'adults (ages 18-21)';
    case '22+':
      return 'seniors (22+)';
    default:
      return 'the user age group';
  }
}

function isYoungerAgeGroup(ageGroup?: string) {
  return ageGroup === '5-7' || ageGroup === '8-10' || ageGroup === '11-13' || ageGroup === '14-17';
}

function softenPraise(text: string, ageGroup?: string, writingExperienceScore?: number) {
  if (!text || !isYoungerAgeGroup(ageGroup)) return text;
  const experienceBand = getWritingExperienceBand(writingExperienceScore);
  if (experienceBand === 'confident' || experienceBand === 'advanced') return text;

  return text
    .replace(/\bdid a great job\b/gi, 'used the word correctly')
    .replace(/\bgreat job\b/gi, 'good work')
    .replace(/\bexcellent\b/gi, 'solid')
    .replace(/\bamazing\b/gi, 'strong')
    .replace(/\bfantastic\b/gi, 'good')
    .replace(/\bawesome\b/gi, 'good')
    .replace(/\bincredible\b/gi, 'strong')
    .replace(/\boutstanding\b/gi, 'strong');
}

function promoteAgePraise(strengths: string, improvements: string, ageGroup?: string) {
  if (!isYoungerAgeGroup(ageGroup)) {
    return { strengths, improvements };
  }

  const agePraisePattern = /(?:too advanced for the age group|advanced for the age group|above (?:their|your) age level|age-appropriate|for the age group)/i;
  if (!agePraisePattern.test(improvements)) {
    return { strengths, improvements };
  }

  const sentence = improvements
    .split(/(?<=[.!?])\s+/)
    .find(part => agePraisePattern.test(part))?.trim() ?? '';

  if (!sentence) {
    return { strengths, improvements };
  }

  const cleanedImprovements = improvements
    .replace(sentence, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s*[,;:-]\s*/g, '')
    .trim();

  const promotedStrength = sentence
    .replace(/\bWhile the sentence is correct,\s*/i, '')
    .replace(/\bmay be a bit\b/i, 'is')
    .replace(/\btoo advanced for the age group\b/i, 'strong for the age group')
    .replace(/\badvanced for the age group\b/i, 'strong for the age group')
    .replace(/\babove (?:their|your) age level\b/i, 'strong for the age group')
    .replace(/\bfor the age group\b/i, 'for this age group')
    .trim();

  const nextStrengths = strengths
    ? `${strengths} ${promotedStrength}`
    : promotedStrength;

  return {
    strengths: nextStrengths.replace(/\s{2,}/g, ' ').trim(),
    improvements: cleanedImprovements || 'Keep refining the sentence with one more specific detail and a clear finish.',
  };
}

async function generateFeedback(word: string, meaning: string, sentence: string, ageGroup?: string, writingExperienceScore?: number) {
  const lowQualityHint = buildHeuristicFeedback(word, meaning, sentence, ageGroup);
  const mappedAgeGroup = mapAgeGroup(ageGroup);
  const experienceLabel = getWritingExperienceLabel(writingExperienceScore);
  const isYoung = ageGroup === '5-7' || ageGroup === '8-10';
  const isTeen = ageGroup === '11-13' || ageGroup === '14-17';

  const lenientRules = isYoung
    ? `IMPORTANT — Age leniency rules for young learners (${mappedAgeGroup}):
- Accept ANY answer that captures the general idea of the word, even if it is not perfectly precise. For example, if the word means "full of anticipation" and the student says "waiting for something", mark as CORRECT.
- Accept simplified, child-friendly paraphrases as correct. The student does not need to use formal language.
- Only mark incorrect if the student's answer is completely unrelated to the word's meaning, or if the sentence is gibberish.
- Be extremely generous. When in doubt, mark as correct and gently guide toward a more complete sentence.`
    : isTeen
    ? `Age leniency rules for teens (${mappedAgeGroup}):
- Accept answers that show the student understands the core concept, even if they do not use precise vocabulary.
- Minor imprecisions or informal phrasing should still be marked correct.
- Only mark incorrect if the meaning is genuinely wrong or the sentence is nonsensical.`
    : `Age leniency rules for adults (${mappedAgeGroup}):
- Expect reasonable accuracy in usage but allow natural, informal phrasing.
- Minor imprecision is fine. Only mark incorrect if the word is clearly misused.`;

  const basePrompt = `You are a warm, supportive vocabulary coach who celebrates effort and guides improvement with kindness.

Target word: "${word}"
Meaning: "${meaning}"
Student sentence: "${sentence}"
Age group: ${mappedAgeGroup}
Writing experience: ${experienceLabel} (${Math.max(0, Math.min(100, Math.round(writingExperienceScore || 0)))}/100)

${lenientRules}

Respond with ONLY valid JSON. No markdown, no backticks, no extra text.

Core rules:
- Judge whether the student shows they understand the word — not whether they use it perfectly.
- Use this four-step grading scale:
  - "correct" = the sentence uses the word naturally, clearly, and accurately.
  - "mostly correct" = the student clearly understands the word, but the sentence is a little thin, awkward, or slightly unfinished.
  - "mostly incorrect" = the student has some idea or partial connection, but the usage is off or unclear.
  - "incorrect" = the sentence is wrong, unrelated, or gibberish.
- If the sentence is even a teeny bit correct, prefer "mostly correct" or "correct" over "incorrect".
- If the sentence has an idea but is not quite right, prefer "mostly incorrect" instead of harshly marking it fully wrong.
- "strengths": if the sentence shows any understanding, write one specific thing done well (max 20 words). If completely wrong, leave as empty string "".
- "improvements": if there is something worth improving, write one kind coaching tip (max 20 words). If sentence is strong, leave as empty string "".
- At least one of strengths or improvements must be non-empty.
- "summary" must be 5 words or fewer.
- "suggestion" leave as empty string always.
- "vocabularySuggestions": return exactly 4 single-word upgraded vocabulary options the student could use next time.
- Each vocabulary suggestion must be a real word (not a phrase, not categories, not labels).
- Do not include the target word "${word}".
- Do not include any word already used in the student sentence.
- If sentence is gibberish or not real, set "grade" to "incorrect" and "correct" to false.
- Always be warm, encouraging, and polite — never harsh or blunt.

Return exactly this JSON structure:
{
  "grade": "correct" | "mostly correct" | "mostly incorrect" | "incorrect",
  "correct": true or false,
  "strengths": "Max 20 words, or empty string.",
  "improvements": "Max 20 words, or empty string if sentence is strong.",
  "summary": "Up to 5 words.",
  "suggestion": "",
  "vocabularySuggestions": ["word1", "word2", "word3", "word4"]
  }`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await chat({
      tier: 'fast',
      system: `Return strict JSON with keys: grade, correct, strengths, improvements, summary, suggestion, vocabularySuggestions. Be warm and encouraging. Use the four-step grading scale exactly: correct, mostly correct, mostly incorrect, incorrect. Grade generously — reward understanding of the concept, not perfect precision. For young learners (ages 5-10) be extremely lenient: if the student shows any grasp of the meaning, prefer mostly correct or correct. strengths: one genuine polite strength max 20 words, or empty string. improvements: one kind coaching tip max 20 words, or empty string if strong. summary: max 5 words upbeat. suggestion: always empty string. vocabularySuggestions: exactly 4 single-word upgrade words, not used in the student sentence and not equal to the target word.`,
      maxTokens: 160,
      messages: [{ role: 'user', content: basePrompt }],
    });

    const normalized = normalizeFeedback(parseFeedbackPayload(raw));
    if (normalized) {
      if (lowQualityHint.grade === 'incorrect') {
        normalized.strengths = '';
      }
      normalized.vocabularySuggestions = buildVocabularySuggestions(
        word,
        meaning,
        sentence,
        normalized.vocabularySuggestions,
        4,
      );
      return normalized;
    }
  }

  return null;
}

export async function POST(req: Request) {
  let payload: { word?: string; meaning?: string; sentence?: string; ageGroup?: string; writingExperienceScore?: number } = {};

  try {
    payload = await req.json();
    const { word, meaning, sentence, ageGroup, writingExperienceScore = 0 } = payload;

    if (!word || !sentence || sentence.trim().length < 3) {
      return NextResponse.json({ error: 'Word and sentence are required' }, { status: 400 });
    }

    const cleanMeaning = typeof meaning === 'string' ? meaning : '';
    const cleanAge = typeof ageGroup === 'string' ? ageGroup : undefined;
    const feedback = await generateFeedback(word, cleanMeaning, sentence, cleanAge, writingExperienceScore);
    if (feedback) {
      return NextResponse.json({
        ...feedback,
        vocabularySuggestions: buildVocabularySuggestions(word, cleanMeaning, sentence, feedback.vocabularySuggestions, 4),
      });
    }
    const heuristic = buildHeuristicFeedback(word, cleanMeaning, sentence, cleanAge);
    return NextResponse.json({
      ...heuristic,
      vocabularySuggestions: buildVocabularySuggestions(word, cleanMeaning, sentence, [], 4),
    });
  } catch (error) {
    console.error('Vocab sentence check error:', error);
    const { word = '', sentence = '' } = payload;
    const meaning = typeof payload.meaning === 'string' ? payload.meaning : '';
    const age = typeof payload.ageGroup === 'string' ? payload.ageGroup : undefined;
    if (word && sentence) {
      const heuristic = buildHeuristicFeedback(word, meaning, sentence, age);
      return NextResponse.json({
        ...heuristic,
        vocabularySuggestions: buildVocabularySuggestions(word, meaning, sentence, [], 4),
      });
    }
    return NextResponse.json(FALLBACK_FEEDBACK);
  }
}
