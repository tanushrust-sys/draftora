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
      maxTokens: 600,
      messages: [
        {
          role: 'user',
          content: `You are a warm, encouraging writing coach for students. Analyse this piece of ${category} writing and respond with ONLY a valid JSON object — no markdown, no extra text.

${prompt ? `Writing prompt: "${prompt}"\n` : ''}Word count: ${wordCount}

Writing:
"${content}"

Return exactly this JSON structure:
{
  "strengths": "2-3 sentences on what the student did well — be specific and genuine",
  "improvements": "1-2 sentences on the single most important area to improve — be kind and constructive",
  "overall": "1-2 sentences of warm overall encouragement that motivates them to keep going"
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
