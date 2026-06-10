'use client';

import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { formatChatDateDivider, getAvatarInitials } from '@/app/lib/chat';
import type { ChatMessage, FriendSummary } from '@/app/lib/chatTypes';
import MessageBubble from '@/app/components/chat/MessageBubble';
import MessageInput from '@/app/components/chat/MessageInput';

type ChatThreadProps = {
  currentUserId: string;
  friend: FriendSummary | null;
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  draft: string;
  replyTo: ChatMessage | null;
  isMobile: boolean;
  onBack: () => void;
  onDraftChange: (value: string) => void;
  onCancelReply: () => void;
  onSend: () => void;
  onReply: (message: ChatMessage) => void;
  onReport: (message: ChatMessage) => void;
};

export default function ChatThread({
  currentUserId,
  friend,
  messages,
  loading,
  sending,
  draft,
  replyTo,
  isMobile,
  onBack,
  onDraftChange,
  onCancelReply,
  onSend,
  onReply,
  onReport,
}: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  if (!friend) {
    return (
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--t-acc-a)', color: 'var(--t-acc)', display: 'grid', placeItems: 'center', margin: '0 auto 0.9rem' }}>
            <MessageCircle style={{ width: 24, height: 24 }} />
          </div>
          <p style={{ margin: 0, color: 'var(--t-tx)', fontSize: 15, fontWeight: 800 }}>Pick a friend to start chatting about stories, prompts, and ideas.</p>
        </div>
      </div>
    );
  }

  let lastDivider = '';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ padding: '0.95rem 1rem', borderBottom: '1px solid var(--t-brd)', display: 'flex', alignItems: 'center', gap: 10 }}>
        {isMobile ? (
          <button type="button" onClick={onBack} style={{ width: 34, height: 34, borderRadius: 12, border: '1px solid var(--t-brd)', background: 'var(--t-card)', color: 'var(--t-tx2)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <ArrowLeft style={{ width: 15, height: 15 }} />
          </button>
        ) : null}
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--t-acc-a)', color: 'var(--t-acc)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900 }}>
          {getAvatarInitials(friend.username, friend.email)}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, color: 'var(--t-tx)', fontSize: 14, fontWeight: 800 }}>{friend.username}</p>
          <p style={{ margin: '0.12rem 0 0', color: 'var(--t-tx3)', fontSize: 11.5 }}>Draftora friend</p>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '1rem', display: 'grid', gap: 12, background: 'var(--t-card)' }}>
        {loading ? <p style={{ margin: 0, color: 'var(--t-tx3)', fontSize: 12.5 }}>Loading messages…</p> : null}
        {!loading && messages.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--t-tx3)', fontSize: 12.5 }}>No messages yet. Say hi and share a writing idea.</p>
        ) : null}
        {!loading && messages.map((message) => {
          const divider = formatChatDateDivider(message.createdAt);
          const showDivider = divider !== lastDivider;
          lastDivider = divider;
          return (
            <div key={message.id} style={{ display: 'grid', gap: 10 }}>
              {showDivider ? (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span style={{ padding: '0.3rem 0.7rem', borderRadius: 999, background: 'var(--t-card2)', color: 'var(--t-tx3)', fontSize: 11, fontWeight: 700 }}>
                    {divider}
                  </span>
                </div>
              ) : null}
              <MessageBubble
                message={message}
                isOwn={message.senderId === currentUserId}
                onReply={onReply}
                onReport={onReport}
              />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <MessageInput
        draft={draft}
        sending={sending}
        replyTo={replyTo}
        onDraftChange={onDraftChange}
        onCancelReply={onCancelReply}
        onSend={onSend}
      />
    </div>
  );
}
