import type { CosmeticRarity } from '@/app/lib/rewards/catalog';

export type UiCustomThemeKey =
  | 'paperboard-minimal'
  | 'blueberry-glass'
  | 'cyber-studyline'
  | 'sakura-desk'
  | 'aurora-forge'
  | 'prism-studio'
  | 'hologram-academy'
  | 'royal-manuscript';

export type UiCustomSkin = {
  id: string;
  slug: string;
  name: string;
  rarity: CosmeticRarity;
  description: string;
  price: number;
  themeKey: UiCustomThemeKey;
  preview: {
    gradient: string;
    panel: string;
    accent: string;
    note: string;
  };
  effects: {
    animated: boolean;
    cinematic: boolean;
  };
  cssVars: Record<string, string>;
};

const mk = (skin: Omit<UiCustomSkin, 'id'>): UiCustomSkin => ({
  ...skin,
  id: `ui_custom:${skin.slug}`,
});

export const UI_CUSTOM_SKINS: UiCustomSkin[] = [
  mk({
    slug: 'ui-custom-paperboard-minimal',
    name: 'Paperboard Minimal',
    rarity: 'common',
    description: 'Warm notebook workspace skin with subtle paper grain and focused writing surfaces.',
    price: 60,
    themeKey: 'paperboard-minimal',
    preview: {
      gradient: 'linear-gradient(145deg, #f7f2e7 0%, #efe5d2 100%)',
      panel: 'rgba(255,255,255,0.78)',
      accent: '#8d6841',
      note: 'Notebook clarity and calm structure.',
    },
    effects: { animated: false, cinematic: false },
    cssVars: {
      '--ui-bg': '#f3ecd9',
      '--ui-bg-2': '#eadfca',
      '--ui-surface': 'rgba(255, 252, 246, 0.92)',
      '--ui-surface-soft': 'rgba(246, 238, 221, 0.86)',
      '--ui-border': 'rgba(145, 113, 78, 0.24)',
      '--ui-text': '#2f2519',
      '--ui-muted': '#6e5942',
      '--ui-accent': '#9b7040',
      '--ui-accent-soft': 'rgba(155, 112, 64, 0.14)',
      '--ui-btn': 'linear-gradient(140deg, #b18453 0%, #936636 100%)',
      '--ui-btn-text': '#fffaf1',
      '--ui-sidebar': 'linear-gradient(180deg, #f0e4cf 0%, #e6d7c0 100%)',
      '--ui-sidebar-border': 'rgba(135, 102, 68, 0.24)',
      '--ui-input': 'rgba(255, 250, 242, 0.94)',
      '--ui-focus': 'rgba(155, 112, 64, 0.3)',
      '--ui-shadow': 'rgba(99, 74, 46, 0.16)',
      '--ui-glow': 'rgba(188, 146, 92, 0.2)',
      '--ui-rail': '#c79a63',
    },
  }),
  mk({
    slug: 'ui-custom-blueberry-glass',
    name: 'Blueberry Glass',
    rarity: 'common',
    description: 'Frosted glass study skin with soft blueberry-lavender gradients and polished card depth.',
    price: 60,
    themeKey: 'blueberry-glass',
    preview: {
      gradient: 'linear-gradient(150deg, #d9e5ff 0%, #e8e2ff 100%)',
      panel: 'rgba(255,255,255,0.52)',
      accent: '#4f67d8',
      note: 'Frosted clarity with modern polish.',
    },
    effects: { animated: false, cinematic: false },
    cssVars: {
      '--ui-bg': '#d9e7ff',
      '--ui-bg-2': '#ece5ff',
      '--ui-surface': 'rgba(246, 249, 255, 0.58)',
      '--ui-surface-soft': 'rgba(235, 241, 255, 0.45)',
      '--ui-border': 'rgba(100, 125, 214, 0.28)',
      '--ui-text': '#1d2c4f',
      '--ui-muted': '#4b5c83',
      '--ui-accent': '#4068e8',
      '--ui-accent-soft': 'rgba(64, 104, 232, 0.18)',
      '--ui-btn': 'linear-gradient(135deg, #3f7de8 0%, #7f6be8 100%)',
      '--ui-btn-text': '#ffffff',
      '--ui-sidebar': 'linear-gradient(180deg, rgba(225,236,255,0.92) 0%, rgba(208,224,255,0.82) 100%)',
      '--ui-sidebar-border': 'rgba(88, 114, 208, 0.26)',
      '--ui-input': 'rgba(245, 249, 255, 0.74)',
      '--ui-focus': 'rgba(86, 122, 235, 0.34)',
      '--ui-shadow': 'rgba(65, 81, 145, 0.19)',
      '--ui-glow': 'rgba(123, 138, 255, 0.24)',
      '--ui-rail': '#6388ff',
    },
  }),
  mk({
    slug: 'ui-custom-cyber-studyline',
    name: 'Cyber Studyline',
    rarity: 'rare',
    description: 'Command-center study skin with neon rails, precision panels, and structured grid focus.',
    price: 180,
    themeKey: 'cyber-studyline',
    preview: {
      gradient: 'linear-gradient(150deg, #0b1530 0%, #121f3e 100%)',
      panel: 'rgba(18,31,62,0.78)',
      accent: '#35c2ff',
      note: 'High-tech focus with clean neon rails.',
    },
    effects: { animated: true, cinematic: false },
    cssVars: {
      '--ui-bg': '#0a1228',
      '--ui-bg-2': '#111f3f',
      '--ui-surface': 'rgba(14, 30, 58, 0.9)',
      '--ui-surface-soft': 'rgba(12, 26, 52, 0.76)',
      '--ui-border': 'rgba(62, 189, 255, 0.26)',
      '--ui-text': '#e8f4ff',
      '--ui-muted': '#94b2d6',
      '--ui-accent': '#3cc5ff',
      '--ui-accent-soft': 'rgba(60, 197, 255, 0.18)',
      '--ui-btn': 'linear-gradient(135deg, #1f7dbb 0%, #4d5fff 100%)',
      '--ui-btn-text': '#f8fcff',
      '--ui-sidebar': 'linear-gradient(180deg, #050d1f 0%, #0e1831 100%)',
      '--ui-sidebar-border': 'rgba(71, 182, 255, 0.28)',
      '--ui-input': 'rgba(8, 22, 45, 0.92)',
      '--ui-focus': 'rgba(74, 193, 255, 0.38)',
      '--ui-shadow': 'rgba(2, 12, 28, 0.58)',
      '--ui-glow': 'rgba(64, 183, 255, 0.32)',
      '--ui-rail': '#43d1ff',
    },
  }),
  mk({
    slug: 'ui-custom-sakura-desk',
    name: 'Sakura Desk',
    rarity: 'rare',
    description: 'Premium stationery-inspired skin with cream surfaces, blush accents, and refined journal polish.',
    price: 180,
    themeKey: 'sakura-desk',
    preview: {
      gradient: 'linear-gradient(145deg, #fff4eb 0%, #ffe7ea 100%)',
      panel: 'rgba(255,248,241,0.86)',
      accent: '#cc5778',
      note: 'Quiet luxury with warm editorial detail.',
    },
    effects: { animated: false, cinematic: false },
    cssVars: {
      '--ui-bg': '#fff1e6',
      '--ui-bg-2': '#ffe5e6',
      '--ui-surface': 'rgba(255, 250, 245, 0.94)',
      '--ui-surface-soft': 'rgba(255, 242, 236, 0.84)',
      '--ui-border': 'rgba(205, 93, 124, 0.24)',
      '--ui-text': '#3a2023',
      '--ui-muted': '#8a565f',
      '--ui-accent': '#cc5878',
      '--ui-accent-soft': 'rgba(204, 88, 120, 0.18)',
      '--ui-btn': 'linear-gradient(135deg, #d46f8d 0%, #b84c69 100%)',
      '--ui-btn-text': '#fff8f9',
      '--ui-sidebar': 'linear-gradient(180deg, #fce9df 0%, #f8dfd6 100%)',
      '--ui-sidebar-border': 'rgba(192, 88, 118, 0.22)',
      '--ui-input': 'rgba(255, 251, 246, 0.95)',
      '--ui-focus': 'rgba(211, 98, 132, 0.34)',
      '--ui-shadow': 'rgba(140, 84, 98, 0.2)',
      '--ui-glow': 'rgba(235, 160, 185, 0.25)',
      '--ui-rail': '#df7094',
    },
  }),
  mk({
    slug: 'ui-custom-aurora-forge',
    name: 'Aurora Forge',
    rarity: 'epic',
    description: 'Dark aurora luxury skin with cinematic depth, premium gradient edges, and elite interface glow.',
    price: 420,
    themeKey: 'aurora-forge',
    preview: {
      gradient: 'linear-gradient(150deg, #091327 0%, #1b1f42 100%)',
      panel: 'rgba(14,22,44,0.78)',
      accent: '#6be4ff',
      note: 'Elite aurora depth and forged glass finish.',
    },
    effects: { animated: true, cinematic: true },
    cssVars: {
      '--ui-bg': '#070f1f',
      '--ui-bg-2': '#1a2247',
      '--ui-surface': 'rgba(13, 22, 44, 0.84)',
      '--ui-surface-soft': 'rgba(11, 19, 39, 0.74)',
      '--ui-border': 'rgba(122, 225, 255, 0.24)',
      '--ui-text': '#ebf8ff',
      '--ui-muted': '#9eb8da',
      '--ui-accent': '#66ddff',
      '--ui-accent-soft': 'rgba(102, 221, 255, 0.18)',
      '--ui-btn': 'linear-gradient(135deg, #2e5ccf 0%, #1baec8 58%, #9a64ff 100%)',
      '--ui-btn-text': '#fafdff',
      '--ui-sidebar': 'linear-gradient(180deg, #060d1d 0%, #0f1532 100%)',
      '--ui-sidebar-border': 'rgba(101, 224, 255, 0.3)',
      '--ui-input': 'rgba(8, 18, 35, 0.9)',
      '--ui-focus': 'rgba(107, 228, 255, 0.38)',
      '--ui-shadow': 'rgba(4, 11, 27, 0.64)',
      '--ui-glow': 'rgba(105, 165, 255, 0.3)',
      '--ui-rail': '#7ce8ff',
    },
  }),
  mk({
    slug: 'ui-custom-prism-studio',
    name: 'Prism Studio',
    rarity: 'epic',
    description: 'Creative premium studio skin with prism accents, layered highlights, and energetic editorial surfaces.',
    price: 420,
    themeKey: 'prism-studio',
    preview: {
      gradient: 'linear-gradient(145deg, #f9fcff 0%, #f3f2ff 100%)',
      panel: 'rgba(255,255,255,0.88)',
      accent: '#5a67ff',
      note: 'Bright creative energy with premium structure.',
    },
    effects: { animated: true, cinematic: false },
    cssVars: {
      '--ui-bg': '#f8fbff',
      '--ui-bg-2': '#f2f0ff',
      '--ui-surface': 'rgba(255, 255, 255, 0.94)',
      '--ui-surface-soft': 'rgba(249, 248, 255, 0.86)',
      '--ui-border': 'rgba(96, 111, 255, 0.26)',
      '--ui-text': '#1b2241',
      '--ui-muted': '#56618f',
      '--ui-accent': '#5a67ff',
      '--ui-accent-soft': 'rgba(90, 103, 255, 0.18)',
      '--ui-btn': 'linear-gradient(135deg, #3e69ff 0%, #7a5dff 45%, #31c7e5 100%)',
      '--ui-btn-text': '#f9fbff',
      '--ui-sidebar': 'linear-gradient(180deg, #eef3ff 0%, #e9eeff 100%)',
      '--ui-sidebar-border': 'rgba(92, 109, 255, 0.26)',
      '--ui-input': 'rgba(255, 255, 255, 0.94)',
      '--ui-focus': 'rgba(90, 103, 255, 0.34)',
      '--ui-shadow': 'rgba(68, 83, 166, 0.2)',
      '--ui-glow': 'rgba(122, 92, 255, 0.26)',
      '--ui-rail': '#6f78ff',
    },
  }),
  mk({
    slug: 'ui-custom-hologram-academy',
    name: 'Hologram Academy',
    rarity: 'legendary',
    description: 'Full holographic academy mode with deep translucent panels, control-dock styling, and cinematic shimmer.',
    price: 900,
    themeKey: 'hologram-academy',
    preview: {
      gradient: 'linear-gradient(145deg, #050c1f 0%, #15173a 100%)',
      panel: 'rgba(15,24,58,0.68)',
      accent: '#56e8ff',
      note: 'Legendary hologram dashboard transformation.',
    },
    effects: { animated: true, cinematic: true },
    cssVars: {
      '--ui-bg': '#050b1a',
      '--ui-bg-2': '#11173a',
      '--ui-surface': 'rgba(12, 24, 56, 0.72)',
      '--ui-surface-soft': 'rgba(11, 19, 46, 0.62)',
      '--ui-border': 'rgba(83, 235, 255, 0.34)',
      '--ui-text': '#eaf8ff',
      '--ui-muted': '#9ec4dc',
      '--ui-accent': '#4ee9ff',
      '--ui-accent-soft': 'rgba(78, 233, 255, 0.22)',
      '--ui-btn': 'linear-gradient(130deg, #1f47e0 0%, #13b5d4 55%, #6f8fff 100%)',
      '--ui-btn-text': '#f5fcff',
      '--ui-sidebar': 'linear-gradient(180deg, #020715 0%, #0a1431 100%)',
      '--ui-sidebar-border': 'rgba(86, 233, 255, 0.34)',
      '--ui-input': 'rgba(7, 18, 42, 0.9)',
      '--ui-focus': 'rgba(103, 232, 255, 0.45)',
      '--ui-shadow': 'rgba(2, 10, 28, 0.74)',
      '--ui-glow': 'rgba(78, 170, 255, 0.36)',
      '--ui-rail': '#66f2ff',
    },
  }),
  mk({
    slug: 'ui-custom-royal-manuscript',
    name: 'Royal Manuscript',
    rarity: 'legendary',
    description: 'Luxury manuscript interface with royal ink tones, gilded accents, and collectible writing ambiance.',
    price: 900,
    themeKey: 'royal-manuscript',
    preview: {
      gradient: 'linear-gradient(145deg, #fbf2dc 0%, #ead9b7 100%)',
      panel: 'rgba(255,247,230,0.88)',
      accent: '#8c5a1d',
      note: 'Legendary manuscript luxury for serious writers.',
    },
    effects: { animated: true, cinematic: true },
    cssVars: {
      '--ui-bg': '#f8ecd0',
      '--ui-bg-2': '#e8d4ae',
      '--ui-surface': 'rgba(255, 247, 230, 0.92)',
      '--ui-surface-soft': 'rgba(248, 235, 208, 0.84)',
      '--ui-border': 'rgba(153, 111, 46, 0.3)',
      '--ui-text': '#2d1d12',
      '--ui-muted': '#6e5130',
      '--ui-accent': '#9a6624',
      '--ui-accent-soft': 'rgba(154, 102, 36, 0.2)',
      '--ui-btn': 'linear-gradient(135deg, #6f4a17 0%, #ad782e 52%, #d9aa58 100%)',
      '--ui-btn-text': '#fff8eb',
      '--ui-sidebar': 'linear-gradient(180deg, #e8d2a8 0%, #dbc18f 100%)',
      '--ui-sidebar-border': 'rgba(143, 102, 40, 0.3)',
      '--ui-input': 'rgba(255, 248, 233, 0.95)',
      '--ui-focus': 'rgba(188, 139, 62, 0.36)',
      '--ui-shadow': 'rgba(104, 74, 35, 0.34)',
      '--ui-glow': 'rgba(212, 166, 80, 0.32)',
      '--ui-rail': '#c58c3e',
    },
  }),
];

export const UI_CUSTOM_SKIN_BY_SLUG = new Map(UI_CUSTOM_SKINS.map((skin) => [skin.slug, skin]));
export const UI_CUSTOM_SKIN_BY_ID = new Map(UI_CUSTOM_SKINS.map((skin) => [skin.id, skin]));
export const UI_CUSTOM_SKIN_BY_THEME = new Map(UI_CUSTOM_SKINS.map((skin) => [skin.themeKey, skin]));

export const DEFAULT_UI_CUSTOM_CSS_VARS: Record<string, string> = {
  '--ui-bg': 'var(--t-bg)',
  '--ui-bg-2': 'var(--t-card2)',
  '--ui-surface': 'color-mix(in srgb, var(--t-card) 92%, transparent)',
  '--ui-surface-soft': 'color-mix(in srgb, var(--t-card2) 88%, transparent)',
  '--ui-border': 'color-mix(in srgb, var(--t-brd) 82%, transparent)',
  '--ui-text': 'var(--t-tx)',
  '--ui-muted': 'var(--t-tx3)',
  '--ui-accent': 'var(--t-acc)',
  '--ui-accent-soft': 'color-mix(in srgb, var(--t-acc) 15%, transparent)',
  '--ui-btn': 'var(--t-btn)',
  '--ui-btn-text': 'var(--t-btn-color)',
  '--ui-sidebar': 'var(--t-sb)',
  '--ui-sidebar-border': 'var(--t-sb-brd)',
  '--ui-input': 'color-mix(in srgb, var(--t-card2) 88%, transparent)',
  '--ui-focus': 'color-mix(in srgb, var(--t-acc) 30%, white)',
  '--ui-shadow': 'var(--t-shadow)',
  '--ui-glow': 'color-mix(in srgb, var(--t-acc) 24%, transparent)',
  '--ui-rail': 'var(--t-acc)',
};

function normalizeKey(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function resolveUiCustomSkin(input: {
  id?: string | null;
  slug?: string | null;
  name?: string | null;
}): UiCustomSkin | null {
  if (input.id) {
    const directById = UI_CUSTOM_SKIN_BY_ID.get(input.id);
    if (directById) return directById;
  }

  if (input.slug) {
    const directBySlug = UI_CUSTOM_SKIN_BY_SLUG.get(input.slug);
    if (directBySlug) return directBySlug;
  }

  const normalizedName = normalizeKey(input.name ?? '');
  if (!normalizedName) return null;

  for (const skin of UI_CUSTOM_SKINS) {
    if (normalizedName.includes(normalizeKey(skin.name)) || normalizedName.includes(skin.themeKey)) {
      return skin;
    }
  }

  return null;
}

export function getUiCustomSkinVars(themeKey: UiCustomThemeKey | 'default') {
  if (themeKey === 'default') return DEFAULT_UI_CUSTOM_CSS_VARS;
  return UI_CUSTOM_SKIN_BY_THEME.get(themeKey)?.cssVars ?? DEFAULT_UI_CUSTOM_CSS_VARS;
}
