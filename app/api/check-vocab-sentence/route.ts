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
      tier: 'fast',
      maxTokens: 300,
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
  "feedback": "1-2 sentences — if correct, praise them warmly and note what made it good. If incorrect, gently explain how to use it better with a quick tip.",
  "suggestion": "If incorrect, give a short example sentence. If correct, leave this as an empty string."
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
