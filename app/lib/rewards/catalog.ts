export type CosmeticCategory =
  | 'editor_themes'
  | 'profile_frames'
  | 'badges'
  | 'streak_effects'
  | 'xp_visuals'
  | 'ui_custom';

export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type EquippedSlotColumn =
  | 'profile_badge_item_id'
  | 'avatar_frame_item_id'
  | 'dashboard_theme_item_id'
  | 'streak_effect_item_id'
  | 'xp_visual_item_id'
  | 'ui_custom_item_id';

export type CatalogItem = {
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

type CollectionSeed = {
  name: string;
  flavor: string;
};

type CategoryBlueprint = {
  series: CollectionSeed[];
  suffix: Record<CosmeticRarity, string>;
  categoryLine: string;
};

const PRICE_BY_RARITY: Record<CosmeticRarity, number> = {
  common: 60,
  rare: 180,
  epic: 420,
  legendary: 900,
};

const RARITY_LINE: Record<CosmeticRarity, string> = {
  common: 'Built for daily focus with subtle polish.',
  rare: 'Adds stronger contrast and motion while staying classroom-safe.',
  epic: 'Cinematic visual language with expressive depth.',
  legendary: 'High-impact signature finish with premium animation cues.',
};

const RARITY_INDEX: Record<CosmeticRarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

const CATALOG_QUALITY_VERSION = '2026-05-premium-v2';

export const COSMETIC_CATEGORIES: CosmeticCategory[] = [
  'editor_themes',
  'profile_frames',
  'badges',
  'streak_effects',
  'xp_visuals',
  'ui_custom',
];

export const SHOP_INVENTORY_CATEGORIES = COSMETIC_CATEGORIES;

export const COSMETIC_RARITIES: CosmeticRarity[] = ['common', 'rare', 'epic', 'legendary'];

export const EQUIPPED_SLOT_BY_CATEGORY: Record<CosmeticCategory, EquippedSlotColumn> = {
  editor_themes: 'dashboard_theme_item_id',
  profile_frames: 'avatar_frame_item_id',
  badges: 'profile_badge_item_id',
  streak_effects: 'streak_effect_item_id',
  xp_visuals: 'xp_visual_item_id',
  ui_custom: 'ui_custom_item_id',
};

export function isCosmeticCategory(value: unknown): value is CosmeticCategory {
  return typeof value === 'string' && COSMETIC_CATEGORIES.includes(value as CosmeticCategory);
}

export function isCosmeticRarity(value: unknown): value is CosmeticRarity {
  return typeof value === 'string' && COSMETIC_RARITIES.includes(value as CosmeticRarity);
}

export function createEmptyEquippedState() {
  return {
    profile_badge_item_id: null,
    avatar_frame_item_id: null,
    dashboard_theme_item_id: null,
    streak_effect_item_id: null,
    xp_visual_item_id: null,
    ui_custom_item_id: null,
  } as Record<EquippedSlotColumn, string | null>;
}

export const CATEGORY_LABELS: Record<CosmeticCategory, string> = {
  editor_themes: 'Editor Themes',
  profile_frames: 'Profile Accessories',
  badges: 'Badges',
  streak_effects: 'Fire Auras',
  xp_visuals: 'XP Visuals',
  ui_custom: 'UI Custom',
};

const DASHBOARD_THEME_VARIANTS = [
  'cloud-atlas',
  'midnight-blue',
  'rose-glow',
  'forest-moss',
  'sunset-glow',
  'midnight-bloom',
] as const;

export type DashboardThemeVariant = (typeof DASHBOARD_THEME_VARIANTS)[number];

function numberFromUnknown(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function resolveDashboardThemeFromCosmetic(item: {
  id?: string;
  slug?: string;
  metadata?: Record<string, unknown> | null;
}) {
  const metaIndex = numberFromUnknown(item.metadata?.collection_index);
  const slug = item.slug ?? '';
  const base = (metaIndex > 0 ? metaIndex : slug.length + (item.id?.length ?? 0)) - 1;
  const safeIndex = ((base % DASHBOARD_THEME_VARIANTS.length) + DASHBOARD_THEME_VARIANTS.length) % DASHBOARD_THEME_VARIANTS.length;
  return DASHBOARD_THEME_VARIANTS[safeIndex];
}

const STREAK_FIRE_NAME_BY_RARITY: Record<CosmeticRarity, string> = {
  common: 'Common Fire',
  rare: 'Rare Fire',
  epic: 'Epic Fire',
  legendary: 'Legendary Fire',
};

const STREAK_FIRE_DESCRIPTION_BY_RARITY: Record<CosmeticRarity, string> = {
  common: 'A small soft flame aura that adds subtle streak intensity.',
  rare: 'A brighter, dynamic fire aura with a lively flicker and small sparks.',
  epic: 'A large blazing flame aura with a glowing core, fast embers, and strong motion.',
  legendary: 'An unstoppable blazing aura that shows peak streak mastery.',
};

const CATALOG_BLUEPRINTS: Record<CosmeticCategory, CategoryBlueprint> = {
  editor_themes: {
    series: [
      { name: 'Atlas', flavor: 'Balanced neutrals for confident drafting.' },
      { name: 'Harbor', flavor: 'Cool coastal tones that reduce visual noise.' },
      { name: 'Cedar', flavor: 'Warm organic palette tuned for long sessions.' },
      { name: 'Solstice', flavor: 'Light-forward contrast for daytime clarity.' },
      { name: 'Meridian', flavor: 'Structured color rhythm for focused planning.' },
      { name: 'Tundra', flavor: 'Crisp frosted scale with calm spacing.' },
      { name: 'Emberglass', flavor: 'Soft heat accents over a stable base layer.' },
      { name: 'Rainline', flavor: 'Muted blues with clean reading hierarchy.' },
      { name: 'Nocturne', flavor: 'Dark-first surfaces with high legibility.' },
      { name: 'Verdant', flavor: 'Green-spectrum palette for gentle attention.' },
    ],
    suffix: {
      common: 'Desk',
      rare: 'Afterglow',
      epic: 'Panorama',
      legendary: 'Parallax',
    },
    categoryLine: 'Optimized for long writing sessions and low eye strain.',
  },
  profile_frames: {
    series: [
      { name: 'Halo', flavor: 'Soft wearable halo that sits above your avatar.' },
      { name: 'Northstar', flavor: 'Star pin accessory for directional identity.' },
      { name: 'Quartz', flavor: 'Polished crystal charm for profile flair.' },
      { name: 'Aegis', flavor: 'Shield crest accessory for strong presence.' },
      { name: 'Aurora', flavor: 'Color-shifting profile ornament with shimmer.' },
      { name: 'Tidecrest', flavor: 'Wave-inspired side charm for fluid motion.' },
      { name: 'Emberline', flavor: 'Warm ember accent clipped to your avatar.' },
      { name: 'Ironwood', flavor: 'Structured carved accessory with texture cues.' },
      { name: 'Prism', flavor: 'Refracted gem accessory with balanced glow.' },
      { name: 'Zenith', flavor: 'Top-tier crown accessory for standout presence.' },
    ],
    suffix: {
      common: 'Clip',
      rare: 'Charm',
      epic: 'Ornament',
      legendary: 'Regalia',
    },
    categoryLine: 'Wearable avatar accessories shown on profile icons across nav and home.',
  },
  badges: {
    series: [
      { name: 'Trailblazer', flavor: 'Signals initiative and consistent momentum.' },
      { name: 'Draftsmith', flavor: 'Represents reliable writing craftsmanship.' },
      { name: 'Lexicon', flavor: 'Highlights strong vocabulary growth.' },
      { name: 'Pathfinder', flavor: 'Marks steady progress through challenges.' },
      { name: 'Storyforge', flavor: 'Celebrates shape, flow, and narrative control.' },
      { name: 'Clarity', flavor: 'Rewards clean expression and readable structure.' },
      { name: 'Insight', flavor: 'Recognizes thoughtful revision and reflection.' },
      { name: 'Steward', flavor: 'Represents discipline and daily consistency.' },
      { name: 'Pinnacle', flavor: 'Reserved for high-output achievement streaks.' },
      { name: 'Keystone', flavor: 'Core identity badge for dependable performance.' },
    ],
    suffix: {
      common: 'Badge',
      rare: 'Mark',
      epic: 'Emblem',
      legendary: 'Insignia',
    },
    categoryLine: 'Readable at small sizes with strong silhouette hierarchy.',
  },
  streak_effects: {
    series: [
      { name: 'Hearthline', flavor: 'Stable ember band under streak counters.' },
      { name: 'Dawnfire', flavor: 'Morning glow transition for daily return cues.' },
      { name: 'Irontrail', flavor: 'Durable kinetic trail with grounded weight.' },
      { name: 'Beaconrun', flavor: 'Lighthouse pulse that scales with streak length.' },
      { name: 'Stormlane', flavor: 'Charged lane highlights for high streak runs.' },
      { name: 'AuroraStep', flavor: 'Layered ribbon motion with gentle color drift.' },
      { name: 'Solflare', flavor: 'Solar edge pulse on milestone check-ins.' },
      { name: 'Emberstride', flavor: 'Stepped heat glow tied to consecutive days.' },
      { name: 'CelestialTrack', flavor: 'Orbit-style sparkle trail with depth cues.' },
      { name: 'Everlight', flavor: 'Continuous radiant loop for elite consistency.' },
    ],
    suffix: {
      common: 'Trail',
      rare: 'Aura',
      epic: 'Surge',
      legendary: 'Eternal',
    },
    categoryLine: 'A blazing fire aura around streak counters that scales with rarity.',
  },
  xp_visuals: {
    series: [
      { name: 'Tickflow', flavor: 'Clean numeric rise with soft easing.' },
      { name: 'Gainline', flavor: 'Progress band that tracks gains with precision.' },
      { name: 'Pulsecount', flavor: 'Rhythmic tally pop for each XP increase.' },
      { name: 'Fluxbar', flavor: 'Smooth fill wave through checkpoint thresholds.' },
      { name: 'Startrack', flavor: 'Guided streak path along level bar movement.' },
      { name: 'Arcmeter', flavor: 'Curved charge visual for milestone pacing.' },
      { name: 'Velocity', flavor: 'Fast-response counter tuned for quick feedback.' },
      { name: 'Prismgauge', flavor: 'Refracted edge highlights on major gains.' },
      { name: 'Chronocurve', flavor: 'Time-linked pulse sequence for session rhythm.' },
      { name: 'Supercharge', flavor: 'Peak-energy burst when crossing level lines.' },
    ],
    suffix: {
      common: 'Meter',
      rare: 'Pulse',
      epic: 'Vector',
      legendary: 'Overdrive',
    },
    categoryLine: 'Makes progress feedback feel immediate and satisfying.',
  },
  ui_custom: {
    series: [
      { name: 'Cleanline', flavor: 'Minimal accents with sharp interaction edges.' },
      { name: 'Hovercraft', flavor: 'Refined hover depth and layered response.' },
      { name: 'Accentforge', flavor: 'Purposeful color punches on key controls.' },
      { name: 'Rippletouch', flavor: 'Tactile click waves with smooth decay.' },
      { name: 'Flowfield', flavor: 'Motion continuity across cards and panels.' },
      { name: 'Kinetica', flavor: 'Energetic transition pace with crisp timing.' },
      { name: 'Neonrail', flavor: 'Bold line highlights for active navigation.' },
      { name: 'Silkstep', flavor: 'Ultra-smooth micro-interaction easing.' },
      { name: 'Focusgrid', flavor: 'Attention-guiding emphasis on task zones.' },
      { name: 'Lumina', flavor: 'Balanced glow treatment for premium depth.' },
    ],
    suffix: {
      common: 'UI',
      rare: 'Motion',
      epic: 'Flux',
      legendary: 'Prime',
    },
    categoryLine: 'Refines micro-interactions for a sharper dashboard feel.',
  },
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

export function getStreakEffectDisplayName(rarity: CosmeticRarity) {
  return STREAK_FIRE_NAME_BY_RARITY[rarity];
}

export function getStreakEffectDescription(rarity: CosmeticRarity) {
  return STREAK_FIRE_DESCRIPTION_BY_RARITY[rarity];
}

function buildDisplayName(category: CosmeticCategory, rarity: CosmeticRarity, seedName: string, suffix: string) {
  if (category === 'streak_effects') {
    return getStreakEffectDisplayName(rarity);
  }
  return `${seedName} ${suffix}`.trim();
}

function buildDescription(category: CosmeticCategory, rarity: CosmeticRarity, seed: CollectionSeed) {
  const blueprint = CATALOG_BLUEPRINTS[category];
  if (category === 'streak_effects') {
    return `${getStreakEffectDescription(rarity)} ${blueprint.categoryLine}`;
  }
  return `${seed.flavor} ${RARITY_LINE[rarity]} ${blueprint.categoryLine}`;
}

export function buildCosmeticCatalog() {
  const catalog: CatalogItem[] = [];

  for (const category of COSMETIC_CATEGORIES) {
    const blueprint = CATALOG_BLUEPRINTS[category];

    for (const rarity of COSMETIC_RARITIES) {
      blueprint.series.forEach((seed, index) => {
        const suffix = blueprint.suffix[rarity];
        const displayName = buildDisplayName(category, rarity, seed.name, suffix);

        catalog.push({
          slug: `${category}-${rarity}-${String(index + 1).padStart(2, '0')}`,
          name: displayName,
          description: buildDescription(category, rarity, seed),
          category,
          rarity,
          price_coins: PRICE_BY_RARITY[rarity],
          asset_ref: `catalog/${CATALOG_QUALITY_VERSION}/${category}/${rarity}/${String(index + 1).padStart(2, '0')}-${slugify(seed.name)}`,
          metadata: {
            display_category: CATEGORY_LABELS[category],
            collection: seed.name,
            collection_index: index + 1,
            rarity_rank: RARITY_INDEX[rarity],
            catalog_version: CATALOG_QUALITY_VERSION,
            category_line: blueprint.categoryLine,
          },
          is_active: true,
          is_seasonal: false,
          season_key: null,
        });
      });
    }
  }

  return catalog;
}

export const COSMETIC_CATALOG_COUNT = buildCosmeticCatalog().length;

let seededCatalogVersion: string | null = null;
let seededAtMs = 0;
const SEED_CACHE_TTL_MS = 10 * 60 * 1000;

export async function ensureCosmeticCatalogSeeded(adminSupabase: {
  from: (table: string) => any;
}) {
  const now = Date.now();
  if (seededCatalogVersion === CATALOG_QUALITY_VERSION && (now - seededAtMs) < SEED_CACHE_TTL_MS) {
    return;
  }

  const { count: activeVersionCount, error: activeVersionCountError } = await adminSupabase
    .from('cosmetic_items')
    .select('id', { head: true, count: 'exact' })
    .eq('is_active', true)
    .contains('metadata', { catalog_version: CATALOG_QUALITY_VERSION });

  if (!activeVersionCountError && activeVersionCount === COSMETIC_CATALOG_COUNT) {
    seededCatalogVersion = CATALOG_QUALITY_VERSION;
    seededAtMs = now;
    return;
  }

  const allRows = buildCosmeticCatalog();
  const activeSlugs = new Set(allRows.map((row) => row.slug));
  const chunkSize = 80;

  for (let start = 0; start < allRows.length; start += chunkSize) {
    const chunk = allRows.slice(start, start + chunkSize);
    const { error: upsertError } = await adminSupabase
      .from('cosmetic_items')
      .upsert(chunk, { onConflict: 'slug' });

    if (upsertError) throw upsertError;
  }

  const { data: existingRows, error: existingRowsError } = await adminSupabase
    .from('cosmetic_items')
    .select('id, slug, is_active')
    .in('category', COSMETIC_CATEGORIES);

  if (existingRowsError) throw existingRowsError;

  const staleIds = ((existingRows ?? []) as Array<{ id: string; slug: string; is_active: boolean }>)
    .filter((row) => row.is_active && !activeSlugs.has(row.slug))
    .map((row) => row.id);

  for (let start = 0; start < staleIds.length; start += chunkSize) {
    const chunk = staleIds.slice(start, start + chunkSize);
    const { error: disableError } = await adminSupabase
      .from('cosmetic_items')
      .update({ is_active: false })
      .in('id', chunk);

    if (disableError) throw disableError;
  }

  seededCatalogVersion = CATALOG_QUALITY_VERSION;
  seededAtMs = now;
}
