'use client';

import { useEffect, useMemo, useState } from 'react';
import { useEquippedCosmetics } from '@/app/context/EquippedCosmeticsContext';

type XpProgressBarProps = {
  percent: number;
  height?: number;
  rounded?: number;
  trackColor?: string;
  fill?: string;
  glow?: string;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export default function XpProgressBar({
  percent,
  height = 6,
  rounded = 999,
  trackColor = 'color-mix(in srgb, var(--t-tx3) 14%, transparent)',
  fill = 'linear-gradient(90deg, var(--t-acc), color-mix(in srgb, var(--t-acc) 70%, white))',
  glow = '0 0 18px color-mix(in srgb, var(--t-acc) 28%, transparent)',
}: XpProgressBarProps) {
  const [animatedPercent, setAnimatedPercent] = useState(() => clampPercent(percent));
  const [pulse, setPulse] = useState(false);
  const cosmetics = useEquippedCosmetics();
  const equippedXpVisual = cosmetics?.equippedItemsByCategory?.xp_visuals ?? null;
  const equippedRarity = equippedXpVisual?.rarity ?? 'common';

  const xpTheme = useMemo(() => {
    const name = (equippedXpVisual?.name ?? '').toLowerCase();
    const rarity = equippedXpVisual?.rarity ?? 'common';

    if (!equippedXpVisual) {
      return {
        a: 'var(--t-acc)',
        b: 'color-mix(in srgb, var(--t-acc) 70%, white)',
        c: 'color-mix(in srgb, var(--t-acc) 42%, white)',
        track: trackColor,
        frame: 'transparent',
      };
    }

    if (name.includes('superchar') || rarity === 'legendary') {
      return {
        a: '#06b6d4',
        b: '#34d399',
        c: '#a7f3d0',
        track: 'linear-gradient(180deg, rgba(236,253,245,0.9) 0%, rgba(220,252,231,0.76) 100%)',
        frame: 'rgba(16,185,129,0.3)',
      };
    }

    if (rarity === 'epic') {
      return {
        a: '#7c3aed',
        b: '#a855f7',
        c: '#d8b4fe',
        track: 'linear-gradient(180deg, rgba(245,243,255,0.9) 0%, rgba(237,233,254,0.76) 100%)',
        frame: 'rgba(124,58,237,0.3)',
      };
    }

    if (rarity === 'rare') {
      return {
        a: '#f59e0b',
        b: '#f97316',
        c: '#fde68a',
        track: 'linear-gradient(180deg, rgba(255,251,235,0.9) 0%, rgba(254,243,199,0.78) 100%)',
        frame: 'rgba(245,158,11,0.28)',
      };
    }

    return {
      a: '#3b82f6',
      b: '#60a5fa',
      c: '#bfdbfe',
      track: 'linear-gradient(180deg, rgba(239,246,255,0.9) 0%, rgba(219,234,254,0.76) 100%)',
      frame: 'rgba(59,130,246,0.26)',
    };
  }, [equippedXpVisual, trackColor]);

  const motion = useMemo(() => {
    if (!equippedXpVisual) return { m: 1, spark: 1, shine: 1 };
    if (equippedRarity === 'legendary') return { m: 1.35, spark: 1.5, shine: 1.45 };
    if (equippedRarity === 'epic') return { m: 1.18, spark: 1.28, shine: 1.18 };
    if (equippedRarity === 'rare') return { m: 1.08, spark: 1.12, shine: 1.06 };
    return { m: 1, spark: 1, shine: 1 };
  }, [equippedRarity, equippedXpVisual]);

  useEffect(() => {
    const next = clampPercent(percent);
    setAnimatedPercent((prev) => {
      if (next > prev) {
        setPulse(true);
        window.setTimeout(() => setPulse(false), 620);
      }
      return next;
    });
  }, [percent]);

  return (
    <div
      className={[
        'xpbar',
        equippedXpVisual ? 'xpbar--equipped' : '',
        equippedXpVisual ? `xpbar--${equippedRarity}` : '',
      ].filter(Boolean).join(' ')}
      style={{
        ['--xp-h' as string]: `${height}px`,
        ['--xp-r' as string]: `${rounded}px`,
        ['--xp-a' as string]: xpTheme.a,
        ['--xp-b' as string]: xpTheme.b,
        ['--xp-c' as string]: xpTheme.c,
        ['--xp-track' as string]: xpTheme.track,
        ['--xp-frame' as string]: xpTheme.frame,
        ['--xp-m' as string]: String(motion.m),
        ['--xp-spark' as string]: String(motion.spark),
        ['--xp-shine' as string]: String(motion.shine),
      }}
    >
      <div className="xpbar__track" aria-hidden="true">
        {equippedXpVisual ? (
          <>
            <span className="xpbar__aura" />
            <span className="xpbar__aura xpbar__aura--2" />
          </>
        ) : null}
        <div
          className="xpbar__fill"
          style={{
            width: `${animatedPercent}%`,
            background: equippedXpVisual ? 'linear-gradient(90deg, var(--xp-a), var(--xp-b))' : fill,
            filter: pulse ? 'brightness(1.1)' : 'brightness(1)',
            boxShadow: pulse ? glow : 'none',
          }}
        >
          <span className="xpbar__scanline" />
          <span className="xpbar__edge" />
          <span className="xpbar__fillspark xpbar__fillspark--1" />
          <span className="xpbar__fillspark xpbar__fillspark--2" />
          <span className="xpbar__fillspark xpbar__fillspark--3" />
        </div>
        {equippedXpVisual ? (
          <>
            <span className="xpbar__trackglow" />
            <span className="xpbar__energy xpbar__energy--1" />
            <span className="xpbar__energy xpbar__energy--2" />
            <span className="xpbar__spark xpbar__spark--1" />
            <span className="xpbar__spark xpbar__spark--2" />
            {equippedRarity === 'epic' || equippedRarity === 'legendary' ? (
              <>
                <span className="xpbar__micro xpbar__micro--1" />
                <span className="xpbar__micro xpbar__micro--2" />
                <span className="xpbar__micro xpbar__micro--3" />
              </>
            ) : null}
          </>
        ) : null}
      </div>
      <style jsx>{`
        .xpbar { position: relative; }
        .xpbar__track {
          position: relative;
          height: var(--xp-h);
          border-radius: var(--xp-r);
          overflow: hidden;
          background: ${trackColor};
        }
        .xpbar--equipped .xpbar__track {
          background: var(--xp-track);
          border: 1px solid var(--xp-frame);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.5), 0 6px 14px rgba(15, 23, 42, 0.08);
        }
        .xpbar__aura {
          position: absolute;
          inset: -10px;
          border-radius: inherit;
          pointer-events: none;
          background: radial-gradient(circle at 24% 50%, color-mix(in srgb, var(--xp-a) 22%, transparent), transparent 48%),
            radial-gradient(circle at 80% 50%, color-mix(in srgb, var(--xp-b) 16%, transparent), transparent 52%);
          opacity: 0.55;
          filter: blur(10px);
          mix-blend-mode: screen;
          animation: xp-aura 4.8s ease-in-out infinite;
        }
        .xpbar__aura--2 {
          opacity: 0.35;
          filter: blur(14px);
          animation-duration: calc(6.6s / var(--xp-m, 1));
          animation-direction: reverse;
        }
        .xpbar__fill {
          position: relative;
          height: 100%;
          border-radius: var(--xp-r);
          transition: width 0.62s cubic-bezier(0.4, 0, 0.2, 1), filter 0.2s ease, box-shadow 0.2s ease;
        }
        .xpbar--legendary .xpbar__fill {
          background-size: 180% 100%;
          animation: xp-legend-gradient calc(3.8s / var(--xp-m, 1)) linear infinite;
        }
        .xpbar--epic .xpbar__fill {
          background-size: 160% 100%;
          animation: xp-epic-gradient calc(5.2s / var(--xp-m, 1)) ease-in-out infinite;
        }
        .xpbar__trackglow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 22% 50%, rgba(255,255,255,0.86) 0%, transparent 32%), radial-gradient(circle at 78% 50%, rgba(255,255,255,0.6) 0%, transparent 26%);
          opacity: 0.52;
          filter: blur(4px);
          animation: xp-track-glow calc(4.6s / var(--xp-m, 1)) ease-in-out infinite;
          pointer-events: none;
        }
        .xpbar__scanline {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
          animation: xp-shine calc(3.2s / var(--xp-shine, 1)) linear infinite;
        }
        .xpbar__edge {
          position: absolute;
          top: -10px;
          bottom: -10px;
          right: -12px;
          width: 22px;
          background: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.9), rgba(255,255,255,0.0) 68%);
          opacity: 0.65;
          filter: blur(6px);
          mix-blend-mode: screen;
          pointer-events: none;
          transform: translateX(0);
          animation: xp-edge 1.6s ease-in-out infinite;
        }
        .xpbar__fillspark {
          position: absolute;
          top: 50%;
          width: 5px;
          height: 5px;
          margin-top: -2.5px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--xp-c) 74%, white 26%);
          box-shadow: 0 0 10px color-mix(in srgb, var(--xp-a) 40%, transparent);
          animation: xp-spark-zoom calc(2.6s / var(--xp-spark, 1)) ease-out infinite;
        }
        .xpbar__fillspark--1 { animation-delay: 0s; }
        .xpbar__fillspark--2 { animation-delay: -0.6s; }
        .xpbar__fillspark--3 { animation-delay: -1.1s; }
        .xpbar__energy {
          position: absolute;
          width: 14px;
          height: 2px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--xp-b) 70%, white 30%);
          opacity: 0.54;
          animation: xp-energy-run calc(2.4s / var(--xp-m, 1)) linear infinite;
        }
        .xpbar__energy--1 { left: 14px; top: 2px; }
        .xpbar__energy--2 { left: 26px; bottom: 2px; animation-delay: -0.44s; }
        .xpbar__spark {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,255,255,0.96) 0%, var(--xp-c) 65%, transparent 100%);
          box-shadow: 0 0 10px color-mix(in srgb, var(--xp-a) 38%, transparent);
          animation: xp-spark-fly calc(2.1s / var(--xp-spark, 1)) ease-out infinite;
        }
        .xpbar__spark--1 { left: 12px; top: 1px; }
        .xpbar__spark--2 { left: 18px; bottom: 1px; animation-delay: -0.34s; }
        .xpbar__micro {
          position: absolute;
          width: 2px;
          height: 2px;
          border-radius: 999px;
          background: rgba(255,255,255,0.95);
          opacity: 0;
          box-shadow: 0 0 10px color-mix(in srgb, var(--xp-a) 30%, transparent);
          animation: xp-micro calc(1.9s / var(--xp-spark, 1)) ease-in-out infinite;
          pointer-events: none;
        }
        .xpbar__micro--1 { right: 18px; top: 1px; animation-delay: -0.2s; }
        .xpbar__micro--2 { right: 34px; bottom: 1px; animation-delay: -0.8s; }
        .xpbar__micro--3 { right: 48px; top: 2px; animation-delay: -1.4s; }
        @keyframes xp-shine {
          0% { transform: translateX(-120%); opacity: 0; }
          32% { opacity: 0.9; }
          100% { transform: translateX(160%); opacity: 0; }
        }
        @keyframes xp-edge {
          0%, 100% { opacity: 0.5; transform: translateX(0); }
          50% { opacity: 0.85; transform: translateX(1px); }
        }
        @keyframes xp-spark-zoom {
          0% { left: 8%; transform: scale(0.55); opacity: 0; }
          15% { opacity: 1; }
          40% { left: 82%; transform: scale(1.18); opacity: 0.95; }
          100% { left: 100%; transform: scale(0.6); opacity: 0; }
        }
        @keyframes xp-track-glow {
          0%, 100% { opacity: 0.42; transform: translateX(0); }
          50% { opacity: 0.72; transform: translateX(6px); }
        }
        @keyframes xp-energy-run {
          0% { transform: translateX(0) scaleX(0.7); opacity: 0.18; }
          50% { transform: translateX(18px) scaleX(1.18); opacity: 0.68; }
          100% { transform: translateX(0) scaleX(0.72); opacity: 0.16; }
        }
        @keyframes xp-spark-fly {
          0% { transform: translate3d(0, 0, 0) scale(0.7); opacity: 0.86; }
          55% { transform: translate3d(22px, -7px, 0) scale(0.9); opacity: 0.7; }
          100% { transform: translate3d(34px, -10px, 0) scale(0.5); opacity: 0; }
        }
        @keyframes xp-micro {
          0% { transform: translate3d(0, 0, 0) scale(0.8); opacity: 0; }
          22% { opacity: 0.9; }
          55% { transform: translate3d(-10px, -2px, 0) scale(1.25); opacity: 0.4; }
          100% { transform: translate3d(-18px, -4px, 0) scale(1.6); opacity: 0; }
        }
        @keyframes xp-aura {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.42; }
          50% { transform: translate3d(6px, -1px, 0) scale(1.04); opacity: 0.7; }
        }
        @keyframes xp-legend-gradient {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        @keyframes xp-epic-gradient {
          0%, 100% { background-position: 0% 50%; filter: brightness(1); }
          50% { background-position: 100% 50%; filter: brightness(1.08); }
        }
        @media (prefers-reduced-motion: reduce) {
          .xpbar__aura,
          .xpbar__scanline,
          .xpbar__fillspark,
          .xpbar__energy,
          .xpbar__spark,
          .xpbar__edge,
          .xpbar__micro,
          .xpbar--legendary .xpbar__fill,
          .xpbar--epic .xpbar__fill {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
