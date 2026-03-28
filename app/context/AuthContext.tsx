'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabase';
import type { Profile } from '@/app/types/database';

// This file manages whether the user is logged in or not
// and makes that info available everywhere in the app

type AuthState = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;   // the user's Draftly data (XP, level, streak, etc.)
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

const PROFILE_CACHE_KEY = 'draftly-profile-v1';

function readCachedProfile(): Profile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

function writeCachedProfile(p: Profile) {
  try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

function clearCachedProfile() {
  try { localStorage.removeItem(PROFILE_CACHE_KEY); } catch { /* ignore */ }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // ── Initialise profile from localStorage immediately so pages render
  //    without waiting for the Supabase round-trip (no full-page spinner on
  //    every navigation).  The real profile arrives moments later and
  //    overwrites the cache.
  const cached = readCachedProfile();
  const [profile, setProfile] = useState<Profile | null>(cached);
  // If we already have a cached profile the user is almost certainly logged in —
  // start with loading=false so the root page can redirect instantly.
  const [loading, setLoading] = useState(!cached);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) {
      setProfile(data as Profile);
      writeCachedProfile(data as Profile);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    // Safety net: if Supabase hangs (paused project, slow network) we still
    // resolve after 2 s so the app doesn't block forever.
    const timeout = setTimeout(() => setLoading(false), 2000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        // No active session — clear any stale cached profile
        clearCachedProfile();
        setProfile(null);
      }
      setLoading(false);
    });

    // Keep state in sync with login / logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        clearCachedProfile();
        setProfile(null);
      }
      setLoading(false);
    });

    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// Use this hook in any page: const { user, profile } = useAuth();
export const useAuth = () => useContext(AuthContext);
