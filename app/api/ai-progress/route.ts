import { NextResponse } from 'next/server';
import { chat, extractJSON } from '@/app/lib/ai-provider';
import { buildAgeAwareProgressAnalysis, buildProgressScores } from '@/app/lib/progress-scoring';

interface WritingEntry {
  id: string;
  title: string;
  content?: string | null;
  prompt?: string | null;
  word_count: number;
  strengths: string | null;
  improvements: string | null;
  feedback: string | null;
  created_at: string;
  category: string;
}

function buildFeedbackSummary(writings: WritingEntry[]): string {
  const sorted = [...writings].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const totalWords = sorted.reduce((sum, writing) => sum + (writing.word_count || 0), 0);
  const avgWords = sorted.length ? Math.round(totalWords / sorted.length) : 0;
  const categories = [...new Set(sorted.map((writing) => writing.category).filter(Boolean))];

  const piecesSummary = sorted.map((writing, index) => {
    const lines: string[] = [`Piece ${index + 1}: ${writing.title || 'Untitled'} (${writing.category}, ${writing.word_count} words)`];
    if (writing.prompt) lines.push(`  Prompt: ${writing.prompt.slice(0, 220)}`);
    if (writing.content) lines.push(`  Draft sample: ${writing.content.slice(0, 260)}`);
    if (writing.feedback) lines.push(`  Overall feedback: ${writing.feedback.slice(0, 300)}`);
    if (writing.improvements) lines.push(`  Section feedback: ${writing.improvements.slice(0, 300)}`);
    return lines.join('\n');
  }).join('\n\n');

  return `Writer stats: ${sorted.length} reviewed pieces, avg ${avgWords} words per piece, categories: ${categories.join(', ')}.

${piecesSummary}`;
}

export async function POST(request: Request) {
  let writings: WritingEntry[] = [];
  let ageGroup: string | undefined;
  try {
    ({ writings, ageGroup } = await request.json() as { writings: WritingEntry[]; ageGroup?: string });

    if (!writings || writings.length === 0) {
      return NextResponse.json({ scores: [], analysis: null });
    }

    const sorted = [...writings].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    const scores = buildProgressScores(sorted, ageGroup);
    const avgScore = Math.round(scores.reduce((sum, item) => sum + item.score, 0) / scores.length);
    const trend = scores.length >= 2 ? scores[scores.length - 1].score - scores[0].score : 0;
    const totalWords = sorted.reduce((sum, writing) => sum + (writing.word_count || 0), 0);
    const avgWords = sorted.length ? Math.round(totalWords / sorted.length) : 0;
    const feedbackSummary = buildFeedbackSummary(sorted);

    const system = `You are a writing coach analyzing a student's portfolio of reviewed pieces. Based on the actual drafts and feedback, generate a personalized progress report. Be specific. If some pieces mostly copy the prompt or fail to become real writing, say that clearly and let it meaningfully affect the report.

Return strict JSON with exactly these keys:
{
  "summary": "2 sentences: state how many pieces, the average length and score, and one specific observation about their trajectory.",
  "strengths": ["3 specific strengths observed across the portfolio"],
  "areasToImprove": ["3 specific improvement areas drawn from recurring patterns"],
  "writingPatterns": "1-2 sentences about visible patterns across categories, length, originality, and structure.",
  "vocabularyTrend": "1 sentence about word choice or originality patterns.",
  "recommendation": "1 focused next step for the next piece."
}

The tone must be heavily tailored to the writer age group. If the age group is 5-10, use very simple child-friendly wording with short sentences and avoid academic language.`;

    const userPrompt = `Analyze this writer's portfolio and generate their progress report.

Age group: ${ageGroup || 'unknown'}
Average score: ${avgScore}/100
Average piece length: ${avgWords} words
Score trend: ${trend >= 0 ? `+${trend}` : trend} points from first to latest

Portfolio:

${feedbackSummary}

Return ONLY valid JSON with keys: summary, strengths, areasToImprove, writingPatterns, vocabularyTrend, recommendation.`;

    const raw = await chat({
      tier: 'fast',
      system,
      maxTokens: 700,
      jsonMode: true,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let analysis = buildAgeAwareProgressAnalysis(sorted, ageGroup);
    try {
      const parsed = JSON.parse(extractJSON(raw)) as typeof analysis;
      if (parsed?.summary && Array.isArray(parsed.strengths) && Array.isArray(parsed.areasToImprove)) {
        analysis = parsed;
      }
    } catch {
      analysis = buildAgeAwareProgressAnalysis(sorted, ageGroup);
    }

    if (analysis && !analysis.summary.includes(String(sorted.length))) {
      analysis.summary = `You have ${sorted.length} reviewed piece${sorted.length === 1 ? '' : 's'} averaging ${avgWords} words and ${avgScore}/100. ${analysis.summary}`;
    }

    return NextResponse.json({ scores, analysis });
  } catch (err) {
    console.error('ai-progress error:', err);
    if (writings.length > 0) {
      const sorted = [...writings].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
      return NextResponse.json({
        scores: buildProgressScores(sorted, ageGroup),
        analysis: buildAgeAwareProgressAnalysis(sorted, ageGroup),
      });
    }
    return NextResponse.json({ scores: [], analysis: null });
  }
}
