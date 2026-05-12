'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { CATEGORY_LABELS, type CosmeticCategory, type CosmeticRarity } from '@/app/lib/rewards/catalog';
import PrismWearableCrown from '@/app/components/rewards/PrismWearableCrown';
import {
  FIRE_THEMES_BY_RARITY,
  FIRE_THEME_UPDATED_EVENT,
  getSavedFireThemeIndex,
  saveFireThemeIndex,
  type FireThemeUpdatedDetail,
} from '@/app/lib/rewards/fire-theme';

type CosmeticLivePreviewProps = {
  category: CosmeticCategory;
  rarity: CosmeticRarity;
  name: string;
  slug?: string;
  collection?: string;
  ageGroup?: string | null;
  compact?: boolean;
  className?: string;
  showMeta?: boolean;
  fireThemeItemId?: string | null;
  renderStyle?: 'default' | 'applied';
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

const RARITY_QUALITY: Record<CosmeticRarity, { sat: number; scale: number; glow: number; motion: number }> = {
  common: { sat: 0.95, scale: 1, glow: 0.9, motion: 0.92 },
  rare: { sat: 1, scale: 1.01, glow: 1, motion: 1 },
  epic: { sat: 1.13, scale: 1.03, glow: 1.25, motion: 1.15 },
  legendary: { sat: 1.24, scale: 1.05, glow: 1.45, motion: 1.28 },
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
  slug = '',
  collection,
  ageGroup = null,
  compact = false,
  className = '',
  showMeta = true,
  fireThemeItemId = null,
  renderStyle = 'default',
}: CosmeticLivePreviewProps) {
  const appliedStyle = renderStyle === 'applied';
  const [fireThemeIndex, setFireThemeIndex] = useState(0);
  const shouldPersistFireThemeIndexRef = useRef(false);
  const fallbackPalette = CATEGORY_PALETTE.xp_visuals;
  const palette = CATEGORY_PALETTE[category] ?? fallbackPalette;
  const itemSignature = `${category}:${rarity}:${name}:${slug}:${collection ?? ''}`;
  let itemHash = 0;
  for (let i = 0; i < itemSignature.length; i += 1) {
    itemHash = (itemHash * 31 + itemSignature.charCodeAt(i)) >>> 0;
  }
  const itemShift = (itemHash % 7) - 3;
  const itemDelay = -((itemHash % 9) * 0.11);
  const itemSaturation = 1 + (itemHash % 6) * 0.03;
  const itemScale = 0.99 + (itemHash % 5) * 0.01;
  const editorKey = `${name} ${slug} ${collection ?? ''}`.toLowerCase();
  const editorVariant =
    editorKey.includes('hacker') || editorKey.includes('matrix') || editorKey.includes('nocturne')
      ? 'hacker'
      : editorKey.includes('rose') || editorKey.includes('neon') || editorKey.includes('bloom') || editorKey.includes('glow')
        ? 'neon'
      : editorKey.includes('forest') || editorKey.includes('cedar') || editorKey.includes('moss') || editorKey.includes('verdant')
          ? 'organic'
          : 'glass';
  const accessoryKey = `${name} ${slug} ${collection ?? ''}`.toLowerCase();
  const accessoryVariant =
    accessoryKey.includes('crown') ||
    accessoryKey.includes('zenith') ||
    accessoryKey.includes('regalia') ||
    accessoryKey.includes('tiara')
      ? 'crown'
      : accessoryKey.includes('halo') ||
          accessoryKey.includes('aurora') ||
          accessoryKey.includes('ring')
        ? 'halo'
        : accessoryKey.includes('prism') ||
            accessoryKey.includes('quartz') ||
            accessoryKey.includes('crystal') ||
            accessoryKey.includes('gem') ||
            accessoryKey.includes('refract') ||
            accessoryKey.includes('refraction') ||
            accessoryKey.includes('spectrum')
          ? 'prism'
          : 'charm';
  const ageKey = (ageGroup ?? '').trim();
  const ageVariant =
    ageKey === '5-7'
      ? 'sprout'
      : ageKey === '8-10'
        ? 'spark'
        : ageKey === '11-13'
          ? 'nova'
          : ageKey === '14-17'
            ? 'edge'
            : ageKey === '18-21'
              ? 'studio'
              : ageKey === '22+'
                ? 'minimal'
                : 'studio';
  const fireThemes = FIRE_THEMES_BY_RARITY[rarity];
  const rarityQuality = RARITY_QUALITY[rarity];
  const xpVariant = useMemo(() => {
    if (category !== 'xp_visuals') {
      return { a: palette.a, b: palette.b, c: palette.c, mode: 'default' as const };
    }

    const lowered = `${name} ${slug} ${collection ?? ''}`.toLowerCase();
    if (lowered.includes('superchar') || rarity === 'legendary') {
      return { a: '#06b6d4', b: '#34d399', c: '#a7f3d0', mode: 'supercharge' as const };
    }
    if (rarity === 'epic') return { a: '#7c3aed', b: '#a855f7', c: '#d8b4fe', mode: 'epic' as const };
    if (rarity === 'rare') return { a: '#f59e0b', b: '#f97316', c: '#fde68a', mode: 'rare' as const };
    return { a: '#3b82f6', b: '#60a5fa', c: '#bfdbfe', mode: 'common' as const };
  }, [category, collection, name, palette.a, palette.b, palette.c, rarity, slug]);

  useEffect(() => {
    if (category !== 'streak_effects') return;
    const next = getSavedFireThemeIndex(rarity, { itemId: fireThemeItemId });
    setFireThemeIndex(next % fireThemes.length);
  }, [category, fireThemeItemId, rarity, fireThemes.length]);

  useEffect(() => {
    if (category !== 'streak_effects') {
      shouldPersistFireThemeIndexRef.current = false;
      return;
    }
    if (!shouldPersistFireThemeIndexRef.current) return;
    shouldPersistFireThemeIndexRef.current = false;
    saveFireThemeIndex(rarity, fireThemeIndex, { itemId: fireThemeItemId });
  }, [category, fireThemeIndex, fireThemeItemId, rarity]);

  useEffect(() => {
    if (typeof window === 'undefined' || category !== 'streak_effects') return;
    const onFireThemeUpdated = (event: Event) => {
      const custom = event as CustomEvent<FireThemeUpdatedDetail>;
      const eventRarity = custom.detail?.rarity;
      if (eventRarity && eventRarity !== rarity) return;
      const eventItemId = custom.detail?.itemId ?? null;
      if (eventItemId && fireThemeItemId && eventItemId !== fireThemeItemId) return;
      const next = getSavedFireThemeIndex(rarity, { itemId: fireThemeItemId });
      setFireThemeIndex(next % fireThemes.length);
    };
    window.addEventListener(FIRE_THEME_UPDATED_EVENT, onFireThemeUpdated as EventListener);
    return () => window.removeEventListener(FIRE_THEME_UPDATED_EVENT, onFireThemeUpdated as EventListener);
  }, [category, fireThemeItemId, rarity, fireThemes.length]);
  const activeFireTheme = useMemo(() => {
    const safeIndex = fireThemeIndex % fireThemes.length;
    return fireThemes[safeIndex] ?? fireThemes[0];
  }, [fireThemeIndex, fireThemes]);

  const previewVars = {
    '--cp-a': category === 'xp_visuals' ? xpVariant.a : palette.a,
    '--cp-b': category === 'xp_visuals' ? xpVariant.b : palette.b,
    '--cp-c': category === 'xp_visuals' ? xpVariant.c : palette.c,
    '--cp-speed': RARITY_SPEED[rarity],
    '--cp-item-shift': `${itemShift}px`,
    '--cp-item-delay': `${itemDelay.toFixed(2)}s`,
    '--cp-item-sat': itemSaturation.toFixed(2),
    '--cp-item-scale': itemScale.toFixed(2),
    '--rq-sat': String(rarityQuality.sat),
    '--rq-scale': String(rarityQuality.scale),
    '--rq-glow': String(rarityQuality.glow),
    '--rq-motion': String(rarityQuality.motion),
    '--fire-filter': activeFireTheme.filter,
    '--fire-core-bg': activeFireTheme.core,
    '--fire-core-shadow': activeFireTheme.coreShadow,
    '--fire-recolor': activeFireTheme.recolor,
    '--fire-recolor-opacity': String(activeFireTheme.recolorOpacity),
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
          <span className="editor-scan-grid" />
          <span className="editor-code-rain editor-code-rain--1" />
          <span className="editor-code-rain editor-code-rain--2" />
          <span className="editor-code-rain editor-code-rain--3" />
          {/* Premium hacker preview: actual 0/1 streams, not just green bars */}
          <span className="editor-matrix editor-matrix--1">0101010010010110100101101001</span>
          <span className="editor-matrix editor-matrix--2">1010010110100101101001011010</span>
          <span className="editor-matrix editor-matrix--3">0101101001011010010110100101</span>
          <span className="editor-matrix editor-matrix--4">1011010010110100101101001011</span>
          <span className="editor-matrix editor-matrix--5">0101011010010110100101101010</span>
          <span className="editor-matrix editor-matrix--6">1010010110100101101010010110</span>
          <span className="editor-matrix editor-matrix--7">0110100101101001011010010110</span>
          <span className="editor-circuit editor-circuit--1" />
          <span className="editor-circuit editor-circuit--2" />
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
        <div className={`scene scene--frame scene--accessory-${accessoryVariant} scene--age-${ageVariant}`} aria-hidden="true">
          <span className="frame-avatar-shell">
            {accessoryVariant === 'prism' || accessoryVariant === 'crown' ? (
              <span className="frame-prism-crown">
                <PrismWearableCrown rarity={rarity} size={50} ageGroup={ageGroup} />
              </span>
            ) : null}
            <span className="frame-avatar">A</span>
          </span>
          <span className="frame-ring frame-ring--one" />
          <span className="frame-ring frame-ring--two" />
          <span className="frame-aura" />
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
          {appliedStyle ? (
            <span className="badge-applied-chip" aria-hidden="true">
              <span className="badge-applied-dot">*</span>
              <span className="badge-applied-name">{name}</span>
            </span>
          ) : null}
        </div>
      )}

      {category === 'streak_effects' && (
        <div className="scene scene--streak" aria-hidden="true">
          <span className="streak-aura" />
          <span className="streak-supernova" />
          <span className="streak-heat-haze" />
          <span className="streak-flame-stack">
            <img
              className="streak-flame-reference"
              src="/rewards/fire-base.png"
              alt=""
              aria-hidden="true"
            />
            <span className="streak-flame-recolor" />
            <img
              className="streak-flame-reference-tip"
              src="/rewards/fire-base.png"
              alt=""
              aria-hidden="true"
            />
            <span className="streak-core-hole" />
            <span className="streak-ash-dot streak-ash-dot--1" />
            <span className="streak-ash-dot streak-ash-dot--2" />
            <span className="streak-ash-dot streak-ash-dot--3" />
            <span className="streak-ash-dot streak-ash-dot--4" />
            <span className="streak-ash-dot streak-ash-dot--5" />
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
	      {category === 'streak_effects' ? (
	        <button
	          type="button"
	          className="streak-theme-toggle"
	          onClick={() => {
	            if (fireThemes.length <= 1) return;
	            shouldPersistFireThemeIndexRef.current = true;
	            setFireThemeIndex((prev) => (prev + 1) % fireThemes.length);
	          }}
	          title={fireThemes.length <= 1 ? `Common theme: ${activeFireTheme.label}` : `Tap to switch ${rarity} color theme`}
	        >
	          {fireThemes.length <= 1 ? 'C1' : `${rarity.slice(0, 1).toUpperCase()}${(fireThemeIndex % fireThemes.length) + 1}`}
	        </button>
	      ) : null}

      {category === 'xp_visuals' && (
        <div className={`scene scene--xp scene--xp-${xpVariant.mode}`} aria-hidden="true">
          <span className="xp-label">+120</span>
          <span className="xp-prism" />
          <span className="xp-prism xp-prism--2" />
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
          <span className="xp-micro xp-micro--1" />
          <span className="xp-micro xp-micro--2" />
          <span className="xp-micro xp-micro--3" />
        </div>
      )}

      {category === 'ui_custom' && (
        <div className="scene scene--ui" aria-hidden="true">
          <span className="ui-pill ui-pill--1" />
          <span className="ui-pill ui-pill--2" />
          <span className="ui-pill ui-pill--3" />
          <span className="ui-accent-dot" />
          {appliedStyle ? (
            <>
              <span className="ui-applied-rail ui-applied-rail--1" />
              <span className="ui-applied-rail ui-applied-rail--2" />
            </>
          ) : null}
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
          transform: scale(var(--rq-scale, 1));
          filter: saturate(var(--rq-sat, 1));
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
          box-shadow: 0 10px 24px rgba(15, 23, 42, calc(0.08 * var(--rq-glow, 1)));
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

        .editor-scan-grid,
        .editor-code-rain,
        .editor-circuit {
          opacity: 0;
          pointer-events: none;
        }

        .editor-scan-grid {
          position: absolute;
          inset: 8px 10px 10px;
          border-radius: 11px;
          background:
            linear-gradient(180deg, rgba(16, 185, 129, 0.06), rgba(16, 185, 129, 0)),
            repeating-linear-gradient(0deg, rgba(148, 163, 184, 0.08) 0 1px, transparent 1px 8px),
            repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.07) 0 1px, transparent 1px 10px);
          mix-blend-mode: multiply;
        }

        .editor-code-rain {
          position: absolute;
          top: 11px;
          width: 3px;
          height: calc(100% - 22px);
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(110, 231, 183, 0) 0%, rgba(52, 211, 153, 0.7) 24%, rgba(167, 243, 208, 0.95) 46%, rgba(52, 211, 153, 0.68) 72%, rgba(110, 231, 183, 0) 100%);
          filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.42));
          animation: code-rain calc(var(--cp-speed) * 0.58) linear infinite;
        }

        .editor-code-rain--1 { left: 20px; }
        .editor-code-rain--2 { left: 50%; margin-left: -1px; animation-delay: -0.24s; }
        .editor-code-rain--3 { right: 20px; animation-delay: -0.46s; }

        .editor-circuit {
          position: absolute;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(52, 211, 153, 0), rgba(52, 211, 153, 0.8), rgba(167, 243, 208, 0.92), rgba(52, 211, 153, 0));
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.3);
          animation: circuit-pulse calc(var(--cp-speed) * 0.72) ease-in-out infinite;
        }

        .editor-circuit--1 { left: 14px; right: 36px; top: 22px; }
        .editor-circuit--2 { left: 36px; right: 14px; bottom: 20px; animation-delay: -0.34s; }

        .scene--frame .frame-avatar-shell {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 34px;
          height: 34px;
          margin-left: -17px;
          margin-top: -17px;
          border-radius: 11px;
          padding: 2px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, color-mix(in srgb, var(--cp-a) 74%, white 26%) 0%, color-mix(in srgb, var(--cp-b) 52%, var(--cp-c) 48%) 100%);
          box-shadow: 0 10px 24px color-mix(in srgb, var(--cp-a) calc(20% * var(--rq-glow, 1)), transparent);
          z-index: 3;
        }

        .scene--frame .frame-prism-crown {
          position: absolute;
          left: 50%;
          top: -15px;
          transform: translateX(-50%);
          z-index: 5;
          pointer-events: none;
        }

        .scene--frame .frame-avatar {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 9px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 900;
          color: #fff;
          background: linear-gradient(145deg, var(--cp-a), var(--cp-b));
          box-shadow: 0 8px 18px color-mix(in srgb, var(--cp-a) calc(20% * var(--rq-glow, 1)), transparent);
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

        .scene--accessory-prism .frame-ring,
        .scene--accessory-prism .frame-aura,
        .scene--accessory-crown .frame-ring,
        .scene--accessory-crown .frame-aura {
          opacity: 0;
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
          box-shadow: 0 10px 24px color-mix(in srgb, var(--cp-a) calc(22% * var(--rq-glow, 1)), transparent);
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

        .badge-applied-chip {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 8px;
          height: 24px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 8px;
          border: 1px solid color-mix(in srgb, var(--cp-a) 34%, transparent);
          background: color-mix(in srgb, var(--cp-a) 14%, white 86%);
          color: color-mix(in srgb, var(--cp-a) 74%, #0f172a);
          box-shadow: 0 8px 16px rgba(15, 23, 42, 0.14);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.01em;
        }

        .badge-applied-dot {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid color-mix(in srgb, var(--cp-a) 34%, transparent);
          background: color-mix(in srgb, var(--cp-a) 18%, white 82%);
          font-size: 8px;
          font-weight: 900;
          flex: 0 0 auto;
        }

        .badge-applied-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
          transform-origin: 50% 100%;
          animation: flame-sway calc(var(--cp-speed) * 0.52) ease-in-out infinite;
        }

        .scene--streak .streak-flame-reference {
          position: absolute;
          left: 50%;
          bottom: 4px;
          width: 88px;
          height: 103px;
          transform: translateX(-50%);
          object-fit: contain;
          pointer-events: none;
          user-select: none;
          -webkit-user-drag: none;
          z-index: 4;
          filter: var(--fire-filter, saturate(1.03) contrast(1.02));
        }

        .scene--streak .streak-flame-recolor {
          position: absolute;
          left: 50%;
          bottom: 4px;
          width: 88px;
          height: 103px;
          transform: translateX(-50%);
          z-index: 4;
          pointer-events: none;
          background: var(--fire-recolor, linear-gradient(180deg, #f97316 0%, #f59e0b 55%, #fde047 100%));
          opacity: var(--fire-recolor-opacity, 0);
          mix-blend-mode: color;
          -webkit-mask-image: url('/rewards/fire-base.png');
          -webkit-mask-size: 100% 100%;
          -webkit-mask-repeat: no-repeat;
          -webkit-mask-position: center;
          mask-image: url('/rewards/fire-base.png');
          mask-size: 100% 100%;
          mask-repeat: no-repeat;
          mask-position: center;
          filter: saturate(1.2) contrast(1.08);
        }

        .scene--streak .streak-flame-reference-tip {
          position: absolute;
          left: 50%;
          bottom: 4px;
          width: 88px;
          height: 103px;
          transform: translateX(-50%);
          object-fit: contain;
          pointer-events: none;
          user-select: none;
          -webkit-user-drag: none;
          z-index: 5;
          clip-path: inset(0 0 46% 0);
          transform-origin: 50% 78%;
          animation: flame-tip-flicker calc(var(--cp-speed) * 0.34) ease-in-out infinite;
          filter: var(--fire-filter, saturate(1.08) brightness(1.05));
          opacity: 0.94;
        }

        .scene--streak .streak-core-hole {
          position: absolute;
          left: 50%;
          bottom: 8px;
          width: 26px;
          height: 28px;
          margin-left: -13px;
          border-radius: 50% 50% 42% 42% / 66% 66% 34% 34%;
          background: var(--fire-core-bg, radial-gradient(circle at 50% 28%, #fffde7 0%, #fff59d 38%, #fde047 72%, #facc15 100%));
          box-shadow: var(--fire-core-shadow, 0 0 12px rgba(253, 224, 71, 0.7), 0 0 22px rgba(250, 204, 21, 0.38), inset 0 0 4px rgba(255, 255, 255, 0.68));
          z-index: 6;
          animation: core-glow calc(var(--cp-speed) * 0.55) ease-in-out infinite;
        }

        .streak-theme-toggle {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 8;
          border: 1px solid color-mix(in srgb, var(--cp-a) 30%, rgba(15, 23, 42, 0.22));
          background: color-mix(in srgb, white 86%, var(--cp-b) 14%);
          color: rgba(15, 23, 42, 0.8);
          border-radius: 999px;
          min-width: 24px;
          height: 20px;
          padding: 0 7px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.04em;
          line-height: 1;
          cursor: pointer;
          box-shadow: 0 2px 7px rgba(15, 23, 42, 0.12);
        }

        .scene--streak .streak-ash-dot {
          position: absolute;
          width: 2px;
          height: 2px;
          border-radius: 999px;
          background: rgba(17, 24, 39, 0.82);
          box-shadow: 0 0 2px rgba(17, 24, 39, 0.28);
          z-index: 7;
          opacity: 0;
          animation: ash-dot-rise calc(var(--cp-speed) * 0.86) linear infinite;
        }

        .streak-ash-dot--1 { left: calc(50% - 7px); bottom: 26px; animation-delay: 0s; }
        .streak-ash-dot--2 { left: calc(50% + 2px); bottom: 24px; animation-delay: -0.16s; }
        .streak-ash-dot--3 { left: calc(50% - 1px); bottom: 30px; animation-delay: -0.3s; }
        .streak-ash-dot--4 { left: calc(50% + 8px); bottom: 22px; animation-delay: -0.42s; }
        .streak-ash-dot--5 { left: calc(50% - 10px); bottom: 20px; animation-delay: -0.54s; }

        .scene--streak .streak-heat-haze {
          position: absolute;
          left: 50%;
          top: 36%;
          width: 112px;
          height: 132px;
          margin-left: -56px;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 70%, rgba(251, 146, 60, 0.2), rgba(251, 146, 60, 0.06) 48%, transparent 72%);
          filter: blur(8px);
          opacity: 0.72;
          animation: heat-shimmer calc(var(--cp-speed) * 0.46) ease-in-out infinite;
          z-index: 0;
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
          display: none;
        }

        .scene--streak .streak-flame-outer {
          bottom: 10px;
          width: 84px;
          height: 118px;
          clip-path: polygon(50% 0%, 61% 8%, 66% 18%, 69% 30%, 76% 40%, 86% 48%, 90% 62%, 86% 76%, 78% 86%, 66% 94%, 54% 98%, 46% 98%, 34% 94%, 22% 86%, 14% 76%, 10% 62%, 14% 48%, 24% 40%, 31% 30%, 34% 18%, 39% 8%);
          background: linear-gradient(180deg, #dc2626 0%, #f97316 30%, #f59e0b 66%, #facc15 100%);
          box-shadow: 0 0 24px rgba(249, 115, 22, 0.38);
          animation: flame-flicker calc(var(--cp-speed) * 0.58) ease-in-out infinite alternate;
          z-index: 1;
        }

        .scene--streak .streak-flame-mid {
          bottom: 18px;
          width: 64px;
          height: 92px;
          clip-path: polygon(50% 2%, 58% 11%, 62% 22%, 67% 34%, 74% 44%, 78% 58%, 74% 71%, 66% 81%, 56% 89%, 50% 93%, 44% 89%, 34% 81%, 26% 71%, 22% 58%, 26% 44%, 33% 34%, 38% 22%, 42% 11%);
          background: linear-gradient(180deg, #f97316 0%, #f59e0b 46%, #facc15 100%);
          box-shadow: 0 0 18px rgba(249, 115, 22, 0.3);
          animation: flame-flicker calc(var(--cp-speed) * 0.66) ease-in-out infinite alternate;
          z-index: 2;
        }

        .scene--streak .streak-flame-inner {
          bottom: 20px;
          width: 44px;
          height: 74px;
          clip-path: polygon(50% 4%, 56% 15%, 60% 28%, 66% 42%, 68% 56%, 64% 68%, 58% 78%, 52% 86%, 48% 86%, 42% 78%, 36% 68%, 32% 56%, 34% 42%, 40% 28%, 44% 15%);
          background: linear-gradient(180deg, #facc15 0%, #fde047 45%, #fef08a 100%);
          box-shadow: 0 0 16px rgba(255, 220, 148, 0.44);
          animation: flame-flicker calc(var(--cp-speed) * 0.8) ease-in-out infinite alternate;
          z-index: 3;
        }

        .scene--streak .streak-flame-core {
          bottom: 8px;
          width: 34px;
          height: 36px;
          clip-path: polygon(50% 8%, 58% 18%, 64% 34%, 64% 52%, 58% 70%, 50% 84%, 42% 70%, 36% 52%, 36% 34%, 42% 18%);
          background: rgba(255, 255, 255, 0.96);
          animation: flame-flicker calc(var(--cp-speed) * 0.9) ease-in-out infinite alternate;
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

        .scene--streak .streak-flame-tongue {
          position: absolute;
          bottom: 44px;
          width: 14px;
          height: 34px;
          border-radius: 18px 18px 6px 6px;
          background: linear-gradient(180deg, rgba(255, 244, 196, 0.98) 0%, rgba(251, 191, 36, 0.92) 52%, rgba(249, 115, 22, 0.78) 100%);
          filter: blur(0.3px);
          transform-origin: 50% 100%;
          opacity: 0.88;
          animation: flame-tongue calc(var(--cp-speed) * 0.44) ease-in-out infinite;
          z-index: 5;
        }

        .streak-flame-tongue--1 { left: 50%; margin-left: -22px; transform: rotate(-14deg); display: none; }
        .streak-flame-tongue--2 { left: 50%; margin-left: -7px; height: 40px; animation-delay: -0.14s; display: none; }
        .streak-flame-tongue--3 { left: 50%; margin-left: 8px; transform: rotate(14deg); animation-delay: -0.28s; display: none; }

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
          display: none;
        }

        .streak-spark--1 { left: calc(50% - 28px); top: 16%; animation-delay: 0s; }
        .streak-spark--2 { left: calc(50% + 6px); top: 10%; animation-delay: -0.18s; }
        .streak-spark--3 { left: calc(50% + 26px); top: 18%; animation-delay: -0.32s; }

        .scene--streak .streak-ember {
          position: absolute;
          width: 3px;
          height: 3px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(209, 213, 219, 0.95) 0%, rgba(107, 114, 128, 0.88) 72%, rgba(75, 85, 99, 0.6) 100%);
          box-shadow: 0 0 8px rgba(107, 114, 128, 0.35);
          opacity: 0.82;
          animation: ash-rise calc(var(--cp-speed) * 0.9) linear infinite;
          z-index: 3;
        }

        .streak-ember--1 { left: calc(50% - 16px); top: 26%; animation-delay: 0s; }
        .streak-ember--2 { left: calc(50% + 4px); top: 22%; animation-delay: -0.2s; }
        .streak-ember--3 { left: calc(50% - 2px); top: 18%; animation-delay: -0.38s; }

        .scene--xp .xp-label {
          position: absolute;
          top: 9px;
          right: 10px;
          font-size: 11px;
          font-weight: 900;
          color: rgba(15, 23, 42, 0.8);
          animation: xp-pop calc(var(--cp-speed) * 0.6) ease-in-out infinite;
        }

        .scene--xp .xp-prism {
          position: absolute;
          inset: -18px;
          border-radius: 999px;
          background: conic-gradient(from 210deg, rgba(34,211,238,0.0), color-mix(in srgb, var(--cp-a) 22%, transparent), color-mix(in srgb, var(--cp-b) 18%, transparent), color-mix(in srgb, var(--cp-c) 18%, transparent), rgba(34,211,238,0.0));
          filter: blur(18px);
          opacity: 0.35;
          mix-blend-mode: screen;
          animation: xp-prism-spin calc(var(--cp-speed) * 1.2) linear infinite;
          pointer-events: none;
        }
        .scene--xp .xp-prism--2 {
          opacity: 0.22;
          filter: blur(24px);
          animation-duration: calc(var(--cp-speed) * 1.6);
          animation-direction: reverse;
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
          box-shadow: 0 6px 16px rgba(15, 23, 42, calc(0.06 * var(--rq-glow, 1)));
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

        .xp-micro {
          position: absolute;
          width: 2px;
          height: 2px;
          border-radius: 999px;
          background: rgba(255,255,255,0.95);
          opacity: 0;
          box-shadow: 0 0 12px color-mix(in srgb, var(--cp-a) 26%, transparent);
          animation: xp-micro calc(var(--cp-speed) * 0.62) ease-in-out infinite;
          pointer-events: none;
        }
        .xp-micro--1 { right: 18px; top: 22px; animation-delay: -0.3s; }
        .xp-micro--2 { right: 40px; top: 44px; animation-delay: -0.9s; }
        .xp-micro--3 { left: 26px; top: 18px; animation-delay: -1.3s; }

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
          box-shadow: 0 10px 22px color-mix(in srgb, var(--cp-a) calc(20% * var(--rq-glow, 1)), transparent);
          animation: ui-pop calc(var(--cp-speed) * 0.72) ease-in-out infinite;
        }

        .ui-applied-rail {
          position: absolute;
          right: 14px;
          width: 4px;
          border-radius: 999px;
          background: linear-gradient(180deg, color-mix(in srgb, var(--cp-a) 84%, white), color-mix(in srgb, var(--cp-b) 78%, white));
          box-shadow: 0 0 10px color-mix(in srgb, var(--cp-b) 38%, transparent);
          opacity: 0.9;
        }

        .ui-applied-rail--1 {
          top: 16px;
          height: 22px;
        }

        .ui-applied-rail--2 {
          top: 44px;
          height: 10px;
          opacity: 0.72;
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
          text-shadow: 0 0 calc(8px * var(--rq-glow, 1)) color-mix(in srgb, var(--cp-c) 26%, transparent);
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

        .cos-prev--common .scene--streak .streak-flame-reference { opacity: 0.99; }

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

        .cos-prev--rare .scene--streak .streak-flame-reference { opacity: 1; }
        .cos-prev--rare .scene--streak .streak-flame-recolor { mix-blend-mode: color; }

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

        .cos-prev--epic .scene--editor .editor-window,
        .cos-prev--epic .scene--frame .frame-avatar,
        .cos-prev--epic .scene--badge .badge-core,
        .cos-prev--epic .scene--xp .xp-track,
        .cos-prev--epic .scene--ui .ui-accent-dot,
        .cos-prev--epic .scene--title .title-name {
          filter: saturate(1.14) contrast(1.08);
        }

        .cos-prev--epic .scene--editor .editor-tier-comet,
        .cos-prev--epic .scene--xp .xp-spark,
        .cos-prev--epic .scene--ui .ui-pill,
        .cos-prev--epic .scene--frame .frame-ring {
          animation-duration: calc(var(--cp-speed) * 0.6);
          opacity: 0.95;
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
          background: linear-gradient(180deg, rgba(255, 211, 128, 0.95), rgba(249, 115, 22, 0.92), rgba(220, 38, 38, 0.86));
          box-shadow: 0 0 28px rgba(249, 115, 22, 0.34);
        }

        .cos-prev--epic .scene--streak .streak-flame-reference { opacity: 1; }
        .cos-prev--epic .scene--streak .streak-flame-recolor { mix-blend-mode: screen; }

        .cos-prev--epic .scene--streak .streak-flame-mid {
          background: linear-gradient(180deg, rgba(255, 239, 181, 0.98), rgba(251, 146, 60, 0.92), rgba(239, 68, 68, 0.8));
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

        .cos-prev--legendary .scene--editor .editor-window,
        .cos-prev--legendary .scene--frame .frame-avatar,
        .cos-prev--legendary .scene--badge .badge-core,
        .cos-prev--legendary .scene--xp .xp-track,
        .cos-prev--legendary .scene--ui .ui-accent-dot,
        .cos-prev--legendary .scene--title .title-name {
          filter: saturate(1.22) contrast(1.14) brightness(1.06);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.2), 0 14px 30px rgba(15, 23, 42, 0.18);
        }

        .cos-prev--legendary .scene--editor .editor-tier-comet,
        .cos-prev--legendary .scene--xp .xp-spark,
        .cos-prev--legendary .scene--ui .ui-pill,
        .cos-prev--legendary .scene--frame .frame-ring {
          animation-duration: calc(var(--cp-speed) * 0.46);
          opacity: 1;
        }

        .cos-prev--legendary .scene--title .title-glow,
        .cos-prev--legendary .scene--badge .badge-shine,
        .cos-prev--legendary .scene--xp .xp-track-glow {
          opacity: 0.9;
          filter: blur(8px);
        }

        .cos-prev--epic .scene--xp .xp-prism { opacity: 0.5; }
        .cos-prev--legendary .scene--xp .xp-prism { opacity: 0.72; filter: blur(22px); }
        .cos-prev--common .scene--xp .xp-micro { display: none; }
        .cos-prev--rare .scene--xp .xp-micro--3 { display: none; }

        .cos-prev--legendary .cos-prev__common-spark {
          box-shadow: 0 0 28px rgba(251, 191, 36, 0.52);
          background: radial-gradient(circle, rgba(255,255,255,0.96) 0%, rgba(251,211,77,0.82) 38%, transparent 100%);
          animation-duration: 2.1s;
        }

        /* Prism accessories preview: show the age-group attachment only when the item is prism */
        .scene--accessory-prism .accessory-prism-tiara,
        .scene--accessory-prism .accessory-prism-star,
        .scene--accessory-prism .accessory-prism-bolt,
        .scene--accessory-prism .accessory-prism-nova,
        .scene--accessory-prism .accessory-prism-edge,
        .scene--accessory-prism .accessory-prism-laurel,
        .scene--accessory-prism .accessory-prism-minhalo {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .scene--accessory-prism.scene--age-sprout .accessory-prism-tiara,
        .scene--accessory-prism.scene--age-sprout .accessory-prism-star { opacity: 0.95; }

        .scene--accessory-prism.scene--age-spark .accessory-prism-bolt,
        .scene--accessory-prism.scene--age-spark .accessory-prism-star { opacity: 0.9; }

        .scene--accessory-prism.scene--age-nova .accessory-prism-nova,
        .scene--accessory-prism.scene--age-nova .accessory-prism-star { opacity: 0.9; }

        .scene--accessory-prism.scene--age-edge .accessory-prism-edge { opacity: 0.92; }
        .scene--accessory-prism.scene--age-studio .accessory-prism-laurel { opacity: 0.85; }
        .scene--accessory-prism.scene--age-minimal .accessory-prism-minhalo { opacity: 0.82; }

        .accessory-prism-tiara {
          left: 50%;
          top: 6px;
          width: 32px;
          height: 16px;
          margin-left: -16px;
          border-radius: 10px;
          background: conic-gradient(from 220deg, rgba(34,211,238,0.95), rgba(96,165,250,0.9), rgba(168,85,247,0.9), rgba(244,114,182,0.86), rgba(245,158,11,0.92), rgba(34,211,238,0.95));
          clip-path: polygon(6% 76%, 18% 40%, 32% 62%, 50% 22%, 68% 62%, 82% 40%, 94% 76%, 94% 100%, 6% 100%);
          box-shadow: 0 12px 22px rgba(96,165,250,0.18);
          animation: acc-bob calc(var(--cp-speed) * 0.26) ease-in-out infinite;
        }

        .accessory-prism-star {
          left: 50%;
          top: 2px;
          width: 10px;
          height: 10px;
          margin-left: -5px;
          border-radius: 6px;
          background: radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,255,255,0.0) 70%);
          clip-path: polygon(50% 0%, 62% 34%, 98% 38%, 70% 58%, 80% 92%, 50% 72%, 20% 92%, 30% 58%, 2% 38%, 38% 34%);
          filter: drop-shadow(0 0 12px rgba(245,158,11,0.35));
          animation: acc-twinkle calc(var(--cp-speed) * 0.2) ease-in-out infinite;
        }

        .accessory-prism-bolt {
          left: 50%;
          top: 4px;
          width: 12px;
          height: 12px;
          margin-left: -6px;
          background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(34,211,238,0.35));
          clip-path: polygon(45% 0%, 70% 0%, 54% 40%, 80% 40%, 38% 100%, 48% 58%, 24% 58%);
          filter: drop-shadow(0 10px 16px rgba(34,211,238,0.18));
          animation: acc-pop calc(var(--cp-speed) * 0.24) ease-in-out infinite;
        }

        .accessory-prism-nova {
          left: 50%;
          top: 0px;
          width: 14px;
          height: 14px;
          margin-left: -7px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,255,255,0.9), rgba(168,85,247,0.18), rgba(255,255,255,0) 70%);
          filter: drop-shadow(0 0 18px rgba(168,85,247,0.22));
          animation: acc-pulse calc(var(--cp-speed) * 0.28) ease-in-out infinite;
        }

        .accessory-prism-edge {
          top: 0px;
          width: 12px;
          height: 11px;
          border-radius: 10px;
          background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(124,58,237,0.18));
          clip-path: polygon(50% 0%, 88% 100%, 12% 100%);
          filter: drop-shadow(0 10px 18px rgba(124,58,237,0.18));
        }
        .accessory-prism-edge--l { left: 9px; transform: rotate(-10deg); }
        .accessory-prism-edge--r { right: 9px; transform: rotate(10deg); }

        .accessory-prism-laurel {
          top: 4px;
          width: 18px;
          height: 14px;
          border-radius: 999px;
          background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.85), rgba(255,255,255,0) 60%), color-mix(in srgb, rgba(59,130,246,0.26) 60%, transparent);
          clip-path: polygon(50% 0%, 76% 14%, 92% 38%, 78% 64%, 54% 84%, 28% 70%, 12% 44%, 22% 18%);
        }
        .accessory-prism-laurel--l { left: 2px; transform: rotate(-18deg); }
        .accessory-prism-laurel--r { right: 2px; transform: rotate(18deg); }

        .accessory-prism-minhalo {
          left: 50%;
          top: 2px;
          width: 34px;
          height: 12px;
          margin-left: -17px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.42);
          background: linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0));
          box-shadow: 0 12px 22px rgba(15,23,42,0.08);
        }

        @keyframes acc-bob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-1.2px); }
        }
        @keyframes acc-twinkle {
          0%, 100% { transform: translateY(0) scale(0.95); opacity: 0.7; }
          50% { transform: translateY(-0.4px) scale(1.08); opacity: 0.95; }
        }
        @keyframes acc-pop {
          0%, 100% { transform: translateY(0) scale(0.96); opacity: 0.7; }
          50% { transform: translateY(-0.4px) scale(1.08); opacity: 0.95; }
        }
        @keyframes acc-pulse {
          0%, 100% { transform: scale(0.98); opacity: 0.75; }
          50% { transform: scale(1.06); opacity: 0.95; }
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
          background: linear-gradient(180deg, rgba(255, 224, 145, 0.96), rgba(249, 115, 22, 0.94), rgba(185, 28, 28, 0.9));
          box-shadow: 0 0 32px rgba(251, 146, 60, 0.46);
        }

        .cos-prev--legendary .scene--streak .streak-flame-reference { opacity: 1; }
        .cos-prev--legendary .scene--streak .streak-flame-recolor {
          mix-blend-mode: screen;
          filter: saturate(1.32) contrast(1.14);
        }

        .cos-prev--legendary .scene--streak .streak-flame-mid {
          background: linear-gradient(180deg, rgba(255, 243, 196, 0.98), rgba(251, 146, 60, 0.94), rgba(239, 68, 68, 0.86));
        }

        .cos-prev--legendary .scene--streak .streak-flame-inner {
          background: linear-gradient(180deg, rgba(255,255,255,0.99), rgba(254, 240, 138, 0.95), rgba(251, 146, 60, 0.82));
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
          box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.2), 0 18px 38px rgba(37, 99, 235, 0.12);
        }

        .cos-prev.shop-rarity-preview--rare {
          box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0.24), 0 18px 40px rgba(6, 182, 212, 0.14);
        }

        .cos-prev.shop-rarity-preview--epic {
          box-shadow: inset 0 0 0 1px rgba(192, 132, 252, 0.28), 0 20px 44px rgba(168, 85, 247, 0.16);
        }

        .cos-prev.shop-rarity-preview--legendary {
          box-shadow: inset 0 0 0 1px rgba(251, 146, 60, 0.34), 0 22px 52px rgba(217, 119, 6, 0.18);
        }

        .cos-prev.shop-rarity-preview--epic::after { animation-duration: 4.4s; opacity: 0.2; }
        .cos-prev.shop-rarity-preview--legendary::after { animation-duration: 3.4s; opacity: 0.26; }

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
        .scene--editor-hacker .editor-window {
          background: linear-gradient(145deg, rgba(2, 20, 12, 0.84), rgba(6, 33, 19, 0.78));
          border-color: rgba(16, 185, 129, 0.42);
          box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.18), 0 0 26px rgba(16, 185, 129, 0.24);
        }
        .scene--editor-organic .editor-window { background: linear-gradient(145deg, rgba(236, 255, 235, 0.76), rgba(255,255,255,0.66)); }

        .scene--editor-hacker .editor-window__top {
          background: linear-gradient(90deg, rgba(5, 150, 105, 0.62), rgba(16, 185, 129, 0.28));
        }

        .scene--editor-hacker .editor-window__line {
          background: linear-gradient(90deg, rgba(110, 231, 183, 0.92), rgba(52, 211, 153, 0.48));
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.24);
        }

        .scene--editor-hacker .editor-window__cursor {
          background: rgba(167, 243, 208, 1);
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.62);
        }

        .editor-matrix {
          position: absolute;
          top: 12px;
          bottom: 12px;
          width: 14px;
          color: rgba(167, 243, 208, 0.82);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
          font-size: 10px;
          line-height: 1.05;
          letter-spacing: 0.16em;
          writing-mode: vertical-rl;
          text-orientation: upright;
          text-shadow: 0 0 14px rgba(16, 185, 129, 0.22);
          opacity: 0;
          pointer-events: none;
          animation:
            editor-matrix-fall calc(var(--cp-speed) * 0.62) linear infinite,
            editor-matrix-sway calc(var(--cp-speed) * 0.9) ease-in-out infinite;
          -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.9) 18%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%);
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.9) 18%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%);
        }

        .editor-matrix::before {
          content: '';
          position: absolute;
          inset: -10px -6px;
          background: linear-gradient(180deg, rgba(16,185,129,0.0) 0%, rgba(16,185,129,0.18) 30%, rgba(16,185,129,0.0) 100%);
          filter: blur(10px);
          opacity: 0.55;
          pointer-events: none;
          mix-blend-mode: screen;
        }

        .scene--editor-hacker .editor-matrix { opacity: 0.85; }
        .cos-prev--common .scene--editor-hacker .editor-matrix { opacity: 0.55; }
        .cos-prev--legendary .scene--editor-hacker .editor-matrix { opacity: 0.95; filter: saturate(1.1); }
        .cos-prev--epic .scene--editor-hacker .editor-matrix { opacity: 0.9; }

        .editor-matrix--1 { left: 18px; animation-delay: calc(var(--cp-item-delay) * 1); }
        .editor-matrix--2 { left: 42%; animation-delay: calc(var(--cp-item-delay) * 1.7); opacity: 0.7; }
        .editor-matrix--3 { right: 34px; animation-delay: calc(var(--cp-item-delay) * 2.2); opacity: 0.78; }
        .editor-matrix--4 { right: 18px; animation-delay: calc(var(--cp-item-delay) * 2.9); opacity: 0.62; }
        .editor-matrix--5 { left: 30%; animation-delay: calc(var(--cp-item-delay) * 3.3); opacity: 0.62; }
        .editor-matrix--6 { right: 46px; animation-delay: calc(var(--cp-item-delay) * 3.9); opacity: 0.55; }
        .editor-matrix--7 { left: 10px; animation-delay: calc(var(--cp-item-delay) * 4.4); opacity: 0.5; }

        .cos-prev--common .scene--editor-hacker .editor-matrix--5,
        .cos-prev--common .scene--editor-hacker .editor-matrix--6,
        .cos-prev--common .scene--editor-hacker .editor-matrix--7 {
          opacity: 0;
        }

        .cos-prev--rare .scene--editor-hacker .editor-matrix--7 { opacity: 0; }

        @keyframes editor-matrix-fall {
          0% { transform: translateY(-120%); }
          100% { transform: translateY(18%); }
        }

        @keyframes editor-matrix-sway {
          0%, 100% { translate: 0 0; }
          50% { translate: 0.5px -1px; }
        }

        .editor-neon-chip,
        .editor-organic-leaf,
        .editor-hacker-column { opacity: 0; }

        .scene--editor-hacker .editor-scan-grid,
        .scene--editor-hacker .editor-code-rain,
        .scene--editor-hacker .editor-circuit {
          opacity: 1;
        }

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

        /* Prism is meant to feel like a wearable crown cosmetic, not a flat bar. */
        .scene--accessory-prism .accessory-crown {
          top: 10px;
          width: 34px;
          height: 18px;
          margin-left: -17px;
          border-radius: 10px;
          background: linear-gradient(180deg, rgba(255,255,255,0.92) 0%, color-mix(in srgb, var(--cp-b) 42%, white 58%) 38%, color-mix(in srgb, var(--cp-a) 72%, white 28%) 100%);
          border: 1px solid color-mix(in srgb, var(--cp-b) 52%, white 48%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.72),
            0 10px 18px color-mix(in srgb, var(--cp-b) 22%, transparent);
          clip-path: polygon(6% 82%, 10% 44%, 22% 62%, 34% 32%, 50% 58%, 66% 32%, 78% 62%, 90% 44%, 94% 82%, 94% 100%, 6% 100%);
          overflow: hidden;
        }

        .scene--accessory-prism .accessory-crown::before {
          content: '';
          position: absolute;
          inset: -10px;
          background: conic-gradient(from 210deg, rgba(34,211,238,0.0), rgba(34,211,238,0.28), rgba(168,85,247,0.24), rgba(244,114,182,0.2), rgba(245,158,11,0.22), rgba(34,211,238,0.0));
          opacity: 0.55;
          filter: blur(9px);
          mix-blend-mode: screen;
          pointer-events: none;
        }

        .scene--accessory-prism .accessory-crown::after {
          content: '';
          position: absolute;
          inset: -6px;
          background: linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.95) 46%, transparent 74%);
          opacity: 0;
          transform: translateX(-140%);
          pointer-events: none;
        }

        .cos-prev--epic .scene--accessory-prism .accessory-crown::after,
        .cos-prev--legendary .scene--accessory-prism .accessory-crown::after {
          opacity: 0.65;
          animation: prism-preview-shine calc(var(--cp-speed) * 0.44) ease-in-out infinite;
        }

        .cos-prev--legendary .scene--accessory-prism .accessory-crown {
          background: conic-gradient(from 220deg, rgba(34,211,238,0.95), rgba(96,165,250,0.9), rgba(168,85,247,0.9), rgba(244,114,182,0.86), rgba(245,158,11,0.92), rgba(34,211,238,0.95));
          animation: prism-preview-hue calc(var(--cp-speed) * 0.62) linear infinite;
        }

        @keyframes prism-preview-hue {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }

        @keyframes prism-preview-shine {
          0% { transform: translateX(-140%); opacity: 0; }
          28% { opacity: 0.65; }
          55% { opacity: 0.35; }
          100% { transform: translateX(140%); opacity: 0; }
        }

        .accessory-prism-aurora {
          position: absolute;
          left: 50%;
          top: 8px;
          width: 52px;
          height: 30px;
          margin-left: -26px;
          border-radius: 999px;
          background: radial-gradient(circle at 50% 60%, color-mix(in srgb, var(--cp-c) 28%, transparent) 0%, transparent 70%);
          filter: blur(10px);
          opacity: 0;
          pointer-events: none;
        }

        .scene--accessory-prism .accessory-prism-aurora {
          opacity: 0.55;
        }

        .cos-prev--legendary .scene--accessory-prism .accessory-prism-aurora {
          opacity: 0.85;
          animation: aurora-pulse calc(var(--cp-speed) * 0.66) ease-in-out infinite;
        }

        .accessory-prism-gem {
          position: absolute;
          left: 50%;
          top: 18px;
          width: 10px;
          height: 10px;
          margin-left: -5px;
          border-radius: 4px;
          background: linear-gradient(145deg, color-mix(in srgb, var(--cp-c) 52%, white 48%), color-mix(in srgb, var(--cp-b) 65%, white 35%));
          box-shadow: 0 0 0 1px rgba(255,255,255,0.35), 0 12px 22px color-mix(in srgb, var(--cp-b) 22%, transparent);
          clip-path: polygon(50% 0%, 92% 18%, 100% 52%, 84% 92%, 50% 100%, 16% 92%, 0% 52%, 8% 18%);
          opacity: 0;
          transform: rotate(14deg);
          pointer-events: none;
        }

        .scene--accessory-prism .accessory-prism-gem { opacity: 0.95; }

        .cos-prev--legendary .scene--accessory-prism .accessory-prism-gem {
          background: conic-gradient(from 220deg, #22d3ee, #60a5fa, #a855f7, #f472b6, #f59e0b, #22d3ee);
        }

        .accessory-prism-spark {
          position: absolute;
          width: 2px;
          height: 2px;
          border-radius: 999px;
          background: rgba(255,255,255,0.95);
          opacity: 0;
          box-shadow: 0 0 12px rgba(34,211,238,0.45), 0 0 18px rgba(168,85,247,0.38);
          animation: prism-preview-spark calc(var(--cp-speed) * 0.52) ease-in-out infinite;
          pointer-events: none;
        }
        .accessory-prism-spark--1 { left: 50%; top: 6px; margin-left: -18px; animation-delay: -0.2s; }
        .accessory-prism-spark--2 { left: 50%; top: 22px; margin-left: 18px; animation-delay: -1.0s; }
        .accessory-prism-spark--3 { left: 50%; top: 12px; margin-left: 6px; animation-delay: -1.7s; }

        .cos-prev--legendary .scene--accessory-prism .accessory-prism-spark { opacity: 1; }
        .cos-prev--epic .scene--accessory-prism .accessory-prism-spark { opacity: 0.65; }

        @keyframes prism-preview-spark {
          0% { transform: scale(0.8); opacity: 0; }
          22% { opacity: 0.9; }
          55% { opacity: 0.35; }
          100% { transform: scale(1.6); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .cos-prev--legendary .scene--accessory-prism .accessory-crown,
          .scene--accessory-prism .accessory-crown::after,
          .accessory-prism-spark {
            animation: none !important;
          }
        }

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
          display: none;
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

        @keyframes xp-prism-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes xp-micro {
          0% { transform: translate3d(0, 0, 0) scale(0.8); opacity: 0; }
          22% { opacity: 0.9; }
          55% { transform: translate3d(-12px, -3px, 0) scale(1.25); opacity: 0.4; }
          100% { transform: translate3d(-20px, -6px, 0) scale(1.6); opacity: 0; }
        }

        @keyframes supernova-pulse {
          0%, 100% { opacity: 0.32; transform: translateY(0) scale(0.94); }
          50% { opacity: 0.62; transform: translateY(-2px) scale(1.04); }
        }

        @keyframes code-rain {
          0% { transform: translateY(-18px); opacity: 0; }
          18% { opacity: 0.92; }
          82% { opacity: 0.92; }
          100% { transform: translateY(18px); opacity: 0; }
        }

        @keyframes circuit-pulse {
          0%, 100% { opacity: 0.36; transform: scaleX(0.94); }
          50% { opacity: 0.9; transform: scaleX(1); }
        }

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

        @keyframes flame-sway {
          0%, 100% { transform: rotate(-2deg) translateY(0); }
          25% { transform: rotate(1deg) translateY(-1px); }
          50% { transform: rotate(3deg) translateY(-2px); }
          75% { transform: rotate(-1deg) translateY(-1px); }
        }

        @keyframes flame-tip-flicker {
          0% { transform: translateX(-50%) rotate(-2deg) translateY(0) scaleX(0.99) scaleY(0.98); }
          11% { transform: translateX(-50%) rotate(2.5deg) translateY(-1px) scaleX(1.01) scaleY(1.03); }
          23% { transform: translateX(-50%) rotate(-1.2deg) translateY(-2px) scaleX(0.98) scaleY(0.95); }
          37% { transform: translateX(-50%) rotate(3.6deg) translateY(-1px) scaleX(1.02) scaleY(1.07); }
          51% { transform: translateX(-50%) rotate(-2.8deg) translateY(-3px) scaleX(0.97) scaleY(0.93); }
          66% { transform: translateX(-50%) rotate(1.8deg) translateY(-1px) scaleX(1.01) scaleY(1.04); }
          81% { transform: translateX(-50%) rotate(-3.2deg) translateY(-2px) scaleX(0.98) scaleY(0.94); }
          100% { transform: translateX(-50%) rotate(-2deg) translateY(0) scaleX(0.99) scaleY(0.98); }
        }

        @keyframes core-glow {
          0%, 100% { transform: scale(0.94); opacity: 0.88; }
          50% { transform: scale(1.06); opacity: 1; }
        }

        @keyframes ash-dot-rise {
          0% { transform: translate3d(0, 0, 0) scale(0.9); opacity: 0; }
          18% { opacity: 0.75; }
          55% { transform: translate3d(-1px, -8px, 0) scale(1); opacity: 0.6; }
          100% { transform: translate3d(1px, -16px, 0) scale(0.7); opacity: 0; }
        }

        @keyframes flame-flicker {
          0% { transform: scaleX(0.92) scaleY(0.84) translateY(0) rotate(-2deg); opacity: 0.84; }
          22% { transform: scaleX(1.02) scaleY(1.08) translateY(-3px) rotate(1deg); opacity: 1; }
          48% { transform: scaleX(0.96) scaleY(0.92) translateY(-1px) rotate(-1deg); opacity: 0.9; }
          74% { transform: scaleX(1.04) scaleY(1.12) translateY(-4px) rotate(2deg); opacity: 1; }
          100% { transform: scaleX(0.92) scaleY(0.84) translateY(0) rotate(-2deg); opacity: 0.84; }
        }

        @keyframes flame-tongue {
          0%, 100% { transform: scaleY(0.82) rotate(-7deg); opacity: 0.7; }
          30% { transform: scaleY(1.06) rotate(3deg); opacity: 0.94; }
          58% { transform: scaleY(0.9) rotate(-2deg); opacity: 0.82; }
          78% { transform: scaleY(1.12) rotate(8deg); opacity: 0.96; }
        }

        @keyframes heat-shimmer {
          0%, 100% { transform: translateY(0) scaleX(0.94) scaleY(0.98); opacity: 0.46; }
          50% { transform: translateY(-3px) scaleX(1.04) scaleY(1.02); opacity: 0.76; }
        }

        @keyframes ash-rise {
          0% { transform: translate3d(0, 0, 0) scale(0.9); opacity: 0.78; }
          40% { transform: translate3d(-2px, -10px, 0) scale(1); opacity: 0.66; }
          80% { transform: translate3d(2px, -22px, 0) scale(0.85); opacity: 0.4; }
          100% { transform: translate3d(0, -30px, 0) scale(0.7); opacity: 0; }
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
