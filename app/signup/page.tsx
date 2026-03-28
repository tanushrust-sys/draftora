'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { AuthShell } from '@/app/components/auth-shell';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', trimmed)
      .single();

    if (existing) {
      setError('That username is already taken.');
      setLoading(false);
      return;
    }

    const res = await fetch('/api/auth-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: trimmed, password }),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'Signup failed.');
      setLoading(false);
      return;
    }

    const emailSlug = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
    const syntheticEmail = `${emailSlug}@draftly.app`;

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    window.location.href = '/dashboard';
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  };

  return (
    <AuthShell
      eyebrow="New account"
      title="Create your Draftly account"
      description="Set up your workspace once, then keep all your writing, vocabulary, and progress in one place."
      footer={
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.62)' }}>
          Already have an account? <Link href="/login" className="auth-link">Log in instead</Link>
        </p>
      }
    >
      <form onSubmit={handleSignup} className="auth-form">
        <div className="auth-field">
          <label htmlFor="username">Username</label>
          <div className="auth-input-wrap">
            <UserRound className="h-4 w-4" />
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
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
              placeholder="At least 6 characters"
              autoComplete="new-password"
              className="auth-input"
            />
            <button type="button" onClick={() => setShowPass((value) => !value)} aria-label="Toggle password visibility">
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error ? <div className="auth-error-box">{error}</div> : null}

        <button type="submit" disabled={loading} className="auth-primary-btn">
          {loading ? 'Creating account...' : 'Create account'}
        </button>

        <div className="auth-divider-modern">or continue with</div>

        <button type="button" onClick={handleGoogle} disabled={googleLoading} className="auth-secondary-btn-modern">
          {googleLoading ? 'Opening Google...' : 'Continue with Google'}
        </button>
      </form>
    </AuthShell>
  );
}
