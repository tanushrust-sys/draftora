'use client';

import { useEffect, useMemo, useState } from 'react';
import { useEquippedCosmetics } from '@/app/context/EquippedCosmeticsContext';
import type { CosmeticRarity } from '@/app/lib/rewards/catalog';
import {
  FIRE_THEMES_BY_RARITY,
  FIRE_THEME_UPDATED_EVENT,
  getSavedFireThemeIndex,
  type FireThemeUpdatedDetail,
} from '@/app/lib/rewards/fire-theme';

export default function EquippedFireIcon({
  size = 16,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const cosmetics = useEquippedCosmetics();
  const equippedStreak = cosmetics?.equippedItemsByCategory?.streak_effects ?? null;
  const rarity: CosmeticRarity = equippedStreak?.rarity ?? 'common';
  const fireThemeItemId = equippedStreak?.id ?? null;
  const themes = FIRE_THEMES_BY_RARITY[rarity];
  const [themeIndex, setThemeIndex] = useState(0);

  useEffect(() => {
    const next = getSavedFireThemeIndex(rarity, { itemId: fireThemeItemId });
    setThemeIndex(next % themes.length);
  }, [fireThemeItemId, rarity, themes.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onTheme = (event: Event) => {
      const custom = event as CustomEvent<FireThemeUpdatedDetail>;
      const eventRarity = custom.detail?.rarity;
      if (eventRarity && eventRarity !== rarity) return;
      const eventItemId = custom.detail?.itemId ?? null;
      if (eventItemId && fireThemeItemId && eventItemId !== fireThemeItemId) return;
      const next = getSavedFireThemeIndex(rarity, { itemId: fireThemeItemId });
      setThemeIndex(next % themes.length);
    };
    window.addEventListener(FIRE_THEME_UPDATED_EVENT, onTheme as EventListener);
    return () => window.removeEventListener(FIRE_THEME_UPDATED_EVENT, onTheme as EventListener);
  }, [fireThemeItemId, rarity, themes.length]);

  const active = useMemo(() => themes[themeIndex % themes.length] ?? themes[0], [themes, themeIndex]);
  const px = Math.max(10, size);
  const w = Math.round(px * 0.92);
  const h = Math.round(px * 1.15);
  const core = Math.max(4, Math.round(px * 0.26));

  return (
    <span
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        width: w,
        height: h,
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      aria-hidden="true"
    >
      <img
        src="/rewards/fire-base.png"
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: active.filter,
          transformOrigin: '50% 86%',
          animation: 'eq-fire-sway 1.35s ease-in-out infinite',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />
      <span
        style={{
          position: 'absolute',
          inset: 0,
          background: active.recolor,
          opacity: active.recolorOpacity,
          mixBlendMode: rarity === 'rare' ? 'color' : 'screen',
          WebkitMaskImage: "url('/rewards/fire-base.png')",
          WebkitMaskSize: '100% 100%',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskImage: "url('/rewards/fire-base.png')",
          maskSize: '100% 100%',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
          animation: 'eq-fire-sway 1.35s ease-in-out infinite',
          transformOrigin: '50% 86%',
        }}
      />
      <span
        style={{
          position: 'absolute',
          left: '50%',
          bottom: Math.max(0, Math.round(px * 0.06)),
          width: core,
          height: core + 1,
          marginLeft: -Math.round(core / 2),
          borderRadius: '50% 50% 42% 42% / 66% 66% 34% 34%',
          background: active.core,
          boxShadow: active.coreShadow,
          animation: 'eq-fire-core 0.9s ease-in-out infinite',
        }}
      />
      <span style={{ position: 'absolute', left: '46%', bottom: Math.round(px * 0.55), width: 2, height: 2, borderRadius: 999, background: 'rgba(17,24,39,0.75)', animation: 'eq-fire-ash 1.2s linear infinite' }} />
      <span style={{ position: 'absolute', left: '56%', bottom: Math.round(px * 0.47), width: 2, height: 2, borderRadius: 999, background: 'rgba(17,24,39,0.7)', animation: 'eq-fire-ash 1.2s linear infinite -0.5s' }} />
      <style jsx>{`
        @keyframes eq-fire-sway {
          0%, 100% { transform: rotate(-2deg) translateY(0); }
          50% { transform: rotate(2.8deg) translateY(-1px); }
        }
        @keyframes eq-fire-core {
          0%, 100% { transform: scale(0.95); opacity: 0.88; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes eq-fire-ash {
          0% { transform: translate3d(0,0,0) scale(0.8); opacity: 0; }
          20% { opacity: 0.75; }
          100% { transform: translate3d(0,-10px,0) scale(0.6); opacity: 0; }
        }
      `}</style>
    </span>
  );
}
