import type { Profile } from '@/app/types/database';
import { isMissingAgeGroupColumnError as isMissingAgeGroupColumnErrorBase } from '@/app/lib/supabase-schema-errors';

const AGE_GROUP_STORAGE_PREFIX = 'draftora-age-group-v1';

export const SUPPORTED_AGE_GROUPS = ['5-7', '8-10', '11-13', '14-17', '18-21', '22+'] as const;
const SUPPORTED_AGE_GROUP_SET = new Set(SUPPORTED_AGE_GROUPS);

function getAgeGroupStorageKey(userId: string) {
  return `${AGE_GROUP_STORAGE_PREFIX}:${userId}`;
}

export function isMissingAgeGroupColumnError(message?: string | null) {
  return isMissingAgeGroupColumnErrorBase(message);
}

export function normalizeAgeGroupValue(ageGroup?: string | null) {
  if (!ageGroup) return '';
  return SUPPORTED_AGE_GROUP_SET.has(ageGroup as (typeof SUPPORTED_AGE_GROUPS)[number]) ? ageGroup : '';
}

export function readAgeGroupOverride(userId?: string | null) {
  if (typeof window === 'undefined' || !userId) return '';
  try {
    return normalizeAgeGroupValue(localStorage.getItem(getAgeGroupStorageKey(userId)));
  } catch {
    return '';
  }
}

export function writeAgeGroupOverride(userId: string, ageGroup: string) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(getAgeGroupStorageKey(userId), normalizeAgeGroupValue(ageGroup));
  } catch {
    // ignore storage failures
  }
}

export function clearAgeGroupOverride(userId?: string | null) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.removeItem(getAgeGroupStorageKey(userId));
  } catch {
    // ignore storage failures
  }
}

export function applyAgeGroupOverride(profile: null): null;
export function applyAgeGroupOverride(profile: Profile): Profile;
export function applyAgeGroupOverride(profile: Profile | null): Profile | null {
  if (!profile) return null;

  const normalizedProfileAgeGroup = normalizeAgeGroupValue(profile.age_group);
  const override = readAgeGroupOverride(profile.id);

  if (override) {
    return { ...profile, age_group: override };
  }

  if (normalizedProfileAgeGroup !== profile.age_group) {
    return { ...profile, age_group: normalizedProfileAgeGroup };
  }

  return profile;
}
