import { NextRequest, NextResponse } from 'next/server';
import { requireRouteAuth } from '@/app/lib/server-auth';
import {
  COSMETIC_CATEGORIES,
  EQUIPPED_SLOT_BY_CATEGORY,
  createEmptyEquippedState,
  type CosmeticCategory,
  type EquippedSlotColumn,
} from '@/app/lib/rewards/catalog';

export const dynamic = 'force-dynamic';

type EquippedRow = Record<EquippedSlotColumn, string | null>;

type CosmeticItemRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: CosmeticCategory;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  asset_ref: string;
  metadata: Record<string, unknown> | null;
};

const EQUIPPED_COLUMNS = [
  'profile_badge_item_id',
  'avatar_frame_item_id',
  'dashboard_theme_item_id',
  'streak_effect_item_id',
  'xp_visual_item_id',
  'ui_custom_item_id',
].join(', ');

function categoryFromEquipped(equipped: Record<EquippedSlotColumn, string | null>) {
  return COSMETIC_CATEGORIES.reduce((acc, category) => {
    acc[category] = equipped[EQUIPPED_SLOT_BY_CATEGORY[category]] ?? null;
    return acc;
  }, {} as Record<CosmeticCategory, string | null>);
}

export async function GET(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['student']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { adminSupabase } = auth;
  const { userId } = auth.auth;

  try {
    const { data: equippedRow, error: equippedError } = await adminSupabase
      .from('equipped_cosmetics')
      .select(EQUIPPED_COLUMNS)
      .eq('user_id', userId)
      .maybeSingle();

    if (equippedError) throw equippedError;

    const equipped = {
      ...createEmptyEquippedState(),
      ...((equippedRow ?? {}) as Partial<EquippedRow>),
    } as Record<EquippedSlotColumn, string | null>;

    const equippedByCategory = categoryFromEquipped(equipped);
    const equippedItemIds = Array.from(
      new Set(
        Object.values(equippedByCategory).filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );

    if (equippedItemIds.length === 0) {
      return NextResponse.json({
        equippedByCategory,
        equippedItemsByCategory: COSMETIC_CATEGORIES.reduce((acc, category) => {
          acc[category] = null;
          return acc;
        }, {} as Record<CosmeticCategory, null>),
      });
    }

    const { data: itemRows, error: itemError } = await adminSupabase
      .from('cosmetic_items')
      .select('id, slug, name, description, category, rarity, asset_ref, metadata')
      .in('id', equippedItemIds)
      .eq('is_active', true);

    if (itemError) throw itemError;

    const itemById = new Map<string, CosmeticItemRow>();
    for (const row of (itemRows ?? []) as CosmeticItemRow[]) {
      itemById.set(row.id, row);
    }

    const equippedItemsByCategory = COSMETIC_CATEGORIES.reduce((acc, category) => {
      const itemId = equippedByCategory[category];
      acc[category] = itemId ? (itemById.get(itemId) ?? null) : null;
      return acc;
    }, {} as Record<CosmeticCategory, CosmeticItemRow | null>);

    return NextResponse.json({
      equippedByCategory,
      equippedItemsByCategory,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load equipped cosmetics.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
