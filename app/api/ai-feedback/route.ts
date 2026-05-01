import { NextResponse } from 'next/server';
import { chat, extractJSON } from '@/app/lib/ai-provider';
import { getWritingExperienceLabel } from '@/app/lib/writing-experience';

type WritingFeedback = {
  overall: string;
  paragraph_feedback: string;
  rewritten_version: string;
};

type RawFeedback = {
  summary: string;
  strengths: string;
  improvements: string;
  next_step: string;
  beginning: string;
  middle: string;
  end: string;
  rewritten_version: string;
};

type AssistSuggestion = {
  type: 'tip' | 'example';
  label: string;
  detail: string;
};

type AssistResult = {
  tips: AssistSuggestion[];
  examples: AssistSuggestion[];
};

const AI_FEEDBACK_UNAVAILABLE_MESSAGE =
  'AI feedback is unavailable right now. Your writing was received, so please try again in a moment.';

const AI_ASSIST_SYSTEM_PROMPT = `You are an expert writing revision coach. Your job is to deliver direct, specific, age-appropriate coaching with zero filler.
Read the writing prompt, writing category, and the user's current draft excerpt.
Return ONLY a valid JSON object with exactly 2 keys:
{
  "tips": [
    { "type": "tip", "label": "<5 words max>", "detail": "<one sentence actionable coaching>" }
  ],
  "examples": [
    { "type": "example", "label": "<5 words max>", "detail": "<one sentence example line/mini-example the student could adapt>" }
  ]
}

Rules:
- Return exactly 4 items in "tips" and exactly 4 items in "examples".
- Do not include any keys other than "tips" and "examples".
- Do not include any text outside the JSON object.
- Do not apologize, hedge, or offer generic encouragement.
- Do not invent plot facts that are not present in the prompt or excerpt.
- Tips must be precise, actionable, and directly tied to visible draft issues (or a strong start strategy when the draft is empty).
- Each tip must describe one concrete upgrade move, not a broad slogan.
- Examples must be concrete sample lines or micro-directions that the student can adapt immediately.
- Examples must sound like writing, not teacher commentary.
- When the draft is not empty, at least two tips must refer to a specific visible word, phrase, sentence, or missing move from the draft.
- When selected text is provided, prioritize that selected text over the rest of the draft.
- For rewrite/shorter/stronger/formal tools, examples should feel like before/after sentence-change directions, not generic advice.
- If the textarea is empty, all tips must teach how to begin with a strong image, action, or emotion, and all examples must show an actual opening move.
- If the draft is weak or underdeveloped, explain what is missing and give an exact revision move for stronger wording, structure, or clarity.
- Always favor specificity over general statements.
- Never repeat the same idea across multiple tips or examples.`;

const ASSIST_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'so', 'to', 'of', 'in', 'on', 'at', 'for',
  'with', 'from', 'by', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'it', 'its', 'i', 'you', 'he', 'she', 'they', 'we', 'my', 'your', 'his', 'her',
  'their', 'our', 'me', 'him', 'them', 'this', 'that', 'these', 'those', 'there',
  'here', 'then', 'than', 'if', 'when', 'while', 'because', 'about', 'into', 'out',
  'up', 'down', 'over', 'under', 'again', 'very', 'just', 'really',
]);

const ASSIST_SENSORY_WORDS = new Set([
  'bright', 'dark', 'cold', 'warm', 'hot', 'loud', 'quiet', 'silent', 'rough', 'smooth',
  'soft', 'sharp', 'bitter', 'sweet', 'salty', 'sour', 'fragrant', 'stale', 'glow', 'shadow',
  'whisper', 'shout', 'thunder', 'echo', 'scent', 'smell', 'taste', 'touch', 'texture',
]);

const ASSIST_EMOTION_WORDS = new Set([
  'afraid', 'angry', 'anxious', 'calm', 'confused', 'curious', 'excited', 'frustrated',
  'grateful', 'guilty', 'happy', 'hopeful', 'lonely', 'nervous', 'proud', 'relieved',
  'sad', 'scared', 'stressed', 'surprised', 'upset', 'worried',
]);

const ASSIST_TRANSITIONS = new Set([
  'after', 'before', 'during', 'meanwhile', 'however', 'therefore', 'later', 'next',
  'then', 'suddenly', 'finally', 'instead', 'because', 'although', 'eventually',
]);

function splitWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function trimToFiveWords(label: string) {
  return label.trim().split(/\s+/).slice(0, 5).join(' ');
}

function normalizeAssistSuggestion(raw: unknown, forcedType: 'tip' | 'example'): AssistSuggestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const labelRaw = String(item.label ?? '').trim();
  const detailRaw = String(item.detail ?? '').trim();

  if (!labelRaw || !detailRaw) return null;

  return {
    type: forcedType,
    label: trimToFiveWords(labelRaw),
    detail: detailRaw,
  };
}

function extractAssistTokens(text: string) {
  return text.toLowerCase().match(/[a-z']+/g) ?? [];
}

function countLexiconHits(tokens: string[], lexicon: Set<string>) {
  let total = 0;
  for (const token of tokens) {
    if (lexicon.has(token)) total += 1;
  }
  return total;
}

function findRepeatedAssistWord(tokens: string[]) {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    if (token.length < 4) continue;
    if (ASSIST_STOPWORDS.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  let result: { word: string; count: number } | null = null;
  for (const [word, count] of counts.entries()) {
    if (count < 4) continue;
    if (!result || count > result.count) {
      result = { word, count };
    }
  }
  return result;
}

function startsWithWeakSetup(sentence: string) {
  const lower = sentence.trim().toLowerCase();
  return (
    lower.startsWith('there is') ||
    lower.startsWith('there are') ||
    lower.startsWith('it is') ||
    lower.startsWith('it was') ||
    lower.startsWith('i am') ||
    lower.startsWith('i was')
  );
}

function assistFallback(prompt: string, content: string, category: string, mappedAgeGroup: string): AssistResult {
  const promptHint = (prompt.trim() || category.trim() || 'this piece').replace(/\s+/g, ' ').trim();
  const clean = content.trim();
  const hasContent = clean.length > 0;
  const kidMode = mappedAgeGroup === 'children';
  const categoryLower = category.toLowerCase();
  const narrativeStyle = /(creative|story|blog|feature|diary|personal|poetry)/.test(categoryLower);
  const persuasiveStyle = /(persuasive|essay)/.test(categoryLower);

  if (!hasContent) {
    return {
      tips: [
        { type: 'tip', label: 'Open With Action', detail: `Begin ${promptHint} with a clear action in the first sentence so readers enter the moment immediately.` },
        { type: 'tip', label: 'Anchor The Setting', detail: kidMode ? 'Add one place detail and one sound detail in your first two lines.' : 'Add one concrete place detail and one sensory detail in your first two lines.' },
        { type: 'tip', label: 'State A Goal Early', detail: 'Show what the main person wants right away so the scene has purpose.' },
        { type: 'tip', label: 'Introduce Early Tension', detail: 'Add a small problem by line three so readers want to continue.' },
      ],
      examples: [
        { type: 'example', label: 'Action First Line', detail: 'I slammed the locker shut and ran before anyone could read the note in my hand.' },
        { type: 'example', label: 'Setting Snapshot', detail: 'Cold rain ticked against the bus window while the station lights flickered above me.' },
        { type: 'example', label: 'Goal In View', detail: 'I only had ten minutes to convince her before the final bell rang.' },
        { type: 'example', label: 'Tension Trigger', detail: 'Then my phone buzzed with a message that changed what I had planned to say.' },
      ],
    };
  }

  const tokens = extractAssistTokens(clean);
  const sentences = splitIntoSentences(clean);
  const paragraphs = clean.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  const words = tokens.length;
  const averageSentenceWords = sentences.length > 0 ? Math.round(words / sentences.length) : words;
  const sensoryHits = countLexiconHits(tokens, ASSIST_SENSORY_WORDS);
  const emotionHits = countLexiconHits(tokens, ASSIST_EMOTION_WORDS);
  const transitionHits = countLexiconHits(tokens, ASSIST_TRANSITIONS);
  const repeatedWord = findRepeatedAssistWord(tokens);
  const firstSentence = sentences[0] ?? '';

  type AssistCandidate = {
    id: string;
    tipLabel: string;
    tipDetail: string;
    exampleLabel: string;
    exampleDetail: string;
  };
  const candidates: AssistCandidate[] = [];
  const addCandidate = (candidate: AssistCandidate) => {
    if (candidates.some((item) => item.id === candidate.id)) return;
    candidates.push(candidate);
  };

  if (words < 100) {
    addCandidate({
      id: 'develop-core-idea',
      tipLabel: 'Develop Core Idea',
      tipDetail: `Expand one key moment from ${promptHint} with 2-3 extra sentences that explain what happens, why it matters, and what changes next.`,
      exampleLabel: 'Expansion Move',
      exampleDetail: 'I thought it would be simple, but when the door opened, every plan I had started to fall apart.',
    });
  }

  if (averageSentenceWords > 24) {
    addCandidate({
      id: 'shorten-sentences',
      tipLabel: 'Shorten Long Sentences',
      tipDetail: `Your average sentence is about ${averageSentenceWords} words, so split one long line into two shorter beats for cleaner rhythm.`,
      exampleLabel: 'Sentence Split',
      exampleDetail: 'I ran for the gate, and my lungs burned, but I refused to slow down.',
    });
  }

  if (paragraphs.length <= 1 && words >= 120) {
    addCandidate({
      id: 'paragraph-structure',
      tipLabel: 'Break Into Paragraphs',
      tipDetail: 'Start a new paragraph when the focus shifts from action to reaction, or from one idea to the next.',
      exampleLabel: 'Paragraph Cue',
      exampleDetail: 'New paragraph after a turning point so readers can feel the shift in focus.',
    });
  }

  if (sensoryHits === 0) {
    addCandidate({
      id: 'sensory-detail',
      tipLabel: 'Add Sensory Detail',
      tipDetail: 'Include at least one sight, sound, or physical sensation so the scene feels real instead of abstract.',
      exampleLabel: 'Sensory Upgrade',
      exampleDetail: 'Cold wind scraped my face while the metal handle stung my fingers.',
    });
  }

  if (narrativeStyle && emotionHits === 0) {
    addCandidate({
      id: 'emotion-beat',
      tipLabel: 'Show Emotion Directly',
      tipDetail: 'Add one reaction beat that shows what your character feels right after the key event.',
      exampleLabel: 'Emotion Beat',
      exampleDetail: 'My hands shook even though I kept my voice steady.',
    });
  }

  if (sentences.length >= 4 && transitionHits <= 1) {
    addCandidate({
      id: 'transitions',
      tipLabel: 'Use Clear Transitions',
      tipDetail: 'Use time or logic transitions so each sentence connects smoothly to the next idea.',
      exampleLabel: 'Transition Line',
      exampleDetail: 'A minute later, the hallway emptied, and I finally had to decide.',
    });
  }

  if (repeatedWord) {
    addCandidate({
      id: 'repetition',
      tipLabel: 'Vary Repeated Words',
      tipDetail: `You repeat "${repeatedWord.word}" ${repeatedWord.count} times, so swap some repeats for sharper alternatives.`,
      exampleLabel: 'Word Variety',
      exampleDetail: `Replace repeated "${repeatedWord.word}" with a more precise verb or image in at least two lines.`,
    });
  }

  if (firstSentence && startsWithWeakSetup(firstSentence)) {
    addCandidate({
      id: 'opening-strength',
      tipLabel: 'Sharpen Opening Line',
      tipDetail: 'Replace a general opening statement with a specific action or image from your scene.',
      exampleLabel: 'Stronger Opening',
      exampleDetail: 'Instead of a broad setup, open on the exact moment when the conflict starts.',
    });
  }

  if (persuasiveStyle && words >= 80) {
    addCandidate({
      id: 'evidence',
      tipLabel: 'Add Concrete Evidence',
      tipDetail: 'Support your main claim with one specific example, fact, or short scenario, not only opinion.',
      exampleLabel: 'Evidence Add',
      exampleDetail: 'One concrete example can prove your point faster than two extra opinion sentences.',
    });
  }

  addCandidate({
    id: 'line-edit-pass',
    tipLabel: 'Run A Line Edit',
    tipDetail: kidMode ? 'Pick three sentences and replace weak words with stronger, clearer words.' : 'Pick three sentences and replace vague words with precise verbs and nouns.',
    exampleLabel: 'Line Edit Move',
    exampleDetail: 'Change one weak phrase into a concrete action so the reader can picture it immediately.',
  });

  const chosen = candidates.slice(0, 4);
  return {
    tips: chosen.map((item) => ({ type: 'tip', label: trimToFiveWords(item.tipLabel), detail: item.tipDetail })),
    examples: chosen.map((item) => ({ type: 'example', label: trimToFiveWords(item.exampleLabel), detail: item.exampleDetail })),
  };
}

function normalizeAssistGroup(raw: unknown, forcedType: 'tip' | 'example'): AssistSuggestion[] {
  if (!Array.isArray(raw)) return [];
  const normalized = raw
    .map((item) => normalizeAssistSuggestion(item, forcedType))
    .filter((item): item is AssistSuggestion => Boolean(item));

  const deduped: AssistSuggestion[] = [];
  const seen = new Set<string>();
  for (const item of normalized) {
    const key = `${item.label.toLowerCase()}:${item.detail.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped.slice(0, 4);
}

function normalizeAssistResult(raw: unknown, content: string, prompt: string, category: string, mappedAgeGroup: string): AssistResult {
  const fallback = assistFallback(prompt, content, category, mappedAgeGroup);
  const tipsRaw = raw && typeof raw === 'object' ? (raw as { tips?: unknown }).tips : null;
  const examplesRaw = raw && typeof raw === 'object' ? (raw as { examples?: unknown }).examples : null;

  const tips = normalizeAssistGroup(tipsRaw, 'tip');
  const examples = normalizeAssistGroup(examplesRaw, 'example');

  return {
    tips: [...tips, ...fallback.tips].slice(0, 4),
    examples: [...examples, ...fallback.examples].slice(0, 4),
  };
}

function mapAgeGroup(ageGroup?: string) {
  switch (ageGroup) {
    case '5-7':
    case '8-10':
      return 'children';
    case '11-13':
    case '14-17':
      return 'teens';
    case '18-21':
      return 'adults';
    case '22+':
      return 'seniors';
    default:
      return 'adults';
  }
}

function mapWritingType(category: string) {
  const value = category.toLowerCase();
  if (value.includes('creative') || value.includes('story') || value.includes('poetry')) return 'creative';
  if (value.includes('persuasive') || value.includes('essay') || value.includes('feature')) return 'academic';
  if (value.includes('email') || value.includes('business')) return 'business';
  if (value.includes('personal') || value.includes('journal') || value.includes('diary')) return 'journaling';
  return 'general';
}

function ageBenchmark(ageGroup: string) {
  switch (ageGroup) {
    case 'children':
      return 'Compare to typical writing from a child. If it is unusually advanced, say so clearly.';
    case 'teens':
      return 'Compare to typical teen writing, not adult publishing standards. If it is above teen level, note that specifically.';
    case 'adults':
      return 'Compare to typical adult writing, with normal expectations for structure and clarity.';
    case 'seniors':
      return 'Compare to typical adult/senior writing, with respect for lived experience and clarity of expression.';
    default:
      return 'Compare to the appropriate age group baseline, not an adult professional standard.';
  }
}

function ageLanguageGuide(ageGroup: string) {
  switch (ageGroup) {
    case 'children':
      return 'Use very simple words and very short sentences. Sound like a kind teacher speaking to a 5-10 year old. Avoid abstract terms like narrative, structure, thematic, restatement, evaluate, or submission. If the writing is too short or does not answer the prompt, say that in plain child-friendly language such as You copied the prompt, so I cannot see your story yet.';
    case 'teens':
      return 'Use clear, school-friendly language for a teenager. Avoid university-style jargon and explain craft ideas in direct everyday terms.';
    case 'adults':
      return 'Use clear adult language with specific craft terms when helpful, but still avoid unnecessary jargon.';
    case 'seniors':
      return 'Use clear, respectful adult language with warm phrasing and no unnecessary jargon.';
    default:
      return 'Use clear language that matches the writer age and avoid unnecessary jargon.';
  }
}

function getRewriteTargetWordCount(ageGroup?: string) {
  switch (ageGroup) {
    case '5-7':
      return 75;
    case '8-10':
      return 200;
    case '11-13':
      return 450;
    case '14-17':
      return 800;
    case '18-21':
      return 1000;
    case '22+':
      return 1300;
    default:
      return 800;
  }
}

function feedbackUnavailableResponse() {
  return NextResponse.json(
    { error: AI_FEEDBACK_UNAVAILABLE_MESSAGE },
    { status: 503 },
  );
}

function getTargetSectionCount(wordCount: number) {
  if (wordCount < 100) return 1;
  if (wordCount <= 250) return 2;
  if (wordCount <= 500) return 3;
  return 5;
}

// Keep prompt context compact to reduce token cost while preserving opening + ending coherence.
function buildCompactExcerpt(content: string) {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 5200) return normalized;
  const head = normalized.slice(0, 3600);
  const tail = normalized.slice(-1200);
  return `${head}\n\n[Middle section trimmed — story continues]\n\n${tail}`;
}

// Repair JSON that has literal newlines/tabs inside string values (common with long AI outputs)
function repairJSON(raw: string): string {
  let result = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) { result += ch; escaped = false; continue; }
    if (ch === '\\' && inString) { result += ch; escaped = true; continue; }
    if (ch === '"') { result += ch; inString = !inString; continue; }
    if (inString) {
      if (ch === '\n') { result += '\\n'; continue; }
      if (ch === '\r') { result += '\\r'; continue; }
      if (ch === '\t') { result += '\\t'; continue; }
    }
    result += ch;
  }
  return result;
}

// Coerce any value to a string — handles cases where the AI returns arrays or objects
function coerceString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map(v => (typeof v === 'string' ? v : JSON.stringify(v))).join('\n\n');
  if (val !== null && typeof val === 'object') {
    // Object like { paragraph1: "...", paragraph2: "..." } — join values
    return Object.values(val as Record<string, unknown>)
      .map(v => (typeof v === 'string' ? v : JSON.stringify(v)))
      .join('\n\n');
  }
  return String(val ?? '');
}

function splitIntoSentences(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function wordCount(text: string) {
  return splitWords(text).length;
}

function splitIntoParagraphs(text: string, sentencesPerParagraph = 3) {
  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) return [] as string[];
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += sentencesPerParagraph) {
    paragraphs.push(sentences.slice(i, i + sentencesPerParagraph).join(' '));
  }
  return paragraphs;
}

function sanitizeRewriteOnly(text: string) {
  const cleaned = text
    .replace(/\r/g, '')
    .replace(/[“”]/g, '"')
    .replace(/^\s*(rewritten version|rewrite|improved rewrite)\s*:?\s*/i, '')
    .trim();

  if (!cleaned) return '';

  const metaStartPatterns = [
    /^this idea\b/i,
    /^a stronger version\b/i,
    /^to strengthen\b/i,
    /^in this revision\b/i,
    /^the conclusion should\b/i,
    /^a stronger opening\b/i,
    /^this piece\b/i,
    /^adding one more example\b/i,
    /^with clearer examples\b/i,
    /^(overall feedback|summary|strengths|improvements|next step)\b/i,
  ];

  const keptParagraphs = cleaned
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => !metaStartPatterns.some((pattern) => pattern.test(paragraph)));

  const joined = (keptParagraphs.length > 0 ? keptParagraphs.join('\n\n') : cleaned).trim();
  return joined.replace(/[ \t]+\n/g, '\n').trim();
}

function buildRewrittenFallback(content: string, prompt?: string, category?: string) {
  const cleaned = content
    .replace(/\r/g, '')
    .replace(/[“”"]/g, '')
    .trim();

  if (cleaned.length > 0) {
    const paragraphs = splitIntoParagraphs(cleaned, 3);
    if (paragraphs.length > 0) return paragraphs.join('\n\n');
    return cleaned;
  }

  const topicHint = (prompt || category || 'this topic').replace(/[“”"]/g, '').trim();
  const fallback = [
    `I took a breath and stepped into ${topicHint} with a clear plan and steady focus.`,
    'Each moment built on the one before it, and every detail moved the idea forward with purpose.',
    'By the end, the message felt complete, confident, and easy for the reader to follow.',
  ].join('\n\n');

  return fallback;
}

function ensureRewrittenVersion(feedback: WritingFeedback, content: string, prompt?: string, category?: string): WritingFeedback {
  const rewritten = sanitizeRewriteOnly(feedback.rewritten_version || '');
  const rewrittenWords = wordCount(rewritten);

  if (rewritten.length >= 40 && rewrittenWords >= 8) {
    return {
      ...feedback,
      rewritten_version: rewritten,
    };
  }

  return {
    ...feedback,
    rewritten_version: sanitizeRewriteOnly(buildRewrittenFallback(content, prompt, category)),
  };
}

function isFeedbackQualityAcceptable(feedback: WritingFeedback, sourceWordCount: number) {
  const paragraphLen = feedback.paragraph_feedback.trim().length;
  const overallLen = feedback.overall.trim().length;
  const rewriteWords = wordCount(feedback.rewritten_version);
  const targetRewriteMin = Math.max(45, Math.min(190, Math.floor(sourceWordCount * 0.45)));

  const minimumParagraphLen = sourceWordCount < 120 ? 280 : sourceWordCount < 280 ? 460 : 620;
  const minimumOverallLen = 220;

  return (
    paragraphLen >= minimumParagraphLen &&
    overallLen >= minimumOverallLen &&
    rewriteWords >= targetRewriteMin
  );
}

function buildStructuredFallbackFeedback(content: string, prompt?: string, category?: string): WritingFeedback {
  const words = splitWords(content);
  const safeWordCount = words.length;
  const sectionCount = getTargetSectionCount(safeWordCount);
  const sourceQuote = words.slice(0, Math.min(30, words.length)).join(' ').trim();
  const quote = sourceQuote || `This piece introduces ${category || 'the topic'} but needs fuller development to become a complete response aligned to ${prompt || 'the prompt'}.`;

  const sections: string[] = [];
  for (let i = 1; i <= sectionCount; i += 1) {
    sections.push(
      [
        `Section ${i}`,
        `Quote: ${quote}`,
        `Pros:`,
        `- The writing presents a clear starting idea and a recognizable topic focus.`,
        `- The sentence flow is readable and understandable for the target audience.`,
        `- The core intention of the piece is easy to identify from the opening lines.`,
        `- The response shows potential to become stronger with expanded detail.`,
        `Cons:`,
        `- The section needs more specific examples to support key claims.`,
        `- Important details are underdeveloped, so meaning stays too general.`,
        `- Structure needs clearer transitions to improve paragraph flow.`,
        `- The current draft does not yet show enough depth for a full response.`,
        `Section Summary: This section shows a useful foundation, but it needs more development to reach strong quality. The main idea is visible, which is a positive start, yet the explanation remains broad and short on evidence. To improve, the writer should add concrete details, expand reasoning, and connect sentences more clearly so each paragraph builds momentum and supports the overall purpose with confidence.`,
      ].join('\n'),
    );
  }

  const overall = [
    'OVERALL FEEDBACK',
    '',
    'SUMMARY:',
    'This draft has a clear topic and readable language, but it currently feels underdeveloped. The response needs more detail, stronger support, and clearer paragraph progression to become complete. The strongest next move is expanding each idea with specific examples and tighter organization.',
    '',
    'STRENGTHS:',
    '- Clear topic focus is visible from the opening.',
    '- Readable sentence flow and understandable language.',
    '- Strong potential for growth with revision.',
    '',
    'IMPROVEMENTS:',
    '- Add concrete examples to support each key point.',
    '- Expand short ideas into fuller paragraph development.',
    '- Use clearer transitions between sentences and sections.',
    '',
    'NEXT STEP:',
    'Rewrite one section at a time by adding detail, evidence, and clearer transitions before final editing.',
  ].join('\n');

  return ensureRewrittenVersion(
    {
      overall,
      paragraph_feedback: sections.join('\n\n'),
      rewritten_version: '',
    },
    content,
    prompt,
    category,
  );
}

function pickCaseInsensitive(parsed: Record<string, unknown>, keys: string[]): unknown {
  const lookup = new Map(Object.keys(parsed).map((k) => [k.toLowerCase().replace(/[\s_]+/g, ''), k]));
  for (const key of keys) {
    const normalized = key.toLowerCase().replace(/[\s_]+/g, '');
    const actual = lookup.get(normalized);
    if (actual !== undefined && parsed[actual] != null) return parsed[actual];
  }
  return undefined;
}

function findKeyStartingWith(parsed: Record<string, unknown>, label: string): string | null {
  const normalized = label.toLowerCase().replace(/\s+/g, '');
  for (const key of Object.keys(parsed)) {
    const keyNorm = key.toLowerCase().replace(/\s+/g, '');
    if (keyNorm.startsWith(normalized)) {
      const rest = key.slice(label.length).replace(/^[:\s]+/, '').trim();
      if (rest.length > 0) return rest;
      const val = parsed[key];
      if (val != null) return coerceString(val).trim();
    }
  }
  return null;
}

function assembleOverallFromFlat(parsed: Record<string, unknown>): string {
  const summary =
    (() => { const v = pickCaseInsensitive(parsed, ['summary']); return v != null ? coerceString(v).trim() : null; })()
    ?? findKeyStartingWith(parsed, 'SUMMARY');
  const strengths =
    (() => { const v = pickCaseInsensitive(parsed, ['strengths']); return v != null ? coerceString(v).trim() : null; })()
    ?? findKeyStartingWith(parsed, 'STRENGTHS');
  const improvements =
    (() => { const v = pickCaseInsensitive(parsed, ['improvements']); return v != null ? coerceString(v).trim() : null; })()
    ?? findKeyStartingWith(parsed, 'IMPROVEMENTS');
  const nextStep =
    (() => { const v = pickCaseInsensitive(parsed, ['next step', 'nextstep', 'next_step']); return v != null ? coerceString(v).trim() : null; })()
    ?? findKeyStartingWith(parsed, 'NEXT STEP')
    ?? findKeyStartingWith(parsed, 'NEXTSTEP');
  const parts: string[] = [];
  if (summary) parts.push(`SUMMARY: ${summary}`);
  if (strengths) parts.push(`STRENGTHS: ${strengths}`);
  if (improvements) parts.push(`IMPROVEMENTS: ${improvements}`);
  if (nextStep) parts.push(`NEXT STEP: ${nextStep}`);
  return parts.join('\n\n');
}

function assembleParagraphFromFlat(parsed: Record<string, unknown>): string {
  const beginning =
    (() => { const v = pickCaseInsensitive(parsed, ['beginning']); return v != null ? coerceString(v).trim() : null; })()
    ?? findKeyStartingWith(parsed, 'BEGINNING');
  const middle =
    (() => { const v = pickCaseInsensitive(parsed, ['middle']); return v != null ? coerceString(v).trim() : null; })()
    ?? findKeyStartingWith(parsed, 'MIDDLE');
  const end =
    (() => { const v = pickCaseInsensitive(parsed, ['end']); return v != null ? coerceString(v).trim() : null; })()
    ?? findKeyStartingWith(parsed, 'END');
  const parts: string[] = [];
  if (beginning) parts.push(`BEGINNING: ${beginning}`);
  if (middle) parts.push(`MIDDLE: ${middle}`);
  if (end) parts.push(`END: ${end}`);
  return parts.join('\n\n');
}

function extractFields(parsed: Record<string, unknown>): WritingFeedback | null {
  const overallRaw =
    parsed.overall ?? parsed.Overall ?? parsed.overall_feedback;
  const paraRaw =
    parsed.paragraph_feedback ?? parsed.paragraphFeedback ??
    parsed.paragraph_by_paragraph ?? parsed.paragraphs ?? parsed.section_feedback;
  const rewriteRaw =
    parsed.rewritten_version ?? parsed.rewrittenVersion ??
    parsed.rewrite ?? parsed.revised_version ?? parsed.improved_version ?? '';

  let overall = overallRaw != null ? coerceString(overallRaw).trim() : '';
  let paragraph_feedback = paraRaw != null ? coerceString(paraRaw).trim() : '';
  const rewritten_version = coerceString(rewriteRaw ?? '').trim();

  if (!overall) overall = assembleOverallFromFlat(parsed);
  if (!paragraph_feedback) paragraph_feedback = assembleParagraphFromFlat(parsed);

  if (!overall || !paragraph_feedback) return null;

  return { overall, paragraph_feedback, rewritten_version };
}

// Last-resort: pull field values directly from the raw string using regex,
// bypassing JSON.parse entirely. Works even if the JSON is malformed.
function extractByRegex(raw: string): WritingFeedback | null {
  function getField(text: string, key: string): string | null {
    // Matches "key": "...value..." where value may span multiple lines and contain escapes
    const re = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\[\\s\\S])*)"`, 's');
    const m = text.match(re);
    if (!m) return null;
    return m[1]
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }

  const overall = getField(raw, 'overall');
  const paragraph_feedback =
    getField(raw, 'paragraph_feedback') ??
    getField(raw, 'paragraph_by_paragraph') ??
    getField(raw, 'paragraphs') ??
    getField(raw, 'section_feedback');
  const rewritten_version =
    getField(raw, 'rewritten_version') ??
    getField(raw, 'rewrite') ??
    getField(raw, 'revised_version') ??
    '';

  let overallFinal = overall ?? '';
  let paragraphFinal = paragraph_feedback ?? '';

  if (!overallFinal) {
    const parts: string[] = [];
    const summary = getField(raw, 'summary') ?? getField(raw, 'Summary') ?? getField(raw, 'SUMMARY');
    const strengths = getField(raw, 'strengths') ?? getField(raw, 'Strengths') ?? getField(raw, 'STRENGTHS');
    const improvements = getField(raw, 'improvements') ?? getField(raw, 'Improvements') ?? getField(raw, 'IMPROVEMENTS');
    const nextStep = getField(raw, 'next step') ?? getField(raw, 'NEXT STEP') ?? getField(raw, 'next_step');
    if (summary) parts.push(`SUMMARY: ${summary.trim()}`);
    if (strengths) parts.push(`STRENGTHS: ${strengths.trim()}`);
    if (improvements) parts.push(`IMPROVEMENTS: ${improvements.trim()}`);
    if (nextStep) parts.push(`NEXT STEP: ${nextStep.trim()}`);
    overallFinal = parts.join('\n\n');
  }

  if (!paragraphFinal) {
    const parts: string[] = [];
    const beginning = getField(raw, 'beginning') ?? getField(raw, 'Beginning') ?? getField(raw, 'BEGINNING');
    const middle = getField(raw, 'middle') ?? getField(raw, 'Middle') ?? getField(raw, 'MIDDLE');
    const end = getField(raw, 'end') ?? getField(raw, 'End') ?? getField(raw, 'END');
    if (beginning) parts.push(`BEGINNING: ${beginning.trim()}`);
    if (middle) parts.push(`MIDDLE: ${middle.trim()}`);
    if (end) parts.push(`END: ${end.trim()}`);
    paragraphFinal = parts.join('\n\n');
  }

  if (overallFinal && paragraphFinal) {
    return { overall: overallFinal, paragraph_feedback: paragraphFinal, rewritten_version: rewritten_version ?? '' };
  }
  return null;
}

function assembleFromRaw(r: Partial<RawFeedback>): WritingFeedback | null {
  const overall = [
    r.summary ? `SUMMARY: ${r.summary.trim()}` : '',
    r.strengths ? `STRENGTHS: ${r.strengths.trim()}` : '',
    r.improvements ? `IMPROVEMENTS: ${r.improvements.trim()}` : '',
    r.next_step ? `NEXT STEP: ${r.next_step.trim()}` : '',
  ].filter(Boolean).join('\n\n');

  const paragraph_feedback = [
    r.beginning ? `BEGINNING: ${r.beginning.trim()}` : '',
    r.middle ? `MIDDLE: ${r.middle.trim()}` : '',
    r.end ? `END: ${r.end.trim()}` : '',
  ].filter(Boolean).join('\n\n');

  if (!overall || !paragraph_feedback) return null;
  return { overall, paragraph_feedback, rewritten_version: r.rewritten_version?.trim() ?? '' };
}

function parseFeedback(raw: string): WritingFeedback | null {
  const sources = [
    () => extractJSON(raw),
    () => repairJSON(extractJSON(raw)),
    () => repairJSON(raw),
  ];

  for (const getSource of sources) {
    try {
      const parsed = JSON.parse(getSource()) as Record<string, unknown>;
      // Try new flat 8-key format first
      const fromRaw = assembleFromRaw(parsed as Partial<RawFeedback>);
      if (fromRaw) return fromRaw;
      // Fall back to old 3-key format
      const result = extractFields(parsed);
      if (result) return result;
    } catch { /* try next */ }
  }

  // Last resort: regex extraction
  return extractByRegex(raw);
}

export async function POST(req: Request) {
  let payload: {
    assistMode?: boolean;
    content?: string;
    category?: string;
    prompt?: string;
    wordCount?: number;
    ageGroup?: string;
    writingExperienceScore?: number;
    toolMode?: string;
    selectedText?: string;
  } = {};

  try {
    payload = await req.json();
    const {
      assistMode = false,
      content,
      category = 'writing',
      prompt,
      wordCount,
      ageGroup,
      writingExperienceScore = 0,
      toolMode = 'ai',
      selectedText = '',
    } = payload;
    const mappedAgeGroup = mapAgeGroup(ageGroup);

    if (assistMode) {
      const safeContent = content ?? '';
      const safePrompt = prompt ?? '';
      const safeToolMode = typeof toolMode === 'string' && toolMode.trim() ? toolMode.trim() : 'ai';
      const safeSelectedText = typeof selectedText === 'string' ? selectedText.trim() : '';
      const assistWordCount = typeof wordCount === 'number' ? wordCount : splitWords(safeContent).length;

      const userPrompt = [
        `ACTIVE WRITING TOOL:\n${safeToolMode}`,
        `WRITING CATEGORY:\n${category.trim() || 'General writing'}`,
        `AGE GROUP:\n${mappedAgeGroup}`,
        `WORD COUNT:\n${assistWordCount}`,
        `WRITING PROMPT:\n${safePrompt.trim() || '(No prompt provided)'}`,
        `SELECTED TEXT:\n${safeSelectedText || '(No selection)'}`,
        `CURRENT DRAFT EXCERPT:\n${safeContent.trim() || '(Empty)'}`,
        'Return only JSON.',
      ].join('\n\n');

      try {
        const rawAssist = await chat({
          tier: 'fast',
          system: AI_ASSIST_SYSTEM_PROMPT,
          maxTokens: 420,
          jsonMode: true,
          messages: [{ role: 'user', content: userPrompt }],
        });
        const parsedAssist = JSON.parse(repairJSON(extractJSON(rawAssist))) as unknown;
        const result = normalizeAssistResult(parsedAssist, safeContent, safePrompt, category, mappedAgeGroup);
        return NextResponse.json(result);
      } catch (assistError) {
        console.error('ai-assist via ai-feedback route error:', assistError);
        return NextResponse.json(
          normalizeAssistResult({}, safeContent, safePrompt, category, mappedAgeGroup),
          { headers: { 'x-ai-assist-fallback': 'true' } },
        );
      }
    }

    if (!content || content.trim().length < 5) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 });
    }

    const mappedWritingType = mapWritingType(category);
    const experienceLabel = getWritingExperienceLabel(writingExperienceScore);
    const safeWordCount = typeof wordCount === 'number' ? wordCount : splitWords(content).length;
    const rewriteTargetWordCount = getRewriteTargetWordCount(ageGroup);
    const trimmedContent = buildCompactExcerpt(content);

    const system = `You are an expert writing coach giving feedback to a ${mappedAgeGroup} writer.
Age group: ${mappedAgeGroup}
Writing type: ${mappedWritingType}
Experience level: ${experienceLabel}
Benchmark: ${ageBenchmark(mappedAgeGroup)}
Language guide: ${ageLanguageGuide(mappedAgeGroup)}

Return ONLY a valid JSON object with exactly these 3 keys. No extra keys. No text outside the JSON.

{
  "paragraph_feedback": "Section-by-section feedback with a DYNAMIC number of subsections based on word count. In EACH subsection include this exact order with paragraph breaks between blocks: Quote (25-50 words copied from student writing), Pros (exactly 4 bullet points), Cons (exactly 4 bullet points), Section Summary (one paragraph, 60-90 words). Leave one blank line between subsections.",
  "overall": "Structured overall feedback with EXACT headings in this order and paragraph breaks: OVERALL FEEDBACK, SUMMARY, STRENGTHS, IMPROVEMENTS, NEXT STEP. SUMMARY should be 3 short paragraphs. STRENGTHS should be 3 bullet points. IMPROVEMENTS should be 3 bullet points. NEXT STEP should be one short paragraph.",
  "rewritten_version": "ONLY the rewritten draft text. No coaching, no analysis, no labels, no headings, no mention of what to improve. Preserve the student's meaning. Target about ${rewriteTargetWordCount} words (roughly plus or minus 10%). Use multiple short paragraphs separated by blank lines."
}

Rules:
- Determine number of section-by-section subsections by approximate word count:
  - Less than 100 words: 1-2 subsections
  - 100-250 words: 2-3 subsections
  - 250-500 words: 3-5 subsections
  - More than 500 words: exactly 5 subsections
- Quote text must come from the student writing only. Do not invent quotes.
- Pros and Cons must be specific, evidence-based, and actionable.
- In Pros, prioritize high-impact craft wins (clarity, specificity, structure, voice, flow), not generic praise.
- In Cons, prioritize the biggest blockers first and describe the exact failure (vague evidence, weak transitions, unclear claim, repetition, flat diction, missing development).
- Keep wording age-appropriate based on the language guide.
- Keep headings clear and consistent: Section 1, Section 2, etc.
- rewritten_version must read like a finished student draft only.
- rewritten_version must NOT include phrases like "This idea has", "A stronger version", "To strengthen", or any instruction/explanation.
- rewritten_version must be materially stronger in precision, rhythm, logic, and paragraph flow while preserving the original intent and tone.
- Remove filler and vague wording in rewritten_version; replace with concrete detail and stronger verbs.
- Use emojis naturally where they fit using only this set: 😀🔥🎯💪👏✔️⭐💯🥇🏆💛✨🌟⚡️💫😂🤣🤪😁
- Do not spam emojis and do not stack them at the end.
- Be specific and encouraging, never vague.`;

    const userPrompt = `Give expert craft feedback on this ${category} submission.

Category: ${category}
${prompt ? `Writing prompt: "${prompt}"` : ''}
Approximate word count: ${safeWordCount}
Writer experience: ${Math.max(0, Math.min(100, Math.round(writingExperienceScore || 0)))}/100
Rewrite target length: about ${rewriteTargetWordCount} words (roughly plus or minus 10%)

Writing:
"""
${trimmedContent}
"""

Return ONLY valid JSON with keys: paragraph_feedback, overall, rewritten_version.

In paragraph_feedback, enforce:
- Dynamic subsection count by word count:
  - <100 words: 1-2 subsections
  - 100-250 words: 2-3 subsections
  - 250-500 words: 3-5 subsections
  - >500 words: exactly 5 subsections
- Each subsection has Quote (25-50 words), 4 Pros bullets, 4 Cons bullets, and a 60-90 word Section Summary
- Paragraph breaks between each block.
- Pros bullets must point to concrete strengths found in the quote (not generic compliments).
- Cons bullets must be direct and high-signal: name the issue and the exact upgrade move.
- Section Summary must include one clear priority action for revision.

In overall, enforce:
- SUMMARY: diagnose the draft's true state directly (no sugarcoating, no filler), while staying respectful.
- STRENGTHS: only meaningful strengths tied to craft impact.
- IMPROVEMENTS: only highest-priority fixes, ordered by impact.
- NEXT STEP: one focused action plan the student can execute immediately.

In rewritten_version, enforce:
- Output ONLY the rewrite text in paragraph form.
- Keep length target; do not add meta commentary or labels.
- Upgrade diction, clarity, flow, and specificity without changing the core meaning.`;

    const fastMaxTokens = safeWordCount < 120
      ? 700
      : safeWordCount < 260
        ? 880
        : safeWordCount < 520
          ? 1080
          : 1260;
    const smartMaxTokens = safeWordCount < 120
      ? 900
      : safeWordCount < 260
        ? 1100
        : safeWordCount < 520
          ? 1320
          : 1520;

    const tryParseFeedback = (raw: string) => {
      const parsed = parseFeedback(raw);
      if (parsed) return parsed;
      try {
        const obj = JSON.parse(repairJSON(extractJSON(raw))) as Record<string, unknown>;
        const types = Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Array.isArray(v) ? 'array' : typeof v]));
        console.error('ai-feedback: parse failed — keys:', Object.keys(obj).join(', '), '| value types:', JSON.stringify(types));
      } catch (e) {
        console.error('ai-feedback: JSON invalid after repair —', (e as Error).message, '\nRaw[0..500]:', raw.slice(0, 500));
      }
      return null;
    };

    const fastRaw = await chat({
      tier: 'fast',
      system,
      maxTokens: fastMaxTokens,
      jsonMode: true,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const fastParsed = tryParseFeedback(fastRaw);
    if (fastParsed && isFeedbackQualityAcceptable(fastParsed, safeWordCount)) {
      return NextResponse.json({ feedback: ensureRewrittenVersion(fastParsed, content, prompt, category) });
    }

    const smartRaw = await chat({
      tier: 'smart',
      system,
      maxTokens: smartMaxTokens,
      jsonMode: true,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const smartParsed = tryParseFeedback(smartRaw);
    if (!smartParsed) {
      return NextResponse.json({ feedback: buildStructuredFallbackFeedback(content, prompt, category) });
    }

    return NextResponse.json({ feedback: ensureRewrittenVersion(smartParsed, content, prompt, category) });
  } catch (err) {
    console.error('ai-feedback error:', err);
    if (payload.content && payload.content.trim().length > 0) {
      return NextResponse.json({ feedback: buildStructuredFallbackFeedback(payload.content, payload.prompt, payload.category) });
    }
    return feedbackUnavailableResponse();
  }
}
