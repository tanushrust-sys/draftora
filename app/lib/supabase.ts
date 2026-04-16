import { createClient, type Session } from '@supabase/supabase-js';

// Connect to our Supabase database
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

let verifiedSessionPromise: Promise<Session | null> | null = null;
let activeSessionPromise: Promise<Session | null> | null = null;

function shouldClearSupabaseStorageKey(key: string) {
  const lower = key.toLowerCase();
  return (
    lower.startsWith('sb-') ||
    lower.startsWith('supabase') ||
    lower.includes('supabase') ||
    lower.includes('auth-token') ||
    lower.includes('sb:')
  );
}

function isDefinitiveAuthFailure(error: { message?: string | null; status?: number } | null | undefined) {
  if (!error) return false;
  if (error.status === 401 || error.status === 403) return true;

  const message = (error.message || '').toLowerCase();
  return (
    message.includes('jwt') ||
    message.includes('invalid token') ||
    message.includes('auth session missing') ||
    message.includes('refresh token') ||
    message.includes('session not found')
  );
}

async function clearInvalidSupabaseSession() {
  clearSupabaseClientSession();

  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch {
    // ignore sign out failures when the session is already invalid
  }
}

export function clearSupabaseClientSession() {
  if (typeof window === 'undefined') return;

  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => Boolean(key));
    for (const key of keys) {
      if (shouldClearSupabaseStorageKey(key)) {
        storage.removeItem(key);
      }
    }
  }
}

// Supabase's autoRefreshToken fires an unhandled rejection when a stored token
// has expired server-side. Intercept it so the browser doesn't show a red error
// — our onAuthStateChange SIGNED_OUT handler already clears the session.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = ((event.reason as { message?: string } | null)?.message ?? '').toLowerCase();
    if (msg.includes('refresh token') || msg.includes('invalid_grant')) {
      // Suppress the browser error — Supabase's onAuthStateChange SIGNED_OUT
      // event already handles clearing the session. Do NOT call
      // clearSupabaseClientSession() here or it will wipe a freshly-created session.
      event.preventDefault();
    }
  });
}

export async function getVerifiedSession() {
  if (verifiedSessionPromise) return verifiedSessionPromise;

  verifiedSessionPromise = (async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        if (isDefinitiveAuthFailure(sessionError)) {
          await clearInvalidSupabaseSession();
        } else {
          clearSupabaseClientSession();
        }
        return null;
      }

      const session = sessionData.session ?? null;
      if (!session) {
        clearSupabaseClientSession();
        return null;
      }

      return session;
    } finally {
      verifiedSessionPromise = null;
    }
  })();

  return verifiedSessionPromise;
}

export async function hardSignOut() {
  clearSupabaseClientSession();

  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch {
    // storage is already cleared; network failures should not block logout
  }
}

export async function ensureActiveSession() {
  if (activeSessionPromise) return activeSessionPromise;

  activeSessionPromise = (async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        if (isDefinitiveAuthFailure(error)) {
          await clearInvalidSupabaseSession();
          return null;
        }
        throw error;
      }

      const expiresAt = data.session?.expires_at ?? 0;
      const expiresSoon = expiresAt !== 0 && expiresAt * 1000 - Date.now() < 2 * 60 * 1000;

      if (!data.session || expiresSoon) {
        const refreshed = await supabase.auth.refreshSession();
        if (refreshed.error) {
          if (isDefinitiveAuthFailure(refreshed.error)) {
            await clearInvalidSupabaseSession();
            return null;
          }
          throw refreshed.error;
        }
        return refreshed.data.session;
      }

      return data.session;
    } finally {
      activeSessionPromise = null;
    }
  })();

  return activeSessionPromise;
}

export async function ensureActiveSessionGracefully() {
  try {
    return await getVerifiedSession();
  } catch {
    return null;
  }
}
