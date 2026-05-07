import { NextRequest, NextResponse } from 'next/server';
import { requireRouteAuth } from '@/app/lib/server-auth';
import {
  CATEGORY_LABELS,
  COSMETIC_CATEGORIES,
  EQUIPPED_SLOT_BY_CATEGORY,
  SHOP_INVENTORY_CATEGORIES,
  createEmptyEquippedState,
  ensureCosmeticCatalogSeeded,
  isCosmeticCategory,
  type CosmeticCategory,
  type EquippedSlotColumn,
} from '@/app/lib/rewards/catalog';

export const dynamic = 'force-dynamic';

type CatalogItemRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: CosmeticCategory;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  price_coins: number;
  asset_ref: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  is_seasonal: boolean;
  season_key: string | null;
};

type OwnedInventoryRow = {
  id: string;
  item_id: string;
  acquired_via: string;
  price_paid_coins: number;
  created_at: string;
  cosmetic_items: CatalogItemRow | CatalogItemRow[] | null;
};

type EquippedRow = {
  profile_badge_item_id: string | null;
  avatar_frame_item_id: string | null;
  dashboard_theme_item_id: string | null;
  streak_effect_item_id: string | null;
  xp_visual_item_id: string | null;
  ui_custom_item_id: string | null;
};

const EQUIPPED_COLUMNS = [
  'profile_badge_item_id',
  'avatar_frame_item_id',
  'dashboard_theme_item_id',
  'streak_effect_item_id',
  'xp_visual_item_id',
  'ui_custom_item_id',
].join(', ');

function normalizeCatalogItem(value: CatalogItemRow | CatalogItemRow[] | null) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

async function fetchOwnedInventory(adminSupabase: { from: (table: string) => any }, userId: string) {
  const { data, error } = await adminSupabase
    .from('user_inventory')
    .select([
      'id',
      'item_id',
      'acquired_via',
      'price_paid_coins',
      'created_at',
      'cosmetic_items(id, slug, name, description, category, rarity, price_coins, asset_ref, metadata, is_active, is_seasonal, season_key)',
    ].join(', '))
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as OwnedInventoryRow[];
  return rows
    .map((row) => {
      const item = normalizeCatalogItem(row.cosmetic_items);
      if (
        !item
        || !item.is_active
        || !isCosmeticCategory(item.category)
        || !SHOP_INVENTORY_CATEGORIES.includes(item.category)
      ) {
        return null;
      }
      return {
        id: row.id,
        itemId: row.item_id,
        acquiredVia: row.acquired_via,
        pricePaidXp: row.price_paid_coins,
        createdAt: row.created_at,
        item: {
          ...item,
          price_xp: item.price_coins,
        },
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
}

async function grantStarterPackIfNeeded(adminSupabase: { from: (table: string) => any }, userId: string) {
  const { data: commonItems, error: commonItemsError } = await adminSupabase
    .from('cosmetic_items')
    .select('id, category, rarity, created_at')
    .eq('rarity', 'common')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (commonItemsError) throw commonItemsError;

  const firstByCategory = new Map<CosmeticCategory, string>();
  for (const row of (commonItems ?? []) as Array<{ id: string; category: CosmeticCategory }>) {
    if (!firstByCategory.has(row.category)) {
      firstByCategory.set(row.category, row.id);
    }
  }

  const starterRows = SHOP_INVENTORY_CATEGORIES
    .map((category) => {
      const itemId = firstByCategory.get(category);
      if (!itemId) return null;
      return {
        user_id: userId,
        item_id: itemId,
        acquired_via: 'starter_pack',
        price_paid_coins: 0,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (starterRows.length === 0) return;

  const { error: insertError } = await adminSupabase
    .from('user_inventory')
    .insert(starterRows);

  if (insertError) throw insertError;
}

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
    await ensureCosmeticCatalogSeeded(adminSupabase);
    let ownedItems = await fetchOwnedInventory(adminSupabase, userId);
    if (ownedItems.length === 0) {
      await grantStarterPackIfNeeded(adminSupabase, userId);
      ownedItems = await fetchOwnedInventory(adminSupabase, userId);
    }

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

    const categoryCounts = new Map<CosmeticCategory, { category: CosmeticCategory; label: string; ownedCount: number }>();
    for (const category of SHOP_INVENTORY_CATEGORIES) {
      categoryCounts.set(category, {
        category,
        label: CATEGORY_LABELS[category],
        ownedCount: 0,
      });
    }

    for (const inventoryItem of ownedItems) {
      const category = inventoryItem.item.category;
      const next = categoryCounts.get(category);
      if (next) {
        next.ownedCount += 1;
      }
    }

    return NextResponse.json({
      ownedItems,
      equipped,
      equippedByCategory: categoryFromEquipped(equipped),
      categories: Array.from(categoryCounts.values()),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load inventory.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
