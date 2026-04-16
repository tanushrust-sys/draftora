// API route: POST /api/drill-review
// After a Word Bank Drill, generates a thorough AI review of the session

import { NextResponse } from 'next/server';
import { chat } from '@/app/lib/ai-provider';

type DrillResultInput = {
  word: string;
  meaning: string;
  challengeType: 'recall' | 'use-it' | 'odd-one-out';
  correct: boolean;
  userAnswer: string;
};

type DrillReview = {
  summary: string;       // 1 paragraph: what they showed they know, what needs work
  weak_words: string[];  // words to focus on
  strong_words: string[]; // words they nailed
  next_steps: string;    // specific, actionable advice for the next session
  encouragement: string; // one warm, personal sentence
};

function buildFallbackReview(results: DrillResultInput[]): DrillReview {
  const correct = results.filter(r => r.correct);
  const wrong = results.filter(r => !r.correct);
  return {
    summary: `You completed ${results.length} challenges and got ${correct.length} correct. ${wrong.length > 0 ? `Focus on the words you missed to strengthen your retention.` : `Great consistency across all challenges!`}`,
    weak_words: wrong.map(r => r.word),
    strong_words: correct.map(r => r.word),
    next_steps: wrong.length > 0
      ? `Write one sentence for each word you missed: ${wrong.map(r => r.word).join(', ')}. Do this before your next drill session.`
      : `Try increasing your drill size — you're ready to take on more words at once.`,
    encouragement: `Every drill session builds stronger vocabulary recall — keep it up!`,
  };
}

export async function POST(req: Request) {
  let results: DrillResultInput[] = [];
  let ageGroup = '';

  try {
    const body = await req.json();
    results = body.results ?? [];
    ageGroup = body.ageGroup ?? '';

    if (!results.length) {
      return NextResponse.json({ review: buildFallbackReview([]) });
    }

    const correct = results.filter(r => r.correct);
    const wrong = results.filter(r => !r.correct);

    // Build a detailed summary of what happened in the drill
    const challengeLines = results.map(r => {
      const label = r.challengeType === 'recall' ? 'Recall (typed the meaning)' :
                    r.challengeType === 'use-it' ? 'Use It (wrote a sentence)' :
                    'Pick the Meaning (multiple choice)';
      return `- "${r.word}" (${label}): ${r.correct ? 'CORRECT' : 'WRONG'} — user answered: "${r.userAnswer.slice(0, 120)}"`;
    }).join('\n');

    const prompt = `You are an expert vocabulary coach reviewing a student's Word Bank Drill session.

Age group: ${ageGroup || 'unknown'}
Total challenges: ${results.length}
Correct: ${correct.length} | Wrong: ${wrong.length}

Drill breakdown:
${challengeLines}

Write a thorough, personal, educational review of this drill session. Be specific — reference the actual words and what the student did. Do NOT be generic.

Return ONLY valid JSON with exactly these keys:
{
  "summary": "2-3 sentences. What patterns you see — which types of challenges they handled well vs poorly, any specific words they struggled with and why that might be, what their overall retention looks like.",
  "weak_words": ["array of words they got wrong — empty array if all correct"],
  "strong_words": ["array of words they got right"],
  "next_steps": "2-3 specific, actionable sentences. What to do before the next drill: e.g. write example sentences for missed words, look up etymology, try using them in writing. Reference the actual missed words by name.",
  "encouragement": "One warm, specific sentence that references something they actually did well in this session."
}`;

    const raw = await chat({
      tier: 'fast',
      maxTokens: 400,
      jsonMode: true,
      messages: [{ role: 'user', content: prompt }],
    });

    let review: DrillReview | null = null;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (typeof parsed.summary === 'string' && Array.isArray(parsed.weak_words)) {
        review = {
          summary: parsed.summary as string,
          weak_words: (parsed.weak_words as unknown[]).filter((w): w is string => typeof w === 'string'),
          strong_words: ((parsed.strong_words as unknown[] | undefined) ?? []).filter((w): w is string => typeof w === 'string'),
          next_steps: typeof parsed.next_steps === 'string' ? parsed.next_steps : '',
          encouragement: typeof parsed.encouragement === 'string' ? parsed.encouragement : '',
        };
      }
    } catch {
      // fall through to fallback
    }

    return NextResponse.json({ review: review ?? buildFallbackReview(results) });
  } catch (err) {
    console.error('drill-review error:', err);
    return NextResponse.json({ review: buildFallbackReview(results) });
  }
}
