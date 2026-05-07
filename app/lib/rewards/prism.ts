import type { EquippedCosmeticItem } from '@/app/context/EquippedCosmeticsContext';

export function isPrismAccessory(item: EquippedCosmeticItem | null | undefined) {
  if (!item) return false;
  const name = (item.name ?? '').toLowerCase();
  const slug = (item.slug ?? '').toLowerCase();
  const collection = typeof item.metadata?.collection === 'string' ? item.metadata.collection.toLowerCase() : '';
  return name.includes('prism') || slug.includes('prism') || collection === 'prism';
}

