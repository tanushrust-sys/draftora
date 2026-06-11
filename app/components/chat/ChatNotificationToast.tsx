'use client';

import { useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { chatTheme } from '@/app/components/chat/chatTheme';

type ChatNotificationToastProps = {
  id: string;
  message: string;
  onClose: (id: string) => void;
  onOpen: () => void;
};

export default function ChatNotificationToast({ id, message, onClose, onOpen }: ChatNotificationToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => onClose(id), 5000);
    return () => window.clearTimeout(timer);
  }, [id, onClose]);

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        width: 'min(360px, calc(100vw - 1.5rem))',
        borderRadius: 18,
        border: `1px solid ${chatTheme.borderStrong}`,
        background: 'linear-gradient(145deg, #f7f5f1 0%, #ffffff 100%)',
        boxShadow: '0 18px 36px rgba(17, 27, 33, 0.18)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '0.9rem 0.95rem',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 12, background: chatTheme.accentSoft, display: 'grid', placeItems: 'center', color: chatTheme.accent, flexShrink: 0 }}>
        <Bell style={{ width: 16, height: 16 }} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, color: chatTheme.text, fontSize: 13, fontWeight: 800 }}>Draftora Chat</p>
        <p style={{ margin: '0.18rem 0 0', color: chatTheme.textMuted, fontSize: 12.5, lineHeight: 1.45 }}>{message}</p>
      </div>
      <span
        role="button"
        aria-label="Dismiss"
        onClick={(event) => {
          event.stopPropagation();
          onClose(id);
        }}
        style={{ width: 24, height: 24, borderRadius: 8, display: 'grid', placeItems: 'center', color: chatTheme.textMuted }}
      >
        <X style={{ width: 14, height: 14 }} />
      </span>
    </button>
  );
}
