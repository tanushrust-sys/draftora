'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AtSign, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { clearSupabaseClientSession, supabase } from '@/app/lib/supabase';
import { AuthShell } from '@/app/components/auth-shell';
import { useAuth } from '@/app/context/AuthContext';
import { getAccountHomePath, resolveAccountType } from '@/app/lib/account-type';

async function getResolvedHomePath(token?: string | null, fallback?: string | null) {
  if (token) {
    try {
      const response = await fetch('/api/account-home', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data && typeof data.homePath === 'string') {
          return data.homePath as string;
        }
      }
    } catch {
      // fall through to local fallback
    }
  }

  return getAccountHomePath(resolveAccountType(fallback));
}

export default function LoginPage() {
  const { user, profile, session, loading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (!authLoading && user && !redirectingRef.current) {
      redirectingRef.current = true;
      void getResolvedHomePath(session?.access_token, user?.user_metadata?.account_type ?? profile?.account_type)
        .then((homePath) => window.location.replace(homePath))
        .catch(() => window.location.replace('/dashboard'));
    }
  }, [authLoading, profile?.account_type, session?.access_token, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Username is required.');
      return;
    }

    if (!password.trim()) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    clearSupabaseClientSession();

    const res = await fetch('/api/auth-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim() }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'No account found with that username.');
      setLoading(false);
      return;
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password,
    });

    if (signInError) {
      setError('Incorrect username or password.');
      setLoading(false);
      return;
    }

    const homePath = await getResolvedHomePath(
      signInData.session?.access_token ?? null,
      signInData.user?.user_metadata?.account_type ?? profile?.account_type,
    );
    redirectingRef.current = true;
    window.location.assign(homePath);
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Log in to your writing studio"
      description="Pick up your streak, revisit saved drafts, and keep your progress moving."
      footer={
        <p style={{ margin: 0, fontSize: '0.95rem', color: 'rgba(199, 249, 255, 0.72)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: '#67e8f9', textDecoration: 'none', fontWeight: 700 }}>
            Create one free
          </Link>
        </p>
      }
    >
      <form onSubmit={handleLogin} style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label htmlFor="username" style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: '#8befff', fontWeight: 700 }}>
            Username
          </label>
          <div style={{ position: 'relative' }}>
            <AtSign size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(125, 211, 252, 0.75)' }} />
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourname"
              autoComplete="username"
              style={{
                width: '100%',
                minHeight: '3.4rem',
                padding: '0.95rem 1rem 0.95rem 2.95rem',
                borderRadius: '1rem',
                border: '1px solid rgba(56, 189, 248, 0.24)',
                background: 'rgba(3, 23, 38, 0.58)',
                color: '#effcff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label htmlFor="password" style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: '#8befff', fontWeight: 700 }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <LockKeyhole size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(125, 211, 252, 0.75)' }} />
            <input
              id="password"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              style={{
                width: '100%',
                minHeight: '3.4rem',
                padding: '0.95rem 3rem 0.95rem 2.95rem',
                borderRadius: '1rem',
                border: '1px solid rgba(56, 189, 248, 0.24)',
                background: 'rgba(3, 23, 38, 0.58)',
                color: '#effcff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPass((value) => !value)}
              aria-label="Toggle password visibility"
              style={{
                position: 'absolute',
                right: '0.9rem',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'transparent',
                color: 'rgba(125, 211, 252, 0.75)',
                cursor: 'pointer',
              }}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', color: 'rgba(223, 247, 255, 0.76)', fontSize: '0.92rem' }}>
            <input type="checkbox" checked={remember} onChange={() => setRemember((value) => !value)} />
            Remember me
          </label>
          <Link href="/forgot-password" style={{ color: '#67e8f9', textDecoration: 'none', fontWeight: 700 }}>
            Forgot password?
          </Link>
        </div>

        {error ? (
          <div style={{ padding: '0.95rem 1rem', borderRadius: '1rem', fontSize: '0.92rem', lineHeight: 1.55, border: '1px solid rgba(248, 113, 113, 0.28)', background: 'rgba(127, 29, 29, 0.22)', color: '#fecaca' }}>
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            minHeight: '3.4rem',
            borderRadius: '1rem',
            border: 'none',
            background: 'linear-gradient(135deg, #083344, #155e75 48%, #67e8f9 100%)',
            color: '#ecfeff',
            fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 18px 36px rgba(34, 211, 238, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          }}
        >
          {loading ? 'Signing in...' : 'Log in'}
        </button>

      </form>
    </AuthShell>
  );
}
