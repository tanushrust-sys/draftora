import { NextResponse } from 'next/server';
import { adminSupabase } from '@/app/lib/server-auth';
import { PRACTICE_DISPLAY_USERNAME, PRACTICE_EMAIL_DOMAIN } from '@/app/lib/practice-mode';

function randomString(length = 24) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  let output = '';
  for (let i = 0; i < length; i += 1) {
    output += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return output;
}

function buildPracticeCredentials() {
  const nonce = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  const email = `practice.${nonce}@${PRACTICE_EMAIL_DOMAIN}`;
  const password = randomString(26);
  return { email, password };
}

export async function POST() {
  const { email, password } = buildPracticeCredentials();

  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username: PRACTICE_DISPLAY_USERNAME,
      account_type: 'student',
      practice_mode: true,
      practice_label: PRACTICE_DISPLAY_USERNAME,
      practice_created_at: new Date().toISOString(),
    },
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || 'Could not start practice session right now.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    email,
    password,
  });
}
