'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AtSign, Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import { clearSupabaseClientSession, supabase } from '@/app/lib/supabase';
import { AuthShell } from '@/app/components/auth-shell';
import { getAccountHomePath } from '@/app/lib/account-type';

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

  return getAccountHomePath(fallback);
}

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<'student' | 'teacher' | 'parent'>('student');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = username.trim();
    if (!trimmed) {
      setError('Username is required.');
      return;
    }
    if (trimmed.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', trimmed)
      .limit(1);

    if ((existing ?? []).length > 0) {
      setError('That username is already taken.');
      setLoading(false);
      return;
    }

    const res = await fetch('/api/auth-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: trimmed, email: email.trim(), password, account_type: accountType }),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'Signup failed.');
      setLoading(false);
      return;
    }

    clearSupabaseClientSession();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const homePath = await getResolvedHomePath(
      signInData.session?.access_token ?? null,
      signInData.user?.user_metadata?.account_type ?? 'student',
    );
    window.location.assign(homePath);
  };

  return (
    <AuthShell
      eyebrow="New account"
      title="Create your Draftora account"
      description="Set up your workspace once, then keep all your writing, vocabulary, and progress in one place."
      footer={
        <p style={{ margin: 0, fontSize: '0.95rem', color: '#3d6489' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#0f79d4', textDecoration: 'none', fontWeight: 700 }}>
            Log in instead
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSignup} style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: '#0f6fbf', fontWeight: 800 }}>
            I am a
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            {(['student', 'teacher', 'parent'] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setAccountType(role)}
                style={{
                  minHeight: '2.95rem',
                  borderRadius: '0.88rem',
                  border: accountType === role ? '1.6px solid #2793e8' : '1px solid rgba(84, 154, 221, 0.32)',
                  background: accountType === role
                    ? 'linear-gradient(142deg, rgba(24, 125, 217, 0.24), rgba(82, 201, 227, 0.2))'
                    : 'linear-gradient(178deg, rgba(255, 255, 255, 0.86), rgba(239, 249, 255, 0.76))',
                  color: accountType === role ? '#0f69b9' : '#4b7093',
                  fontWeight: accountType === role ? 800 : 650,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  boxShadow: accountType === role ? '0 10px 24px rgba(47, 136, 211, 0.22)' : 'none',
                }}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label htmlFor="username" style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: '#0f6fbf', fontWeight: 800 }}>
            Username
          </label>
          <div style={{ position: 'relative' }}>
            <UserRound size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(37, 122, 197, 0.78)' }} />
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              autoComplete="username"
              style={{
                width: '100%',
                minHeight: '3.4rem',
                padding: '0.95rem 1rem 0.95rem 2.95rem',
                borderRadius: '1rem',
                border: '1px solid rgba(84, 154, 221, 0.36)',
                background: 'linear-gradient(176deg, rgba(255, 255, 255, 0.93) 0%, rgba(244, 251, 255, 0.84) 100%)',
                color: '#0d2b4a',
                outline: 'none',
                boxSizing: 'border-box',
                fontWeight: 600,
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.96), 0 14px 28px rgba(88, 142, 191, 0.22)',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label htmlFor="email" style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: '#0f6fbf', fontWeight: 800 }}>
            Email
          </label>
          <div style={{ position: 'relative' }}>
            <AtSign size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(37, 122, 197, 0.78)' }} />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              style={{
                width: '100%',
                minHeight: '3.4rem',
                padding: '0.95rem 1rem 0.95rem 2.95rem',
                borderRadius: '1rem',
                border: '1px solid rgba(84, 154, 221, 0.36)',
                background: 'linear-gradient(176deg, rgba(255, 255, 255, 0.93) 0%, rgba(244, 251, 255, 0.84) 100%)',
                color: '#0d2b4a',
                outline: 'none',
                boxSizing: 'border-box',
                fontWeight: 600,
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.96), 0 14px 28px rgba(88, 142, 191, 0.22)',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label htmlFor="password" style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: '#0f6fbf', fontWeight: 800 }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <LockKeyhole size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(37, 122, 197, 0.78)' }} />
            <input
              id="password"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              style={{
                width: '100%',
                minHeight: '3.4rem',
                padding: '0.95rem 3rem 0.95rem 2.95rem',
                borderRadius: '1rem',
                border: '1px solid rgba(84, 154, 221, 0.36)',
                background: 'linear-gradient(176deg, rgba(255, 255, 255, 0.93) 0%, rgba(244, 251, 255, 0.84) 100%)',
                color: '#0d2b4a',
                outline: 'none',
                boxSizing: 'border-box',
                fontWeight: 600,
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.96), 0 14px 28px rgba(88, 142, 191, 0.22)',
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
                color: 'rgba(37, 122, 197, 0.82)',
                cursor: 'pointer',
              }}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
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
            borderRadius: '1.08rem',
            border: '1px solid rgba(31, 116, 192, 0.32)',
            background: 'linear-gradient(135deg, #0b4fae 0%, #1f7fdd 36%, #42a8ef 72%, #5ad2e7 100%)',
            color: '#f4fbff',
            fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 24px 40px rgba(38, 126, 204, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.42)',
          }}
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>

      </form>
    </AuthShell>
  );
}
