'use client';

import { useEffect } from 'react';
import { Bell, X } from 'lucide-react';

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
        border: '1px solid color-mix(in srgb, var(--t-acc) 22%, var(--t-brd))',
        background: 'linear-gradient(145deg, color-mix(in srgb, var(--t-card) 92%, var(--t-acc) 8%) 0%, color-mix(in srgb, var(--t-card2) 88%, white 12%) 100%)',
        boxShadow: '0 18px 36px color-mix(in srgb, var(--t-shadow) 22%, transparent)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '0.9rem 0.95rem',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 12, background: 'var(--t-acc-a)', display: 'grid', placeItems: 'center', color: 'var(--t-acc)', flexShrink: 0 }}>
        <Bell style={{ width: 16, height: 16 }} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, color: 'var(--t-tx)', fontSize: 13, fontWeight: 800 }}>Draftora Chat</p>
        <p style={{ margin: '0.18rem 0 0', color: 'var(--t-tx2)', fontSize: 12.5, lineHeight: 1.45 }}>{message}</p>
      </div>
      <span
        role="button"
        aria-label="Dismiss"
        onClick={(event) => {
          event.stopPropagation();
          onClose(id);
        }}
        style={{ width: 24, height: 24, borderRadius: 8, display: 'grid', placeItems: 'center', color: 'var(--t-tx3)' }}
      >
        <X style={{ width: 14, height: 14 }} />
      </span>
    </button>
  );
}
