'use client';

import type { CSSProperties } from 'react';
import { CATEGORY_LABELS, type CosmeticCategory, type CosmeticRarity } from '@/app/lib/rewards/catalog';

type CosmeticLivePreviewProps = {
  category: CosmeticCategory;
  rarity: CosmeticRarity;
  name: string;
  collection?: string;
  compact?: boolean;
  className?: string;
  showMeta?: boolean;
};

const CATEGORY_PALETTE: Record<CosmeticCategory, { a: string; b: string; c: string }> = {
  editor_themes: { a: '#2563eb', b: '#60a5fa', c: '#bfdbfe' },
  profile_frames: { a: '#0f766e', b: '#22d3ee', c: '#99f6e4' },
  badges: { a: '#7c3aed', b: '#c084fc', c: '#f5d0fe' },
  streak_effects: { a: '#f97316', b: '#fb923c', c: '#fde68a' },
  xp_visuals: { a: '#0f766e', b: '#34d399', c: '#86efac' },
  ui_custom: { a: '#4338ca', b: '#818cf8', c: '#c7d2fe' },
};

const RARITY_SPEED: Record<CosmeticRarity, string> = {
  common: '8.8s',
  rare: '7.2s',
  epic: '6s',
  legendary: '5s',
};

const CATEGORY_LABEL_SHORT: Record<CosmeticCategory, string> = {
  editor_themes: 'Editor Themes',
  profile_frames: 'Profile Accessories',
  badges: 'Badges',
  streak_effects: 'Fire Aura',
  xp_visuals: 'XP Visuals',
  ui_custom: 'UI Custom',
};

export default function CosmeticLivePreview({
  category,
  rarity,
  name,
  collection,
  compact = false,
  className = '',
  showMeta = true,
}: CosmeticLivePreviewProps) {
  const fallbackPalette = CATEGORY_PALETTE.xp_visuals;
  const palette = CATEGORY_PALETTE[category] ?? fallbackPalette;
  const itemSignature = `${category}:${rarity}:${name}:${collection ?? ''}`;
  let itemHash = 0;
  for (let i = 0; i < itemSignature.length; i += 1) {
    itemHash = (itemHash * 31 + itemSignature.charCodeAt(i)) >>> 0;
  }
  const itemShift = (itemHash % 7) - 3;
  const itemDelay = -((itemHash % 9) * 0.11);
  const itemSaturation = 1 + (itemHash % 6) * 0.03;
  const itemScale = 0.99 + (itemHash % 5) * 0.01;
  const editorKey = `${name} ${collection ?? ''}`.toLowerCase();
  const editorVariant =
    editorKey.includes('hacker') || editorKey.includes('midnight') || editorKey.includes('nocturne')
      ? 'hacker'
      : editorKey.includes('rose') || editorKey.includes('sunset') || editorKey.includes('bloom') || editorKey.includes('glow')
        ? 'neon'
        : editorKey.includes('forest') || editorKey.includes('cedar') || editorKey.includes('moss') || editorKey.includes('verdant')
          ? 'organic'
          : 'glass';
  const accessoryKey = `${name} ${collection ?? ''}`.toLowerCase();
  const accessoryVariant =
    accessoryKey.includes('crown') || accessoryKey.includes('zenith') || accessoryKey.includes('regalia')
      ? 'crown'
      : accessoryKey.includes('halo') || accessoryKey.includes('aurora')
        ? 'halo'
        : accessoryKey.includes('prism') || accessoryKey.includes('quartz')
          ? 'prism'
          : 'charm';
  const previewVars = {
    '--cp-a': palette.a,
    '--cp-b': palette.b,
    '--cp-c': palette.c,
    '--cp-speed': RARITY_SPEED[rarity],
    '--cp-item-shift': `${itemShift}px`,
    '--cp-item-delay': `${itemDelay.toFixed(2)}s`,
    '--cp-item-sat': itemSaturation.toFixed(2),
    '--cp-item-scale': itemScale.toFixed(2),
  } as CSSProperties;

  return (
    <div
      className={[
        'cos-prev',
        `cos-prev--${rarity}`,
        `cos-prev--${category}`,
        compact ? 'cos-prev--compact' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={previewVars}
    >
      <div className="cos-prev__ambient" aria-hidden="true" />
      <div className="cos-prev__common-spark" aria-hidden="true" />
      <div className="cos-prev__rarity-aurora" aria-hidden="true" />

      {category === 'editor_themes' && (
        <div className={`scene scene--editor scene--editor-${editorVariant}`} aria-hidden="true">
          <span className="editor-tier-glow" />
          <span className="editor-tier-comet editor-tier-comet--1" />
          <span className="editor-tier-comet editor-tier-comet--2" />
          <div className="editor-window">
            <div className="editor-window__top" />
            <div className="editor-window__line editor-window__line--1" />
            <div className="editor-window__line editor-window__line--2" />
            <div className="editor-window__line editor-window__line--3" />
            <span className="editor-window__cursor" />
          </div>
          <span className="editor-gradient-sweep" />
          <span className="editor-neon-chip editor-neon-chip--1" />
          <span className="editor-neon-chip editor-neon-chip--2" />
          <span className="editor-organic-leaf editor-organic-leaf--1" />
          <span className="editor-organic-leaf editor-organic-leaf--2" />
          <span className="editor-hacker-column editor-hacker-column--1" />
          <span className="editor-hacker-column editor-hacker-column--2" />
        </div>
      )}

      {category === 'profile_frames' && (
        <div className={`scene scene--frame scene--accessory-${accessoryVariant}`} aria-hidden="true">
          <span className="frame-avatar">A</span>
          <span className="frame-ring frame-ring--one" />
          <span className="frame-ring frame-ring--two" />
          <span className="frame-aura" />
          <span className="accessory-crown" />
          <span className="accessory-charm accessory-charm--left" />
          <span className="accessory-charm accessory-charm--right" />
          <span className="accessory-halo" />
        </div>
      )}

      {category === 'badges' && (
        <div className="scene scene--badge" aria-hidden="true">
          <span className="badge-core">*</span>
          <span className="badge-ring" />
          <span className="badge-shine" />
        </div>
      )}

      {category === 'streak_effects' && (
        <div className="scene scene--streak" aria-hidden="true">
          <span className="streak-aura" />
          <span className="streak-supernova" />
          <span className="streak-flame-stack">
            <span className="streak-flame-outer" />
            <span className="streak-flame-mid" />
            <span className="streak-flame-inner" />
            <span className="streak-flame-core" />
            <span className="streak-flame-flicker streak-flame-flicker--left" />
            <span className="streak-flame-flicker streak-flame-flicker--right" />
            <span className="streak-flame-glow" />
          </span>
          <span className="streak-spark streak-spark--1" />
          <span className="streak-spark streak-spark--2" />
          <span className="streak-spark streak-spark--3" />
          <span className="streak-ember streak-ember--1" />
          <span className="streak-ember streak-ember--2" />
          <span className="streak-ember streak-ember--3" />
          <span className="streak-comet streak-comet--1" />
          <span className="streak-comet streak-comet--2" />
        </div>
      )}

      {category === 'xp_visuals' && (
        <div className="scene scene--xp" aria-hidden="true">
          <span className="xp-label">+120</span>
          <div className="xp-track">
            <span className="xp-fill" />
            <span className="xp-track-glow" />
            <span className="xp-scanline" />
            <span className="xp-fill-spark xp-fill-spark--1" />
            <span className="xp-fill-spark xp-fill-spark--2" />
            <span className="xp-fill-spark xp-fill-spark--3" />
          </div>
          <span className="xp-orbit xp-orbit--1" />
          <span className="xp-orbit xp-orbit--2" />
          <span className="xp-energy xp-energy--1" />
          <span className="xp-energy xp-energy--2" />
          <span className="xp-energy xp-energy--3" />
          <span className="xp-spark xp-spark--1" />
          <span className="xp-spark xp-spark--2" />
        </div>
      )}

      {category === 'ui_custom' && (
        <div className="scene scene--ui" aria-hidden="true">
          <span className="ui-pill ui-pill--1" />
          <span className="ui-pill ui-pill--2" />
          <span className="ui-pill ui-pill--3" />
          <span className="ui-accent-dot" />
        </div>
      )}

      {showMeta ? (
        <div className="cos-prev__meta">
          <span>{CATEGORY_LABEL_SHORT[category] ?? CATEGORY_LABELS[category]}</span>
          <span>{collection ?? 'Live Preview'}</span>
        </div>
      ) : null}

      <style jsx>{`
        .cos-prev {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid color-mix(in srgb, var(--cp-a) 30%, transparent);
          background: linear-gradient(138deg, color-mix(in srgb, var(--cp-a) 28%, white 72%) 0%, color-mix(in srgb, var(--cp-b) 18%, white 82%) 44%, color-mix(in srgb, var(--cp-c) 22%, white 78%) 100%);
          min-height: 120px;
          padding: 0.66rem;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16), 0 24px 54px rgba(15, 23, 42, 0.12);
          isolation: isolate;
        }

        .cos-prev--compact {
          min-height: 88px;
          padding: 0.44rem;
          border-radius: 13px;
        }

        .cos-prev::before,
        .cos-prev::after {
          content: '';
          position: absolute;
          pointer-events: none;
        }

        .cos-prev::before {
          inset: 0;
          background: radial-gradient(circle at 18% 20%, rgba(255,255,255,0.32) 0, rgba(255,255,255,0) 44%), radial-gradient(circle at 82% 72%, rgba(255,255,255,0.22) 0, rgba(255,255,255,0) 50%);
          z-index: 0;
        }

        .cos-prev::after {
          inset: -1px;
          border-radius: inherit;
          opacity: 0.16;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.42) 46%, transparent 72%);
          transform: translateX(-140%);
          animation: preview-shine 5.4s ease-in-out infinite;
          z-index: 0;
        }

        .cos-prev__ambient,
        .cos-prev__common-spark,
        .cos-prev__rarity-aurora {
          position: absolute;
          pointer-events: none;
          z-index: 0;
        }

        .cos-prev__ambient {
          inset: 0;
          background: linear-gradient(120deg, color-mix(in srgb, var(--cp-a) 13%, transparent) 0%, transparent 45%, color-mix(in srgb, var(--cp-b) 18%, transparent) 100%);
          opacity: 0.62;
        }

        .cos-prev__common-spark {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          right: 14px;
          top: 14px;
          background: radial-gradient(circle, rgba(255,255,255,0.98) 0%, color-mix(in srgb, var(--cp-a) 78%, white 22%) 32%, transparent 100%);
          box-shadow: 0 0 24px color-mix(in srgb, var(--cp-a) 40%, transparent);
          opacity: 0.76;
          animation: common-spark 3.2s ease-in-out infinite;
          transform: scale(1);
        }

        .cos-prev__rarity-aurora {
          inset: -32% -12%;
          border-radius: 50%;
          background: conic-gradient(from 20deg, color-mix(in srgb, var(--cp-a) 28%, transparent), color-mix(in srgb, var(--cp-b) 24%, transparent), color-mix(in srgb, var(--cp-c) 22%, transparent), color-mix(in srgb, var(--cp-a) 28%, transparent));
          filter: blur(30px);
          opacity: 0.44;
          transform: rotate(0deg) scale(0.98);
          animation: aurora-spin 13s linear infinite, aurora-pulse 6.8s ease-in-out infinite;
        }

        .scene {
          position: relative;
          z-index: 1;
          width: 100%;
          min-height: 72px;
        }

        .cos-prev--compact .scene {
          min-height: 96px;
        }

        .cos-prev__meta {
          position: absolute;
          left: 10px;
          right: 10px;
          bottom: 7px;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-size: 9px;
          font-weight: 820;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(15, 23, 42, 0.72);
        }

        .scene--editor .editor-window {
          position: absolute;
          inset: 8px 10px 10px;
          border-radius: 11px;
          background: rgba(255,255,255,0.64);
          border: 1px solid rgba(255,255,255,0.76);
          overflow: hidden;
        }

        .editor-window__top {
          height: 10px;
          background: color-mix(in srgb, var(--cp-a) 34%, white 66%);
        }

        .editor-window__line {
          height: 6px;
          border-radius: 999px;
          margin-left: 9px;
          background: color-mix(in srgb, var(--cp-b) 26%, white 74%);
        }

        .editor-window__line--1 { width: 66%; margin-top: 10px; }
        .editor-window__line--2 { width: 54%; margin-top: 8px; }
        .editor-window__line--3 { width: 42%; margin-top: 8px; }

        .editor-window__cursor {
          position: absolute;
          right: 11px;
          bottom: 10px;
          width: 2px;
          height: 13px;
          border-radius: 2px;
          background: color-mix(in srgb, var(--cp-a) 70%, white 30%);
          animation: cursor-blink 1.1s steps(1, end) infinite;
        }

        .editor-gradient-sweep {
          position: absolute;
          top: 10px;
          left: -34px;
          width: 24px;
          height: calc(100% - 20px);
          transform: skewX(-18deg);
          background: rgba(255,255,255,0.54);
          animation: preview-shine calc(var(--cp-speed) * 0.95) ease-in-out infinite;
          opacity: 0.55;
        }

        .scene--frame .frame-avatar {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 28px;
          height: 28px;
          margin-left: -14px;
          margin-top: -14px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 900;
          color: #fff;
          background: linear-gradient(145deg, var(--cp-a), var(--cp-b));
          box-shadow: 0 6px 14px color-mix(in srgb, var(--cp-a) 24%, transparent);
        }

        .frame-ring {
          position: absolute;
          left: 50%;
          top: 50%;
          border-radius: 999px;
          border: 2px solid color-mix(in srgb, var(--cp-b) 58%, white 42%);
          animation: ring-spin calc(var(--cp-speed) * 0.78) linear infinite;
        }

        .frame-ring--one {
          width: 44px;
          height: 44px;
          margin-left: -22px;
          margin-top: -22px;
        }

        .frame-ring--two {
          width: 58px;
          height: 58px;
          margin-left: -29px;
          margin-top: -29px;
          opacity: 0.62;
          animation-direction: reverse;
        }

        .frame-aura {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 70px;
          height: 70px;
          margin-left: -35px;
          margin-top: -35px;
          border-radius: 999px;
          background: radial-gradient(circle, color-mix(in srgb, var(--cp-c) 22%, transparent) 0%, transparent 70%);
          animation: aura-breathe calc(var(--cp-speed) * 0.84) ease-in-out infinite;
        }

        .scene--badge .badge-core {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 38px;
          height: 38px;
          margin-left: -19px;
          margin-top: -19px;
          border-radius: 11px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #fff;
          background: linear-gradient(145deg, var(--cp-a), var(--cp-b));
          box-shadow: 0 8px 20px color-mix(in srgb, var(--cp-a) 26%, transparent);
        }

        .badge-ring {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 52px;
          height: 52px;
          margin-left: -26px;
          margin-top: -26px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.66);
          animation: badge-ring-pulse calc(var(--cp-speed) * 0.82) ease-in-out infinite;
        }

        .badge-shine {
          position: absolute;
          top: 8px;
          left: -36px;
          width: 24px;
          height: 80%;
          transform: skewX(-20deg);
          background: rgba(255,255,255,0.56);
          animation: preview-shine calc(var(--cp-speed) * 0.82) ease-in-out infinite;
        }

        .writing-caret {
          position: absolute;
          left: 14px;
          top: 39%;
          width: 2px;
          height: 15px;
          border-radius: 3px;
          background: color-mix(in srgb, var(--cp-a) 76%, white 24%);
          box-shadow: 0 0 10px color-mix(in srgb, var(--cp-a) 24%, transparent);
          animation: writing-caret-run calc(var(--cp-speed) * 0.6) linear infinite, cursor-blink 1s steps(1, end) infinite;
        }

        .writing-wave {
          position: absolute;
          left: 10px;
          right: 10px;
          top: 50%;
          height: 20px;
          margin-top: -10px;
          border-radius: 999px;
          background: radial-gradient(circle at 20% 50%, color-mix(in srgb, var(--cp-c) 22%, transparent) 0%, transparent 64%);
          filter: blur(5px);
          animation: writing-wave-flow calc(var(--cp-speed) * 0.72) linear infinite;
        }

        .writing-burst {
          position: absolute;
          left: 14px;
          top: 48%;
          width: 12px;
          height: 12px;
          margin-top: -6px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--cp-a) 62%, white 38%);
          animation: writing-burst-run calc(var(--cp-speed) * 0.6) ease-out infinite;
        }

        .writing-particle {
          position: absolute;
          left: 16px;
          top: 50%;
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--cp-b) 76%, white 24%);
          box-shadow: 0 0 8px color-mix(in srgb, var(--cp-a) 30%, transparent);
          animation: writing-particle-run calc(var(--cp-speed) * 0.6) ease-out infinite;
        }

        .writing-particle--1 { animation-delay: 0.1s; }
        .writing-particle--2 { animation-delay: 0.22s; }
        .writing-particle--3 { animation-delay: 0.34s; }

        .scene--streak {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          min-height: 132px;
          overflow: visible;
        }

        .scene--streak .streak-aura {
          position: absolute;
          left: 50%;
          top: 52%;
          width: 76px;
          height: 76px;
          margin-left: -38px;
          margin-top: -38px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(252, 211, 77, 0.18) 0%, rgba(249, 115, 22, 0.08) 28%, transparent 72%);
          filter: blur(16px);
          opacity: 0.78;
          animation: aura-pulse 1.6s ease-in-out infinite;
          z-index: 0;
        }

        .scene--streak .streak-flame-stack {
          position: relative;
          width: 88px;
          height: 128px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .scene--streak .streak-flame-outer,
        .scene--streak .streak-flame-mid,
        .scene--streak .streak-flame-inner,
        .scene--streak .streak-flame-core,
        .scene--streak .streak-flame-glow {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1;
        }

        .scene--streak .streak-flame-outer {
          bottom: 10px;
          width: 56px;
          height: 92px;
          clip-path: polygon(50% 0%, 62% 14%, 72% 32%, 76% 54%, 70% 72%, 58% 90%, 42% 90%, 30% 72%, 24% 54%, 28% 32%, 38% 14%);
          background: linear-gradient(180deg, rgba(255, 226, 141, 0.96), rgba(249, 115, 22, 0.82));
          box-shadow: 0 0 18px rgba(249, 115, 22, 0.24);
          animation: flame-flicker calc(var(--cp-speed) * 0.58) ease-in-out infinite alternate;
          z-index: 1;
        }

        .scene--streak .streak-flame-mid {
          bottom: 16px;
          width: 44px;
          height: 78px;
          clip-path: polygon(50% 0%, 58% 18%, 66% 36%, 68% 56%, 58% 74%, 50% 92%, 42% 74%, 32% 56%, 34% 36%, 42% 18%);
          background: linear-gradient(180deg, rgba(255, 130, 62, 0.96), rgba(245, 160, 14, 0.88));
          box-shadow: 0 0 14px rgba(249, 115, 22, 0.22);
          animation: flame-flicker calc(var(--cp-speed) * 0.66) ease-in-out infinite alternate;
          z-index: 2;
        }

        .scene--streak .streak-flame-inner {
          bottom: 24px;
          width: 30px;
          height: 58px;
          clip-path: polygon(50% 0%, 54% 18%, 60% 34%, 58% 54%, 50% 74%, 42% 54%, 40% 34%, 46% 18%);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(252, 211, 77, 0.94), rgba(249, 115, 22, 0.72));
          box-shadow: 0 0 12px rgba(255, 220, 148, 0.34);
          animation: flame-flicker calc(var(--cp-speed) * 0.8) ease-in-out infinite alternate;
          z-index: 3;
        }

        .scene--streak .streak-flame-core {
          bottom: 34px;
          width: 18px;
          height: 40px;
          clip-path: polygon(50% 0%, 54% 20%, 58% 38%, 56% 56%, 50% 70%, 44% 56%, 42% 38%, 46% 20%);
          background: radial-gradient(circle at 50% 28%, rgba(255, 255, 255, 1) 0%, rgba(255, 222, 150, 1) 24%, rgba(249, 115, 22, 0.84) 60%, transparent 100%);
          box-shadow: 0 0 22px rgba(255, 210, 105, 0.75);
          animation: flame-flicker calc(var(--cp-speed) * 1) ease-in-out infinite alternate;
          z-index: 4;
        }

        .scene--streak .streak-flame-glow {
          bottom: 8px;
          width: 94px;
          height: 110px;
          margin-left: -47px;
          background: radial-gradient(circle, rgba(252, 211, 77, 0.26), transparent 58%);
          filter: blur(16px);
          opacity: 0.78;
          z-index: 0;
          animation: aura-pulse calc(var(--cp-speed) * 0.72) ease-in-out infinite;
        }

        .scene--streak .streak-spark {
          position: absolute;
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,255,255,0.96) 0%, rgba(250, 204, 21, 0.92) 68%, transparent 100%);
          box-shadow: 0 0 12px rgba(250, 204, 21, 0.45);
          opacity: 0.92;
          animation: sparkle-pop calc(var(--cp-speed) * 0.54) ease-out infinite;
          z-index: 3;
        }

        .streak-spark--1 { left: calc(50% - 28px); top: 16%; animation-delay: 0s; }
        .streak-spark--2 { left: calc(50% + 6px); top: 10%; animation-delay: -0.18s; }
        .streak-spark--3 { left: calc(50% + 26px); top: 18%; animation-delay: -0.32s; }

        .scene--streak .streak-ember {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(250, 204, 21, 0.96) 100%);
          box-shadow: 0 0 12px rgba(251, 191, 36, 0.4);
          opacity: 0.78;
          animation: ember-float calc(var(--cp-speed) * 1.05) linear infinite;
          z-index: 3;
        }

        .streak-ember--1 { left: calc(50% - 22px); top: 54%; animation-delay: 0s; }
        .streak-ember--2 { left: calc(50% + 10px); top: 58%; animation-delay: -0.16s; }
        .streak-ember--3 { left: calc(50% - 4px); top: 64%; animation-delay: -0.32s; }

        .scene--xp .xp-label {
          position: absolute;
          top: 9px;
          right: 10px;
          font-size: 11px;
          font-weight: 900;
          color: rgba(15, 23, 42, 0.8);
          animation: xp-pop calc(var(--cp-speed) * 0.6) ease-in-out infinite;
        }

        .scene--xp .xp-track {
          position: absolute;
          left: 10px;
          right: 10px;
          top: 50%;
          height: 12px;
          margin-top: -6px;
          border-radius: 999px;
          background: rgba(255,255,255,0.68);
          border: 1px solid rgba(255,255,255,0.88);
          overflow: hidden;
        }

        .scene--xp .xp-track-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 22% 50%, rgba(255,255,255,0.9) 0%, transparent 32%), radial-gradient(circle at 78% 50%, rgba(255,255,255,0.6) 0%, transparent 26%);
          opacity: 0.5;
          filter: blur(4px);
          animation: xp-track-glow 4.6s ease-in-out infinite;
        }

        .scene--xp .xp-fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 18%;
          border-radius: 999px;
          background: linear-gradient(90deg, color-mix(in srgb, var(--cp-a) 86%, white 14%), color-mix(in srgb, var(--cp-b) 82%, white 18%));
          animation: xp-fill calc(var(--cp-speed) * 0.74) ease-in-out infinite;
        }

        .xp-fill-spark {
          position: absolute;
          top: 50%;
          width: 6px;
          height: 6px;
          margin-top: -3px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--cp-c) 74%, white 26%);
          box-shadow: 0 0 12px color-mix(in srgb, var(--cp-a) 40%, transparent);
          animation: xp-spark-zoom calc(var(--cp-speed) * 0.68) ease-out infinite;
        }

        .xp-fill-spark--1 { animation-delay: 0s; }
        .xp-fill-spark--2 { animation-delay: -0.52s; }
        .xp-fill-spark--3 { animation-delay: -1.04s; }

        .xp-spark {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,255,255,0.96) 0%, rgba(164, 230, 198, 0.9) 55%, transparent 100%);
          box-shadow: 0 0 16px rgba(110, 231, 183, 0.55);
          opacity: 0.85;
          filter: blur(0.4px);
          animation: xp-spark-fly calc(var(--cp-speed) * 0.5) ease-out infinite;
        }

        .xp-spark--1 { left: 16px; top: 38%; animation-delay: 0s; }
        .xp-spark--2 { left: 20px; top: 58%; animation-delay: -0.28s; }

        .xp-energy {
          position: absolute;
          width: 18px;
          height: 2px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--cp-b) 64%, white 36%);
          opacity: 0.52;
          animation: xp-energy-run calc(var(--cp-speed) * 0.66) linear infinite;
        }

        .xp-energy--1 { left: 16px; top: 24px; }
        .xp-energy--2 { left: 28px; top: 32px; animation-delay: -0.36s; }
        .xp-energy--3 { left: 22px; top: 40px; animation-delay: -0.62s; }

        .scene--ui .ui-pill {
          position: absolute;
          left: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.62);
          border: 1px solid rgba(255,255,255,0.76);
          animation: ui-pulse calc(var(--cp-speed) * 0.72) ease-in-out infinite;
        }

        .ui-pill--1 { width: 42px; top: 15px; }
        .ui-pill--2 { width: 58px; top: 33px; animation-delay: -0.42s; }
        .ui-pill--3 { width: 34px; top: 51px; animation-delay: -0.72s; }

        .ui-accent-dot {
          position: absolute;
          right: 14px;
          top: 25px;
          width: 24px;
          height: 24px;
          border-radius: 10px;
          background: linear-gradient(135deg, color-mix(in srgb, var(--cp-a) 68%, white 32%), color-mix(in srgb, var(--cp-b) 68%, white 32%));
          box-shadow: 0 8px 16px color-mix(in srgb, var(--cp-a) 24%, transparent);
          animation: ui-pop calc(var(--cp-speed) * 0.72) ease-in-out infinite;
        }

        .scene--title .title-crown {
          position: absolute;
          left: 50%;
          top: 7px;
          margin-left: -7px;
          font-size: 14px;
          font-weight: 900;
          color: rgba(15, 23, 42, 0.72);
          animation: crown-float calc(var(--cp-speed) * 0.78) ease-in-out infinite;
        }

        .scene--title .title-name {
          position: absolute;
          left: 10px;
          right: 10px;
          top: 32px;
          text-align: center;
          font-size: 13px;
          font-weight: 900;
          color: rgba(15, 23, 42, 0.88);
          letter-spacing: 0.02em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-shadow: 0 0 12px color-mix(in srgb, var(--cp-c) 26%, transparent);
        }

        .scene--title .title-glow {
          position: absolute;
          left: 50%;
          top: 38px;
          width: 110px;
          height: 18px;
          margin-left: -55px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--cp-c) 30%, transparent);
          filter: blur(6px);
          opacity: 0.56;
        }

        .scene--title .title-shine {
          position: absolute;
          top: 24px;
          left: -34px;
          width: 24px;
          height: 30px;
          transform: skewX(-20deg);
          background: rgba(255,255,255,0.52);
          animation: preview-shine calc(var(--cp-speed) * 0.74) ease-in-out infinite;
        }

        .cos-prev--common {
          border-color: rgba(251, 146, 60, 0.28);
          box-shadow: inset 0 0 0 1px rgba(251, 146, 60, 0.12), 0 18px 40px rgba(248, 113, 43, 0.12);
        }

        .cos-prev--common .cos-prev__common-spark {
          width: 12px;
          height: 12px;
          box-shadow: 0 0 14px rgba(251, 146, 60, 0.35);
          background: radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(251, 146, 60, 0.7) 36%, transparent 100%);
          animation-duration: 3.4s;
        }

        .cos-prev--common .cos-prev__rarity-aurora {
          opacity: 0.32;
          filter: blur(12px);
        }

        .cos-prev--common .scene--streak .streak-aura {
          opacity: 0.68;
          background: radial-gradient(circle, rgba(252, 211, 77, 0.14) 0%, rgba(249, 115, 22, 0.06) 30%, transparent 70%);
        }

        .cos-prev--common .scene--streak .streak-flame-outer {
          width: 48px;
          height: 82px;
          background: linear-gradient(180deg, rgba(255, 172, 62, 0.94), rgba(249, 115, 22, 0.78));
        }

        .cos-prev--common .scene--streak .streak-spark {
          opacity: 0.65;
          animation-duration: calc(var(--cp-speed) * 1.2);
        }

        .cos-prev--rare {
          border-color: rgba(251, 191, 36, 0.42);
          box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.12), 0 20px 42px rgba(249, 115, 22, 0.18);
          animation: rare-hover 6.8s ease-in-out infinite;
        }

        .cos-prev--rare .cos-prev__common-spark {
          box-shadow: 0 0 18px rgba(251, 191, 36, 0.42);
          background: radial-gradient(circle, rgba(255,255,255,0.96) 0%, rgba(251,211,56,0.78) 40%, transparent 100%);
          animation-duration: 2.8s;
        }

        .cos-prev--rare .cos-prev__rarity-aurora {
          opacity: 0.54;
          filter: blur(18px);
        }

        .cos-prev--rare .scene--streak .streak-aura {
          width: 84px;
          height: 84px;
          margin-left: -42px;
          margin-top: -42px;
          background: radial-gradient(circle, rgba(251, 211, 74, 0.22) 0%, rgba(249, 115, 22, 0.12) 30%, transparent 65%);
        }

        .cos-prev--rare .scene--streak .streak-flame-outer {
          background: linear-gradient(180deg, rgba(255, 192, 80, 0.96), rgba(249, 115, 22, 0.82));
          box-shadow: 0 0 22px rgba(249, 115, 22, 0.28);
        }

        .cos-prev--rare .scene--streak .streak-spark {
          opacity: 0.85;
          animation-duration: calc(var(--cp-speed) * 0.9);
        }

        .cos-prev--rare .scene--streak .streak-ember {
          animation-duration: calc(var(--cp-speed) * 0.88);
        }

        .cos-prev--epic {
          border-color: rgba(249, 115, 22, 0.58);
          box-shadow: inset 0 0 0 1px rgba(249, 115, 22, 0.16), 0 22px 46px rgba(245, 158, 11, 0.2);
          animation: epic-border-pulse calc(var(--cp-speed) * 0.92) ease-in-out infinite;
        }

        .cos-prev--epic .cos-prev__common-spark {
          box-shadow: 0 0 22px rgba(251, 191, 36, 0.5);
          background: radial-gradient(circle, rgba(255,255,255,0.96) 0%, rgba(252,211,77,0.8) 38%, transparent 100%);
          animation-duration: 2.5s;
        }

        .cos-prev--epic .cos-prev__rarity-aurora {
          opacity: 0.64;
          filter: blur(26px);
        }

        .cos-prev--epic .scene--streak .streak-aura {
          background: radial-gradient(circle, rgba(240, 147, 255, 0.18) 0%, rgba(249, 115, 22, 0.12) 30%, transparent 66%);
          filter: blur(18px);
        }

        .cos-prev--epic .scene--streak .streak-flame-outer {
          background: linear-gradient(180deg, rgba(251, 147, 76, 0.92), rgba(192, 132, 252, 0.84));
          box-shadow: 0 0 24px rgba(192, 132, 252, 0.26);
        }

        .cos-prev--epic .scene--streak .streak-flame-mid {
          background: linear-gradient(180deg, rgba(255, 220, 155, 0.94), rgba(245, 158, 11, 0.86));
        }

        .cos-prev--epic .scene--streak .streak-spark {
          background: radial-gradient(circle, rgba(255,255,255,0.96) 0%, rgba(192, 132, 252, 0.9) 72%, transparent 100%);
          box-shadow: 0 0 14px rgba(192, 132, 252, 0.4);
        }

        .cos-prev--epic .scene--streak .streak-ember {
          background: linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(240, 147, 255, 0.92) 100%);
          box-shadow: 0 0 12px rgba(192, 132, 252, 0.38);
        }

        .cos-prev--legendary {
          border-color: rgba(244, 114, 182, 0.78);
          box-shadow: inset 0 0 0 1px rgba(244, 114, 182, 0.18), 0 28px 62px rgba(251, 146, 60, 0.26);
          background: linear-gradient(138deg, color-mix(in srgb, var(--cp-a) 42%, #fff7ed 58%) 0%, color-mix(in srgb, var(--cp-b) 32%, #fff7ed 72%) 52%, color-mix(in srgb, var(--cp-c) 38%, #fff7ed 78%) 100%);
        }

        .cos-prev--legendary .cos-prev__common-spark {
          box-shadow: 0 0 28px rgba(251, 191, 36, 0.52);
          background: radial-gradient(circle, rgba(255,255,255,0.96) 0%, rgba(251,211,77,0.82) 38%, transparent 100%);
          animation-duration: 2.1s;
        }

        .cos-prev--legendary .cos-prev__rarity-aurora {
          opacity: 0.85;
          filter: blur(34px);
        }

        .cos-prev--legendary .scene--streak .streak-aura {
          width: 96px;
          height: 96px;
          margin-left: -48px;
          margin-top: -44px;
          background: radial-gradient(circle, rgba(255, 219, 93, 0.2) 0%, rgba(236, 72, 238, 0.16) 24%, rgba(59, 130, 246, 0.12) 48%, transparent 72%);
          filter: blur(18px);
          animation: legendary-aura 2.4s linear infinite;
          opacity: 0.92;
        }

        .cos-prev--legendary .scene--streak .streak-flame-outer {
          background: linear-gradient(180deg, rgba(251, 147, 76, 0.9), rgba(59, 130, 246, 0.78));
          box-shadow: 0 0 28px rgba(255, 211, 102, 0.4);
        }

        .cos-prev--legendary .scene--streak .streak-flame-mid {
          background: linear-gradient(180deg, rgba(249, 115, 22, 0.9), rgba(192, 132, 252, 0.82));
        }

        .cos-prev--legendary .scene--streak .streak-flame-inner {
          background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(252, 211, 77, 0.92), rgba(167, 139, 250, 0.7));
        }

        .cos-prev--legendary .scene--streak .streak-spark {
          background: radial-gradient(circle, rgba(255,255,255,0.96) 0%, rgba(255, 221, 112, 0.94) 42%, rgba(168, 85, 247, 0.9) 78%, transparent 100%);
          box-shadow: 0 0 18px rgba(255, 206, 84, 0.55);
          animation-duration: calc(var(--cp-speed) * 0.7);
        }

        .cos-prev--legendary .scene--streak .streak-ember {
          background: linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(251, 146, 60, 0.9) 45%, rgba(168, 85, 247, 0.86) 100%);
          box-shadow: 0 0 14px rgba(168, 85, 247, 0.34);
        }

        .cos-prev.shop-rarity-preview--common {
          box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.2);
        }

        .cos-prev.shop-rarity-preview--rare {
          box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0.24);
        }

        .cos-prev.shop-rarity-preview--epic {
          box-shadow: inset 0 0 0 1px rgba(192, 132, 252, 0.28);
        }

        .cos-prev.shop-rarity-preview--legendary {
          box-shadow: inset 0 0 0 1px rgba(251, 146, 60, 0.34);
        }

        .cos-prev.shop-preview--streak .scene--streak .streak-tail {
          filter: blur(6px);
          opacity: 0.84;
        }

        .cos-prev.shop-preview--streak .scene--streak .streak-ash {
          width: 6px;
          height: 6px;
          opacity: 0.86;
        }

        .scene--editor .editor-tier-glow {
          position: absolute;
          inset: 12% 6%;
          border-radius: 12px;
          background: radial-gradient(circle at 18% 30%, color-mix(in srgb, var(--cp-c) 34%, transparent), transparent 60%);
          filter: blur(14px);
          opacity: 0.54;
        }

        .scene--editor .editor-tier-comet {
          position: absolute;
          width: 24px;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, color-mix(in srgb, var(--cp-c) 80%, white 20%), transparent);
          animation: streak-lane-pulse calc(var(--cp-speed) * 0.6) ease-in-out infinite;
        }

        .editor-tier-comet--1 { right: 10px; top: 12px; }
        .editor-tier-comet--2 { left: 10px; bottom: 12px; animation-delay: -0.3s; }

        .scene--editor-neon .editor-window { box-shadow: 0 0 22px color-mix(in srgb, var(--cp-a) 30%, transparent); }
        .scene--editor-hacker .editor-window { background: linear-gradient(145deg, rgba(222, 255, 235, 0.72), rgba(255,255,255,0.58)); }
        .scene--editor-organic .editor-window { background: linear-gradient(145deg, rgba(236, 255, 235, 0.76), rgba(255,255,255,0.66)); }

        .editor-neon-chip,
        .editor-organic-leaf,
        .editor-hacker-column { opacity: 0; }

        .scene--editor-neon .editor-neon-chip {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 4px;
          background: color-mix(in srgb, var(--cp-b) 70%, white 30%);
          opacity: 0.9;
          animation: common-spark calc(var(--cp-speed) * 0.7) ease-in-out infinite;
        }

        .editor-neon-chip--1 { right: 16px; top: 16px; }
        .editor-neon-chip--2 { left: 16px; bottom: 16px; animation-delay: -0.24s; }

        .scene--editor-organic .editor-organic-leaf {
          position: absolute;
          width: 12px;
          height: 7px;
          border-radius: 999px 999px 999px 0;
          background: color-mix(in srgb, var(--cp-a) 52%, white 48%);
          opacity: 0.78;
          animation: flame-plume-wave calc(var(--cp-speed) * 0.72) ease-in-out infinite;
        }

        .editor-organic-leaf--1 { left: 14px; top: 18px; transform: rotate(-25deg); }
        .editor-organic-leaf--2 { right: 14px; bottom: 18px; transform: rotate(30deg); animation-delay: -0.32s; }

        .scene--editor-hacker .editor-hacker-column {
          position: absolute;
          top: 14px;
          bottom: 14px;
          width: 2px;
          border-radius: 999px;
          background: linear-gradient(180deg, color-mix(in srgb, var(--cp-a) 75%, white 25%), transparent);
          opacity: 0.62;
          animation: aurora-pulse calc(var(--cp-speed) * 0.62) ease-in-out infinite;
        }

        .editor-hacker-column--1 { left: 14px; }
        .editor-hacker-column--2 { right: 14px; animation-delay: -0.26s; }

        .accessory-crown {
          position: absolute;
          left: 50%;
          top: 14px;
          width: 24px;
          height: 11px;
          margin-left: -12px;
          border-radius: 3px 3px 8px 8px;
          background: linear-gradient(180deg, #fde68a, #f59e0b);
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
          opacity: 0;
        }

        .scene--accessory-crown .accessory-crown,
        .scene--accessory-prism .accessory-crown { opacity: 0.95; }

        .accessory-charm {
          position: absolute;
          top: 50%;
          width: 8px;
          height: 8px;
          margin-top: -4px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--cp-c) 72%, white 28%);
          box-shadow: 0 0 8px color-mix(in srgb, var(--cp-b) 42%, transparent);
          opacity: 0;
        }

        .accessory-charm--left { left: 18px; }
        .accessory-charm--right { right: 18px; }

        .scene--accessory-charm .accessory-charm,
        .scene--accessory-prism .accessory-charm {
          opacity: 0.85;
          animation: common-spark calc(var(--cp-speed) * 0.8) ease-in-out infinite;
        }

        .accessory-halo {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 74px;
          height: 74px;
          margin-left: -37px;
          margin-top: -37px;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--cp-c) 52%, white 48%);
          opacity: 0;
        }

        .scene--accessory-halo .accessory-halo,
        .scene--accessory-prism .accessory-halo {
          opacity: 0.78;
          animation: ring-spin calc(var(--cp-speed) * 1.2) linear infinite;
        }

        .scene--streak .streak-supernova {
          position: absolute;
          left: 50%;
          top: 58%;
          width: 132px;
          height: 72px;
          margin-left: -66px;
          margin-top: -36px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(254, 240, 138, 0.28), rgba(251, 113, 36, 0.14), transparent 72%);
          filter: blur(14px);
          opacity: 0.44;
          animation: supernova-pulse calc(var(--cp-speed) * 0.72) ease-in-out infinite;
        }

        .scene--streak .streak-flame-flicker {
          position: absolute;
          width: 16px;
          height: 24px;
          bottom: 86px;
          border-radius: 16px 16px 6px 6px;
          background: linear-gradient(180deg, rgba(254, 240, 138, 0.96), rgba(251, 146, 60, 0.82), rgba(239, 68, 68, 0.74));
          animation: flame-flicker calc(var(--cp-speed) * 0.36) ease-in-out infinite;
          opacity: 0.9;
        }

        .scene--streak .streak-flame-flicker--left { left: 50%; margin-left: -24px; transform: rotate(-18deg); }
        .scene--streak .streak-flame-flicker--right { left: 50%; margin-left: 8px; transform: rotate(18deg); animation-delay: -0.18s; }

        .scene--streak .streak-comet {
          position: absolute;
          width: 36px;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(254, 240, 138, 0.86), transparent);
          opacity: 0.72;
          animation: streak-lane-pulse calc(var(--cp-speed) * 0.5) ease-in-out infinite;
        }

        .streak-comet--1 { top: 30px; right: 8px; transform: rotate(-14deg); }
        .streak-comet--2 { top: 54px; left: 8px; transform: rotate(16deg); animation-delay: -0.24s; }

        .scene--xp .xp-scanline {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
          animation: preview-shine calc(var(--cp-speed) * 0.56) linear infinite;
          opacity: 0.66;
        }

        .scene--xp .xp-orbit {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,255,255,0.95), color-mix(in srgb, var(--cp-b) 78%, white 22%), transparent 86%);
          box-shadow: 0 0 10px color-mix(in srgb, var(--cp-a) 36%, transparent);
          animation: common-spark calc(var(--cp-speed) * 0.54) ease-in-out infinite;
        }

        .xp-orbit--1 { right: 18px; top: 20px; }
        .xp-orbit--2 { left: 18px; bottom: 18px; animation-delay: -0.28s; }

        @keyframes cursor-blink {
          0%, 48% { opacity: 1; }
          49%, 100% { opacity: 0; }
        }

        @keyframes preview-shine {
          0%, 18% { transform: translateX(0) skewX(-20deg); opacity: 0; }
          42% { opacity: 0.95; }
          74%, 100% { transform: translateX(168px) skewX(-20deg); opacity: 0; }
        }

        @keyframes common-spark {
          0% { transform: translate(0, 0) scale(0.88); opacity: 0.58; }
          25% { transform: translate(-1px, 1px) scale(1.04); opacity: 0.78; }
          50% { transform: translate(2px, -2px) scale(1.18); opacity: 0.98; }
          75% { transform: translate(-1px, 0px) scale(1.04); opacity: 0.8; }
          100% { transform: translate(0, 0) scale(0.88); opacity: 0.58; }
        }

        @keyframes aurora-spin {
          0% { transform: rotate(0deg) scale(0.98); }
          50% { transform: rotate(180deg) scale(1.02); }
          100% { transform: rotate(360deg) scale(0.98); }
        }

        @keyframes aurora-pulse {
          0%, 100% { opacity: 0.42; }
          50% { opacity: 0.68; }
        }

        @keyframes rare-hover {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -1.5px, 0); }
        }

        @keyframes ring-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes aura-breathe {
          0%, 100% { transform: scale(0.9); opacity: 0.4; }
          50% { transform: scale(1.12); opacity: 0.86; }
        }

        @keyframes badge-ring-pulse {
          0%, 100% { transform: scale(0.9); opacity: 0.42; }
          50% { transform: scale(1.1); opacity: 0.9; }
        }

        @keyframes writing-bg-drift {
          0%, 100% { transform: translateX(0); opacity: 0.56; }
          50% { transform: translateX(6px); opacity: 0.82; }
        }

        @keyframes writing-line-breathe {
          0%, 100% { transform: scaleX(0.8); opacity: 0.42; }
          50% { transform: scaleX(1); opacity: 0.74; }
        }

        @keyframes writing-stroke-run {
          0% { width: 18%; opacity: 0.42; }
          42% { width: 62%; opacity: 1; }
          100% { width: 30%; opacity: 0.52; }
        }

        @keyframes writing-caret-run {
          0% { left: 14px; }
          70% { left: calc(100% - 22px); }
          100% { left: 34%; }
        }

        @keyframes writing-wave-flow {
          0% { transform: translateX(-8px); opacity: 0.18; }
          55% { transform: translateX(12px); opacity: 0.52; }
          100% { transform: translateX(-8px); opacity: 0.2; }
        }

        @keyframes writing-burst-run {
          0% { left: 14px; transform: scale(0.45); opacity: 0.8; }
          55% { left: calc(100% - 32px); transform: scale(1.3); opacity: 1; }
          100% { left: 34%; transform: scale(0.6); opacity: 0; }
        }

        @keyframes writing-particle-run {
          0% { transform: translate3d(0, 0, 0) scale(0.7); opacity: 0; }
          18% { opacity: 1; }
          65% { transform: translate3d(56px, -12px, 0) scale(1); opacity: 0.85; }
          100% { transform: translate3d(88px, -20px, 0) scale(0.45); opacity: 0; }
        }

        @keyframes streak-head-run {
          0% { transform: translate(-50%, -50%) scaleX(0.96) rotate(-1deg); }
          25% { transform: translate(-50%, -52%) scaleX(1.02) rotate(1deg); }
          50% { transform: translate(-50%, -48%) scaleX(0.98) rotate(-0.5deg); }
          75% { transform: translate(-50%, -51%) scaleX(1.04) rotate(0.5deg); }
          100% { transform: translate(-50%, -50%) scaleX(0.96) rotate(-1deg); }
        }

        @keyframes streak-tail-run {
          0% { opacity: 0.6; }
          50% { opacity: 0.18; }
          100% { opacity: 0.6; }
        }

        @keyframes streak-lane-pulse {
          0%, 100% { opacity: 0.36; transform: scaleX(0.92); }
          50% { opacity: 0.82; transform: scaleX(1.05); }
        }

        @keyframes flame-flicker {
          0% { transform: scale(0.86) translateY(0); opacity: 0.82; }
          25% { transform: scale(1.1) translateY(-1px); opacity: 1; }
          60% { transform: scale(0.92) translateY(1px); opacity: 0.9; }
          100% { transform: scale(0.86) translateY(0); opacity: 0.82; }
        }

        @keyframes flame-plume-wave {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.9; }
          50% { transform: translateY(-2px) scale(1.08); opacity: 0.95; }
        }

        @keyframes flicker-tip {
          0% { transform: translateY(0) scale(1); opacity: 0.9; }
          25% { transform: translateY(-1px) scale(1.05); opacity: 1; }
          50% { transform: translateY(-2px) scale(0.95); opacity: 0.88; }
          100% { transform: translateY(0) scale(1); opacity: 0.92; }
        }

        @keyframes glow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.68; }
          50% { transform: scale(1.08); opacity: 0.82; }
        }

@keyframes streak-spark-fly {
  0% {
    transform: translate3d(0, 0, 0) scale(0.7);
    opacity: 1;
  }

  20% {
    transform: translate3d(8px, -6px, 0) scale(1.2);
  }

  50% {
    transform: translate3d(22px, -20px, 0) scale(0.9);
    opacity: 0.9;
  }

  80% {
    transform: translate3d(40px, -36px, 0) scale(0.5);
    opacity: 0.5;
  }

  100% {
    transform: translate3d(60px, -50px, 0) scale(0.2);
    opacity: 0;
  }
}
        }

        @keyframes streak-ember-run {
          0% { transform: translate3d(0, 0, 0) scale(0.65); opacity: 0; }
          20% { opacity: 1; }
          48% { transform: translate3d(18px, -10px, 0) scale(1); opacity: 0.88; }
          100% { transform: translate3d(34px, -22px, 0) scale(0.35); opacity: 0; }
        }

        @keyframes ash-rise {
          0% { transform: translate3d(0, 0, 0) scale(0.85); opacity: 0; }
          20% { opacity: 0.92; }
          100% { transform: translate3d(-18px, -28px, 0) scale(0.26) rotate(26deg); opacity: 0; }
        }

        @keyframes xp-fill {
          0% { width: 14%; }
          30% { width: 92%; }
          55% { width: 68%; }
          100% { width: 20%; }
        }

        @keyframes xp-spark-zoom {
          0% { left: 12%; transform: scale(0.55); opacity: 0; }
          15% { opacity: 1; }
          40% { left: 82%; transform: scale(1.18); opacity: 0.95; }
          60% { left: 90%; transform: scale(0.95); opacity: 0.7; }
          100% { left: 100%; transform: scale(0.6); opacity: 0; }
        }

        @keyframes xp-spark-fly {
          0% { transform: translate3d(0, 0, 0) scale(0.7); opacity: 0.86; }
          25% { transform: translate3d(8px, -8px, 0) scale(1); opacity: 1; }
          55% { transform: translate3d(24px, -20px, 0) scale(0.9); opacity: 0.7; }
          100% { transform: translate3d(42px, -34px, 0) scale(0.5); opacity: 0; }
        }

        @keyframes xp-track-glow {
          0%, 100% { opacity: 0.4; transform: translateX(0); }
          50% { opacity: 0.72; transform: translateX(6px); }
        }

        @keyframes xp-energy-run {
          0% { transform: translateX(0) scaleX(0.7); opacity: 0.18; }
          50% { transform: translateX(26px) scaleX(1.18); opacity: 0.68; }
          100% { transform: translateX(0) scaleX(0.72); opacity: 0.16; }
        }

        @keyframes xp-pop {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(-3px); opacity: 1; }
        }

        @keyframes ui-pulse {
          0%, 100% { transform: scaleX(1); opacity: 0.72; }
          50% { transform: scaleX(1.08); opacity: 1; }
        }

        @keyframes ui-pop {
          0%, 100% { transform: scale(0.9); }
          50% { transform: scale(1.1); }
        }

        @keyframes crown-float {
          0%, 100% { transform: translateY(0); opacity: 0.72; }
          50% { transform: translateY(-3px); opacity: 1; }
        }

        @keyframes rare-float {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -2px, 0); }
        }

        @keyframes epic-border-pulse {
          0%, 100% { box-shadow: 0 14px 28px rgba(147, 51, 234, 0.18), inset 0 0 0 1px rgba(255,255,255,0.48); }
          50% { box-shadow: 0 18px 32px rgba(236, 72, 153, 0.26), inset 0 0 0 1px rgba(255,255,255,0.56); }
        }

        @keyframes epic-particles {
          0% { transform: translateY(0); opacity: 0.45; }
          50% { transform: translateY(-3px); opacity: 0.8; }
          100% { transform: translateY(0); opacity: 0.45; }
        }

        @keyframes legendary-aura {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes sparkle-pop {
          0% { transform: scale(0.7); opacity: 0; }
          30% { transform: scale(1.1); opacity: 1; }
          60% { transform: scale(0.85); opacity: 0.8; }
          100% { transform: scale(0.65); opacity: 0; }
        }

        @keyframes ember-float {
          0% { transform: translateY(0) scale(0.9); opacity: 0.7; }
          40% { transform: translateY(-6px) scale(1); opacity: 0.95; }
          100% { transform: translateY(-14px) scale(0.7); opacity: 0; }
        }

        @keyframes rainbow-shift {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .cos-prev,
          .cos-prev *,
          .cos-prev::before,
          .cos-prev::after {
            animation: none !important;
            transition: none !important;
            transform: none !important;
          }

          .cos-prev__common-spark {
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}
