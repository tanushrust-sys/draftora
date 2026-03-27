import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

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
