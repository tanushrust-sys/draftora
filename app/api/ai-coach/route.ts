import { NextResponse } from 'next/server';
import { chat } from '@/app/lib/ai-provider';
import { createClient } from '@supabase/supabase-js';
import { getWritingExperienceLabel, getWritingExperiencePromptContext } from '@/app/lib/writing-experience';
import { buildAgeAwareProgressAnalysis, buildProgressScores } from '@/app/lib/progress-scoring';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type Writing = {
  id: string;
  title: string;
  category: string;
  prompt: string | null;
  word_count: number;
  content: string;
  feedback: string | null;
  strengths: string | null;
  improvements: string | null;
  status?: string;
  created_at: string;
};

type VocabWord = {
  word: string;
  meaning: string;
  example_sentence: string;
  mastered: boolean;
};

type UserContext = {
  username?: string;
  level?: number;
  xp?: number;
  streak?: number;
  customGoal?: string;
  ageGroup?: string;
  writingExperienceScore?: number;
};

function truncate(text: string, max = 220) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function buildUserClient(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    },
  );
}

async function fetchStudentContext(userId: string, client: any) {
  const today = new Date().toISOString().split('T')[0];

  const [todayRes, latestRes, reviewedRes, vocabRes] = await Promise.all([
    client
      .from('writings')
      .select('id, title, category, prompt, word_count, content, feedback, strengths, improvements, status, created_at')
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false })
      .limit(1),

    client
      .from('writings')
      .select('id, title, category, prompt, word_count, content, feedback, strengths, improvements, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1),

    client
      .from('writings')
      .select('id, title, category, prompt, word_count, content, feedback, strengths, improvements, created_at, status')
      .eq('user_id', userId)
      .eq('status', 'reviewed')
      .order('created_at', { ascending: false })
      .limit(5),

    client
      .from('vocab_words')
      .select('word, meaning, example_sentence, mastered')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  const todayWriting = todayRes.data?.[0] ?? null;
  const latestWriting = latestRes.data?.[0] ?? null;

  return {
    todayWriting: todayWriting ?? latestWriting,
    reviewed: reviewedRes.data ?? [],
    vocab: vocabRes.data ?? [],
    errors: {
      today: todayRes.error,
      latest: latestRes.error,
      reviewed: reviewedRes.error,
      vocab: vocabRes.error,
    },
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

function mapWritingType(trainerType?: string, todayWriting?: Writing | null) {
  const source = (trainerType || todayWriting?.category || '').toLowerCase();

  if (source.includes('creative') || source.includes('story') || source.includes('poetry')) return 'creative';
  if (source.includes('persuasive') || source.includes('essay') || source.includes('academic') || source.includes('feature')) return 'academic';
  if (source.includes('email') || source.includes('business')) return 'business';
  if (source.includes('diary') || source.includes('journal') || source.includes('personal')) return 'journaling';
  return 'general';
}

function ageBenchmark(ageGroup: string) {
  switch (ageGroup) {
    case 'children':
      return 'Compare the writing to typical child writing, not adult standards. If it is impressive for that age, say so clearly.';
    case 'teens':
      return 'Compare the writing to typical teen writing, not adult publishing standards. If it is above teen level, acknowledge that.';
    case 'adults':
      return 'Compare the writing to typical adult writing, with normal expectations for structure and clarity.';
    case 'seniors':
      return 'Compare the writing to typical adult/senior writing, with respect for experience and voice.';
    default:
      return 'Compare the writing to the user age group, not an adult baseline.';
  }
}

function buildWritingContext(todayWriting: Writing | null, reviewed: Writing[], ageGroup?: string) {
  let context = '';
  const sortedReviewed = [...reviewed].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const scores = buildProgressScores(sortedReviewed, ageGroup);
  const scoreMap = new Map(scores.map((score) => [score.id, score]));

  if (todayWriting) {
    const statusLabel = todayWriting.status === 'reviewed'
      ? 'reviewed'
      : todayWriting.created_at?.startsWith(new Date().toISOString().split('T')[0])
        ? 'submitted today'
        : 'most recent submission';
    context += `\n## TODAY'S WRITING (${statusLabel})`;
    context += `\nTitle: "${todayWriting.title}"`;
    context += `\nCategory: ${todayWriting.category}`;
    context += `\nWord count: ${todayWriting.word_count}`;
    if (todayWriting.prompt) context += `\nPrompt: "${todayWriting.prompt}"`;
    context += `\nDraft excerpt:\n"""\n${truncate(todayWriting.content, 500)}\n"""`;
    if (todayWriting.strengths || todayWriting.improvements || todayWriting.feedback) {
      context += `\nPrevious AI feedback:`;
      if (todayWriting.strengths) context += `\n- Strengths: ${todayWriting.strengths}`;
      if (todayWriting.improvements) context += `\n- Improvements: ${todayWriting.improvements}`;
      if (todayWriting.feedback) context += `\n- Overall: ${todayWriting.feedback}`;
    }
    const todayScore = scoreMap.get(todayWriting.id);
    if (todayScore) {
      context += `\n- Progress score: ${todayScore.score}/100 (${todayScore.note})`;
    }
  }

  const pastPieces = todayWriting
    ? reviewed.filter((writing) => writing.created_at !== todayWriting.created_at)
    : reviewed;

  if (pastPieces.length > 0) {
    context += `\n\n## PAST REVIEWED WRITING`;
    for (const writing of pastPieces) {
      const date = new Date(writing.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      context += `\n\n### "${writing.title}" (${date})`;
      context += `\nCategory: ${writing.category}`;
      context += `\nWord count: ${writing.word_count}`;
      if (writing.prompt) context += `\nPrompt: "${writing.prompt}"`;
      context += `\nExcerpt/source:\n"""\n${truncate(writing.content, 360)}\n"""`;
      const score = scoreMap.get(writing.id);
      if (score) context += `\nScore: ${score.score}/100 (${score.note})`;
      if (writing.strengths) context += `\nStrengths: ${writing.strengths}`;
      if (writing.improvements) context += `\nImprovements: ${writing.improvements}`;
      if (writing.feedback) context += `\nOverall: ${writing.feedback}`;
    }
  }

  const analysis = buildAgeAwareProgressAnalysis(sortedReviewed, ageGroup);
  if (analysis) {
    context += `\n\n## PORTFOLIO PATTERNS`;
    context += `\nSummary: ${analysis.summary}`;
    context += `\nStrengths: ${analysis.strengths.join(' | ')}`;
    context += `\nNeeds work: ${analysis.areasToImprove.join(' | ')}`;
    context += `\nPattern notes: ${analysis.writingPatterns}`;
    context += `\nVocabulary trend: ${analysis.vocabularyTrend}`;
    context += `\nNext step: ${analysis.recommendation}`;
  }

  return context;
}

function buildVocabContext(vocab: VocabWord[]) {
  if (!vocab.length) return '';

  const mastered = vocab.filter((word) => word.mastered).map((word) => word.word);
  const learning = vocab
    .filter((word) => !word.mastered)
    .map((word) => `${word.word} (${word.meaning})`);

  let context = `\n\n## VOCAB BANK`;
  if (learning.length) context += `\nStill learning: ${learning.join(', ')}`;
  if (mastered.length) context += `\nMastered: ${mastered.join(', ')}`;
  return context;
}

function buildSystemPrompt(
  trainerType: string,
  userContext: UserContext,
  sessionDate: string,
  todayWriting: Writing | null,
  reviewed: Writing[],
  vocab: VocabWord[],
) {
  const ageGroup = mapAgeGroup(userContext.ageGroup);
  const writingType = mapWritingType(trainerType, todayWriting);
  const name = userContext.username || 'the user';
  const writingExperienceScore = userContext.writingExperienceScore ?? 0;
  const writingContext = buildWritingContext(todayWriting, reviewed, userContext.ageGroup);
  const vocabContext = buildVocabContext(vocab);

  return `You are an expert writing coach embedded in a training platform. Your sole purpose is to help users grow as writers through honest, constructive, and age-appropriate feedback. You operate in "coach mode" — not cheerleader mode. Improvement is always your first priority.

ACTIVE USER SETTINGS
- Age Group: ${ageGroup}
- Writing Type: ${writingType}
- Session Date: ${sessionDate}
- Username: ${name}
- Level: ${userContext.level ?? 1}
- Age Benchmark: ${ageBenchmark(ageGroup)}
- Writing Experience: ${getWritingExperienceLabel(writingExperienceScore)} (${Math.max(0, Math.min(100, Math.round(writingExperienceScore)))}/100)
- Experience Benchmark: ${getWritingExperiencePromptContext(writingExperienceScore)}
${userContext.customGoal ? `- Personal Goal: ${userContext.customGoal}` : ''}

CORE BEHAVIOR RULES
1. IMPROVEMENT IS ALWAYS THE PRIORITY
- Dedicate at least 75% of your feedback to specific, actionable improvements.
- Strengths may be acknowledged briefly, but never padded or exaggerated.
- When there are genuine strengths, mention them clearly and specifically.
- For clearly strong writing, strengths can be 2-4 sentences and should name concrete craft wins.
- The improvement portion should feel about twice as substantial as the strengths portion.
- Do not open with compliments.
- Do not end with hollow praise.

2. THE MINIMAL WRITING RULE — CRITICAL
- If the writing is extremely short, fragmentary, repetitive, low-effort, gibberish, or clearly not a meaningful attempt, do not acknowledge strengths.
- Instead deliver a coaching intervention that explains what is missing, what stronger writing in this category looks like, and a concrete rewrite challenge.
- Be respectful but direct.

3. FEEDBACK STRUCTURE
- For substantial writing, use:
  1. "Areas to Improve" as the primary section with 3-6 specific points.
  2. "What's Working" briefly, only if there are real strengths.
  3. "Priority Action" with one clear next step.
- For minimal or insufficient writing, skip the normal structure and give a coaching intervention.

AGE GROUP RULES
- children: use simple, friendly language, but stay honest and clear that more detail and effort are needed.
- teens: be direct, respectful, and specific. Do not talk down to them.
- adults: use efficient, peer-level, professional feedback with no hand-holding.
- seniors: be respectful, substantive, and encouraging without softening the truth.
- Use writing experience as an important second lens after age. A beginner adult should not be judged like an advanced adult, and a highly experienced child should not be treated like a complete novice.

WRITING TYPE ADAPTATIONS
- creative: focus on narrative structure, voice, pacing, show-don't-tell, character depth, sensory detail, originality, and dialogue authenticity.
- academic: focus on thesis clarity, argument structure, evidence use, logical flow, transitions, and conclusion strength.
- business: focus on clarity, brevity, audience awareness, purpose, and wasted wording.
- journaling: focus on reflective depth, emotional honesty, specificity, and growth in self-awareness. Do not over-police grammar.
- general: use balanced criteria across clarity, structure, grammar, purpose, and voice.

WHAT YOU MUST NEVER DO
- Never fake enthusiasm for weak writing.
- Never praise nonsense, repetition, or random filler.
- Never give vague feedback without showing exactly what to fix.
- Never skip necessary criticism to protect feelings.
- Never use generic feedback that ignores writing type and age group.
- Never mention that you are an AI.
- Never sound cruel, dismissive, or unfair when the writing has genuine strengths.

PLATFORM CONTEXT
${writingContext || '\nNo current writing was provided in platform context.'}
${vocabContext}

COACHING RULE
- Always anchor your response in the writing history above. Mention the current draft, a recent reviewed piece, or a recurring feedback pattern when relevant.
- Do not sound generic or detached from the portfolio.

FINAL RESPONSE RULES
- If the user asks about today's writing, use the actual writing above.
- If a writing is present in PLATFORM CONTEXT, you must treat it as available and never ask the user to paste their draft.
- When responding to a request like "review my latest piece," reference the title and word count from the context in your first sentence.
- Quote exact lines when useful.
- Be concrete, specific, and honest.
- If there are real strengths, acknowledge them briefly before returning to the main coaching work.
- If there are no real strengths, say so clearly.
- Push the user toward a better rewrite, not empty reassurance.
- Use emojis naturally where they fit, selected only from: 😀🔥🎯💪👏✔️⭐💯🥇🏆💛✨🌟⚡️💫😂🤣🤪😁
- Do not spam emojis and do not stack them at the end.`;
}

export async function POST(req: Request) {
  try {
    const { messages, trainerType, userContext, userId, accessToken, clientContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    let todayWriting: Writing | null = null;
    let reviewed: Writing[] = [];
    let vocab: VocabWord[] = [];

    if (clientContext?.latestWriting || clientContext?.reviewed?.length) {
      todayWriting = clientContext.latestWriting ?? null;
      reviewed = Array.isArray(clientContext.reviewed) ? clientContext.reviewed : [];
    }

    if (userId) {
      const adminResult = await fetchStudentContext(userId, adminSupabase);
      todayWriting = todayWriting ?? adminResult.todayWriting;
      reviewed = reviewed.length ? reviewed : adminResult.reviewed;
      vocab = adminResult.vocab;

      const adminFailed = Boolean(
        adminResult.errors.today ||
        adminResult.errors.latest ||
        adminResult.errors.reviewed ||
        adminResult.errors.vocab,
      );

      if ((!todayWriting || reviewed.length === 0) && accessToken) {
        const userClient = buildUserClient(accessToken);
        const userResult = await fetchStudentContext(userId, userClient);
        if (userResult.todayWriting || userResult.reviewed.length || userResult.vocab.length) {
          todayWriting = todayWriting ?? userResult.todayWriting ?? null;
          reviewed = reviewed.length ? reviewed : userResult.reviewed;
          vocab = userResult.vocab.length ? userResult.vocab : vocab;
        } else if (adminFailed) {
          console.error('ai-coach: supabase fetch failed', adminResult.errors);
        }
      } else if (adminFailed) {
        console.error('ai-coach: supabase fetch failed', adminResult.errors);
      }
    }

    const text = await chat({
      tier: 'smart',
      system: buildSystemPrompt(
        trainerType || 'general',
        (userContext || {}) as UserContext,
        new Date().toISOString().split('T')[0],
        todayWriting,
        reviewed,
        vocab,
      ),
      messages,
      maxTokens: 900,
    });

    return NextResponse.json({ response: text });
  } catch (err) {
    console.error('ai-coach error:', err);
    return NextResponse.json({ error: 'Failed to get coach response' }, { status: 500 });
  }
}
