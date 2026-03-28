import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/app/lib/ai-provider';

interface WritingEntry {
  id: string;
  title: string;
  word_count: number;
  strengths: string | null;
  improvements: string | null;
  feedback: string | null;
  created_at: string;
  category: string;
}

export async function POST(request: NextRequest) {
  try {
    const { writings }: { writings: WritingEntry[] } = await request.json();

    if (!writings || writings.length === 0) {
      return NextResponse.json({ scores: [] });
    }

    // If only 1 writing, score it simply without an AI call
    if (writings.length === 1) {
      const w = writings[0];
      const base = Math.min(50 + Math.round(w.word_count / 10), 70);
      return NextResponse.json({
        scores: [{ id: w.id, score: base, note: 'Keep writing to see your progress chart!' }],
      });
    }

    const prompt = `You are assessing a student's writing quality over time based on AI feedback they received.

For each writing piece below, give a quality score from 20 to 95 (integers only).
Base scores on:
- How positive the strengths feedback is (strong strengths = higher score)
- How many/how serious the improvements needed are (fewer/minor = higher)
- Word count (longer pieces usually show more effort; 50 words ≈ 40pts base, 300+ words ≈ 65+ pts base)
- Make scores vary realistically — they should go up AND down to show a genuine learning curve

Pieces:
${writings.map((w, i) =>
  `[${i + 1}] id="${w.id}" | Title: "${w.title}" | Category: ${w.category} | Words: ${w.word_count}
  Strengths: ${w.strengths || 'none'}
  Needs improving: ${w.improvements || 'none'}
  Overall: ${w.feedback || 'none'}`
).join('\n\n')}

Respond ONLY with valid JSON, no markdown fences, no explanation:
{"scores":[{"id":"<id>","score":<number>,"note":"<5 word summary of key growth>"}]}`;

    const text = await chat({
      tier: 'fast',
      maxTokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    // Strip markdown code fences if the model adds them anyway
    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    return NextResponse.json(JSON.parse(clean));
  } catch (err) {
    console.error('ai-progress error:', err);
    return NextResponse.json({ scores: [] }, { status: 500 });
  }
}
