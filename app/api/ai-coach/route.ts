// API route: POST /api/ai-coach
// Powers the Coach chat tab — uses the configured AI provider
// Fetches the student's full writing history, feedback, and vocab to give personalised coaching

import { NextResponse } from 'next/server';
import { chat } from '@/app/lib/ai-provider';
import { createClient } from '@supabase/supabase-js';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchStudentContext(userId: string) {
  const [writingsRes, vocabRes] = await Promise.all([
    adminSupabase
      .from('writings')
      .select('title, category, word_count, feedback, strengths, improvements, created_at')
      .eq('user_id', userId)
      .eq('status', 'reviewed')
      .order('created_at', { ascending: false })
      .limit(10),
    adminSupabase
      .from('vocab_words')
      .select('word, meaning, example_sentence')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  return {
    writings: writingsRes.data ?? [],
    vocab:    vocabRes.data    ?? [],
  };
}

function buildSystemPrompt(
  mode: string,
  trainerType: string,
  userContext: { username?: string; level?: number; xp?: number; streak?: number; customGoal?: string },
  writings: Array<{ title: string; category: string; word_count: number; feedback: string | null; strengths: string | null; improvements: string | null; created_at: string }>,
  vocab: Array<{ word: string; meaning: string; example_sentence: string }>,
) {
  const name  = userContext.username || 'the student';
  const level = userContext.level    || 1;

  const persona = mode === 'creative'
    ? `You are a creative, imaginative writing coach. You love ideas, storytelling, metaphors, and sparking inspiration. You give free-flowing, energetic, and fun suggestions. You celebrate creativity above all. Think like a novelist, poet, and storyteller.`
    : `You are a thoughtful, analytical writing coach. You give deep, structured, step-by-step guidance. You explain the "why" behind writing techniques and help students build strong foundations. You are warm but precise.`;

  const focus = trainerType === 'general'             ? 'all types of writing'
    : trainerType === 'Persuasive / Essay'            ? 'persuasive writing and essay structure'
    : trainerType === 'Blog'                          ? 'blog writing and personal voice'
    : trainerType === 'Email Entry'                   ? 'professional and formal email writing'
    : trainerType === 'Feature Article'               ? 'feature articles and journalism'
    : 'all types of writing';

  let context = '';

  if (writings.length > 0) {
    context += `\n\n## ${name}'s Recent Writing Feedback (${writings.length} pieces reviewed):`;
    for (const w of writings) {
      const date = new Date(w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      context += `\n- "${w.title}" (${w.category}, ${w.word_count} words, ${date})`;
      if (w.strengths)    context += `\n  ✓ Strengths: ${w.strengths}`;
      if (w.improvements) context += `\n  → To improve: ${w.improvements}`;
      if (w.feedback)     context += `\n  Overall: ${w.feedback}`;
    }
  }

  if (vocab.length > 0) {
    context += `\n\n## ${name}'s Vocabulary Bank (${vocab.length} words saved):`;
    context += '\n' + vocab.map(v => `- ${v.word}: ${v.meaning}. Example: "${v.example_sentence}"`).join('\n');
  }

  return `${persona}

You are coaching ${name}, a student at Level ${level}. Your specialty today is ${focus}.
${userContext.customGoal ? `\nTheir personal writing goal: "${userContext.customGoal}"` : ''}
${context}

Key rules:
- Keep responses concise and actionable — students have short attention spans
- Always be encouraging, never condescending
- Tailor your advice to a school-age student
- Reference their past feedback and vocab when relevant — show you know their journey
- If they share writing, give specific, honest feedback
- Celebrate milestones and progress warmly`;
}

export async function POST(req: Request) {
  try {
    const { messages, mode, trainerType, userContext, userId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const { writings, vocab } = userId
      ? await fetchStudentContext(userId)
      : { writings: [], vocab: [] };

    const text = await chat({
      tier:      'fast',
      system:    buildSystemPrompt(mode || 'thinking', trainerType || 'general', userContext || {}, writings, vocab),
      messages,
      maxTokens: 600,
    });

    return NextResponse.json({ response: text });
  } catch (err) {
    console.error('ai-coach error:', err);
    return NextResponse.json({ error: 'Failed to get coach response' }, { status: 500 });
  }
}
