import type { Profile } from '@/app/types/database';

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function matchesConfiguredValue(profileValue: string, envValue: string | undefined) {
  return Boolean(envValue) && normalize(profileValue) === normalize(envValue);
}

export function isDevAccount(profile: Profile | null | undefined, currentUserId?: string | null) {
  if (!profile) return false;
  if (!currentUserId) return false;
  if (profile.id !== currentUserId) return false;

  const allowedId = process.env.NEXT_PUBLIC_DEV_ACCOUNT_ID;
  const allowedEmail = process.env.NEXT_PUBLIC_DEV_ACCOUNT_EMAIL;
  const allowedUsername = process.env.NEXT_PUBLIC_DEV_ACCOUNT_USERNAME;

  return (
    matchesConfiguredValue(profile.id, allowedId) ||
    matchesConfiguredValue(profile.email, allowedEmail) ||
    matchesConfiguredValue(profile.username, allowedUsername) ||
    normalize(profile.username) === 'tanush'
  );
}
