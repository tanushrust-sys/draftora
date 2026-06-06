import { NextRequest, NextResponse } from 'next/server';
import { PRACTICE_DISPLAY_USERNAME, PRACTICE_EMAIL_DOMAIN } from '@/app/lib/practice-mode';
import { adminSupabase } from '@/app/lib/server-auth';
import type { AccountType } from '@/app/types/database';

function getBearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
}

function normalizeAccountType(value: unknown): AccountType {
  return value === 'teacher' || value === 'parent' ? value : 'student';
}

function sanitizeUsername(value: string) {
  const collapsed = value.replace(/[^\p{L}\p{N}\s_-]/gu, ' ').replace(/\s+/g, ' ').trim();
  return collapsed.slice(0, 24);
}

function buildUsernameCandidates(user: { email?: string | null; user_metadata?: Record<string, unknown> | null }, preferred?: string) {
  const emailPrefix = (user.email || '').split('@')[0] || 'writer';
  const metadata = user.user_metadata ?? {};
  const sourceValues = [
    preferred,
    typeof metadata.username === 'string' ? metadata.username : '',
    typeof metadata.full_name === 'string' ? metadata.full_name : '',
    typeof metadata.name === 'string' ? metadata.name : '',
    typeof metadata.preferred_username === 'string' ? metadata.preferred_username : '',
    emailPrefix,
  ];

  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const source of sourceValues) {
    const next = sanitizeUsername(source || '');
    const key = next.toLowerCase();
    if (!next || seen.has(key)) continue;
    seen.add(key);
    candidates.push(next);
  }

  if (candidates.length === 0) {
    candidates.push('Writer');
  }

  return candidates;
}

async function generateAvailableUsername(user: { email?: string | null; user_metadata?: Record<string, unknown> | null }, preferred?: string) {
  const candidates = buildUsernameCandidates(user, preferred);

  for (const candidate of candidates) {
    if (candidate.toLowerCase() === PRACTICE_DISPLAY_USERNAME.toLowerCase()) continue;

    const { data: matches, error } = await adminSupabase
      .from('profiles')
      .select('id, deleted_at')
      .ilike('username', candidate)
      .limit(1);

    if (error) throw error;
    const taken = (matches ?? []).some((row) => !row.deleted_at);
    if (!taken) return candidate;
  }

  const base = sanitizeUsername(candidates[0] || 'Writer') || 'Writer';
  for (let index = 1; index <= 200; index += 1) {
    const suffixCandidate = sanitizeUsername(`${base}${index}`);
    if (!suffixCandidate || suffixCandidate.toLowerCase() === PRACTICE_DISPLAY_USERNAME.toLowerCase()) continue;

    const { data: matches, error } = await adminSupabase
      .from('profiles')
      .select('id, deleted_at')
      .ilike('username', suffixCandidate)
      .limit(1);

    if (error) throw error;
    const taken = (matches ?? []).some((row) => !row.deleted_at);
    if (!taken) return suffixCandidate;
  }

  return `Writer${Date.now().toString().slice(-6)}`;
}

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 });
  }

  const { data: userData, error: userError } = await adminSupabase.auth.getUser(token);
  const user = userData.user ?? null;
  if (userError || !user) {
    return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const requestedAccountType = normalizeAccountType(body?.accountType);
  const preferredUsername = typeof body?.username === 'string' ? body.username.trim() : '';
  const normalizedEmail = (user.email || '').trim().toLowerCase();

  const { data: existingProfile, error: existingProfileError } = await adminSupabase
    .from('profiles')
    .select('id, username, account_type, deleted_at')
    .eq('id', user.id)
    .maybeSingle();

  if (existingProfileError) {
    return NextResponse.json({ error: existingProfileError.message || 'Could not load profile.' }, { status: 500 });
  }

  if (existingProfile && !existingProfile.deleted_at) {
    return NextResponse.json({
      profileCreated: false,
      username: existingProfile.username,
      accountType: existingProfile.account_type,
    });
  }

  const { data: deletedMatch, error: deletedMatchError } = await adminSupabase
    .from('deleted_accounts')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  if (deletedMatchError) {
    return NextResponse.json({ error: deletedMatchError.message || 'Could not validate account state.' }, { status: 500 });
  }

  if ((deletedMatch ?? []).length > 0) {
    await adminSupabase.auth.admin.deleteUser(user.id);
    return NextResponse.json({ error: 'This account was deleted and cannot be used again.' }, { status: 403 });
  }

  const username = await generateAvailableUsername(user, preferredUsername);

  if (normalizedEmail.endsWith(`@${PRACTICE_EMAIL_DOMAIN}`)) {
    await adminSupabase.auth.admin.deleteUser(user.id);
    return NextResponse.json({ error: 'Please use a valid personal email address.' }, { status: 403 });
  }

  await adminSupabase
    .from('deleted_accounts')
    .delete()
    .or(`email.ilike.${normalizedEmail},username.ilike.${username}`);

  const { error: profileError } = await adminSupabase.from('profiles').upsert({
    id: user.id,
    username,
    email: normalizedEmail,
    account_type: requestedAccountType,
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message || 'Could not create your profile.' }, { status: 400 });
  }

  const { error: metadataError } = await adminSupabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(user.user_metadata ?? {}),
      username,
      account_type: requestedAccountType,
    },
  });

  if (metadataError) {
    return NextResponse.json({ error: metadataError.message || 'Could not finish sign-in.' }, { status: 400 });
  }

  return NextResponse.json({
    profileCreated: true,
    username,
    accountType: requestedAccountType,
  });
}
