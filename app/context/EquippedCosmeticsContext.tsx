'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { CosmeticCategory } from '@/app/lib/rewards/catalog';

export type EquippedCosmeticItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: CosmeticCategory;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  asset_ref?: string;
  metadata?: Record<string, unknown>;
};

type EquippedCosmeticsContextValue = {
  equippedItemsByCategory: Record<CosmeticCategory, EquippedCosmeticItem | null>;
};

const EquippedCosmeticsContext = createContext<EquippedCosmeticsContextValue | null>(null);

export function EquippedCosmeticsProvider({
  value,
  children,
}: {
  value: EquippedCosmeticsContextValue;
  children: ReactNode;
}) {
  return (
    <EquippedCosmeticsContext.Provider value={value}>
      {children}
    </EquippedCosmeticsContext.Provider>
  );
}

export function useEquippedCosmetics() {
  return useContext(EquippedCosmeticsContext);
}
