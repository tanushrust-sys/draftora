import { NextRequest, NextResponse } from 'next/server';
import { requireRouteAuth } from '@/app/lib/server-auth';
import {
  COSMETIC_CATEGORIES,
  EQUIPPED_SLOT_BY_CATEGORY,
  SHOP_INVENTORY_CATEGORIES,
  createEmptyEquippedState,
  type CosmeticCategory,
  type EquippedSlotColumn,
} from '@/app/lib/rewards/catalog';
import { ensureCurrentWeeklyRotation } from '@/app/lib/rewards/shop';

export const dynamic = 'force-dynamic';

type EquippedRow = Record<EquippedSlotColumn, string | null>;

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
  const { userId, profile } = auth.auth;

  try {
    const rotation = await ensureCurrentWeeklyRotation(adminSupabase);

    const { data: ownedRows, error: ownedError } = await adminSupabase
      .from('user_inventory')
      .select('item_id')
      .eq('user_id', userId);

    if (ownedError) throw ownedError;

    const ownedSet = new Set(((ownedRows ?? []) as Array<{ item_id: string }>).map((row) => row.item_id));

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

    const items = rotation.items
      .filter((entry) => SHOP_INVENTORY_CATEGORIES.includes(entry.item.category))
      .map((entry) => {
        const owned = ownedSet.has(entry.item.id);
        const equippedItem = equippedByCategory[entry.item.category] === entry.item.id;
        return {
          id: entry.id,
          slotType: entry.slotType,
          position: entry.position,
          featured: entry.featured,
          affordable: entry.affordable,
          price: entry.price,
          owned,
          equipped: owned && equippedItem,
          item: entry.item,
        };
      });

    return NextResponse.json({
      rotation: rotation.rotation,
      items,
      equippedByCategory,
      xpBalance: profile.xp ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load current shop.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
