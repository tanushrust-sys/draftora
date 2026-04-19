import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireRouteAuth } from '@/app/lib/server-auth';
import { chat } from '@/app/lib/ai-provider';

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

  const [profileRes, writingsRes, vocabRes] = await Promise.all([
    adminSupabase.from('profiles').select('username, age_group, writing_experience_score').eq('id', studentId).maybeSingle(),
    adminSupabase.from('writings').select('title, category, status, word_count').eq('user_id', studentId).order('created_at', { ascending: false }).limit(5),
    adminSupabase.from('vocab_words').select('word, meaning, mastered, times_used, times_to_master').eq('user_id', studentId).order('created_at', { ascending: false }).limit(10),
  ]);

  if (!profileRes.data) {
    return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
  }

  const profile = profileRes.data;
  const writings = writingsRes.data ?? [];
  const vocab = vocabRes.data ?? [];
  const totalWords = writings.reduce((sum, w) => sum + (w.word_count ?? 0), 0);
  const mastered = vocab.filter((v) => v.mastered).length;

  const writingLines = writings.length
    ? writings.map((w) => `- "${w.title}" (${w.category}, ${w.word_count} words, ${w.status})`).join('\n')
    : 'No writing pieces yet.';

  const vocabLines = vocab.length
    ? vocab.map((v) => `- "${v.word}": ${v.meaning} (mastered: ${v.mastered}, uses: ${v.times_used}/${v.times_to_master})`).join('\n')
    : 'No vocabulary saved yet.';

  const prompt = `Write a focused improvement note for a parent or teacher. Exactly 180–220 words. Flowing prose only — no bullet points, headers, or lists. Focus entirely on what this student needs to improve: writing quality, piece length, vocabulary use, and consistency. Be specific and honest. Do not mention XP, streaks, levels, or gamification. Do not open with the student's name.

Student: ${profile.username}, age group: ${profile.age_group || 'unknown'}, writing experience: ${profile.writing_experience_score}/10
Total pieces: ${writings.length}, total words: ${totalWords}, avg per piece: ${writings.length > 0 ? Math.round(totalWords / writings.length) : 0}
Writings:
${writingLines}
Vocab saved: ${vocab.length}, mastered: ${mastered}
Vocab:
${vocabLines}`;

  const summary = await chat({
    tier: 'smart',
    system: 'You write honest, specific, improvement-focused student progress notes for parents and teachers. Plain prose only.',
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 240,
  });

  return NextResponse.json({ summary });
}
