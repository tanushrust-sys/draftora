'use client';

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useEquippedCosmetics } from '@/app/context/EquippedCosmeticsContext';

function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp01(v: number) {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    // xorshift32
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function randomGlyphString(rng: () => number, length: number) {
  const glyphs = '01ABCDEF10';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += glyphs[Math.floor(rng() * glyphs.length)] ?? '0';
  }
  return out;
}

export default function EditorThemeOverlay({
  intensity = 1,
}: {
  intensity?: number;
}) {
  const cosmetics = useEquippedCosmetics();
  const item = cosmetics?.equippedItemsByCategory?.editor_themes ?? null;
  const rarity = item?.rarity ?? 'common';
  if (!item) return null;

  const key = `${item.name} ${String(item.metadata?.collection ?? '')} ${item.slug}`.toLowerCase();
  const variant =
    key.includes('hacker') || key.includes('matrix') || key.includes('nocturne')
      ? 'hacker'
      : key.includes('rose') || key.includes('neon') || key.includes('bloom') || key.includes('glow')
        ? 'neon'
        : key.includes('forest') || key.includes('cedar') || key.includes('moss') || key.includes('verdant')
          ? 'organic'
          : 'glass';

  const strength = clamp01(intensity) * ({
    common: 0.26,
    rare: 0.34,
    epic: 0.46,
    legendary: 0.6,
  }[rarity]);
  const motionScale = ({
    common: 1,
    rare: 1.06,
    epic: 1.18,
    legendary: 1.32,
  }[rarity]);

  const seed = hashString(key);
  const columns = useMemo(() => {
    const countByRarity = { common: 16, rare: 20, epic: 26, legendary: 34 } as const;
    const count = countByRarity[rarity] ?? 18;
    const rng = makeRng(seed ^ 0x9e3779b9);
    const cols = [];
    for (let i = 0; i < count; i += 1) {
      const left = rng() * 100;
      const durBase = 2.9 / motionScale;
      const dur = durBase + rng() * (rarity === 'legendary' ? (3.4 / motionScale) : (4.0 / motionScale));
      const delay = -(rng() * 4.0);
      const scale = 0.86 + rng() * 0.32;
      const op = 0.32 + rng() * 0.55;
      const width = 16 + Math.round(rng() * 12);
      const blur = rng() < 0.2 ? 1 : 0;
      const glyphCount = 60 + Math.floor(rng() * 50);
      const glyphs = randomGlyphString(rng, glyphCount);
      const flickerDur = 0.75 + rng() * 1.1;
      const flickerDelay = -(rng() * 1.8);
      const hue = Math.floor(rng() * 18) - 9; // small per-column hue variance
      cols.push({ left, dur, delay, scale, op, id: i, width, blur, glyphs, flickerDur, flickerDelay, hue });
    }
    return cols;
  }, [motionScale, rarity, seed]);

  const backColumns = useMemo(() => {
    if (variant !== 'hacker') return [];
    // A softer, blurrier parallax layer behind the main streams.
    return columns
      .filter((c) => c.id % 2 === 0)
      .map((c) => ({
        ...c,
        id: `b-${c.id}`,
        left: Math.max(0, Math.min(100, c.left + (c.id % 4 === 0 ? -1.6 : 1.3))),
        dur: c.dur * 1.42,
        delay: c.delay * 1.1,
        scale: c.scale * 0.92,
        op: c.op * 0.34,
        width: Math.round(c.width * 1.18),
        blur: 1,
        hue: (typeof c.hue === 'number' ? c.hue : 0) + 12,
      }));
  }, [columns, variant]);

  return (
    <div
      aria-hidden="true"
      className={`ed-ov ed-ov--${variant} ed-ov--${rarity}`}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: strength,
        mixBlendMode: variant === 'glass' ? 'overlay' : 'screen',
        filter: `saturate(${1.06 + (rarity === 'legendary' ? 0.22 : rarity === 'epic' ? 0.14 : rarity === 'rare' ? 0.08 : 0.0)}) contrast(1.06)`,
        WebkitMaskImage: 'radial-gradient(circle at 50% 58%, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.78) 52%, rgba(0,0,0,1) 100%)',
        maskImage: 'radial-gradient(circle at 50% 58%, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.78) 52%, rgba(0,0,0,1) 100%)',
        ['--ov-motion' as any]: String(motionScale),
      }}
    >
      <div className="ed-ov__vignette" />
      <div className="ed-ov__grain" />
      {(rarity === 'epic' || rarity === 'legendary') ? <div className="ed-ov__rim" /> : null}
      {rarity === 'legendary' ? <div className="ed-ov__crown-glint" /> : null}
      {(variant === 'hacker' && (rarity === 'epic' || rarity === 'legendary')) ? <div className="ed-ov__glitch-sweep" /> : null}
      {(variant === 'hacker' && rarity === 'legendary') ? <div className="ed-ov__glow-bloom" /> : null}

      {variant === 'hacker' && (
        <div className="ed-ov__rain">
          {backColumns.map((c) => (
            <div
              key={c.id}
              className="ed-ov__col ed-ov__col--back"
              style={{
                left: `${c.left}%`,
                opacity: c.op,
                width: c.width,
                filter: 'drop-shadow(0 0 18px rgba(16, 185, 129, 0.22)) blur(0.65px)',
              }}
            >
              <div
                className="ed-ov__stream ed-ov__stream--back"
                style={{
                  animationDuration: `${c.dur}s`,
                  animationDelay: `${c.delay}s`,
                  '--stream-scale': String(c.scale),
                  '--flicker-dur': `${c.flickerDur}s`,
                  '--flicker-delay': `${c.flickerDelay}s`,
                  '--col-hue': `${c.hue}deg`,
                } as CSSProperties}
              >
                <div className="ed-ov__digits ed-ov__digits--back">{c.glyphs}</div>
              </div>
            </div>
          ))}
          {columns.map((c) => (
            <div
              key={c.id}
              className="ed-ov__col"
              style={{
                left: `${c.left}%`,
                opacity: c.op,
                width: c.width,
                filter: `drop-shadow(0 0 14px rgba(16, 185, 129, 0.36)) ${c.blur ? 'blur(0.4px)' : ''}`.trim(),
              }}
            >
              <div
                className="ed-ov__stream"
                style={{
                  animationDuration: `${c.dur}s`,
                  animationDelay: `${c.delay}s`,
                  '--stream-scale': String(c.scale),
                  '--flicker-dur': `${c.flickerDur}s`,
                  '--flicker-delay': `${c.flickerDelay}s`,
                  '--col-hue': `${c.hue}deg`,
                } as CSSProperties}
              >
                <div className="ed-ov__digits">{c.glyphs}</div>
              </div>
            </div>
          ))}
          <div className="ed-ov__scan" />
          <div className="ed-ov__haze" />
          <div className="ed-ov__scanlines" />
          <div className="ed-ov__focus-clear" />
        </div>
      )}

      {variant === 'neon' && (
        <>
          <div className="ed-ov__scanlines" />
          <div className="ed-ov__neon-glow" />
          <div className="ed-ov__neon-comets" />
          <div className="ed-ov__neon-grid" />
        </>
      )}

      {variant === 'organic' && (
        <>
          <div className="ed-ov__organic-wash" />
          <div className="ed-ov__organic-dust" />
          <div className="ed-ov__organic-stems" />
        </>
      )}

      {variant === 'glass' && (
        <>
          <div className="ed-ov__glass-sheen" />
          <div className="ed-ov__glass-prism" />
          <div className="ed-ov__glass-split" />
        </>
      )}

      <style jsx>{`
        .ed-ov {
          border-radius: inherit;
          overflow: hidden;
          isolation: isolate;
        }

        .ed-ov__vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 40%, rgba(255,255,255,0.06), rgba(0,0,0,0.22) 70%);
          opacity: 0.5;
        }

        /* Keeps the typing zone clean while edges stay cinematic */
        .ed-ov__focus-clear {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 56%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.0) 58%, rgba(0,0,0,0.0) 100%);
          mix-blend-mode: multiply;
          opacity: 0.55;
          pointer-events: none;
        }

        .ed-ov__rim {
          position: absolute;
          inset: -18px;
          border-radius: inherit;
          background: conic-gradient(from 210deg, rgba(34,211,238,0.0), rgba(96,165,250,0.14), rgba(168,85,247,0.18), rgba(244,114,182,0.12), rgba(245,158,11,0.12), rgba(34,211,238,0.0));
          filter: blur(18px);
          opacity: 0.65;
          mix-blend-mode: screen;
          animation: ed-rim-spin 9.2s linear infinite;
          pointer-events: none;
        }

        .ed-ov__crown-glint {
          position: absolute;
          left: -30%;
          top: 18%;
          width: 160%;
          height: 40%;
          background: linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.12) 46%, transparent 74%);
          opacity: 0.6;
          filter: blur(10px);
          transform: translateX(-45%);
          animation: ed-glint 5.2s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes ed-rim-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes ed-glint {
          0% { transform: translateX(-45%); opacity: 0.15; }
          40% { opacity: 0.65; }
          100% { transform: translateX(45%); opacity: 0.15; }
        }

        .ed-ov__grain {
          position: absolute;
          inset: -30%;
          background-image:
            radial-gradient(circle, rgba(255,255,255,0.08) 0.9px, transparent 1px);
          background-size: 10px 10px;
          opacity: 0.12;
          transform: rotate(12deg) translate3d(0,0,0);
          animation: ed-grain-drift calc(9.5s / var(--ov-motion, 1)) ease-in-out infinite;
          will-change: transform;
        }

        @keyframes ed-grain-drift {
          0%, 100% { transform: rotate(12deg) translate3d(-1%, -1%, 0); }
          50% { transform: rotate(12deg) translate3d(1.2%, 0.8%, 0); }
        }

        /* ── Hacker (0/1 rain) ── */
        .ed-ov__rain {
          position: absolute;
          inset: 0;
          perspective: 700px;
          transform: translate3d(0,0,0);
          background:
            linear-gradient(180deg, rgba(0,0,0,0.0), rgba(0,0,0,0.12)),
            radial-gradient(circle at 30% 30%, rgba(16,185,129,0.14), transparent 55%),
            radial-gradient(circle at 70% 55%, rgba(34,197,94,0.1), transparent 60%);
        }

        .ed-ov__col {
          position: absolute;
          top: 0;
          height: 160%;
          will-change: transform;
        }

        .ed-ov__col--back {
          transform: translateZ(-120px) rotateX(8deg);
          transform-origin: 50% 40%;
          mix-blend-mode: screen;
        }

        .ed-ov__stream {
          position: absolute;
          inset: 0;
          transform: translateY(-120%) scale(var(--stream-scale, 1));
          transform-origin: 50% 0%;
          animation-name: ed-hacker-fall, ed-hacker-sway;
          animation-timing-function: linear, ease-in-out;
          animation-iteration-count: infinite, infinite;
          will-change: transform;
          filter: hue-rotate(var(--col-hue, 0deg));
        }

        .ed-ov__stream--back {
          animation-timing-function: linear, ease-in-out;
          opacity: 0.95;
        }

        /* Tail + head-glow makes it feel like actual "streams" instead of static letters */
        .ed-ov__stream::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 0;
          width: 70%;
          height: 100%;
          transform: translateX(-50%);
          background: linear-gradient(
            180deg,
            rgba(16,185,129,0.0) 0%,
            rgba(16,185,129,0.12) 16%,
            rgba(16,185,129,0.22) 42%,
            rgba(16,185,129,0.0) 100%
          );
          filter: blur(6px);
          opacity: 0.85;
          pointer-events: none;
          mix-blend-mode: screen;
        }

        .ed-ov__stream::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 18%;
          width: 10px;
          height: 10px;
          transform: translateX(-50%);
          border-radius: 999px;
          background: radial-gradient(circle, rgba(167,243,208,0.92), rgba(16,185,129,0.0) 68%);
          opacity: 0.85;
          filter: blur(0.3px);
          animation: ed-hacker-head 1.1s ease-in-out infinite;
          pointer-events: none;
          mix-blend-mode: screen;
        }

        .ed-ov__digits {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
          font-size: 11px;
          line-height: 1.15;
          letter-spacing: 0.12em;
          color: rgba(167, 243, 208, 0.82);
          text-shadow: 0 0 18px rgba(16, 185, 129, 0.24);
          writing-mode: vertical-rl;
          text-orientation: upright;
          user-select: none;
          -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.9) 18%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%);
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.9) 18%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%);
          animation: ed-hacker-flicker var(--flicker-dur, 1.3s) steps(2, end) infinite;
          animation-delay: var(--flicker-delay, 0s);
        }

        .ed-ov__digits--back {
          color: rgba(167, 243, 208, 0.55);
          text-shadow: 0 0 22px rgba(16, 185, 129, 0.18);
          font-size: 10px;
          letter-spacing: 0.14em;
          filter: blur(0.15px);
        }

        @keyframes ed-hacker-flicker {
          0%, 100% { opacity: 0.86; filter: blur(0px); }
          7% { opacity: 0.72; }
          9% { opacity: 0.92; }
          12% { opacity: 0.62; filter: blur(0.12px); }
          16% { opacity: 0.9; filter: blur(0px); }
          52% { opacity: 0.78; }
          56% { opacity: 0.95; }
        }

        .ed-ov__scan {
          position: absolute;
          left: -20%;
          top: 20%;
          width: 140%;
          height: 42%;
          background: linear-gradient(115deg, transparent 0%, rgba(167, 243, 208, 0.28) 46%, transparent 72%);
          opacity: 0.55;
          filter: blur(10px);
          transform: translateX(-40%);
          animation: ed-hacker-scan calc(4.4s / var(--ov-motion, 1)) ease-in-out infinite;
          mix-blend-mode: screen;
        }

        .ed-ov__scanlines {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            180deg,
            rgba(255,255,255,0.06) 0px,
            rgba(255,255,255,0.06) 1px,
            rgba(0,0,0,0.0) 3px,
            rgba(0,0,0,0.0) 7px
          );
          opacity: 0.18;
          mix-blend-mode: overlay;
          pointer-events: none;
        }

        .ed-ov__glitch-sweep {
          position: absolute;
          inset: -20%;
          background:
            linear-gradient(115deg, transparent 0%, rgba(167,243,208,0.14) 44%, transparent 72%),
            linear-gradient(25deg, transparent 0%, rgba(34,197,94,0.1) 46%, transparent 78%);
          filter: blur(10px);
          opacity: 0.0;
          transform: translateX(-45%);
          animation: ed-glitch 6.2s ease-in-out infinite;
          mix-blend-mode: screen;
          pointer-events: none;
        }

        @keyframes ed-glitch {
          0% { transform: translateX(-45%) translateY(0); opacity: 0.0; }
          12% { opacity: 0.0; }
          18% { opacity: 0.55; }
          22% { transform: translateX(-15%) translateY(-2px); opacity: 0.25; }
          36% { transform: translateX(35%) translateY(2px); opacity: 0.18; }
          48% { opacity: 0.0; }
          100% { transform: translateX(45%) translateY(0); opacity: 0.0; }
        }

        .ed-ov__glow-bloom {
          position: absolute;
          inset: -20%;
          background:
            radial-gradient(circle at 35% 30%, rgba(16,185,129,0.18), transparent 60%),
            radial-gradient(circle at 70% 55%, rgba(34,197,94,0.14), transparent 62%);
          filter: blur(22px);
          opacity: 0.75;
          animation: ed-bloom 5.6s ease-in-out infinite;
          mix-blend-mode: screen;
          pointer-events: none;
        }

        @keyframes ed-bloom {
          0%, 100% { transform: translate3d(-1%, -1%, 0) scale(1); opacity: 0.55; }
          50% { transform: translate3d(1.2%, 0.8%, 0) scale(1.05); opacity: 0.85; }
        }

        .ed-ov__haze {
          position: absolute;
          inset: -10%;
          background:
            radial-gradient(circle at 50% 35%, rgba(16,185,129,0.16), transparent 58%),
            radial-gradient(circle at 42% 70%, rgba(34,197,94,0.12), transparent 60%);
          filter: blur(18px);
          opacity: 0.55;
          animation: ed-hacker-haze calc(6.6s / var(--ov-motion, 1)) ease-in-out infinite;
          mix-blend-mode: screen;
        }

        @keyframes ed-hacker-haze {
          0%, 100% { transform: translate3d(-1%, -1%, 0) scale(1); opacity: 0.42; }
          50% { transform: translate3d(1.2%, 1%, 0) scale(1.05); opacity: 0.62; }
        }

        @keyframes ed-hacker-fall {
          0% { transform: translateY(-120%) scale(var(--stream-scale, 1)); }
          100% { transform: translateY(8%) scale(var(--stream-scale, 1)); }
        }

        @keyframes ed-hacker-sway {
          0%, 100% { translate: 0 0; }
          50% { translate: 0.6px -1px; }
        }

        @keyframes ed-hacker-head {
          0%, 100% { opacity: 0.55; transform: translateX(-50%) scale(0.95); }
          50% { opacity: 0.95; transform: translateX(-50%) scale(1.1); }
        }

        @keyframes ed-hacker-scan {
          0% { transform: translateX(-45%) translateY(-6%) rotate(-3deg); opacity: 0.2; }
          45% { opacity: 0.65; }
          100% { transform: translateX(45%) translateY(8%) rotate(2deg); opacity: 0.2; }
        }

        /* ── Neon ── */
        .ed-ov__scanlines {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            180deg,
            rgba(255,255,255,0.06) 0px,
            rgba(255,255,255,0.06) 1px,
            rgba(0,0,0,0.0) 3px,
            rgba(0,0,0,0.0) 6px
          );
          opacity: 0.38;
          mix-blend-mode: overlay;
        }

        .ed-ov__neon-glow {
          position: absolute;
          inset: -30%;
          background:
            radial-gradient(circle at 20% 25%, rgba(244,114,182,0.18), transparent 56%),
            radial-gradient(circle at 78% 40%, rgba(96,165,250,0.16), transparent 60%),
            radial-gradient(circle at 45% 78%, rgba(168,85,247,0.14), transparent 58%);
          filter: blur(10px);
          animation: ed-neon-breathe calc(4.2s / var(--ov-motion, 1)) ease-in-out infinite;
          mix-blend-mode: screen;
        }

        .ed-ov__neon-comets {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.12) 40%, transparent 72%),
            linear-gradient(135deg, transparent 0%, rgba(244,114,182,0.14) 44%, transparent 70%);
          opacity: 0.5;
          transform: translateX(-40%);
          animation: ed-neon-sweep calc(5.4s / var(--ov-motion, 1)) ease-in-out infinite;
          filter: blur(6px);
        }

        .ed-ov__neon-grid {
          position: absolute;
          inset: 0;
          opacity: 0.22;
          background-image:
            linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(180deg, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 28px 28px;
          transform: perspective(520px) rotateX(56deg) translateY(18%);
          transform-origin: 50% 0%;
          mix-blend-mode: overlay;
          animation: ed-neon-grid calc(6.2s / var(--ov-motion, 1)) ease-in-out infinite;
        }

        @keyframes ed-neon-grid {
          0%, 100% { opacity: 0.16; filter: blur(0px); }
          50% { opacity: 0.28; filter: blur(0.2px); }
        }

        @keyframes ed-neon-breathe {
          0%, 100% { transform: scale(1); opacity: 0.55; }
          50% { transform: scale(1.05); opacity: 0.75; }
        }

        @keyframes ed-neon-sweep {
          0% { transform: translateX(-40%); opacity: 0.18; }
          35% { opacity: 0.6; }
          100% { transform: translateX(40%); opacity: 0.18; }
        }

        /* ── Organic ── */
        .ed-ov__organic-wash {
          position: absolute;
          inset: -22%;
          background:
            radial-gradient(circle at 25% 35%, rgba(34,197,94,0.12), transparent 58%),
            radial-gradient(circle at 75% 50%, rgba(14,165,233,0.08), transparent 60%),
            radial-gradient(circle at 50% 80%, rgba(132,204,22,0.1), transparent 62%);
          filter: blur(12px);
          animation: ed-organic-drift calc(6.6s / var(--ov-motion, 1)) ease-in-out infinite;
          mix-blend-mode: screen;
        }

        .ed-ov__organic-dust {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 20% 30%, rgba(255,255,255,0.12) 0%, transparent 22%),
            radial-gradient(circle at 70% 40%, rgba(255,255,255,0.1) 0%, transparent 20%),
            radial-gradient(circle at 40% 75%, rgba(255,255,255,0.12) 0%, transparent 22%);
          opacity: 0.4;
          filter: blur(8px);
          animation: ed-organic-dust calc(4.8s / var(--ov-motion, 1)) ease-in-out infinite;
        }

        .ed-ov__organic-stems {
          position: absolute;
          inset: 0;
          opacity: 0.22;
          background:
            radial-gradient(circle at 14% 62%, rgba(255,255,255,0.12), transparent 32%),
            radial-gradient(circle at 86% 34%, rgba(255,255,255,0.12), transparent 28%),
            radial-gradient(circle at 42% 28%, rgba(255,255,255,0.1), transparent 26%),
            radial-gradient(circle at 62% 76%, rgba(255,255,255,0.1), transparent 28%);
          filter: blur(6px);
          mix-blend-mode: screen;
          animation: ed-organic-stems calc(7.2s / var(--ov-motion, 1)) ease-in-out infinite;
        }

        @keyframes ed-organic-stems {
          0%, 100% { transform: translate3d(0,0,0) scale(1); opacity: 0.18; }
          50% { transform: translate3d(0, -1.2%, 0) scale(1.04); opacity: 0.28; }
        }

        @keyframes ed-organic-drift {
          0%, 100% { transform: translate3d(-1%, -1%, 0) scale(1); }
          50% { transform: translate3d(1.5%, 1%, 0) scale(1.04); }
        }

        @keyframes ed-organic-dust {
          0%, 100% { transform: translate3d(0,0,0); opacity: 0.22; }
          50% { transform: translate3d(0, -1.5%, 0); opacity: 0.44; }
        }

        /* ── Glass ── */
        .ed-ov__glass-sheen {
          position: absolute;
          inset: -20%;
          background:
            radial-gradient(circle at 20% 20%, rgba(255,255,255,0.22), transparent 56%),
            radial-gradient(circle at 80% 60%, rgba(255,255,255,0.14), transparent 58%);
          filter: blur(10px);
          opacity: 0.55;
          mix-blend-mode: overlay;
        }

        .ed-ov__glass-prism {
          position: absolute;
          inset: -12%;
          background: conic-gradient(from 210deg, rgba(34,211,238,0.0), rgba(34,211,238,0.16), rgba(96,165,250,0.14), rgba(168,85,247,0.14), rgba(244,114,182,0.12), rgba(245,158,11,0.14), rgba(34,211,238,0.0));
          filter: blur(14px);
          opacity: 0.6;
          animation: ed-glass-rotate calc(7.2s / var(--ov-motion, 1)) linear infinite;
          mix-blend-mode: screen;
        }

        .ed-ov__glass-split {
          position: absolute;
          inset: 0;
          opacity: 0.22;
          background:
            linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.18) 42%, transparent 70%),
            linear-gradient(25deg, transparent 0%, rgba(34,211,238,0.10) 44%, transparent 76%);
          filter: blur(8px);
          transform: translateX(-45%);
          animation: ed-glass-split calc(5.6s / var(--ov-motion, 1)) ease-in-out infinite;
          mix-blend-mode: screen;
        }

        @keyframes ed-glass-split {
          0% { transform: translateX(-45%); opacity: 0.12; }
          40% { opacity: 0.28; }
          100% { transform: translateX(45%); opacity: 0.12; }
        }

        @keyframes ed-glass-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .ed-ov__rim,
          .ed-ov__crown-glint,
          .ed-ov__glitch-sweep,
          .ed-ov__glow-bloom,
          .ed-ov__grain,
          .ed-ov__col,
          .ed-ov__stream,
          .ed-ov__scan,
          .ed-ov__neon-glow,
          .ed-ov__neon-comets,
          .ed-ov__neon-grid,
          .ed-ov__organic-wash,
          .ed-ov__organic-dust,
          .ed-ov__organic-stems,
          .ed-ov__glass-split,
          .ed-ov__glass-prism {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
