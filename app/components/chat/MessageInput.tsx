'use client';

import { CornerDownLeft, Send, X } from 'lucide-react';
import { chatTheme } from '@/app/components/chat/chatTheme';
import { CHAT_MAX_MESSAGE_LENGTH } from '@/app/lib/chat';
import type { ChatMessage } from '@/app/lib/chatTypes';

type MessageInputProps = {
  draft: string;
  sending: boolean;
  replyTo: ChatMessage | null;
  onDraftChange: (value: string) => void;
  onCancelReply: () => void;
  onSend: () => void;
};

export default function MessageInput({
  draft,
  sending,
  replyTo,
  onDraftChange,
  onCancelReply,
  onSend,
}: MessageInputProps) {
  const nearLimit = draft.length > 420;

  return (
    <div style={{ borderTop: `1px solid ${chatTheme.border}`, padding: '0.65rem 0.8rem 0.8rem', background: '#f0f2f5' }}>
      {replyTo ? (
        <div style={{ marginBottom: 10, borderRadius: 10, border: `1px solid ${chatTheme.borderStrong}`, background: '#fff', padding: '0.55rem 0.7rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <p style={{ margin: 0, color: chatTheme.accent, fontSize: 11, fontWeight: 800 }}>Replying to {replyTo.sender.username}</p>
            <p style={{ margin: '0.15rem 0 0', color: chatTheme.text, fontSize: 12, lineHeight: 1.4 }}>{replyTo.messageText.slice(0, 100)}</p>
          </div>
          <button type="button" onClick={onCancelReply} style={{ width: 24, height: 24, border: 'none', background: 'transparent', color: chatTheme.textMuted, cursor: 'pointer' }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <textarea
          value={draft}
          onChange={(event) => {
            if (event.target.value.length <= CHAT_MAX_MESSAGE_LENGTH) onDraftChange(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
          rows={1}
          placeholder="Share a writing idea..."
          style={{
            flex: 1,
            minHeight: 44,
            maxHeight: 140,
            resize: 'none',
            borderRadius: 22,
            border: `1px solid ${chatTheme.border}`,
            background: '#fff',
            color: chatTheme.text,
            padding: '0.72rem 0.95rem',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <button type="button" onClick={onSend} disabled={sending || !draft.trim()} style={sendButtonStyle}>
          <Send style={{ width: 15, height: 15 }} />
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ color: chatTheme.textMuted, fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <CornerDownLeft style={{ width: 12, height: 12 }} />
          Enter to send · Shift+Enter for new line
        </span>
        <span style={{ color: nearLimit ? '#ffca6b' : chatTheme.textMuted, fontSize: 11.5, fontWeight: nearLimit ? 800 : 600 }}>
          {draft.length}/{CHAT_MAX_MESSAGE_LENGTH}
        </span>
      </div>
    </div>
  );
}

const sendButtonStyle = {
  width: 44,
  height: 44,
  borderRadius: '50%',
  border: 'none',
  background: '#00a884',
  color: '#fff',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  flexShrink: 0,
} as const;
