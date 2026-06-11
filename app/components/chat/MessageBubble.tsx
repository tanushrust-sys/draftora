'use client';

import { MoreHorizontal, Reply, ShieldAlert } from 'lucide-react';
import { chatTheme } from '@/app/components/chat/chatTheme';
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
      <div style={{ maxWidth: 'min(78%, 560px)', display: 'grid', gap: 4 }}>
        <div
          style={{
            position: 'relative',
            borderRadius: 8,
            padding: '0.42rem 0.55rem 0.32rem',
            background: isOwn ? '#d9fdd3' : '#ffffff',
            color: isOwn ? '#fff' : chatTheme.text,
            border: `1px solid ${chatTheme.border}`,
            boxShadow: '0 1px 0 rgba(17, 27, 33, 0.06)',
          }}
        >
          {message.replyTo ? (
            <div style={{ marginBottom: 8, borderRadius: 7, background: isOwn ? 'rgba(255,255,255,0.55)' : '#f0f2f5', padding: '0.42rem 0.5rem', borderLeft: '3px solid #00a884' }}>
              <p style={{ margin: 0, fontSize: 10.5, fontWeight: 800, color: '#00a884' }}>{message.replyTo.senderName}</p>
              <p style={{ margin: '0.15rem 0 0', fontSize: 11.5, lineHeight: 1.35, color: chatTheme.text }}>{message.replyTo.messageText.slice(0, 90)}</p>
            </div>
          ) : null}
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap', color: chatTheme.text, paddingRight: 44 }}>{message.messageText}</p>
          <span style={{ position: 'absolute', right: 10, bottom: 6, color: chatTheme.textMuted, fontSize: 11 }}>
            {formatChatTimestamp(message.createdAt)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
          <button type="button" onClick={() => onReply(message)} style={iconButtonStyle}>
            <Reply style={{ width: 12, height: 12 }} />
          </button>
          {!isOwn ? (
            <button type="button" onClick={() => onReport(message)} style={iconButtonStyle}>
              <ShieldAlert style={{ width: 12, height: 12 }} />
            </button>
          ) : null}
          <span style={{ color: chatTheme.textMuted, display: 'inline-flex' }}>
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
  borderRadius: 999,
  border: 'none',
  background: 'transparent',
  color: chatTheme.textMuted,
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
} as const;
