'use client';

import { useRouter } from 'next/navigation';
import { MessageCircle, Sparkles, Users } from 'lucide-react';
import ChatModal from '@/app/components/chat/ChatModal';
import { useAuth } from '@/app/context/AuthContext';
import { chatTheme } from '@/app/components/chat/chatTheme';

export default function DashboardChatPage() {
  const router = useRouter();
  const { profile, session } = useAuth();

  if (!profile || !session?.access_token) return null;

  return (
    <div
      style={{
        height: 'calc(100vh - 1.5rem)',
        minHeight: 0,
        padding: '0.75rem',
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr)',
        gap: 12,
        overflow: 'hidden',
      }}
    >
      <section
        style={{
          borderRadius: 24,
          border: `1px solid ${chatTheme.border}`,
          background: 'linear-gradient(135deg, #10213f 0%, #15305a 100%)',
          color: chatTheme.text,
          padding: '1rem 1.1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 38, height: 38, borderRadius: 14, background: chatTheme.accentSoft, color: chatTheme.accent, display: 'grid', placeItems: 'center' }}>
              <MessageCircle style={{ width: 18, height: 18 }} />
            </div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Draftora Chat</h1>
          </div>
          <p style={{ margin: 0, color: chatTheme.textMuted, fontSize: 13, lineHeight: 1.5 }}>
            Chat with accepted friends, send ideas fast, and keep everything in one place.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { icon: <Users style={{ width: 14, height: 14 }} />, label: 'Friend inbox' },
            { icon: <Sparkles style={{ width: 14, height: 14 }} />, label: 'Fast chat view' },
          ].map((chip) => (
            <span key={chip.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', border: `1px solid ${chatTheme.border}`, padding: '0.5rem 0.8rem', fontSize: 12.5, fontWeight: 800 }}>
              {chip.icon}
              {chip.label}
            </span>
          ))}
        </div>
      </section>
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
