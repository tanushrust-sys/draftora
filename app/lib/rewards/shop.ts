import { createHash } from 'crypto';
import {
  ensureCosmeticCatalogSeeded,
  isCosmeticCategory,
  SHOP_INVENTORY_CATEGORIES,
  type CosmeticCategory,
  type CosmeticRarity,
} from '@/app/lib/rewards/catalog';

type SupabaseAdmin = {
  from: (table: string) => {
    select: (...args: any[]) => any;
    insert: (values: Record<string, unknown> | Array<Record<string, unknown>>) => any;
    upsert: (values: Record<string, unknown> | Array<Record<string, unknown>>, options?: Record<string, unknown>) => any;
    delete: () => any;
  };
};

type CatalogItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: CosmeticCategory;
  rarity: CosmeticRarity;
  price_coins: number;
  asset_ref: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  is_seasonal: boolean;
  season_key: string | null;
};

type RotationRow = {
  id: string;
  week_start: string;
  week_end: string;
  seed: string;
  fallback_generated: boolean;
};

type WeeklyShopItemRow = {
  id: string;
  slot_type: 'affordable' | 'featured' | 'standard';
  position: number;
  is_featured: boolean;
  price_override_coins: number | null;
  cosmetic_items: CatalogItem | CatalogItem[] | null;
};

type ShopRotationItem = {
  id: string;
  slotType: 'affordable' | 'featured' | 'standard';
  position: number;
  featured: boolean;
  affordable: boolean;
  price: number;
  item: CatalogItem;
};

export type CurrentShopRotation = {
  rotation: {
    id: string;
    weekStart: string;
    weekEnd: string;
    expiresAt: string;
    generatedFallback: boolean;
    seed: string;
  };
  items: ShopRotationItem[];
};

const ROTATION_SIZE = 8;
const FEATURED_DISCOUNT = 0.9;

function toDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mondayUtc(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function nextMondayUtc(date: Date) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 7);
  return next;
}

function seededNumber(seed: string) {
  const hex = createHash('sha256').update(seed).digest('hex').slice(0, 12);
  return parseInt(hex, 16);
}

function seededSort<T>(rows: T[], keyFn: (row: T) => string, seed: string) {
  return [...rows].sort((a, b) => {
    const aScore = seededNumber(`${seed}:${keyFn(a)}`);
    const bScore = seededNumber(`${seed}:${keyFn(b)}`);
    return aScore - bScore;
  });
}

function normalizeCatalogItem(value: CatalogItem | CatalogItem[] | null) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function toPrice(value: number | null | undefined, fallback: number) {
  const next = Number(value ?? fallback);
  if (!Number.isFinite(next) || next <= 0) return fallback;
  return Math.round(next);
}

function maybeDuplicateError(error: unknown) {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : '';
  return message.toLowerCase().includes('duplicate key');
}

function buildRotationRows(catalog: CatalogItem[], seed: string) {
  const commonItems = catalog.filter((item) => item.rarity === 'common');
  const featuredPool = catalog.filter((item) => item.rarity === 'legendary' || item.rarity === 'epic' || item.rarity === 'rare');

  const chosenIds = new Set<string>();
  const picked: Array<{
    item: CatalogItem;
    slot_type: 'affordable' | 'featured' | 'standard';
    is_featured: boolean;
    price_override_coins: number | null;
  }> = [];

  const affordableCandidate = seededSort(commonItems, (item) => `${item.id}:affordable`, seed)
    .sort((a, b) => a.price_coins - b.price_coins)[0];

  if (affordableCandidate) {
    chosenIds.add(affordableCandidate.id);
    picked.push({
      item: affordableCandidate,
      slot_type: 'affordable',
      is_featured: false,
      price_override_coins: null,
    });
  }

  const featuredCandidate = seededSort(featuredPool, (item) => `${item.id}:featured`, seed)
    .find((item) => !chosenIds.has(item.id));

  if (featuredCandidate) {
    chosenIds.add(featuredCandidate.id);
    picked.push({
      item: featuredCandidate,
      slot_type: 'featured',
      is_featured: true,
      price_override_coins: Math.max(60, Math.round(featuredCandidate.price_coins * FEATURED_DISCOUNT)),
    });
  }

  for (const category of SHOP_INVENTORY_CATEGORIES) {
    if (picked.length >= ROTATION_SIZE) break;
    const categoryCandidate = seededSort(
      catalog.filter((item) => item.category === category),
      (item) => `${item.id}:category:${category}`,
      seed,
    ).find((item) => !chosenIds.has(item.id));

    if (!categoryCandidate) continue;
    chosenIds.add(categoryCandidate.id);
    picked.push({
      item: categoryCandidate,
      slot_type: 'standard',
      is_featured: false,
      price_override_coins: null,
    });
  }

  const remainingPool = seededSort(catalog, (item) => `${item.id}:standard`, seed)
    .filter((item) => !chosenIds.has(item.id));

  for (const item of remainingPool) {
    if (picked.length >= ROTATION_SIZE) break;
    chosenIds.add(item.id);
    picked.push({
      item,
      slot_type: 'standard',
      is_featured: false,
      price_override_coins: null,
    });
  }

  return picked.slice(0, ROTATION_SIZE).map((entry, index) => ({
    item_id: entry.item.id,
    slot_type: entry.slot_type,
    position: index + 1,
    is_featured: entry.is_featured,
    price_override_coins: entry.price_override_coins,
  }));
}

function isRotationHealthy(items: ShopRotationItem[]) {
  if (items.length < ROTATION_SIZE) return false;
  const categorySet = new Set(items.map((item) => item.item.category));
  return SHOP_INVENTORY_CATEGORIES.every((category) => categorySet.has(category));
}

async function fetchRotationByWeekStart(adminSupabase: SupabaseAdmin, weekStart: string) {
  const { data, error } = await adminSupabase
    .from('weekly_shop_rotations')
    .select('id, week_start, week_end, seed, fallback_generated')
    .eq('week_start', weekStart)
    .maybeSingle();

  if (error) throw error;
  return (data as RotationRow | null) ?? null;
}

async function fetchRotationItems(adminSupabase: SupabaseAdmin, rotationId: string) {
  const { data, error } = await adminSupabase
    .from('weekly_shop_items')
    .select(
      [
        'id',
        'slot_type',
        'position',
        'is_featured',
        'price_override_coins',
        'cosmetic_items(id, slug, name, description, category, rarity, price_coins, asset_ref, metadata, is_active, is_seasonal, season_key)',
      ].join(', '),
    )
    .eq('rotation_id', rotationId)
    .order('position', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as WeeklyShopItemRow[])
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
      const price = toPrice(row.price_override_coins, item.price_coins);
      return {
        id: row.id,
        slotType: row.slot_type,
        position: row.position,
        featured: row.is_featured || row.slot_type === 'featured',
        affordable: row.slot_type === 'affordable',
        price,
        item,
      } satisfies ShopRotationItem;
    })
    .filter((row): row is ShopRotationItem => Boolean(row));
}

function toRotationResponse(rotation: RotationRow, items: ShopRotationItem[]): CurrentShopRotation {
  const weekEndDate = new Date(`${rotation.week_end}T00:00:00.000Z`);
  return {
    rotation: {
      id: rotation.id,
      weekStart: rotation.week_start,
      weekEnd: rotation.week_end,
      expiresAt: weekEndDate.toISOString(),
      generatedFallback: rotation.fallback_generated,
      seed: rotation.seed,
    },
    items,
  };
}

export async function ensureCurrentWeeklyRotation(adminSupabase: SupabaseAdmin): Promise<CurrentShopRotation> {
  await ensureCosmeticCatalogSeeded(adminSupabase);

  const weekStartDate = mondayUtc();
  const weekEndDate = nextMondayUtc(weekStartDate);
  const weekStart = toDateKey(weekStartDate);
  const weekEnd = toDateKey(weekEndDate);

  const getActiveCatalog = async () => {
    const { data: catalogRows, error: catalogError } = await adminSupabase
      .from('cosmetic_items')
      .select('id, slug, name, description, category, rarity, price_coins, asset_ref, metadata, is_active, is_seasonal, season_key')
      .eq('is_active', true)
      .in('category', SHOP_INVENTORY_CATEGORIES);
    if (catalogError) throw catalogError;
    return (catalogRows ?? []) as CatalogItem[];
  };

  const rebuildRotationItems = async (rotationId: string, seed: string) => {
    const catalog = await getActiveCatalog();
    if (catalog.length === 0) throw new Error('Cosmetic catalog is empty.');
    const rotationRows = buildRotationRows(catalog, seed);
    if (rotationRows.length === 0) throw new Error('Could not build shop rotation.');

    const { error: clearError } = await adminSupabase
      .from('weekly_shop_items')
      .delete()
      .eq('rotation_id', rotationId);
    if (clearError) throw clearError;

    const { error: insertError } = await adminSupabase
      .from('weekly_shop_items')
      .insert(rotationRows.map((row) => ({ ...row, rotation_id: rotationId })));
    if (insertError) throw insertError;
  };

  const existing = await fetchRotationByWeekStart(adminSupabase, weekStart);
  if (existing) {
    let items = await fetchRotationItems(adminSupabase, existing.id);
    if (!isRotationHealthy(items)) {
      await rebuildRotationItems(existing.id, existing.seed || `shop:${weekStart}`);
      items = await fetchRotationItems(adminSupabase, existing.id);
    }
    return toRotationResponse(existing, items);
  }

  const seed = `shop:${weekStart}`;

  const catalog = await getActiveCatalog();
  if (catalog.length === 0) {
    throw new Error('Cosmetic catalog is empty.');
  }

  const rotationRows = buildRotationRows(catalog, seed);
  if (rotationRows.length === 0) {
    throw new Error('Could not build shop rotation.');
  }

  try {
    const { data: insertedRotationRows, error: rotationInsertError } = await adminSupabase
      .from('weekly_shop_rotations')
      .insert({
        week_start: weekStart,
        week_end: weekEnd,
        seed,
        status: 'active',
        generated_by: 'lazy-fallback',
        fallback_generated: true,
      })
      .select('id, week_start, week_end, seed, fallback_generated')
      .limit(1);

    if (rotationInsertError || !insertedRotationRows?.[0]) {
      throw rotationInsertError || new Error('Could not create weekly shop rotation.');
    }

    const rotation = insertedRotationRows[0] as RotationRow;

    const { error: itemsInsertError } = await adminSupabase
      .from('weekly_shop_items')
      .insert(rotationRows.map((row) => ({ ...row, rotation_id: rotation.id })));

    if (itemsInsertError) throw itemsInsertError;

    const items = await fetchRotationItems(adminSupabase, rotation.id);
    return toRotationResponse(rotation, items);
  } catch (error) {
    if (!maybeDuplicateError(error)) throw error;

    const existingAfterRace = await fetchRotationByWeekStart(adminSupabase, weekStart);
    if (!existingAfterRace) throw error;
    const items = await fetchRotationItems(adminSupabase, existingAfterRace.id);
    return toRotationResponse(existingAfterRace, items);
  }
}
