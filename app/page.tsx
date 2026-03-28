'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PenTool } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(user ? '/dashboard' : '/login');
    }
  }, [loading, router, user]);

  return (
    <div className="auth-shell flex items-center justify-center">
      <div className="auth-card-panel max-w-sm text-center">
        <div className="auth-card-panel__body">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px]" style={{ background: 'rgba(245,200,66,0.15)', color: '#f5c842' }}>
            <PenTool className="h-8 w-8 animate-pulse" />
          </div>
          <p className="auth-card-panel__eyebrow">Preparing your workspace</p>
          <h1 className="auth-card-panel__title">Opening Draftly</h1>
          <p className="auth-card-panel__description">Checking your session and routing you to the right place.</p>
        </div>
      </div>
    </div>
  );
}
