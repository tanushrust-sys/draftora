import type { Profile } from '@/app/types/database';

export type AccountType = 'teacher' | 'student' | 'parent';
export type AccountTypeProfile = Profile & { account_type: AccountType };

const ACCOUNT_TYPE_STORAGE_PREFIX = 'draftora-account-type-v1';

function getStorageKey(userId: string) {
  return `${ACCOUNT_TYPE_STORAGE_PREFIX}:${userId}`;
}

function normalizeAccountType(value?: string | null): AccountType {
  if (value === 'teacher' || value === 'student' || value === 'parent') {
    return value;
  }
  return 'student';
}

export function resolveAccountType(
  profileAccountType?: string | null,
  fallbackAccountType?: string | null,
): AccountType {
  if (fallbackAccountType === 'teacher' || fallbackAccountType === 'parent') {
    return fallbackAccountType;
  }

  if (profileAccountType === 'teacher' || profileAccountType === 'parent') {
    return profileAccountType;
  }

  if (fallbackAccountType === 'student') {
    return 'student';
  }

  return normalizeAccountType(profileAccountType);
}

export function readAccountTypeOverride(userId?: string | null) {
  if (typeof window === 'undefined' || !userId) return null;

  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    return raw ? normalizeAccountType(raw) : null;
  } catch {
    return null;
  }
}

export function writeAccountTypeOverride(userId: string, accountType: AccountType) {
  if (typeof window === 'undefined' || !userId) return;

  try {
    localStorage.setItem(getStorageKey(userId), normalizeAccountType(accountType));
  } catch {
    // ignore storage failures
  }
}

export function clearAccountTypeOverride(userId?: string | null) {
  if (typeof window === 'undefined' || !userId) return;

  try {
    localStorage.removeItem(getStorageKey(userId));
  } catch {
    // ignore storage failures
  }
}

export function applyAccountTypeOverride(profile: Profile | null, fallbackAccountType?: string | null): AccountTypeProfile | null {
  if (!profile) return null;

  const override = readAccountTypeOverride(profile.id);
  return {
    ...profile,
    account_type:
      override ??
      resolveAccountType(
        (profile as Partial<Profile> & { account_type?: string | null }).account_type,
        fallbackAccountType,
      ),
  };
}

export function getAccountDashboardLabel(accountType?: string | null) {
  switch (normalizeAccountType(accountType)) {
    case 'teacher':
      return 'Teacher dashboard';
    case 'parent':
      return 'Parent dashboard';
    default:
      return 'Student dashboard';
  }
}

export function getAccountHomePath(accountType?: string | null) {
  switch (normalizeAccountType(accountType)) {
    case 'teacher':
      return '/teacher';
    case 'parent':
      return '/parent';
    default:
      return '/dashboard';
  }
}
