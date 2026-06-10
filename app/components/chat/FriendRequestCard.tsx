'use client';

import { Check, Clock3, MessageCircle, UserPlus2, X } from 'lucide-react';
import { chatTheme } from '@/app/components/chat/chatTheme';
import { getAvatarInitials } from '@/app/lib/chat';
import type { ChatProfileSnippet, FriendRequestItem } from '@/app/lib/chatTypes';

type FriendRequestCardProps = {
  profile: ChatProfileSnippet;
  subtitle: string;
  variant: 'incoming' | 'outgoing' | 'friend';
  request?: FriendRequestItem;
  onAccept?: (requestId: string) => void;
  onDecline?: (requestId: string) => void;
  onOpenChat?: (userId: string) => void;
};

export default function FriendRequestCard({
  profile,
  subtitle,
  variant,
  request,
  onAccept,
  onDecline,
  onOpenChat,
}: FriendRequestCardProps) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: `1px solid ${chatTheme.border}`,
        background: chatTheme.surface,
        padding: '0.8rem',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ width: 42, height: 42, borderRadius: '50%', background: chatTheme.accentSoft, color: chatTheme.accent, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900, flexShrink: 0 }}>
        {getAvatarInitials(profile.username, profile.email)}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, color: chatTheme.text, fontSize: 13.5, fontWeight: 800 }}>{profile.username}</p>
        <p style={{ margin: '0.15rem 0 0', color: chatTheme.textMuted, fontSize: 12 }}>{subtitle}</p>
      </div>
      {variant === 'incoming' && request ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => onAccept?.(request.id)} style={pillButtonStyle('success')}>
            <Check style={{ width: 14, height: 14 }} />
          </button>
          <button type="button" onClick={() => onDecline?.(request.id)} style={pillButtonStyle('neutral')}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      ) : null}
      {variant === 'outgoing' ? (
        <span style={statusChipStyle()}>
          <Clock3 style={{ width: 12, height: 12 }} />
          Pending
        </span>
      ) : null}
      {variant === 'friend' ? (
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <span style={statusChipStyle()}>
            <UserPlus2 style={{ width: 12, height: 12 }} />
            Friend
          </span>
          <button type="button" onClick={() => onOpenChat?.(profile.id)} style={chatButtonStyle}>
            <MessageCircle style={{ width: 12, height: 12 }} />
            Chat
          </button>
        </div>
      ) : null}
    </div>
  );
}

function pillButtonStyle(kind: 'success' | 'neutral') {
  return {
    width: 34,
    height: 34,
    borderRadius: 12,
    border: '1px solid transparent',
    background: kind === 'success'
      ? 'linear-gradient(135deg, color-mix(in srgb, var(--t-success) 82%, #ffffff 18%) 0%, color-mix(in srgb, var(--t-success) 72%, var(--t-card2) 28%) 100%)'
      : chatTheme.surfaceMuted,
    color: kind === 'success' ? '#fff' : chatTheme.textMuted,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
  } as const;
}

function statusChipStyle() {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    border: `1px solid ${chatTheme.borderStrong}`,
    background: chatTheme.accentSoft,
    color: chatTheme.accent,
    fontSize: 11.5,
    fontWeight: 800,
    padding: '0.38rem 0.62rem',
    flexShrink: 0,
  } as const;
}

const chatButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  borderRadius: 999,
  border: `1px solid ${chatTheme.borderStrong}`,
  background: 'linear-gradient(135deg, #3cbcff 0%, #59d6ff 100%)',
  color: '#fff',
  fontSize: 11.5,
  fontWeight: 800,
  padding: '0.38rem 0.7rem',
  cursor: 'pointer',
} as const;
