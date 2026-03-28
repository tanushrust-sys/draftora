// API route: POST /api/extract-vocab
// Pulls interesting/advanced words from a writing submission and adds them to the user's Word Bank

import { NextResponse } from 'next/server';
import { chat } from '@/app/lib/ai-provider';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/app/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { content, userId, writingId } = await req.json();

    if (!content || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const raw = await chat({
      tier: 'nano',
      maxTokens: 400,
      messages: [
        {
          role: 'user',
          content: `Extract up to 5 interesting, advanced, or useful vocabulary words from this student writing. Only pick words that are genuinely worth learning. Respond with ONLY a valid JSON array, no markdown.

Writing: "${content}"

Return this structure:
[
  {
    "word": "the word",
    "meaning": "simple, student-friendly definition",
    "example_sentence": "a new example sentence using the word in context"
  }
]

If there are no notable words, return an empty array: []`,
        },
      ],
    });

    const words: Array<{ word: string; meaning: string; example_sentence: string }> = JSON.parse(raw);

    if (!Array.isArray(words) || words.length === 0) {
      return NextResponse.json({ added: 0 });
    }

    const { data: existing } = await supabase
      .from('vocab_words')
      .select('word')
      .eq('user_id', userId);

    const existingWords = new Set(
      ((existing ?? []) as Array<{ word: string }>).map((w) => w.word.toLowerCase())
    );

    const toInsert: Database['public']['Tables']['vocab_words']['Insert'][] = words
      .filter(w => w.word && !existingWords.has(w.word.toLowerCase()))
      .map(w => ({
        user_id: userId,
        word: w.word,
        meaning: w.meaning,
        example_sentence: w.example_sentence,
        times_used: 0,
        times_to_master: 5,
        mastered: false,
        source_writing_id: writingId || null,
      }));

    if (toInsert.length > 0) {
      await supabase.from('vocab_words').insert(toInsert as any);
    }

    return NextResponse.json({ added: toInsert.length });
  } catch (err) {
    console.error('extract-vocab error:', err);
    return NextResponse.json({ error: 'Failed to extract vocab' }, { status: 500 });
  }
}
