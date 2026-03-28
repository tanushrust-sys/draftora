// API route: POST /api/ai-coach
// Powers the Coach chat tab — fully linked to the student's writing system.
// Fetches today's writing (full content), past reviewed pieces (full content + feedback),
// and vocab bank so the coach can read, evaluate, and give detailed personalised coaching.

import { NextResponse } from 'next/server';
import { chat } from '@/app/lib/ai-provider';
import { createClient } from '@supabase/supabase-js';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchStudentContext(userId: string) {
  const today = new Date().toISOString().split('T')[0];

  const [todayRes, reviewedRes, vocabRes] = await Promise.all([
    // Today's writing — any status, full content so coach can read it
    adminSupabase
      .from('writings')
      .select('title, category, prompt, word_count, content, feedback, strengths, improvements, status, created_at')
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false })
      .limit(1),

    // Last 5 reviewed pieces with full content + AI feedback
    adminSupabase
      .from('writings')
      .select('title, category, prompt, word_count, content, feedback, strengths, improvements, created_at')
      .eq('user_id', userId)
      .eq('status', 'reviewed')
      .order('created_at', { ascending: false })
      .limit(5),

    // Full vocab bank
    adminSupabase
      .from('vocab_words')
      .select('word, meaning, example_sentence, mastered')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(60),
  ]);

  return {
    todayWriting: todayRes.data?.[0]    ?? null,
    reviewed:     reviewedRes.data      ?? [],
    vocab:        vocabRes.data         ?? [],
  };
}

type Writing = {
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

function buildSystemPrompt(
  mode: string,
  trainerType: string,
  userContext: { username?: string; level?: number; xp?: number; streak?: number; customGoal?: string },
  todayWriting: Writing | null,
  reviewed: Writing[],
  vocab: VocabWord[],
) {
  const name  = userContext.username || 'the student';
  const level = userContext.level    || 1;

  const persona = mode === 'creative'
    ? `You are a creative, imaginative writing coach. You love ideas, storytelling, metaphors, and sparking inspiration. You give free-flowing, energetic, and fun suggestions. You celebrate creativity above all.`
    : `You are a thoughtful, analytical writing coach. You give deep, structured, step-by-step guidance. You explain the "why" behind writing techniques and help build strong foundations. You are warm but precise.`;

  const focus = trainerType === 'general'             ? 'all types of writing'
    : trainerType === 'Persuasive / Essay'            ? 'persuasive writing and essay structure'
    : trainerType === 'Blog'                          ? 'blog writing and personal voice'
    : trainerType === 'Email Entry'                   ? 'professional and formal email writing'
    : trainerType === 'Feature Article'               ? 'feature articles and journalism'
    : 'all types of writing';

  let context = '';

  // ── Today's writing — full content so coach can evaluate it directly ──
  if (todayWriting) {
    const statusLabel = todayWriting.status === 'reviewed' ? 'reviewed' : 'submitted today';
    context += `\n\n## TODAY'S WRITING (${statusLabel}):`;
    context += `\nTitle: "${todayWriting.title}" | Category: ${todayWriting.category} | ${todayWriting.word_count} words`;
    if (todayWriting.prompt) context += `\nPrompt: "${todayWriting.prompt}"`;
    context += `\n\nFull text:\n"""\n${todayWriting.content}\n"""`;
    if (todayWriting.strengths || todayWriting.improvements) {
      context += `\n\nAI Feedback received:`;
      if (todayWriting.strengths)    context += `\n- Strengths: ${todayWriting.strengths}`;
      if (todayWriting.improvements) context += `\n- To improve: ${todayWriting.improvements}`;
      if (todayWriting.feedback)     context += `\n- Overall: ${todayWriting.feedback}`;
    }
  }

  // ── Past reviewed pieces — full content + feedback for deep coaching ──
  const pastPieces = todayWriting
    ? reviewed.filter(r => r.created_at !== todayWriting.created_at)
    : reviewed;

  if (pastPieces.length > 0) {
    context += `\n\n## PAST WRITINGS (${pastPieces.length} reviewed pieces):`;
    for (const w of pastPieces) {
      const date = new Date(w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      context += `\n\n### "${w.title}" — ${w.category}, ${w.word_count} words (${date})`;
      if (w.prompt) context += `\nPrompt: "${w.prompt}"`;
      context += `\n"""\n${w.content}\n"""`;
      if (w.strengths)    context += `\nStrengths: ${w.strengths}`;
      if (w.improvements) context += `\nTo improve: ${w.improvements}`;
      if (w.feedback)     context += `\nOverall: ${w.feedback}`;
    }
  }

  // ── Vocab bank ──
  if (vocab.length > 0) {
    const mastered = vocab.filter(v => v.mastered);
    const learning = vocab.filter(v => !v.mastered);
    context += `\n\n## VOCABULARY BANK (${vocab.length} words — ${mastered.length} mastered):`;
    if (learning.length > 0)
      context += '\nStill learning: ' + learning.map(v => `${v.word} (${v.meaning})`).join(', ');
    if (mastered.length > 0)
      context += '\nMastered: ' + mastered.map(v => v.word).join(', ');
  }

  return `${persona}

You are coaching ${name}, a student at Level ${level}. Your specialty today is ${focus}.
${userContext.customGoal ? `Their personal writing goal: "${userContext.customGoal}"` : ''}
${context}

Key rules:
- You have access to ${name}'s ACTUAL writing — read it carefully and quote specific lines when giving feedback
- When asked to evaluate or improve their writing, reference the exact text above
- Be detailed and specific — generic advice is not helpful; always tie feedback to their actual words
- Always be encouraging but honest — identify real strengths AND real areas to grow
- Tailor language to a school-age student
- If they ask about their daily writing, use the TODAY'S WRITING section above
- Suggest concrete rewrites or improvements using their own style and voice`;
}

export async function POST(req: Request) {
  try {
    const { messages, mode, trainerType, userContext, userId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const { todayWriting, reviewed, vocab } = userId
      ? await fetchStudentContext(userId)
      : { todayWriting: null, reviewed: [], vocab: [] };

    const text = await chat({
      tier:      'fast',
      system:    buildSystemPrompt(mode || 'thinking', trainerType || 'general', userContext || {}, todayWriting, reviewed, vocab),
      messages,
      maxTokens: 800,
    });

    return NextResponse.json({ response: text });
  } catch (err) {
    console.error('ai-coach error:', err);
    return NextResponse.json({ error: 'Failed to get coach response' }, { status: 500 });
  }
}
