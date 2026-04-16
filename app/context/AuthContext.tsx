'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { getVerifiedSession, hardSignOut, supabase } from '@/app/lib/supabase';
import { applyAgeGroupOverride } from '@/app/lib/age-group-storage';
import { applyWritingExperienceOverride, clearWritingExperienceOverride } from '@/app/lib/writing-experience';
import { applyProfileOverrides, clearProfileOverrides } from '@/app/lib/profile-overrides';
import { applyAccountTypeOverride, clearAccountTypeOverride } from '@/app/lib/account-type';
import { normalizeTeacherSubscriptionPlan } from '@/app/lib/teacher-subscription';
import type { Profile } from '@/app/types/database';
import { getTitleForLevel } from '@/app/types/database';

const PROFILE_FALLBACK_SELECT = [
  'id',
  'username',
  'email',
  'title',
  'level',
  'xp',
  'streak',
  'longest_streak',
  'last_writing_date',
  'daily_word_goal',
  'daily_vocab_goal',
  'custom_daily_goal',
  'active_theme',
  'unlocked_themes',
  'plan',
  'student_id',
  'account_type',
  'created_at',
  'updated_at',
].join(', ');

type AuthState = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  levelUpEvent: { level: number; title: string } | null;
  clearLevelUpEvent: () => void;
};

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  levelUpEvent: null,
  clearLevelUpEvent: () => {},
});

const PROFILE_CACHE_KEY = 'draftora-profile-v1';

const LEGACY_THEME_ALIASES: Record<string, string> = {
  default: 'cloud-atlas',
  lavender: 'midnight-bloom',
  sunrise: 'sunset-glow',
  bubbles: 'cloud-atlas',
  golden: 'forest-moss',
};

const KNOWN_THEME_NAMES = new Set([
  'cloud-atlas',
  'midnight-blue',
  'midnight-bloom',
  'rose-glow',
  'forest-moss',
  'sunset-glow',
]);

function normalizeThemeName(theme?: string | null) {
  if (!theme) return 'cloud-atlas';
  const remapped = LEGACY_THEME_ALIASES[theme] ?? theme;
  return KNOWN_THEME_NAMES.has(remapped) ? remapped : 'cloud-atlas';
}

function normalizeUnlockedThemes(themes?: string[] | null) {
  const source = themes && themes.length > 0 ? themes : ['cloud-atlas'];
  const seen = new Set<string>();
  return source
    .map(theme => normalizeThemeName(theme))
    .filter((theme) => {
      if (!theme || seen.has(theme)) return false;
      seen.add(theme);
      return true;
    });
}

function normalizeStoredProfile(profile: Profile): Profile {
  return {
    ...profile,
    active_theme: normalizeThemeName(profile.active_theme),
    unlocked_themes: normalizeUnlockedThemes(profile.unlocked_themes),
  };
}

function readCachedProfile(): Profile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw
      ? normalizeStoredProfile(
          applyProfileOverrides(
            applyAccountTypeOverride(
              applyWritingExperienceOverride(
                applyAgeGroupOverride(JSON.parse(raw) as Profile),
              ),
            ),
          ),
        )
      : null;
  } catch {
    return null;
  }
}

function writeCachedProfile(profile: Profile) {
  try {
    localStorage.setItem(
      PROFILE_CACHE_KEY,
      JSON.stringify(
        normalizeStoredProfile(
          applyProfileOverrides(
            applyAccountTypeOverride(
              applyWritingExperienceOverride(
                applyAgeGroupOverride(profile),
              ),
            ),
          ),
        ),
      ),
    );
  } catch {
    // ignore cache write issues
  }
}

function clearCachedProfile() {
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // ignore cache removal issues
  }
}

function normalizeProfile(profile: Partial<Profile> & Pick<Profile, 'id'>): Profile {
  const timestamp = new Date().toISOString();

  return {
    id: profile.id,
    username: profile.username ?? '',
    email: profile.email ?? '',
    title: profile.title ?? 'Novice Writer',
    level: profile.level ?? 1,
    xp: profile.xp ?? 0,
    streak: profile.streak ?? 0,
    longest_streak: profile.longest_streak ?? 0,
    last_writing_date: profile.last_writing_date ?? null,
    daily_word_goal: profile.daily_word_goal ?? 300,
    daily_vocab_goal: profile.daily_vocab_goal ?? 3,
    custom_daily_goal: profile.custom_daily_goal ?? 'Write for 10 minutes',
    active_theme: normalizeThemeName(profile.active_theme),
    unlocked_themes: normalizeUnlockedThemes(profile.unlocked_themes),
    plan: normalizeTeacherSubscriptionPlan(profile.plan),
    student_id: profile.student_id ?? null,
    account_type: profile.account_type ?? 'student',
    age_group: profile.age_group ?? '',
    writing_goal: profile.writing_goal ?? '',
    writing_experience_score: profile.writing_experience_score ?? 0,
    coach_messages_used: profile.coach_messages_used ?? 0,
    writings_created: profile.writings_created ?? 0,
    vocab_words_saved: profile.vocab_words_saved ?? 0,
    free_started_at: profile.free_started_at ?? profile.created_at ?? timestamp,
    usage_period_started_at: profile.usage_period_started_at ?? profile.updated_at ?? profile.created_at ?? timestamp,
    stripe_customer_id: profile.stripe_customer_id ?? null,
    stripe_subscription_id: profile.stripe_subscription_id ?? null,
    stripe_subscription_status: profile.stripe_subscription_status ?? null,
    created_at: profile.created_at ?? timestamp,
    updated_at: profile.updated_at ?? profile.created_at ?? timestamp,
    deleted_at: profile.deleted_at ?? null,
  };
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return '';
}

function isTransientAuthLockError(error: unknown) {
  const message = getErrorMessage(error);
  const lower = message.toLowerCase();
  return (
    (lower.includes('auth-token') && lower.includes('lock')) ||
    lower.includes('another request stole it') ||
    lower.includes('lock released')
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const cachedProfile = readCachedProfile();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(cachedProfile);
  const [loading, setLoading] = useState(true);
  const [levelUpEvent, setLevelUpEvent] = useState<{ level: number; title: string } | null>(null);
  const clearLevelUpEvent = useCallback(() => setLevelUpEvent(null), []);
  const profileFetchInFlight = useRef<Promise<Profile | null> | null>(null);
  const mountedRef = useRef(true);
  const profileRef = useRef<Profile | null>(cachedProfile);
  const sessionRef = useRef<Session | null>(null);

  const clearProfileState = useCallback((reason: 'signed-out' | 'invalid-session') => {
    clearCachedProfile();
    if (profileRef.current?.id) {
      clearWritingExperienceOverride(profileRef.current.id);
      clearProfileOverrides(profileRef.current.id);
      clearAccountTypeOverride(profileRef.current.id);
    }
    setProfile(null);
    profileRef.current = null;
    if (reason === 'invalid-session') {
      setUser(null);
      setSession(null);
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    if (profileFetchInFlight.current) return profileFetchInFlight.current;

    profileFetchInFlight.current = (async () => {
      // Use limit(1) + array select to avoid .single() errors on 0 or multiple rows
      const { data: rows, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .is('deleted_at', null)
        .limit(1);

      let nextData = (rows?.[0] ?? null) as Partial<Profile> | null;
      let nextError = rows !== null ? null : error;

      if (nextError) {
        const fallback = await supabase
          .from('profiles')
          .select(PROFILE_FALLBACK_SELECT)
          .eq('id', userId)
          .limit(1);

        if (!fallback.error && fallback.data?.[0]) {
          nextData = fallback.data[0] as Partial<Profile>;
          nextError = null;
        }
      }

      if (nextError) {
        if (isTransientAuthLockError(nextError)) {
          return profileRef.current ?? cachedProfile ?? null;
        }
        console.error('Failed to fetch profile:', nextError.message);
        if (mountedRef.current) {
          clearProfileState('invalid-session');
          void hardSignOut().catch(() => {});
        }
        return null;
      }

      if (nextData?.id) {
        const normalizedData: Partial<Profile> & Pick<Profile, 'id'> = { ...nextData, id: nextData.id };
        normalizedData.plan = normalizeTeacherSubscriptionPlan(
          typeof sessionRef.current?.user?.user_metadata?.plan === 'string'
            ? sessionRef.current.user.user_metadata.plan
            : normalizedData.plan,
        );
        const nextProfile = applyProfileOverrides(
          applyAccountTypeOverride(
            applyWritingExperienceOverride(applyAgeGroupOverride(normalizeProfile(normalizedData))),
            sessionRef.current?.user?.user_metadata?.account_type ?? null,
          ),
        );
        if (!nextProfile || !mountedRef.current) return null;
        // Detect level-up (only fire if user was already loaded, not on initial login)
        if (profileRef.current && nextProfile.level > profileRef.current.level) {
          setLevelUpEvent({ level: nextProfile.level, title: getTitleForLevel(nextProfile.level) });
        }
        setProfile(nextProfile);
        profileRef.current = nextProfile;
        writeCachedProfile(nextProfile);
        return nextProfile;
      }

      // Profile row not found — could be a race condition right after account creation.
      // Don't sign the user out; just return null and let the app retry or redirect naturally.
      console.warn('fetchProfile: no profile row found for user', userId);
      return null;
    })().finally(() => {
      profileFetchInFlight.current = null;
    });

    return profileFetchInFlight.current;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await fetchProfile(user.id);
  }, [fetchProfile, user]);

  useEffect(() => {
    mountedRef.current = true;
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 800);

    getVerifiedSession()
      .then(async (session) => {
        clearTimeout(timeout);
        setSession(session);
        setUser(session?.user ?? null);

      sessionRef.current = session;

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        clearProfileState('invalid-session');
      }

        setLoading(false);
      })
      .catch((error) => {
        if (isTransientAuthLockError(error)) {
          setLoading(false);
          return;
        }
        console.error('Failed to resolve auth session:', error);
        clearCachedProfile();
        setProfile(null);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      sessionRef.current = nextSession;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        window.setTimeout(() => {
          if (mountedRef.current) {
            void fetchProfile(nextSession.user.id);
          }
        }, 0);
      } else {
        clearProfileState(event === 'SIGNED_OUT' ? 'signed-out' : 'invalid-session');
      }

      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [cachedProfile, fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, refreshProfile, levelUpEvent, clearLevelUpEvent }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
