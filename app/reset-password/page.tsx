'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
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
  const passwordStrength =
    password.length >= 10 ? 'Strong' : password.length >= 6 ? 'Good' : 'Too short';
  const passwordStrengthColor =
    password.length >= 10 ? '#34d399' : password.length >= 6 ? '#67e8f9' : 'rgba(125, 211, 252, 0.72)';

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
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'rgba(199, 249, 255, 0.72)' }}>
            Want to return instead? <Link href="/login" className="auth-link">Go to login</Link>
          </p>
        ) : undefined
      }
    >
      {success ? (
        <div
          style={{
            display: 'grid',
            gap: 10,
            padding: '1rem 1.1rem',
            borderRadius: '1rem',
            border: '1px solid rgba(74, 222, 128, 0.26)',
            background: 'linear-gradient(180deg, rgba(22, 101, 52, 0.22), rgba(6, 46, 24, 0.2))',
            color: '#dcfce7',
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
            <CheckCircle2 size={16} />
            Password updated successfully
          </div>
          <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Redirecting you back to login...</div>
        </div>
      ) : !ready ? (
        <div style={{ padding: '0.95rem 1rem', borderRadius: '1rem', fontSize: '0.92rem', lineHeight: 1.55, border: '1px solid rgba(248, 113, 113, 0.28)', background: 'rgba(127, 29, 29, 0.22)', color: '#fecaca' }}>
          Open this page from the password reset email. Once the recovery session is active, you can set a new password here.
        </div>
      ) : (
        <form onSubmit={handleResetPassword} style={{ display: 'grid', gap: '1rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              borderRadius: 14,
              border: '1px solid rgba(56, 189, 248, 0.18)',
              background: 'rgba(3, 23, 38, 0.46)',
              padding: '0.65rem 0.8rem',
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(224, 251, 255, 0.9)', fontSize: '0.82rem', fontWeight: 700 }}>
              <ShieldCheck size={14} />
              Password strength
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: passwordStrengthColor }}>{passwordStrength}</div>
          </div>

          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <label htmlFor="password" style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: '#8befff', fontWeight: 700 }}>
              New password
            </label>
            <div style={{ position: 'relative' }}>
              <LockKeyhole size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(125, 211, 252, 0.75)' }} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
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
                onClick={() => setShowPassword((value) => !value)}
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
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <label htmlFor="confirm-password" style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: '#8befff', fontWeight: 700 }}>
              Confirm password
            </label>
            <div style={{ position: 'relative' }}>
              <LockKeyhole size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(125, 211, 252, 0.75)' }} />
              <input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
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
                onClick={() => setShowConfirm((value) => !value)}
                aria-label="Toggle confirm password visibility"
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
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
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
            {loading ? 'Saving password...' : 'Save new password'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
