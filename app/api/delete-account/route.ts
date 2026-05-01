import { NextRequest, NextResponse } from 'next/server';
import { requireRouteAuth } from '@/app/lib/server-auth';
import { isPracticeEmail, PRACTICE_DISPLAY_USERNAME } from '@/app/lib/practice-mode';

export async function POST(req: NextRequest) {
  const auth = await requireRouteAuth(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { userId, profile } = auth.auth;
  const { adminSupabase } = auth;
  const isPracticeAccount =
    isPracticeEmail(profile.email) ||
    (profile.username || '').trim().toUpperCase() === PRACTICE_DISPLAY_USERNAME;

  if (!isPracticeAccount) {
    const { error: tombstoneError } = await adminSupabase.from('deleted_accounts').insert({
      user_id: userId,
      email: profile.email,
      username: profile.username,
      account_type: profile.account_type,
    });

    if (tombstoneError) {
      return NextResponse.json({ error: tombstoneError.message }, { status: 500 });
    }
  }

  if (profile.account_type === 'teacher') {
    const { data: classes } = await adminSupabase.from('teacher_classes').select('id').eq('teacher_id', userId);
    const classIds = (classes ?? []).map((row: { id: string }) => row.id);
    if (classIds.length) {
      await adminSupabase.from('teacher_class_students').delete().in('class_id', classIds);
    }
    await adminSupabase.from('teacher_classes').delete().eq('teacher_id', userId);
  }

  if (profile.account_type === 'parent') {
    await adminSupabase.from('parent_student_links').delete().eq('parent_id', userId);
  }

  // Delete all user data (cascade handled by DB, but belt-and-suspenders)
  await adminSupabase.from('writings').delete().eq('user_id', userId);
  await adminSupabase.from('vocab_words').delete().eq('user_id', userId);
  await adminSupabase.from('vocab_tests').delete().eq('user_id', userId);
  await adminSupabase.from('daily_stats').delete().eq('user_id', userId);
  await adminSupabase.from('xp_log').delete().eq('user_id', userId);
  await adminSupabase.from('coach_conversations').delete().eq('user_id', userId);
  await adminSupabase.from('profiles').delete().eq('id', userId);

  const { error } = await adminSupabase.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
