// API route: POST /api/ai-feedback
// Receives a piece of writing, returns structured AI feedback

import { NextResponse } from 'next/server';
import { chat } from '@/app/lib/ai-provider';

export async function POST(req: Request) {
  try {
    const { content, category, prompt, wordCount } = await req.json();

    if (!content || content.trim().length < 10) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 });
    }

    const raw = await chat({
      tier: 'fast',
      maxTokens: 1000,
      messages: [
        {
          role: 'user',
          content: `You are an expert writing coach giving thorough, detailed feedback to a student. Analyse this piece of ${category} writing deeply and respond with ONLY a valid JSON object — no markdown, no extra text.

${prompt ? `Writing prompt: "${prompt}"\n` : ''}Word count: ${wordCount}

Writing:
"${content}"

Analyse the writing across these dimensions: structure, vocabulary, sentence variety, clarity, voice/tone, and how well it fits the ${category} format. Then return exactly this JSON structure:
{
  "strengths": "3-5 sentences identifying specific strengths with examples quoted directly from their writing — be precise about what works and why",
  "improvements": "3-5 sentences on the 2-3 most important areas to improve — give concrete, actionable techniques the student can apply immediately, with brief examples of how",
  "overall": "2-3 sentences of honest, warm summary — acknowledge real effort, highlight their biggest win, and give one clear focus for next time"
}`,
        },
      ],
    });

    const feedback = JSON.parse(raw);
    return NextResponse.json({ feedback });
  } catch (err) {
    console.error('ai-feedback error:', err);
    return NextResponse.json({ error: 'Failed to generate feedback' }, { status: 500 });
  }
}
