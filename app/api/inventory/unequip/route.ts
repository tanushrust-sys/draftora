import { NextRequest, NextResponse } from 'next/server';
import { requireRouteAuth } from '@/app/lib/server-auth';
import {
  COSMETIC_CATEGORIES,
  EQUIPPED_SLOT_BY_CATEGORY,
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

  const category = categoryRaw;
  const slot = EQUIPPED_SLOT_BY_CATEGORY[category];

  const { adminSupabase } = auth;
  const { userId, profile } = auth.auth;

  try {
    const patch = {
      user_id: userId,
      [slot]: null,
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

    // Editor themes are cosmetic overlays and should not reset the user's active_theme.

    return NextResponse.json({
      ok: true,
      equipped,
      equippedByCategory: categoryFromEquipped(equipped),
      category,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not unequip cosmetic.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
