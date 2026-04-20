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

function isModelResolutionError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('model') &&
    (
      msg.includes('not found') ||
      msg.includes('does not exist') ||
      msg.includes('unsupported') ||
      msg.includes('not available') ||
      msg.includes('access') ||
      msg.includes('permission')
    )
  );
}

const AI_ASSIST_SYSTEM_PROMPT = `You are an expert creative writing coach. Your job is to deliver direct, specific, and age-appropriate writing coaching with zero filler.
Read the writing prompt and the user's current story excerpt.
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
- Do not invent ideas that are not present in the prompt or excerpt.
- Tips must be precise, actionable, and directly tied to the draft or to a strong way to start if the draft is empty.
- Examples must be concrete sample lines or micro-directions that the student can use immediately.
- If the textarea is empty, all tips must teach how to begin with a strong image, action, or emotion, and all examples must show an actual opening move.
- If the draft is weak or underdeveloped, explain what is missing and give one exact revision move for stronger wording or structure.
- Always favor specificity over general statements.
- Never repeat the same idea across multiple tips or examples.`;

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

function assistFallback(prompt: string, hasContent: boolean, mappedAgeGroup: string): AssistResult {
  const promptHint = prompt.trim() || 'the writing prompt';
  const kidMode = mappedAgeGroup === 'children';
  const teenMode = mappedAgeGroup === 'teens';
  if (!hasContent) {
    return {
      tips: [
        { type: 'tip', label: 'Start In Motion', detail: kidMode ? `Begin with one clear action so we instantly know what is happening in ${promptHint}.` : `Open with a concrete action that places the reader directly inside ${promptHint}.` },
        { type: 'tip', label: 'Set Scene Quickly', detail: kidMode ? 'Use one strong describing word so the place feels real right away.' : 'Use one sensory image in the first two sentences so the location feels real.' },
        { type: 'tip', label: 'Reveal Character Goal', detail: kidMode ? 'Tell us what your character wants in the first two lines.' : 'Show what your main character wants in line one or two.' },
        { type: 'tip', label: 'Signal Early Tension', detail: kidMode ? 'Add a small problem early so readers want to know what happens next.' : 'Introduce a small problem immediately so readers feel momentum from the start.' },
      ],
      examples: [
        { type: 'example', label: 'Action Opening', detail: kidMode ? 'The bell rang, and I ran to find my best friend before I lost courage.' : 'By the time the school bell rang, I was still clutching the note I never sent.' },
        { type: 'example', label: 'Scene First Line', detail: kidMode ? 'Rain hit the bus window while I practiced the words in my head.' : 'Rain tapped the bus window while I rehearsed what I would finally say to her.' },
        { type: 'example', label: 'Character Hook', detail: teenMode ? 'People said I was being dramatic, but I was terrified she would walk away.' : 'Everyone thought I was angry, but I was mostly scared she would not listen.' },
        { type: 'example', label: 'Conflict Seed', detail: kidMode ? 'When she sat next to me, my mouth went dry and I forgot every sentence.' : 'When she sat beside me at lunch, the words I had waited months to say disappeared.' },
      ],
    };
  }

  return {
    tips: [
      { type: 'tip', label: 'Sharpen One Image', detail: kidMode ? 'Swap one plain describing phrase for a picture word readers can imagine.' : 'Upgrade one broad description into a specific image the reader can clearly picture.' },
      { type: 'tip', label: 'Add Emotion Beat', detail: kidMode ? 'Add one short sentence that says how your character feels right then.' : 'Insert one reaction sentence showing exactly what the narrator feels right now.' },
      { type: 'tip', label: 'Tighten Sentence Rhythm', detail: kidMode ? 'Split one long sentence into two shorter ones so it is easier to read.' : 'Break one long sentence into two to improve pacing during the tense moment.' },
      { type: 'tip', label: 'Raise Stakes Next', detail: kidMode ? 'Show what could go wrong next so readers care even more.' : 'Show what the character could lose in the next beat to increase urgency.' },
    ],
    examples: [
      { type: 'example', label: 'Dialogue Pivot', detail: kidMode ? 'She crossed her arms and said, If you are just joking, do not start.' : 'She folded her arms and said, If this is another excuse, do not say it.' },
      { type: 'example', label: 'Emotion Line', detail: kidMode ? 'I tried to sound calm, but my voice shook on every word.' : 'My voice sounded steady, but my hands kept shaking under the table.' },
      { type: 'example', label: 'Concrete Detail', detail: kidMode ? 'I twisted my lunchbox zipper again and again while she waited.' : 'The plastic straw bent in half as I pressed it between my fingers.' },
      { type: 'example', label: 'Hook Ending', detail: kidMode ? 'Then she pulled a crumpled note from her pocket and looked me in the eye.' : 'Then she reached into her bag and pulled out the message I never sent.' },
    ],
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

function normalizeAssistResult(raw: unknown, hasContent: boolean, prompt: string, mappedAgeGroup: string): AssistResult {
  const fallback = assistFallback(prompt, hasContent, mappedAgeGroup);
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

// Send up to 10000 chars in full; beyond that, trim head + tail to preserve context
function buildCompactExcerpt(content: string) {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 10000) return normalized;
  const head = normalized.slice(0, 7000);
  const tail = normalized.slice(-1500);
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
    } = payload;
    const mappedAgeGroup = mapAgeGroup(ageGroup);

    if (assistMode) {
      const safeContent = content ?? '';
      const safePrompt = prompt ?? '';
      const hasContent = safeContent.trim().length > 0;

      const userPrompt = [
        `WRITING PROMPT:\n${safePrompt.trim() || '(No prompt provided)'}`,
        `CURRENT STORY EXCERPT:\n${safeContent.trim() || '(Empty)'}`,
        'Return only JSON.',
      ].join('\n\n');

      try {
        const { default: OpenAI } = await import('openai');
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error('Missing OPENAI_API_KEY.');
        }

        const client = new OpenAI({ apiKey });
        const model = process.env.AI_ASSIST_MODEL || process.env.AI_SMART_MODEL || 'gpt-4.1-mini';
        const fallbackCandidates = [
          process.env.AI_FALLBACK_MODEL,
          'gpt-5-mini',
          'gpt-4.1-mini',
        ].filter((m): m is string => Boolean(m && m.trim()));
        const modelsToTry = [model, ...fallbackCandidates.filter((m) => m !== model)];

        let completion: Awaited<ReturnType<typeof client.chat.completions.create>> | null = null;
        let lastError: unknown = null;

        for (let i = 0; i < modelsToTry.length; i++) {
          const candidate = modelsToTry[i];
          try {
            completion = await client.chat.completions.create({
              model: candidate,
              temperature: 0.7,
              max_tokens: 700,
              messages: [
                { role: 'system', content: AI_ASSIST_SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
              ],
            });
            break;
          } catch (err) {
            lastError = err;
            const canFallback = i < modelsToTry.length - 1 && isModelResolutionError(err);
            if (!canFallback) throw err;
            console.warn(`AI assist model fallback: "${candidate}" failed, trying next candidate.`);
          }
        }

        if (!completion) {
          throw lastError instanceof Error ? lastError : new Error('AI assist failed for all candidate models.');
        }

        const rawAssist = completion.choices[0]?.message?.content ?? '[]';
        const parsedAssist = JSON.parse(extractJSON(rawAssist)) as unknown;
        const result = normalizeAssistResult(parsedAssist, hasContent, safePrompt, mappedAgeGroup);
        return NextResponse.json(result);
      } catch (assistError) {
        console.error('ai-assist via ai-feedback route error:', assistError);
        return NextResponse.json(normalizeAssistResult({}, hasContent, safePrompt, mappedAgeGroup));
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

    const feedbackMaxTokens = safeWordCount < 120
      ? 950
      : safeWordCount < 260
        ? 1200
        : safeWordCount < 520
          ? 1500
          : 1750;

    const raw = await chat({
      tier: 'smart',
      system,
      maxTokens: feedbackMaxTokens,
      jsonMode: true,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const parsed = parseFeedback(raw);
    if (!parsed) {
      try {
        const obj = JSON.parse(repairJSON(extractJSON(raw))) as Record<string, unknown>;
        const types = Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Array.isArray(v) ? 'array' : typeof v]));
        console.error('ai-feedback: parse failed — keys:', Object.keys(obj).join(', '), '| value types:', JSON.stringify(types));
      } catch (e) {
        console.error('ai-feedback: JSON invalid after repair —', (e as Error).message, '\nRaw[0..500]:', raw.slice(0, 500));
      }
      return NextResponse.json({ feedback: buildStructuredFallbackFeedback(content, prompt, category) });
    }

    return NextResponse.json({ feedback: ensureRewrittenVersion(parsed, content, prompt, category) });
  } catch (err) {
    console.error('ai-feedback error:', err);
    if (payload.content && payload.content.trim().length > 0) {
      return NextResponse.json({ feedback: buildStructuredFallbackFeedback(payload.content, payload.prompt, payload.category) });
    }
    return feedbackUnavailableResponse();
  }
}
