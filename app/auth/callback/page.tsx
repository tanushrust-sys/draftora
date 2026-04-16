'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { clearSupabaseClientSession, getVerifiedSession, supabase } from '@/app/lib/supabase';
import { AuthShell } from '@/app/components/auth-shell';

async function getResolvedHomePath(token?: string | null, fallback = '/dashboard') {
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
      // fall through to fallback
    }
  }

  return fallback;
}

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      const code = searchParams.get('code');
      const rawNext = searchParams.get('next');
      const recoveryType = searchParams.get('type');
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const hasRecoveryHash =
        hash.includes('access_token=') ||
        hash.includes('refresh_token=') ||
        hash.includes('type=recovery');
      const isRecoveryFlow = hasRecoveryHash || recoveryType === 'recovery';
      const next = rawNext || (isRecoveryFlow ? '/reset-password' : '/dashboard');

      try {
        if (code) {
          clearSupabaseClientSession();
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            clearSupabaseClientSession();
            const message = exchangeError.message || 'Authentication failed.';
            setError(
              message.toLowerCase().includes('deleted') || message.toLowerCase().includes('recreate')
                ? 'This account was deleted and cannot be used again.'
                : message,
            );
            return;
          }
        }

        if (hasRecoveryHash) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          const session = await getVerifiedSession();
          if (!session) {
            setError('We could not finish the recovery sign-in. Please open the password reset email again.');
            return;
          }
        }

        const session = await getVerifiedSession();
        const homePath = next === '/dashboard'
          ? await getResolvedHomePath(session?.access_token ?? null, next)
          : next;

        window.location.replace(homePath);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed.');
      }
    };

    void run();
  }, [searchParams]);

  return (
    <AuthShell
      eyebrow="Signing you in"
      title="Finishing authentication"
      description="We are connecting your account and sending you to the right place."
    >
      {error ? (
        <div className="auth-error-box">{error}</div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/75">
          <Loader2 className="h-4 w-4 animate-spin" />
          Completing sign-in...
        </div>
      )}
    </AuthShell>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <AuthShell
          eyebrow="Signing you in"
          title="Finishing authentication"
          description="We are connecting your account and sending you to the right place."
        >
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/75">
            <Loader2 className="h-4 w-4 animate-spin" />
            Completing sign-in...
          </div>
        </AuthShell>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
