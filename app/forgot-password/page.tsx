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

    const lookupRes = await fetch('/api/auth-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim() }),
    });

    const lookupJson = await lookupRes.json().catch(() => ({}));

    if (!lookupRes.ok) {
      setError(lookupJson.error || 'Could not look up that account.');
      setLoading(false);
      return;
    }

    const email = String(lookupJson.email || '').trim();
    if (!email) {
      setError('No email was found for that username.');
      setLoading(false);
      return;
    }

    const appBaseUrl =
      (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '') ||
      window.location.origin;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appBaseUrl}/auth/callback?next=/reset-password`,
    });

    if (resetError) {
      setError(resetError.message || 'Could not send a reset email.');
      setLoading(false);
      return;
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
        <p style={{ margin: 0, fontSize: '0.95rem', color: 'rgba(199, 249, 255, 0.72)' }}>
          Remembered it?{' '}
          <Link href="/login" style={{ color: '#67e8f9', textDecoration: 'none', fontWeight: 700 }}>
            Go back to login
          </Link>
        </p>
      }
    >
      {success ? (
        <div style={{ padding: '0.95rem 1rem', borderRadius: '1rem', fontSize: '0.92rem', lineHeight: 1.55, border: '1px solid rgba(74, 222, 128, 0.26)', background: 'rgba(20, 83, 45, 0.26)', color: '#dcfce7' }}>
          If that username exists, a reset link has been sent to the associated email address.
        </div>
      ) : (
        <form onSubmit={handleReset} style={{ display: 'grid', gap: '1rem' }}>
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
            {loading ? 'Sending reset link...' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
