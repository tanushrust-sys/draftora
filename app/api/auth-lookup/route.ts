import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PRACTICE_DISPLAY_USERNAME, PRACTICE_EMAIL_DOMAIN } from '@/app/lib/practice-mode';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const { username } = await req.json();
  if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 });

  const normalized = username.trim();
  const normalizedLower = normalized.toLowerCase();
  const reservedPracticeUsername = PRACTICE_DISPLAY_USERNAME.toLowerCase();

  if (normalizedLower === reservedPracticeUsername) {
    return NextResponse.json({ error: 'Please use your real account username.' }, { status: 404 });
  }

  const { data: deletedMatches, error: deletedError } = await adminSupabase
    .from('deleted_accounts')
    .select('id')
    .ilike('username', normalized)
    .limit(1);

  if (deletedError) {
    // If the deleted_accounts table is missing or partially migrated, keep login usable
    // and fall through to the active profile lookup instead of hard-failing sign in.
    console.warn('auth-lookup deleted_accounts lookup failed:', deletedError.message);
  }

  if ((deletedMatches ?? []).length > 0) {
    return NextResponse.json({ error: 'That account was deleted and cannot be used again.' }, { status: 404 });
  }

  const { data, error } = await adminSupabase
    .from('profiles')
    .select('email')
    .ilike('username', normalized)
    .neq('username', PRACTICE_DISPLAY_USERNAME)
    .not('email', 'ilike', `%@${PRACTICE_EMAIL_DOMAIN}`)
    .limit(1);

  if (error) {
    return NextResponse.json({ error: 'Could not look up that username.' }, { status: 500 });
  }

  const email = data?.[0]?.email;

  if (!email) {
    return NextResponse.json({ error: 'No account found with that username.' }, { status: 404 });
  }

  return NextResponse.json({ email });
}
