'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { AuthShell } from '@/app/components/auth-shell';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push('/login'), 1500);
  };

  return (
    <AuthShell
      eyebrow="Secure your account"
      title="Choose a new password"
      description="Set a fresh password for your account and we’ll send you straight back into Draftora."
      footer={
        !success ? (
          <p className="text-sm" style={{ color: 'var(--t-tx2)' }}>
            Want to return instead? <Link href="/login" className="auth-link">Go to login</Link>
          </p>
        ) : undefined
      }
    >
      {success ? (
        <div className="auth-success-box">Password updated. Redirecting you back to login...</div>
      ) : !ready ? (
        <div className="auth-error-box">
          Open this page from the password reset email. Once the recovery session is active, you can set a new password here.
        </div>
      ) : (
        <form onSubmit={handleResetPassword} className="auth-form">
          <div className="auth-field">
            <label htmlFor="password">New password</label>
            <div className="auth-input-wrap">
              <LockKeyhole className="h-4 w-4" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="auth-input"
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Toggle password visibility">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="confirm-password">Confirm password</label>
            <div className="auth-input-wrap">
              <LockKeyhole className="h-4 w-4" />
              <input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="auth-input"
              />
              <button type="button" onClick={() => setShowConfirm((value) => !value)} aria-label="Toggle confirm password visibility">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error ? <div className="auth-error-box">{error}</div> : null}

          <button type="submit" disabled={loading} className="auth-primary-btn">
            {loading ? 'Saving password...' : 'Save new password'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
