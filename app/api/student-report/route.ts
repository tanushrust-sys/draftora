import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireRouteAuth } from '@/app/lib/server-auth';
import { chat, extractJSON } from '@/app/lib/ai-provider';

const REPORT_CACHE_VERSION = 3;

function getLastSevenDates() {
  return Array.from({ length: 7 }, (_, index) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - index));
    return d.toISOString().slice(0, 10);
  });
}

function getLastThirtyDates() {
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return start.toISOString().slice(0, 10);
}

async function canAccessStudent(userId: string, accountType: 'teacher' | 'parent', studentId: string) {
  if (accountType === 'parent') {
    const { data } = await adminSupabase
      .from('parent_student_links')
      .select('id')
      .eq('parent_id', userId)
      .eq('student_id', studentId)
      .maybeSingle();
    return Boolean(data);
  }

  const { data: ownedStudent } = await adminSupabase
    .from('profiles')
    .select('id')
    .eq('id', studentId)
    .eq('teacher_id', userId)
    .maybeSingle();

  if (ownedStudent) {
    return true;
  }

  const { data: classes } = await adminSupabase
    .from('teacher_classes')
    .select('id')
    .eq('teacher_id', userId);

  const classIds = (classes ?? []).map((k) => k.id);
  if (classIds.length === 0) return false;

  const { data } = await adminSupabase
    .from('teacher_class_students')
    .select('class_id')
    .eq('student_id', studentId)
    .in('class_id', classIds)
    .maybeSingle();

  return Boolean(data);
}

type AiFeedback = {
  snapshot: string;
  feedback: string[];
  improvements: string[];
  improvementSummary: string;
  reportVersion?: number;
  goingWell?: string[];
  improveNext?: string[];
};

type WritingForAi = {
  title: string;
  category: string;
  status: string;
  word_count: number;
  prompt: string | null;
  content: string | null;
  strengths: string | null;
  improvements: string | null;
  feedback: string | null;
  created_at: string;
};
type VocabForAi = { word: string; meaning: string; mastered: boolean; times_used: number; times_to_master: number };

function clip(text: string | null | undefined, max = 220) {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function buildWritingEvidence(writings: WritingForAi[]) {
  if (!writings.length) return 'No writing pieces yet.';

  return writings.slice(0, 6).map((w) => {
    const lines = [`- "${w.title}" (${w.category}, ${w.word_count} words, status: ${w.status})`];
    if (w.prompt) lines.push(`  Prompt: ${clip(w.prompt, 180)}`);
    if (w.content) lines.push(`  Draft excerpt: ${clip(w.content, 360)}`);
    if (w.strengths) lines.push(`  Existing strengths: ${clip(w.strengths, 220)}`);
    if (w.feedback) lines.push(`  Existing feedback: ${clip(w.feedback, 220)}`);
    if (w.improvements) lines.push(`  Existing improvements: ${clip(w.improvements, 220)}`);
    return lines.join('\n');
  }).join('\n\n');
}

async function generateAiFeedback(
  profile: { username: string; age_group: string | null; writing_experience_score: number; daily_word_goal: number; daily_vocab_goal: number; streak: number; longest_streak: number },
  writings: WritingForAi[],
  vocab: VocabForAi[],
  totalWords: number,
  mastered: number,
  weekWords: number,
  weekStats: Array<{ date: string; words_written?: number; vocab_words_learned?: number; custom_goal_completed?: boolean }>,
): Promise<AiFeedback> {
  const vocabLines = vocab.length
    ? vocab.slice(0, 12).map((v) => `- "${v.word}": ${v.meaning} (mastered: ${v.mastered}, ${v.times_used}/${v.times_to_master} uses)`).join('\n')
    : 'No vocabulary saved yet.';

  const avgWords = writings.length > 0 ? Math.round(totalWords / writings.length) : 0;
  const masteryRate = vocab.length > 0 ? Math.round((mastered / vocab.length) * 100) : 0;
  const daysActive = weekStats.filter((s) => (s.words_written ?? 0) > 0).length;
  const categoryCount: Record<string, number> = {};
  for (const w of writings) categoryCount[w.category] = (categoryCount[w.category] ?? 0) + 1;
  const categoryBreakdown = Object.entries(categoryCount).map(([cat, n]) => `${cat}: ${n}`).join(', ') || 'none';
  const submittedCount = writings.filter((w) => w.status === 'submitted' || w.status === 'reviewed').length;
  const writingEvidence = buildWritingEvidence(writings);

  const hasActivity = writings.length > 0 || totalWords > 0 || vocab.length > 0;

  if (!hasActivity) {
    return {
      reportVersion: REPORT_CACHE_VERSION,
      snapshot: `${profile.username} has not yet submitted any writing pieces or saved any vocabulary words. There is no activity data to assess at this time.`,
      feedback: [],
      improvements: [
        'No writing pieces have been submitted yet — encourage the student to complete their first piece.',
        'No vocabulary words have been saved — the student should start exploring the vocab section.',
        'No active writing streak has been established — daily writing habits should be encouraged.',
      ],
      improvementSummary: `${profile.username} has not yet engaged with any writing or vocabulary activities on Draftora. There is no data available to provide a detailed assessment. To begin building a meaningful progress record, the student should submit at least one writing piece and save some vocabulary words. Once activity is recorded, this report will provide specific, data-driven insights into their writing strengths, areas for improvement, vocabulary mastery, and consistency.`,
    };
  }

  const prompt = `You are generating a sharply focused student writing progress report for a parent or teacher. Return ONLY valid JSON with exactly these four keys. Base every sentence strictly on the data provided — do not invent strengths, skills, or positives that are not supported by the actual writing.

Student data:
- Name: ${profile.username}
- Age group: ${profile.age_group || 'unknown'}
- Writing experience self-assessed: ${profile.writing_experience_score}/10
- Current streak: ${profile.streak} days (longest ever: ${profile.longest_streak} days)
- Days active this week: ${daysActive}/7
- Total pieces written: ${writings.length} (${submittedCount} submitted/reviewed)
- Total words written: ${totalWords.toLocaleString()}, avg per piece: ${avgWords}
- Words written this week: ${weekWords}
- Daily word goal: ${profile.daily_word_goal} words/day
- Writing categories: ${categoryBreakdown}
- Vocab saved: ${vocab.length} words, mastered: ${mastered} (${masteryRate}% mastery rate)
- Daily vocab goal: ${profile.daily_vocab_goal} words/day

Recent writings and draft evidence (newest first):
${writingEvidence}

Recent vocabulary:
${vocabLines}

IMPORTANT RULES:
- Return strictly valid JSON only. Do not include markdown, explanation, or extra keys.
- The snapshot must be one paragraph, 90-110 words, and read like a teacher's honest, evidence-based summary of the student's writing quality.
- The snapshot should emphasize craft, clarity, structure, voice, originality, vocabulary use, and recurring weaknesses.
- Do not make the snapshot feel like a stats report. Mention numbers only when they explain a writing strength or weakness.
- "feedback" must be 3-4 concise teacher-style sentences about what is truly going well in the writing. Focus on specific craft evidence, not general praise.
- "improvements" must be 3-4 short, explicit next steps for the writing craft, based only on the actual data and writing evidence.
- "improvementSummary" must be 200-240 words of tightly written prose describing the single most important things this student needs to improve. Be direct, constructive, and data-driven. No bullet points. No gamification or motivational fluff. Do not open with the student's name.
- If the student has weak or minimal output, say so clearly and give a strong, concrete improvement recommendation.
- Do not invent progress or positive trends that are not supported by the data.

Return JSON:
{
  "snapshot": "About 100 words of balanced prose about the student's writing quality, strengths, weaknesses, and biggest improvement areas.",
  "feedback": ["3-4 concise teacher-style feedback bullets grounded in the writing data."],
  "improvements": ["3-4 actionable improvement bullets grounded in the writing data."],
  "improvementSummary": "200–240 word focused prose on what this student needs to improve most. Be frank and constructive. Reference actual data. Cover writing output, piece length, vocab use, and consistency. No bullet points. No gamification stats. Do not open with the student's name."
}`;

  const raw = await chat({
    tier: 'smart',
    system: 'You write structured student progress reports. Return only valid JSON, no markdown fences.',
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 750,
    jsonMode: true,
  });

  const parsed = JSON.parse(extractJSON(raw));

  return {
    reportVersion: REPORT_CACHE_VERSION,
    snapshot: typeof parsed.snapshot === 'string' ? parsed.snapshot : '',
    feedback: Array.isArray(parsed.feedback)
      ? parsed.feedback.slice(0, 5)
      : Array.isArray(parsed.goingWell)
        ? parsed.goingWell.slice(0, 5)
        : [],
    improvements: Array.isArray(parsed.improvements)
      ? parsed.improvements.slice(0, 5)
      : Array.isArray(parsed.improveNext)
        ? parsed.improveNext.slice(0, 5)
        : [],
    improvementSummary: typeof parsed.improvementSummary === 'string' ? parsed.improvementSummary : '',
    goingWell: Array.isArray(parsed.feedback) ? parsed.feedback.slice(0, 5) : Array.isArray(parsed.goingWell) ? parsed.goingWell.slice(0, 5) : [],
    improveNext: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 5) : Array.isArray(parsed.improveNext) ? parsed.improveNext.slice(0, 5) : [],
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['teacher', 'parent']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const studentId = new URL(request.url).searchParams.get('studentId')?.trim() || '';
  if (!studentId) {
    return NextResponse.json({ error: 'Missing studentId.' }, { status: 400 });
  }

  const allowed = await canAccessStudent(auth.auth.userId, auth.auth.profile.account_type as 'teacher' | 'parent', studentId);
  if (!allowed) {
    return NextResponse.json({ error: 'You cannot view that student.' }, { status: 403 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const [profileRes, writingsRes, vocabRes, statsRes, weekStatsRes, monthStatsRes, cacheRes] = await Promise.all([
    adminSupabase.from('profiles').select('id, username, title, level, xp, streak, longest_streak, age_group, student_id, account_type, daily_word_goal, daily_vocab_goal, custom_daily_goal, writing_experience_score').eq('id', studentId).maybeSingle(),
    adminSupabase.from('writings').select('id, title, category, status, word_count, xp_earned, is_favorite, feedback, strengths, improvements, prompt, content, created_at, updated_at').eq('user_id', studentId).order('created_at', { ascending: false }).limit(20),
    adminSupabase.from('vocab_words').select('id, word, meaning, mastered, times_used, times_to_master, created_at').eq('user_id', studentId).order('created_at', { ascending: false }),
    adminSupabase.from('daily_stats').select('*').eq('user_id', studentId).eq('date', today).maybeSingle(),
    adminSupabase.from('daily_stats').select('date, words_written, vocab_words_learned, writings_completed, xp_earned, custom_goal_completed').eq('user_id', studentId).in('date', getLastSevenDates()),
    adminSupabase.from('daily_stats').select('date, words_written, vocab_words_learned, writings_completed, xp_earned').eq('user_id', studentId).gte('date', getLastThirtyDates()),
    // Fetch most recent cached entry (any date) — stale-while-revalidate
    adminSupabase.from('student_report_cache').select('date, content').eq('student_id', studentId).order('date', { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (profileRes.error || !profileRes.data) {
    return NextResponse.json({ error: 'Student profile not found.' }, { status: 404 });
  }

  if (writingsRes.error || vocabRes.error || statsRes.error || weekStatsRes.error) {
    return NextResponse.json({ error: 'Could not load the report.' }, { status: 500 });
  }

  const weekStats = (weekStatsRes.data ?? []) as Array<{ date: string; words_written?: number; vocab_words_learned?: number; writings_completed?: number; xp_earned?: number; custom_goal_completed?: boolean }>;
  const monthStats = (monthStatsRes.data ?? []) as Array<{ date: string; words_written?: number; vocab_words_learned?: number; writings_completed?: number; xp_earned?: number }>;
  const weekWords = weekStats.reduce((sum, s) => sum + (s.words_written ?? 0), 0);
  const weekVocab = weekStats.reduce((sum, s) => sum + (s.vocab_words_learned ?? 0), 0);
  const monthWords = monthStats.reduce((sum, s) => sum + (s.words_written ?? 0), 0);
  const daysActiveThisWeek = weekStats.filter((s) => (s.words_written ?? 0) > 0).length;
  const daysActiveThisMonth = monthStats.filter((s) => (s.words_written ?? 0) > 0).length;

  const allWritings = writingsRes.data ?? [];
  const totalWords = allWritings.reduce((sum, w) => sum + (w.word_count ?? 0), 0);
  const vocab = vocabRes.data ?? [];
  const mastered = vocab.filter((v) => v.mastered).length;

  // Category breakdown across all writings
  const categoryCount: Record<string, number> = {};
  for (const w of allWritings) categoryCount[w.category] = (categoryCount[w.category] ?? 0) + 1;

  // Avg words per piece for last 5 vs previous 5 (trend indicator)
  const last5 = allWritings.slice(0, 5);
  const prev5 = allWritings.slice(5, 10);
  const avgLast5 = last5.length > 0 ? Math.round(last5.reduce((s, w) => s + w.word_count, 0) / last5.length) : 0;
  const avgPrev5 = prev5.length > 0 ? Math.round(prev5.reduce((s, w) => s + w.word_count, 0) / prev5.length) : 0;

  const profile = profileRes.data;
  // Serve recent writings in UI (8), all writings for AI context
  const writings = allWritings.slice(0, 8);

  // Serve any cached AI feedback immediately (stale-while-revalidate).
  // If the cache is from a previous day, or the student now has activity but
  // the cached snapshot looks like a no-activity placeholder, regenerate.
  const cachedRow = cacheRes.data as { date?: string; content?: unknown } | null;
  const cachedContent = cachedRow?.content as AiFeedback | null ?? null;
  const cachedVersion = typeof cachedContent?.reportVersion === 'number' ? cachedContent.reportVersion : 0;

  const studentHasActivity = allWritings.length > 0 || vocab.length > 0;
  const cachedFeedbackItems = cachedContent?.feedback ?? cachedContent?.goingWell ?? [];
  const cachedImprovementItems = cachedContent?.improvements ?? cachedContent?.improveNext ?? [];

  // Detect cached reports that are clearly wrong relative to current data:
  // - placeholder "no activity" snapshots
  // - cached when student had 0 writings but now has real ones (snapshot mentions "no pieces" or "yet to engage")
  // - cached feedback/improvement bullets fabricate positives like "blank slate" when student has real activity
  const cachedSnapshotText = (cachedContent?.snapshot ?? '').toLowerCase();
  const cachedLooksStale =
    studentHasActivity &&
    cachedContent !== null &&
    (cachedVersion < REPORT_CACHE_VERSION ||
      cachedSnapshotText.includes('has not yet submitted') ||
      cachedSnapshotText.includes('yet to engage') ||
      cachedSnapshotText.includes('no pieces written') ||
      cachedSnapshotText.includes('no writing pieces') ||
      cachedSnapshotText.includes('0 pieces') ||
      cachedFeedbackItems.some((s: string) =>
        s.toLowerCase().includes('blank slate') ||
        s.toLowerCase().includes('start fresh') ||
        s.toLowerCase().includes('no prior submissions') ||
        s.toLowerCase().includes('no negative habits'),
      ) ||
      cachedImprovementItems.some((s: string) =>
        s.toLowerCase().includes('blank slate') ||
        s.toLowerCase().includes('start fresh') ||
        s.toLowerCase().includes('no prior submissions') ||
        s.toLowerCase().includes('no negative habits'),
      ));

  let aiFeedback: AiFeedback = cachedContent && !cachedLooksStale
    ? cachedContent
    : { snapshot: '', feedback: [], improvements: [], improvementSummary: '', reportVersion: REPORT_CACHE_VERSION, goingWell: [], improveNext: [] };

  const needsRegen = !cachedRow || cachedRow.date !== today || cachedLooksStale;

  if (needsRegen) {
    if (!cachedContent || cachedLooksStale) {
      // No usable cache at all — generate inline so the first load gets real data
      try {
        const fresh = await generateAiFeedback(profile, allWritings, vocab, totalWords, mastered, weekWords, weekStats);
        aiFeedback = fresh;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        void (adminSupabase as any).from('student_report_cache').upsert({ student_id: studentId, date: today, content: fresh });
      } catch {
        // fall through with empty aiFeedback
      }
    } else {
      // Stale but usable cache — serve it immediately, regenerate in background
      void generateAiFeedback(profile, allWritings, vocab, totalWords, mastered, weekWords, weekStats)
        .then((fresh) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (adminSupabase as any).from('student_report_cache').upsert({ student_id: studentId, date: today, content: fresh }),
        )
        .catch(() => undefined);
    }
  }

  return NextResponse.json({
    profile,
    stats: statsRes.data ?? null,
    writings,
    vocab,
    weekStats,
    aiFeedback,
    aiFeedbackStale: needsRegen && (!cachedContent || cachedLooksStale) ? false : (needsRegen),
    summary: {
      totalWritings: allWritings.length,
      totalWords,
      vocabCount: vocab.length,
      masteredCount: mastered,
      weekWords,
      weekVocab,
      monthWords,
      daysActiveThisWeek,
      daysActiveThisMonth,
      categoryCount,
      avgLast5,
      avgPrev5,
    },
  });
}
