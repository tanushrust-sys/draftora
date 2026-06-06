export const GOOGLE_SIGNUP_STORAGE_KEY = 'draftora-google-signup-v1';

export type PendingGoogleSignup = {
  username: string;
  accountType: 'student' | 'teacher' | 'parent';
};

export function readPendingGoogleSignup(): PendingGoogleSignup | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(GOOGLE_SIGNUP_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PendingGoogleSignup> | null;
    if (!parsed) return null;

    const username = typeof parsed.username === 'string' ? parsed.username.trim() : '';
    const accountType =
      parsed.accountType === 'teacher' || parsed.accountType === 'parent' ? parsed.accountType : 'student';

    if (!username) return null;
    return { username, accountType };
  } catch {
    return null;
  }
}

export function writePendingGoogleSignup(payload: PendingGoogleSignup) {
  if (typeof window === 'undefined') return;

  window.sessionStorage.setItem(GOOGLE_SIGNUP_STORAGE_KEY, JSON.stringify(payload));
}

export function clearPendingGoogleSignup() {
  if (typeof window === 'undefined') return;

  window.sessionStorage.removeItem(GOOGLE_SIGNUP_STORAGE_KEY);
}
