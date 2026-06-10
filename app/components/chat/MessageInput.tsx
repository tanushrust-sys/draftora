'use client';

import { CornerDownLeft, Send, X } from 'lucide-react';
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
    <div style={{ borderTop: '1px solid var(--t-brd)', padding: '0.85rem 1rem 1rem', background: 'color-mix(in srgb, var(--t-card) 92%, white 8%)' }}>
      {replyTo ? (
        <div style={{ marginBottom: 10, borderRadius: 14, border: '1px solid color-mix(in srgb, var(--t-acc) 18%, var(--t-brd))', background: 'var(--t-acc-a)', padding: '0.55rem 0.7rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <p style={{ margin: 0, color: 'var(--t-acc)', fontSize: 11, fontWeight: 800 }}>Replying to {replyTo.sender.username}</p>
            <p style={{ margin: '0.15rem 0 0', color: 'var(--t-tx2)', fontSize: 12, lineHeight: 1.4 }}>{replyTo.messageText.slice(0, 100)}</p>
          </div>
          <button type="button" onClick={onCancelReply} style={{ width: 24, height: 24, border: 'none', background: 'transparent', color: 'var(--t-tx3)', cursor: 'pointer' }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
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
            minHeight: 48,
            maxHeight: 140,
            resize: 'vertical',
            borderRadius: 16,
            border: '1px solid var(--t-brd)',
            background: 'color-mix(in srgb, var(--t-card2) 84%, white 16%)',
            color: 'var(--t-tx)',
            padding: '0.82rem 0.95rem',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <button type="button" onClick={onSend} disabled={sending || !draft.trim()} style={sendButtonStyle}>
          <Send style={{ width: 15, height: 15 }} />
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ color: 'var(--t-tx3)', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <CornerDownLeft style={{ width: 12, height: 12 }} />
          Enter to send · Shift+Enter for new line
        </span>
        <span style={{ color: nearLimit ? 'var(--t-warning)' : 'var(--t-tx3)', fontSize: 11.5, fontWeight: nearLimit ? 800 : 600 }}>
          {draft.length}/{CHAT_MAX_MESSAGE_LENGTH}
        </span>
      </div>
    </div>
  );
}

const sendButtonStyle = {
  width: 48,
  height: 48,
  borderRadius: 16,
  border: '1px solid color-mix(in srgb, var(--t-acc) 24%, transparent)',
  background: 'linear-gradient(135deg, color-mix(in srgb, var(--t-acc) 78%, #fff 22%) 0%, color-mix(in srgb, var(--t-acc) 64%, var(--t-card2) 36%) 100%)',
  color: '#fff',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  flexShrink: 0,
} as const;
