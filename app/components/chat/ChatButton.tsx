'use client';

import { MessageCircle } from 'lucide-react';

type ChatButtonProps = {
  badgeCount: number;
  onClick: () => void;
};

export default function ChatButton({ badgeCount, onClick }: ChatButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open Draftora Chat"
      style={{
        position: 'fixed',
        right: 'clamp(1rem, 2vw, 1.5rem)',
        top: 'max(5.75rem, calc(env(safe-area-inset-top) + 5rem))',
        width: 68,
        height: 68,
        borderRadius: '50%',
        border: '1px solid color-mix(in srgb, var(--t-acc) 34%, var(--t-brd))',
        background: 'linear-gradient(145deg, color-mix(in srgb, var(--t-acc) 82%, #ffffff 18%) 0%, color-mix(in srgb, var(--t-acc) 68%, var(--t-card2) 32%) 100%)',
        boxShadow: '0 20px 40px color-mix(in srgb, var(--t-shadow) 26%, transparent), inset 0 1px 0 rgba(255,255,255,0.42)',
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        cursor: 'pointer',
        zIndex: 80,
      }}
    >
      <MessageCircle style={{ width: 28, height: 28 }} />
      {badgeCount > 0 ? (
        <span
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            minWidth: 22,
            height: 22,
            padding: '0 6px',
            borderRadius: 999,
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ff3d71 100%)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 900,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 18px rgba(255, 61, 113, 0.35)',
          }}
        >
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      ) : null}
    </button>
  );
}
