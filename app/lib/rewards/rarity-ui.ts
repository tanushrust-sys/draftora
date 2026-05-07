import type { CosmeticRarity } from '@/app/lib/rewards/catalog';

export type RarityUIStyle = {
  label: string;
  cardClass: string;
  badgeClass: string;
  previewClass: string;
  buttonClass: string;
  animationClass: string;
  accent: string;
};

export const rarityConfig: Record<CosmeticRarity, RarityUIStyle> = {
  common: {
    label: 'Common',
    cardClass: 'shop-rarity-card--common',
    badgeClass: 'shop-rarity-badge--common',
    previewClass: 'shop-rarity-preview--common',
    buttonClass: 'shop-rarity-button--common',
    animationClass: 'shop-rarity-anim--common',
    accent: '#2563eb',
  },
  rare: {
    label: 'Rare',
    cardClass: 'shop-rarity-card--rare',
    badgeClass: 'shop-rarity-badge--rare',
    previewClass: 'shop-rarity-preview--rare',
    buttonClass: 'shop-rarity-button--rare',
    animationClass: 'shop-rarity-anim--rare',
    accent: '#0891b2',
  },
  epic: {
    label: 'Epic',
    cardClass: 'shop-rarity-card--epic',
    badgeClass: 'shop-rarity-badge--epic',
    previewClass: 'shop-rarity-preview--epic',
    buttonClass: 'shop-rarity-button--epic',
    animationClass: 'shop-rarity-anim--epic',
    accent: '#9333ea',
  },
  legendary: {
    label: 'Legendary',
    cardClass: 'shop-rarity-card--legendary',
    badgeClass: 'shop-rarity-badge--legendary',
    previewClass: 'shop-rarity-preview--legendary',
    buttonClass: 'shop-rarity-button--legendary',
    animationClass: 'shop-rarity-anim--legendary',
    accent: '#ea580c',
  },
};

export function getRarityStyles(rarity: CosmeticRarity) {
  return rarityConfig[rarity];
}
