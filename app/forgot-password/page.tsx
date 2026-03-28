'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AtSign } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { AuthShell } from '@/app/components/auth-shell';

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Username is required.');
      return;
    }

    setLoading(true);

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', username.trim().toLowerCase())
      .single();

    if (profile?.email) {
      await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    }

    setSuccess(true);
    setLoading(false);
  };

  return (
    <AuthShell
      eyebrow="Password recovery"
      title="Reset your password"
      description="Enter your username and we’ll send a recovery link to the email tied to that account."
      footer={
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.62)' }}>
          Remembered it? <Link href="/login" className="auth-link">Go back to login</Link>
        </p>
      }
    >
      {success ? (
        <div className="auth-success-box">
          If that username exists, a reset link has been sent to the associated email address.
        </div>
      ) : (
        <form onSubmit={handleReset} className="auth-form">
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

          {error ? <div className="auth-error-box">{error}</div> : null}

          <button type="submit" disabled={loading} className="auth-primary-btn">
            {loading ? 'Sending reset link...' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
