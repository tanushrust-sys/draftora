import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireRouteAuth } from '@/app/lib/server-auth';

type StudentReviewRow = {
  studentId: string;
  name: string;
  writingSubmitted: number;
  avgWordsPerWriting: number;
  vocabAdded: number;
  lastActiveAt: string | null;
  overall: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parseIntParam(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['teacher']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const classId = String(url.searchParams.get('classId') ?? '').trim();
  const days = clamp(parseIntParam(url.searchParams.get('days'), 7), 1, 30);

  if (!classId) {
    return NextResponse.json({ error: 'Missing classId.' }, { status: 400 });
  }

  const { data: klass, error: classError } = await adminSupabase
    .from('teacher_classes')
    .select('id, name')
    .eq('id', classId)
    .eq('teacher_id', auth.auth.userId)
    .maybeSingle();

  if (classError || !klass) {
    return NextResponse.json({ error: 'Class not found.' }, { status: 404 });
  }

  const { data: links, error: linkError } = await adminSupabase
    .from('teacher_class_students')
    .select('student_id')
    .eq('class_id', classId);

  if (linkError) {
    return NextResponse.json({ error: linkError.message || 'Could not load class members.' }, { status: 500 });
  }

  const studentIds = (links ?? []).map((l) => l.student_id);
  if (!studentIds.length) {
    return NextResponse.json({
      classId,
      className: klass.name,
      rangeDays: days,
      students: [],
      summary: {
        studentCount: 0,
        activeStudents: 0,
        avgWritingSubmitted: 0,
        avgVocabAdded: 0,
        avgWordsPerWriting: 0,
        overall: 0,
      },
    });
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const profilesRes = await adminSupabase
    .from('profiles')
    .select('id, username')
    .in('id', studentIds);

  if (profilesRes.error) {
    return NextResponse.json({ error: profilesRes.error.message || 'Could not load student profiles.' }, { status: 500 });
  }

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p.username]));

  const writingsRes = await adminSupabase
    .from('writings')
    .select('user_id, word_count, created_at, status')
    .in('user_id', studentIds)
    .gte('created_at', since);

  if (writingsRes.error) {
    return NextResponse.json({ error: writingsRes.error.message || 'Could not load writings.' }, { status: 500 });
  }

  const vocabRes = await adminSupabase
    .from('vocab_words')
    .select('user_id, created_at')
    .in('user_id', studentIds)
    .gte('created_at', since);

  if (vocabRes.error) {
    return NextResponse.json({ error: vocabRes.error.message || 'Could not load vocab.' }, { status: 500 });
  }

  const writingAgg = new Map<string, { submitted: number; words: number; count: number; lastAt: string | null }>();
  for (const row of writingsRes.data ?? []) {
    const key = row.user_id as string;
    const existing = writingAgg.get(key) ?? { submitted: 0, words: 0, count: 0, lastAt: null };
    const status = String(row.status ?? '');
    if (status === 'submitted' || status === 'reviewed') {
      existing.submitted += 1;
      existing.words += Number(row.word_count ?? 0) || 0;
      existing.count += 1;
    }
    const createdAt = String(row.created_at ?? '');
    if (createdAt && (!existing.lastAt || createdAt > existing.lastAt)) existing.lastAt = createdAt;
    writingAgg.set(key, existing);
  }

  const vocabAgg = new Map<string, { added: number; lastAt: string | null }>();
  for (const row of vocabRes.data ?? []) {
    const key = row.user_id as string;
    const existing = vocabAgg.get(key) ?? { added: 0, lastAt: null };
    existing.added += 1;
    const createdAt = String(row.created_at ?? '');
    if (createdAt && (!existing.lastAt || createdAt > existing.lastAt)) existing.lastAt = createdAt;
    vocabAgg.set(key, existing);
  }

  const students: StudentReviewRow[] = studentIds.map((id) => {
    const writing = writingAgg.get(id) ?? { submitted: 0, words: 0, count: 0, lastAt: null };
    const vocab = vocabAgg.get(id) ?? { added: 0, lastAt: null };
    const avgWords = writing.count ? Math.round(writing.words / writing.count) : 0;
    const lastActiveAt = [writing.lastAt, vocab.lastAt].filter(Boolean).sort().at(-1) ?? null;

    // Lightweight, transparent scoring: writing is weighted slightly higher than vocab.
    // Targets are “healthy defaults” for a 7-day window; scale linearly with `days`.
    const writingTarget = Math.max(1, Math.round((3 / 7) * days));
    const vocabTarget = Math.max(1, Math.round((14 / 7) * days));
    const writingScore = clamp((writing.submitted / writingTarget) * 100, 0, 100);
    const vocabScore = clamp((vocab.added / vocabTarget) * 100, 0, 100);
    const overall = Math.round(writingScore * 0.6 + vocabScore * 0.4);

    return {
      studentId: id,
      name: profileMap.get(id) ?? 'Student',
      writingSubmitted: writing.submitted,
      avgWordsPerWriting: avgWords,
      vocabAdded: vocab.added,
      lastActiveAt,
      overall,
    };
  });

  students.sort((a, b) => b.overall - a.overall);

  const studentCount = students.length;
  const activeStudents = students.filter((s) => s.lastActiveAt).length;
  const avgWritingSubmitted = Math.round(students.reduce((sum, s) => sum + s.writingSubmitted, 0) / Math.max(1, studentCount));
  const avgVocabAdded = Math.round(students.reduce((sum, s) => sum + s.vocabAdded, 0) / Math.max(1, studentCount));
  const avgWordsPerWriting = Math.round(students.reduce((sum, s) => sum + s.avgWordsPerWriting, 0) / Math.max(1, studentCount));
  const overall = Math.round(students.reduce((sum, s) => sum + s.overall, 0) / Math.max(1, studentCount));

  return NextResponse.json({
    classId,
    className: klass.name,
    rangeDays: days,
    students,
    summary: {
      studentCount,
      activeStudents,
      avgWritingSubmitted,
      avgVocabAdded,
      avgWordsPerWriting,
      overall,
    },
  });
}

