'use client';

import { useRouter } from 'next/navigation';
import ChatModal from '@/app/components/chat/ChatModal';
import { useAuth } from '@/app/context/AuthContext';

export default function DashboardChatPage() {
  const router = useRouter();
  const { profile, session } = useAuth();

  if (!profile || !session?.access_token) return null;

  return (
    <div
      style={{
        height: 'calc(100vh - 0.5rem)',
        minHeight: 0,
        padding: '0.25rem',
        overflow: 'hidden',
      }}
    >
      <ChatModal
        open
        mode="page"
        token={session.access_token}
        currentUser={{
          id: profile.id,
          username: profile.username,
          email: profile.email,
          title: profile.title,
          level: profile.level,
        }}
        initialCounts={{
          unreadMessages: 0,
          unreadChats: 0,
          pendingRequests: 0,
          totalBadge: 0,
        }}
        onClose={() => router.push('/dashboard')}
        onCountsChange={() => {}}
      />
    </div>
  );
}
