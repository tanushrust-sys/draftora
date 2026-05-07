import type { CosmeticRarity } from '@/app/lib/rewards/catalog';

export type FireTheme = {
  label: string;
  filter: string;
  core: string;
  coreShadow: string;
  recolor: string;
  recolorOpacity: number;
};

export const FIRE_THEMES_BY_RARITY: Record<CosmeticRarity, FireTheme[]> = {
  common: [
    {
      label: 'Classic',
      filter: 'saturate(1) hue-rotate(0deg) brightness(1) contrast(1.02)',
      core: 'radial-gradient(circle at 50% 28%, #fffde7 0%, #fff59d 42%, #fde047 78%, #facc15 100%)',
      coreShadow: '0 0 12px rgba(253, 224, 71, 0.7), 0 0 22px rgba(250, 204, 21, 0.38), inset 0 0 4px rgba(255, 255, 255, 0.68)',
      recolor: 'linear-gradient(180deg, #f97316 0%, #f59e0b 55%, #fde047 100%)',
      recolorOpacity: 0,
    },
  ],
  rare: [
    { label: 'Amber', filter: 'saturate(1.08) hue-rotate(0deg) brightness(1.03) contrast(1.06)', core: 'radial-gradient(circle at 50% 28%, #fffde7 0%, #fff59d 38%, #fde047 70%, #f59e0b 100%)', coreShadow: '0 0 12px rgba(253, 224, 71, 0.66), 0 0 20px rgba(245, 158, 11, 0.35), inset 0 0 4px rgba(255,255,255,0.65)', recolor: 'linear-gradient(180deg, #fb923c 0%, #f59e0b 52%, #fde047 100%)', recolorOpacity: 0.06 },
  ],
  epic: [
    { label: 'Solar', filter: 'saturate(1.18) hue-rotate(6deg) brightness(1.07) contrast(1.12)', core: 'radial-gradient(circle at 50% 28%, #fffde7 0%, #fef08a 34%, #fde047 56%, #f59e0b 100%)', coreShadow: '0 0 14px rgba(253, 224, 71, 0.75), 0 0 24px rgba(245, 158, 11, 0.4), inset 0 0 4px rgba(255,255,255,0.7)', recolor: 'linear-gradient(180deg, #ff6a00 0%, #ffb300 45%, #fff200 100%)', recolorOpacity: 0.58 },
    { label: 'Toxic', filter: 'saturate(1.2) hue-rotate(52deg) brightness(1.06) contrast(1.14)', core: 'radial-gradient(circle at 50% 28%, #f7fee7 0%, #d9f99d 34%, #84cc16 56%, #4d7c0f 100%)', coreShadow: '0 0 14px rgba(132, 204, 22, 0.72), 0 0 24px rgba(77, 124, 15, 0.42), inset 0 0 4px rgba(255,255,255,0.7)', recolor: 'linear-gradient(180deg, #22c55e 0%, #84cc16 48%, #bef264 100%)', recolorOpacity: 0.62 },
    { label: 'Electric', filter: 'saturate(1.22) hue-rotate(168deg) brightness(1.07) contrast(1.14)', core: 'radial-gradient(circle at 50% 28%, #ecfeff 0%, #a5f3fc 34%, #06b6d4 56%, #155e75 100%)', coreShadow: '0 0 14px rgba(6, 182, 212, 0.72), 0 0 24px rgba(21, 94, 117, 0.42), inset 0 0 4px rgba(255,255,255,0.7)', recolor: 'linear-gradient(180deg, #0ea5e9 0%, #06b6d4 46%, #67e8f9 100%)', recolorOpacity: 0.64 },
    { label: 'Violet', filter: 'saturate(1.22) hue-rotate(250deg) brightness(1.07) contrast(1.14)', core: 'radial-gradient(circle at 50% 28%, #faf5ff 0%, #e9d5ff 34%, #a855f7 56%, #6b21a8 100%)', coreShadow: '0 0 14px rgba(168, 85, 247, 0.72), 0 0 24px rgba(107, 33, 168, 0.42), inset 0 0 4px rgba(255,255,255,0.7)', recolor: 'linear-gradient(180deg, #7c3aed 0%, #a855f7 48%, #d8b4fe 100%)', recolorOpacity: 0.64 },
  ],
  legendary: [
    { label: 'Inferno', filter: 'saturate(1.24) hue-rotate(12deg) brightness(1.1) contrast(1.16)', core: 'radial-gradient(circle at 50% 28%, #fffde7 0%, #fef08a 30%, #fde047 54%, #f59e0b 100%)', coreShadow: '0 0 16px rgba(253, 224, 71, 0.84), 0 0 26px rgba(251, 146, 60, 0.42), inset 0 0 5px rgba(255,255,255,0.74)', recolor: 'linear-gradient(180deg, #ef4444 0%, #f97316 34%, #f59e0b 62%, #fef08a 100%)', recolorOpacity: 0.76 },
    { label: 'Emerald', filter: 'saturate(1.28) hue-rotate(64deg) brightness(1.1) contrast(1.16)', core: 'radial-gradient(circle at 50% 28%, #f7fee7 0%, #d9f99d 30%, #84cc16 54%, #15803d 100%)', coreShadow: '0 0 16px rgba(132, 204, 22, 0.82), 0 0 26px rgba(21, 128, 61, 0.44), inset 0 0 5px rgba(255,255,255,0.74)', recolor: 'linear-gradient(180deg, #10b981 0%, #22c55e 38%, #84cc16 70%, #d9f99d 100%)', recolorOpacity: 0.78 },
    { label: 'Frost', filter: 'saturate(1.3) hue-rotate(180deg) brightness(1.11) contrast(1.16)', core: 'radial-gradient(circle at 50% 28%, #ecfeff 0%, #a5f3fc 30%, #06b6d4 54%, #0f766e 100%)', coreShadow: '0 0 16px rgba(6, 182, 212, 0.82), 0 0 26px rgba(15, 118, 110, 0.44), inset 0 0 5px rgba(255,255,255,0.74)', recolor: 'linear-gradient(180deg, #38bdf8 0%, #06b6d4 40%, #22d3ee 72%, #cffafe 100%)', recolorOpacity: 0.8 },
    { label: 'Royal', filter: 'saturate(1.3) hue-rotate(272deg) brightness(1.12) contrast(1.16)', core: 'radial-gradient(circle at 50% 28%, #faf5ff 0%, #e9d5ff 30%, #a855f7 54%, #7e22ce 100%)', coreShadow: '0 0 16px rgba(168, 85, 247, 0.84), 0 0 26px rgba(126, 34, 206, 0.44), inset 0 0 5px rgba(255,255,255,0.74)', recolor: 'linear-gradient(180deg, #8b5cf6 0%, #a855f7 40%, #c084fc 72%, #f5d0fe 100%)', recolorOpacity: 0.8 },
  ],
};

export const FIRE_THEME_UPDATED_EVENT = 'draftora:fire-theme-updated';

export type FireThemeScope = {
  itemId?: string | null;
};

export type FireThemeUpdatedDetail = {
  rarity: CosmeticRarity;
  index: number;
  itemId?: string | null;
};

function normalizeScope(scope?: FireThemeScope) {
  const itemId = typeof scope?.itemId === 'string' ? scope.itemId.trim() : '';
  return itemId.length > 0 ? itemId : null;
}

function storageKey(rarity: CosmeticRarity, scope?: FireThemeScope) {
  const itemId = normalizeScope(scope);
  if (itemId) {
    return `draftora:fire-theme-index:${rarity}:${itemId}`;
  }
  return `draftora:fire-theme-index:${rarity}`;
}

export function getSavedFireThemeIndex(rarity: CosmeticRarity, scope?: FireThemeScope): number {
  if (typeof window === 'undefined') return 0;
  const scopedKey = storageKey(rarity, scope);
  const rawScoped = window.localStorage.getItem(scopedKey);
  const rawFallback = window.localStorage.getItem(storageKey(rarity));
  const raw = rawScoped ?? rawFallback;
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export function saveFireThemeIndex(rarity: CosmeticRarity, index: number, scope?: FireThemeScope) {
  if (typeof window === 'undefined') return;
  const normalized = Math.max(0, Math.floor(index));
  window.localStorage.setItem(storageKey(rarity), String(normalized));
  const scopedItemId = normalizeScope(scope);
  if (scopedItemId) {
    window.localStorage.setItem(storageKey(rarity, { itemId: scopedItemId }), String(normalized));
  }
  window.dispatchEvent(
    new CustomEvent<FireThemeUpdatedDetail>(FIRE_THEME_UPDATED_EVENT, {
      detail: { rarity, index: normalized, itemId: scopedItemId },
    }),
  );
}
