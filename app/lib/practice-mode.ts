import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/app/types/database';

export const PRACTICE_EMAIL_DOMAIN = 'practice.draftora.local';
export const PRACTICE_DISPLAY_USERNAME = 'USER';

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

type LooseMetadata = Record<string, unknown> | null | undefined;

function readBool(metadata: LooseMetadata, key: string) {
  if (!metadata || typeof metadata !== 'object') return false;
  const value = metadata[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    return lowered === 'true' || lowered === '1' || lowered === 'yes';
  }
  return false;
}

export function isPracticeEmail(email?: string | null) {
  const normalized = normalize(email);
  return normalized.endsWith(`@${PRACTICE_EMAIL_DOMAIN}`);
}

export function isPracticeUserMetadata(metadata: LooseMetadata) {
  return (
    readBool(metadata, 'practice_mode') ||
    readBool(metadata, 'practiceMode') ||
    readBool(metadata, 'is_practice') ||
    readBool(metadata, 'isPractice')
  );
}

export function isPracticeUser(user: Pick<User, 'email' | 'user_metadata'> | null | undefined) {
  if (!user) return false;
  return isPracticeUserMetadata(user.user_metadata as LooseMetadata) || isPracticeEmail(user.email);
}

export function isPracticeProfile(profile: Profile | null | undefined) {
  if (!profile) return false;
  if (isPracticeEmail(profile.email)) return true;
  return normalize(profile.username) === normalize(PRACTICE_DISPLAY_USERNAME);
}

export function applyPracticeDisplayUsername(profile: Profile, isPracticeMode: boolean) {
  if (!isPracticeMode) return profile;
  if (profile.username === PRACTICE_DISPLAY_USERNAME) return profile;
  return {
    ...profile,
    username: PRACTICE_DISPLAY_USERNAME,
  };
}
