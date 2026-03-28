// API route: POST /api/ai-coach
// Powers the Coach chat tab — uses the configured AI provider

import { NextResponse } from 'next/server';
import { chat } from '@/app/lib/ai-provider';

function buildSystemPrompt(mode: string, trainerType: string, userContext: { username?: string; level?: number }) {
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

  return `${persona}

You are coaching ${name}, a student at Level ${level}. Your specialty today is ${focus}.

Key rules:
- Keep responses concise and actionable — students have short attention spans
- Always be encouraging, never condescending
- Tailor your advice to a school-age student
- If they share writing, give specific, honest feedback
- Celebrate milestones and progress warmly`;
}

export async function POST(req: Request) {
  try {
    const { messages, mode, trainerType, userContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const text = await chat({
      tier:      mode === 'thinking' ? 'smart' : 'fast',
      system:    buildSystemPrompt(mode || 'thinking', trainerType || 'general', userContext || {}),
      messages,
      maxTokens: mode === 'thinking' ? 800 : 500,
    });

    return NextResponse.json({ response: text });
  } catch (err) {
    console.error('ai-coach error:', err);
    return NextResponse.json({ error: 'Failed to get coach response' }, { status: 500 });
  }
}
