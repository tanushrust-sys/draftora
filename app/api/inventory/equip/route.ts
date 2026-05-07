import { NextRequest, NextResponse } from 'next/server';
import { requireRouteAuth } from '@/app/lib/server-auth';
import {
  COSMETIC_CATEGORIES,
  EQUIPPED_SLOT_BY_CATEGORY,
  SHOP_INVENTORY_CATEGORIES,
  createEmptyEquippedState,
  isCosmeticCategory,
  type CosmeticCategory,
  type EquippedSlotColumn,
} from '@/app/lib/rewards/catalog';

type EquippedRow = Record<EquippedSlotColumn, string | null>;

const EQUIPPED_COLUMNS = [
  'profile_badge_item_id',
  'avatar_frame_item_id',
  'dashboard_theme_item_id',
  'streak_effect_item_id',
  'xp_visual_item_id',
  'ui_custom_item_id',
].join(', ');

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function categoryFromEquipped(equipped: Record<EquippedSlotColumn, string | null>) {
  return COSMETIC_CATEGORIES.reduce((acc, category) => {
    acc[category] = equipped[EQUIPPED_SLOT_BY_CATEGORY[category]] ?? null;
    return acc;
  }, {} as Record<CosmeticCategory, string | null>);
}

export async function POST(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['student']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  if (!isObject(body)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const categoryRaw = body.category;
  if (!isCosmeticCategory(categoryRaw)) {
    return NextResponse.json({ error: 'Invalid category.' }, { status: 400 });
  }
  if (!SHOP_INVENTORY_CATEGORIES.includes(categoryRaw)) {
    return NextResponse.json({ error: 'Titles are unlocked via Title Progression, not inventory equip.' }, { status: 410 });
  }

  const itemIdRaw = body.itemId;
  if (typeof itemIdRaw !== 'string' || !looksLikeUuid(itemIdRaw)) {
    return NextResponse.json({ error: 'Invalid itemId.' }, { status: 400 });
  }

  const category = categoryRaw;
  const itemId = itemIdRaw;

  const { adminSupabase } = auth;
  const { userId } = auth.auth;

  try {
    const { data: itemRow, error: itemError } = await adminSupabase
      .from('cosmetic_items')
      .select('id, slug, name, metadata, category, is_active')
      .eq('id', itemId)
      .maybeSingle();

    if (itemError) throw itemError;

    const item = itemRow as {
      id: string;
      slug: string;
      name: string;
      metadata: Record<string, unknown> | null;
      category: CosmeticCategory;
      is_active: boolean;
    } | null;
    if (!item || !item.is_active) {
      return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
    }

    if (item.category !== category) {
      return NextResponse.json({ error: 'Item does not match this category.' }, { status: 409 });
    }

    const { data: ownedRow, error: ownedError } = await adminSupabase
      .from('user_inventory')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .maybeSingle();

    if (ownedError) throw ownedError;
    if (!ownedRow) {
      return NextResponse.json({ error: 'You do not own this item yet.' }, { status: 403 });
    }

    const slot = EQUIPPED_SLOT_BY_CATEGORY[category];
    const patch = {
      user_id: userId,
      [slot]: itemId,
      updated_at: new Date().toISOString(),
    } as Record<string, string | null>;

    const { data: equippedRow, error: equippedError } = await adminSupabase
      .from('equipped_cosmetics')
      .upsert(patch as any, { onConflict: 'user_id' })
      .select(EQUIPPED_COLUMNS)
      .single();

    if (equippedError) throw equippedError;

    const equipped = {
      ...createEmptyEquippedState(),
      ...(equippedRow as Partial<EquippedRow>),
    } as EquippedRow;

    // Editor themes are cosmetic overlays that render on top of the active theme.
    // They should not overwrite the user's actual active_theme selection.

    return NextResponse.json({
      ok: true,
      equipped,
      equippedByCategory: categoryFromEquipped(equipped),
      category,
      itemId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not equip cosmetic.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
