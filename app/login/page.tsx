'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AtSign, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { AuthShell } from '@/app/components/auth-shell';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password,
    });

    if (signInError) {
      setError('Incorrect username or password.');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Log in to your writing studio"
      description="Pick up your streak, revisit saved drafts, and keep your progress moving."
      footer={
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.62)' }}>
          Don&apos;t have an account? <Link href="/signup" className="auth-link">Create one free</Link>
        </p>
      }
    >
      <form onSubmit={handleLogin} className="auth-form">
        <div className="auth-field">
          <label htmlFor="username">Username</label>
          <div className="auth-input-wrap">
            <AtSign className="h-4 w-4" />
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourname"
              autoComplete="username"
              className="auth-input"
            />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="password">Password</label>
          <div className="auth-input-wrap">
            <LockKeyhole className="h-4 w-4" />
            <input
              id="password"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="auth-input"
            />
            <button type="button" onClick={() => setShowPass((value) => !value)} aria-label="Toggle password visibility">
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="auth-form__split">
          <label className="auth-check">
            <input type="checkbox" checked={remember} onChange={() => setRemember((value) => !value)} />
            Remember me
          </label>
          <Link href="/forgot-password" className="auth-link">
            Forgot password?
          </Link>
        </div>

        {error ? <div className="auth-error-box">{error}</div> : null}

        <button type="submit" disabled={loading} className="auth-primary-btn">
          {loading ? 'Signing in...' : 'Log in'}
        </button>

        <div className="auth-divider-modern">or continue with</div>

        <button
          type="button"
          className="auth-secondary-btn-modern"
          onClick={async () => {
            await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: { redirectTo: `${window.location.origin}/dashboard` },
            });
          }}
        >
          Continue with Google
        </button>
      </form>
    </AuthShell>
  );
}
