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

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Username is required.');
      return;
    }

    setLoading(true);

    try {
      const input = username.trim();
      let email = input;

      // Allow either username or email for recovery.
      if (!input.includes('@')) {
        const lookupRes = await fetch('/api/auth-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: input }),
        });

        const lookupJson = await lookupRes.json().catch(() => ({}));
        if (!lookupRes.ok) {
          // Keep response generic so users don't get blocked by lookup edge cases.
          setSuccess(true);
          setLoading(false);
          return;
        }

        email = String(lookupJson.email || '').trim();
        if (!email) {
          setSuccess(true);
          setLoading(false);
          return;
        }
      }

      const appBaseUrl =
        (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '') ||
        window.location.origin;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        // Direct reset page is more reliable for recovery token handling.
        redirectTo: `${appBaseUrl}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message || 'Could not send a reset email.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send a reset email.');
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Password recovery"
      title="Reset your password"
      description="Enter your username and we’ll send a recovery link to the email tied to that account."
      footer={
        <p style={{ margin: 0, fontSize: '0.95rem', color: '#3d6489' }}>
          Remembered it?{' '}
          <Link href="/login" style={{ color: '#0f79d4', textDecoration: 'none', fontWeight: 800 }}>
            Go back to login
          </Link>
        </p>
      }
    >
      {success ? (
        <div
          style={{
            padding: '0.95rem 1rem',
            borderRadius: '1rem',
            fontSize: '0.92rem',
            lineHeight: 1.55,
            border: '1px solid rgba(88, 180, 132, 0.38)',
            background: 'linear-gradient(180deg, rgba(236, 255, 245, 0.95), rgba(225, 250, 238, 0.86))',
            color: '#165f40',
          }}
        >
          If that username exists, a reset link has been sent to the associated email address.
        </div>
      ) : (
        <form onSubmit={handleReset} style={{ display: 'grid', gap: '1.1rem' }}>
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
            }}
          >
            {loading ? 'Sending reset link...' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
