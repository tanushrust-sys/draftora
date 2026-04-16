import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const { username, email, password, account_type: rawAccountType } = await req.json();
  const accountType = rawAccountType === 'teacher' || rawAccountType === 'parent' ? rawAccountType : 'student';

  if (!username || !email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const trimmed = username.trim();
  const trimmedEmail = String(email).trim().toLowerCase();

  const [usernameMatches, emailMatches] = await Promise.all([
    adminSupabase.from('profiles').select('id, deleted_at').ilike('username', trimmed),
    adminSupabase.from('profiles').select('id, deleted_at').ilike('email', trimmedEmail),
  ]);

  const usernameTaken = (usernameMatches.data ?? []).some((row) => !row.deleted_at);
  const emailTaken = (emailMatches.data ?? []).some((row) => !row.deleted_at);

  if (usernameTaken) {
    return NextResponse.json({ error: 'That username is already taken.' }, { status: 400 });
  }

  if (emailTaken) {
    return NextResponse.json({ error: 'That email is already in use.' }, { status: 400 });
  }

  // Remove any deleted_accounts entries for this email/username so the DB trigger allows re-registration
  await adminSupabase
    .from('deleted_accounts')
    .delete()
    .or(`email.ilike.${trimmedEmail},username.ilike.${trimmed}`);

  // Create user via admin API — no confirmation email sent
  const { data, error } = await adminSupabase.auth.admin.createUser({
    email: trimmedEmail,
    password,
    email_confirm: true,
    user_metadata: { username: trimmed, account_type: accountType },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { error: profileError } = await adminSupabase.from('profiles').upsert({
    id: data.user.id,
    username: trimmed,
    email: trimmedEmail,
    account_type: accountType,
  });

  if (profileError) {
    // Roll back the auth user so the state stays consistent
    await adminSupabase.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ userId: data.user.id });
}
