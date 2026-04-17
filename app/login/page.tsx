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
  const labelStyle: React.CSSProperties = {
    fontSize: '0.76rem',
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    color: '#0f6fbf',
    fontWeight: 800,
  };
  const fieldWrapStyle: React.CSSProperties = {
    position: 'relative',
    borderRadius: '1.06rem',
    background: 'linear-gradient(176deg, rgba(255, 255, 255, 0.93) 0%, rgba(244, 251, 255, 0.84) 100%)',
    border: '1px solid rgba(76, 147, 214, 0.38)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.96), 0 14px 28px rgba(88, 142, 191, 0.22)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%',
    minHeight: '3.4rem',
    borderRadius: '1rem',
    border: 'none',
    background: 'transparent',
    color: '#0d2b4a',
    outline: 'none',
    boxSizing: 'border-box',
    fontSize: '1.03rem',
    fontWeight: 600,
  };

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
        <p style={{ margin: 0, fontSize: '0.95rem', color: '#3d6489' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: '#0f78d4', textDecoration: 'none', fontWeight: 800 }}>
            Create one free
          </Link>
        </p>
      }
    >
      <form onSubmit={handleLogin} style={{ display: 'grid', gap: '1.1rem' }}>
        <div style={{ display: 'grid', gap: '0.52rem' }}>
          <label htmlFor="username" style={labelStyle}>
            Username
          </label>
          <div style={fieldWrapStyle}>
            <AtSign size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(21, 109, 188, 0.82)' }} />
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourname"
              autoComplete="username"
              style={{
                ...inputStyle,
                padding: '0.95rem 1rem 0.95rem 2.95rem',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.52rem' }}>
          <label htmlFor="password" style={labelStyle}>
            Password
          </label>
          <div style={fieldWrapStyle}>
            <LockKeyhole size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(21, 109, 188, 0.82)' }} />
            <input
              id="password"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              style={{
                ...inputStyle,
                padding: '0.95rem 3rem 0.95rem 2.95rem',
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
                color: 'rgba(22, 112, 190, 0.86)',
                cursor: 'pointer',
              }}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginTop: '-0.1rem' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', color: '#3b6389', fontSize: '0.92rem', fontWeight: 600 }}>
            <input type="checkbox" checked={remember} onChange={() => setRemember((value) => !value)} style={{ accentColor: '#2491e8' }} />
            Remember me
          </label>
          <Link href="/forgot-password" style={{ color: '#0f79d4', textDecoration: 'none', fontWeight: 800 }}>
            Forgot password?
          </Link>
        </div>

        {error ? (
          <div style={{ padding: '0.95rem 1rem', borderRadius: '1rem', fontSize: '0.92rem', lineHeight: 1.55, border: '1px solid rgba(230, 110, 110, 0.4)', background: 'rgba(255, 239, 241, 0.82)', color: '#9f1d2d' }}>
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            minHeight: '3.65rem',
            borderRadius: '1.14rem',
            border: '1px solid rgba(31, 116, 192, 0.32)',
            background: 'linear-gradient(135deg, #0b4fae 0%, #1f7fdd 36%, #42a8ef 72%, #5ad2e7 100%)',
            color: '#f4fbff',
            fontWeight: 850,
            fontSize: '1.08rem',
            letterSpacing: '0.01em',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 24px 40px rgba(38, 126, 204, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.42)',
            transition: 'transform 0.15s ease, filter 0.15s ease',
          }}
        >
          {loading ? 'Signing in...' : 'Log in'}
        </button>

      </form>
    </AuthShell>
  );
}
