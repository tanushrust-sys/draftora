'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { Trophy } from 'lucide-react';
import { pickLevelUpGif } from '@/app/lib/reaction-gifs';

// Lightweight canvas confetti — no external dependency
function runConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width = window.innerWidth;
  const H = canvas.height = window.innerHeight;

  const COLORS = ['#a78bfa', '#fb923c', '#4ade80', '#60a5fa', '#f472b6', '#fbbf24', '#22d3ee'];
  const pieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H - H,
    r: Math.random() * 7 + 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    vx: (Math.random() - 0.5) * 3,
    vy: Math.random() * 4 + 2,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.15,
    shape: Math.random() > 0.5 ? 'rect' : 'circle' as 'rect' | 'circle',
  }));

  let raf: number;
  let frame = 0;

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    for (const p of pieces) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;
      if (p.y > H + 20) {
        p.y = -20;
        p.x = Math.random() * W;
      }
    }
    frame++;
    if (frame < 180) raf = requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, W, H);
  };

  raf = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(raf);
}

export default function LevelUpPopup() {
  const { levelUpEvent, clearLevelUpEvent } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cleanupConfetti = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    if (!levelUpEvent || !canvasRef.current) return;
    cleanupConfetti.current = runConfetti(canvasRef.current) ?? undefined;
    const timer = setTimeout(clearLevelUpEvent, 5000);
    return () => {
      clearTimeout(timer);
      cleanupConfetti.current?.();
    };
  }, [levelUpEvent, clearLevelUpEvent]);

  const handleDismiss = useCallback(() => {
    cleanupConfetti.current?.();
    clearLevelUpEvent();
  }, [clearLevelUpEvent]);

  if (!levelUpEvent) return null;
  const levelUpGif = pickLevelUpGif(levelUpEvent.level);

  return (
    <div
      onClick={handleDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        animation: 'fadeIn 0.25s ease',
        cursor: 'pointer',
      }}
    >
      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />

      {/* Card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', zIndex: 1,
          background: 'var(--t-card)',
          border: '1px solid var(--t-brd-a)',
          borderRadius: 28,
          padding: '2.5rem 3rem',
          textAlign: 'center',
          maxWidth: 380,
          width: '90%',
          boxShadow: '0 0 60px rgba(167,139,250,0.25)',
          animation: 'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: 24, margin: '0 auto 20px',
          background: 'linear-gradient(135deg, var(--t-acc-a), var(--t-acc-b))',
          border: '1px solid var(--t-brd-a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Trophy style={{ width: 34, height: 34, color: 'var(--t-acc)' }} />
        </div>

        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-acc)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
          Level Up!
        </p>
        <h2 style={{ fontSize: 42, fontWeight: 900, color: 'var(--t-tx)', lineHeight: 1, marginBottom: 8, letterSpacing: '-0.03em' }}>
          Level {levelUpEvent.level}
        </h2>
        <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--t-acc)', marginBottom: 8 }}>
          {levelUpEvent.title}
        </p>
        <p style={{ fontSize: 14, color: 'var(--t-tx3)', lineHeight: 1.55, marginBottom: 24 }}>
          You&apos;ve earned this through consistent writing and practice. Keep it up!
        </p>
        {levelUpGif && (
          <div style={{ marginBottom: 18, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--t-brd)' }}>
            <img
              src={levelUpGif}
              alt="Level up GIF"
              loading="lazy"
              style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}

        <button
          onClick={handleDismiss}
          style={{
            background: 'var(--t-btn)', color: 'var(--t-btn-color)',
            borderRadius: 14, padding: '11px 32px',
            fontSize: 14, fontWeight: 700,
            border: 'none', cursor: 'pointer',
          }}
        >
          Let&apos;s keep going
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.8) translateY(20px) }
          to   { opacity: 1; transform: scale(1) translateY(0) }
        }
      `}</style>
    </div>
  );
}
