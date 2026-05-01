import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase } from '@/app/lib/server-auth';
import { getTokenFromRequest } from '@/app/lib/practice-route-auth';
import { isPracticeEmail, isPracticeUserMetadata } from '@/app/lib/practice-mode';

async function deletePracticeUserData(userId: string) {
  await Promise.allSettled([
    adminSupabase.from('writings').delete().eq('user_id', userId),
    adminSupabase.from('vocab_words').delete().eq('user_id', userId),
    adminSupabase.from('vocab_tests').delete().eq('user_id', userId),
    adminSupabase.from('daily_stats').delete().eq('user_id', userId),
    adminSupabase.from('xp_log').delete().eq('user_id', userId),
    adminSupabase.from('coach_conversations').delete().eq('user_id', userId),
    adminSupabase.from('profiles').delete().eq('id', userId),
  ]);
}

export async function POST(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 });
  }

  const { data, error } = await adminSupabase.auth.getUser(token);
  const user = data.user ?? null;

  if (error || !user) {
    return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
  }

  const isPractice =
    isPracticeUserMetadata(user.user_metadata as Record<string, unknown> | null) ||
    isPracticeEmail(user.email);

  if (!isPractice) {
    return NextResponse.json({ error: 'Practice session required.' }, { status: 403 });
  }

  await deletePracticeUserData(user.id);

  const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(user.id);
  if (deleteUserError) {
    return NextResponse.json({ error: deleteUserError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
