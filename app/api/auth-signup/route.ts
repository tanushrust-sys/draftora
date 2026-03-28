import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const trimmed = username.trim();
  const emailSlug = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
  const syntheticEmail = `${emailSlug}@draftly.app`;

  // Check username taken (case-insensitive)
  const { data: existing } = await adminSupabase
    .from('profiles')
    .select('id')
    .ilike('username', trimmed)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'That username is already taken.' }, { status: 400 });
  }

  // Create user via admin API — no confirmation email sent
  const { data, error } = await adminSupabase.auth.admin.createUser({
    email: syntheticEmail,
    password,
    email_confirm: true,
    user_metadata: { username: trimmed },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { error: profileError } = await adminSupabase.from('profiles').upsert({
    id: data.user.id,
    username: trimmed,
    email: syntheticEmail,
  });

  if (profileError) {
    // Roll back the auth user so the state stays consistent
    await adminSupabase.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ userId: data.user.id });
}
