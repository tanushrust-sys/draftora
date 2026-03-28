'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function JournalRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/writings?tab=journal');
  }, [router]);
  return null;
}
