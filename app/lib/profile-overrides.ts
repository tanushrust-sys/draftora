import type { Profile } from '@/app/types/database';

type ProfileOverrideState = {
  xp?: number;
  coach_messages_used?: number;
  writings_created?: number;
  vocab_words_saved?: number;
};

const PROFILE_OVERRIDE_PREFIX = 'draftora-profile-overrides-v1';

function getStorageKey(userId: string) {
  return `${PROFILE_OVERRIDE_PREFIX}:${userId}`;
}

function readState(userId?: string | null): ProfileOverrideState | null {
  if (typeof window === 'undefined' || !userId) return null;

  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfileOverrideState;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeState(userId: string, nextState: ProfileOverrideState) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(nextState));
  } catch {
    // ignore cache write issues
  }
}

export function clearProfileOverrides(userId?: string | null) {
  if (typeof window === 'undefined' || !userId) return;

  try {
    localStorage.removeItem(getStorageKey(userId));
  } catch {
    // ignore cache cleanup issues
  }
}

export function applyProfileOverrides(profile: Profile | null): Profile | null {
  if (!profile) return null;

  const overrides = readState(profile.id);
  if (!overrides) return profile;

  return {
    ...profile,
    xp: overrides.xp ?? profile.xp,
    coach_messages_used: overrides.coach_messages_used ?? profile.coach_messages_used,
    writings_created: overrides.writings_created ?? profile.writings_created,
    vocab_words_saved: overrides.vocab_words_saved ?? profile.vocab_words_saved,
  };
}

export function incrementProfileOverride(userId: string, key: keyof ProfileOverrideState, delta = 1) {
  const current = readState(userId) ?? {};
  const nextValue = Math.max(0, (current[key] ?? 0) + delta);
  const nextState = { ...current, [key]: nextValue };
  writeState(userId, nextState);
  return nextValue;
}

export function setProfileOverride(userId: string, key: keyof ProfileOverrideState, value: number) {
  const current = readState(userId) ?? {};
  const nextState = { ...current, [key]: Math.max(0, value) };
  writeState(userId, nextState);
  return nextState[key] ?? 0;
}

