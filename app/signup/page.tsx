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
        <p style={{ margin: 0, fontSize: '0.95rem', color: 'rgba(199, 249, 255, 0.72)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#67e8f9', textDecoration: 'none', fontWeight: 700 }}>
            Log in instead
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSignup} style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: '#8befff', fontWeight: 700 }}>
            I am a
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            {(['student', 'teacher', 'parent'] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setAccountType(role)}
                style={{
                  minHeight: '2.8rem',
                  borderRadius: '0.75rem',
                  border: accountType === role ? '1.5px solid #67e8f9' : '1px solid rgba(56, 189, 248, 0.24)',
                  background: accountType === role ? 'rgba(34, 211, 238, 0.12)' : 'rgba(3, 23, 38, 0.58)',
                  color: accountType === role ? '#67e8f9' : 'rgba(199, 249, 255, 0.6)',
                  fontWeight: accountType === role ? 700 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label htmlFor="username" style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: '#8befff', fontWeight: 700 }}>
            Username
          </label>
          <div style={{ position: 'relative' }}>
            <UserRound size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(125, 211, 252, 0.75)' }} />
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
          <label htmlFor="email" style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: '#8befff', fontWeight: 700 }}>
            Email
          </label>
          <div style={{ position: 'relative' }}>
            <AtSign size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(125, 211, 252, 0.75)' }} />
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
              placeholder="At least 6 characters"
              autoComplete="new-password"
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
          {loading ? 'Creating account...' : 'Create account'}
        </button>

      </form>
    </AuthShell>
  );
}
