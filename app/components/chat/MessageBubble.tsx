'use client';

import { MoreHorizontal, Reply, ShieldAlert } from 'lucide-react';
import { formatChatTimestamp } from '@/app/lib/chat';
import type { ChatMessage } from '@/app/lib/chatTypes';

type MessageBubbleProps = {
  message: ChatMessage;
  isOwn: boolean;
  onReply: (message: ChatMessage) => void;
  onReport: (message: ChatMessage) => void;
};

export default function MessageBubble({ message, isOwn, onReply, onReport }: MessageBubbleProps) {
  return (
    <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
      <div style={{ maxWidth: 'min(78%, 560px)', display: 'grid', gap: 6 }}>
        <div
          style={{
            position: 'relative',
            borderRadius: isOwn ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
            padding: '0.78rem 0.9rem',
            background: isOwn
              ? 'linear-gradient(145deg, color-mix(in srgb, var(--t-acc) 84%, #ffffff 16%) 0%, color-mix(in srgb, var(--t-acc) 72%, var(--t-card2) 28%) 100%)'
              : 'var(--t-card2)',
            color: isOwn ? '#fff' : 'var(--t-tx)',
            border: isOwn ? 'none' : '1px solid var(--t-brd)',
            boxShadow: '0 12px 26px color-mix(in srgb, var(--t-shadow) 14%, transparent)',
          }}
        >
          {message.replyTo ? (
            <div style={{ marginBottom: 8, borderRadius: 12, background: isOwn ? 'rgba(255,255,255,0.16)' : 'var(--t-acc-a)', padding: '0.48rem 0.6rem' }}>
              <p style={{ margin: 0, fontSize: 10.5, fontWeight: 800, opacity: 0.88 }}>{message.replyTo.senderName}</p>
              <p style={{ margin: '0.15rem 0 0', fontSize: 11.5, lineHeight: 1.35, opacity: 0.92 }}>{message.replyTo.messageText.slice(0, 90)}</p>
            </div>
          ) : null}
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{message.messageText}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
          <span style={{ color: 'var(--t-tx3)', fontSize: 11 }}>{formatChatTimestamp(message.createdAt)}</span>
          <button type="button" onClick={() => onReply(message)} style={iconButtonStyle}>
            <Reply style={{ width: 12, height: 12 }} />
          </button>
          {!isOwn ? (
            <button type="button" onClick={() => onReport(message)} style={iconButtonStyle}>
              <ShieldAlert style={{ width: 12, height: 12 }} />
            </button>
          ) : null}
          <span style={{ color: 'var(--t-tx3)', display: 'inline-flex' }}>
            <MoreHorizontal style={{ width: 12, height: 12 }} />
          </span>
        </div>
      </div>
    </div>
  );
}

const iconButtonStyle = {
  width: 24,
  height: 24,
  borderRadius: 8,
  border: 'none',
  background: 'transparent',
  color: 'var(--t-tx3)',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
} as const;
