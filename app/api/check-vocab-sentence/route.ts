// API route: POST /api/check-vocab-sentence
// Checks if a user's sentence correctly uses a vocabulary word

import { NextResponse } from 'next/server';
import { chat } from '@/app/lib/ai-provider';

export async function POST(req: Request) {
  try {
    const { word, meaning, sentence } = await req.json();

    if (!word || !sentence || sentence.trim().length < 3) {
      return NextResponse.json({ error: 'Word and sentence are required' }, { status: 400 });
    }

    const text = await chat({
      tier: 'nano',
      maxTokens: 400,
      messages: [
        {
          role: 'user',
          content: `You are a vocabulary coach for students. A student is practising the word "${word}" which means: "${meaning}".

They wrote this sentence:
"${sentence}"

Evaluate their sentence and respond with ONLY a valid JSON object — no markdown, no extra text.

Return exactly this JSON structure:
{
  "correct": true or false (did they use the word correctly in context?),
  "strengths": "1-2 sentences on what is good about their sentence — comment on correct usage, clarity, or creativity even if imperfect",
  "improvements": "1-2 sentences on what could be better — if correct, suggest how to make it even more vivid or precise; if incorrect, explain the mistake kindly and how to fix it",
  "summary": "1 short encouraging sentence wrapping up — motivate them to keep practising",
  "suggestion": "If incorrect, give a better example sentence using the word. If correct, leave as empty string."
}`,
        },
      ],
    });

    const result = JSON.parse(text);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Vocab sentence check error:', error);
    return NextResponse.json({ error: 'Failed to check sentence' }, { status: 500 });
  }
}
