'use client';

import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { useAuth } from './AuthContext';

export type ThemeName =
  | 'cloud-atlas'
  | 'midnight-blue'
  | 'midnight-bloom'
  | 'rose-glow'
  | 'forest-moss'
  | 'sunset-glow';

type ThemePreview = {
  bg: string;
  card: string;
  topbar: string;
  sidebar: string;
  accent: string;
  text: string;
  muted: string;
  write: string;
  vocab: string;
  coach: string;
  rewards: string;
  xpBar: string;
};

type ThemeConfig = {
  name: ThemeName;
  label: string;
  description: string;
  bg: string;
  card: string;
  text: string;
  accent: string;
  border: string;
  muted: string;
  button: string;
  xpBar: string;
  preview: ThemePreview;
};

export const THEMES = {
  'cloud-atlas': {
    name: 'cloud-atlas',
    label: 'Cloud Atlas',
    description: 'Ultra-bright sky blue on a clean white canvas. Sharp, glossy, and vivid.',
    bg: 'bg-sky-100',
    card: 'bg-white',
    text: 'text-sky-950',
    accent: 'text-sky-800',
    border: 'border-sky-200',
    muted: 'text-sky-700',
    button: 'bg-sky-800 hover:bg-sky-700',
    xpBar: 'bg-sky-700',
    preview: {
      bg: '#eaf8ff',
      card: '#ffffff',
      topbar: '#d6ebff',
      sidebar: '#e2f5ff',
      accent: '#006dff',
      text: '#081528',
      muted: '#45688f',
      write: '#005ff0',
      vocab: '#00a88f',
      coach: '#4d3fff',
      rewards: '#f38a14',
      xpBar: '#006dff',
    },
  },
  'midnight-blue': {
    name: 'midnight-blue',
    label: 'Midnight Blue',
    description: 'Deep blue night with electric cyan highlights. Bold, moody, and neon.',
    bg: 'bg-slate-950',
    card: 'bg-slate-900',
    text: 'text-slate-50',
    accent: 'text-cyan-300',
    border: 'border-cyan-500/30',
    muted: 'text-slate-300',
    button: 'bg-cyan-500 hover:bg-cyan-400',
    xpBar: 'bg-cyan-400',
    preview: {
      bg: '#010511',
      card: '#09183a',
      topbar: '#0c2151',
      sidebar: '#040a18',
      accent: '#5bd8ff',
      text: '#f6fbff',
      muted: '#93afd8',
      write: '#63b0ff',
      vocab: '#31edcf',
      coach: '#c19eff',
      rewards: '#ffd65b',
      xpBar: '#4bc7ff',
    },
  },
  'midnight-bloom': {
    name: 'midnight-bloom',
    label: 'Midnight Bloom',
    description: 'Dark plum with neon pink and purple glow. Loud, glossy, and dramatic.',
    bg: 'bg-zinc-950',
    card: 'bg-zinc-900',
    text: 'text-zinc-50',
    accent: 'text-fuchsia-300',
    border: 'border-fuchsia-500/30',
    muted: 'text-zinc-300',
    button: 'bg-fuchsia-500 hover:bg-fuchsia-400',
    xpBar: 'bg-fuchsia-400',
    preview: {
      bg: '#0f0412',
      card: '#220f33',
      topbar: '#361652',
      sidebar: '#08020d',
      accent: '#ff31d1',
      text: '#fff6ff',
      muted: '#c18edf',
      write: '#9db5ff',
      vocab: '#5ef2d6',
      coach: '#ff9bff',
      rewards: '#ffd85a',
      xpBar: '#ff31d1',
    },
  },
  'rose-glow': {
    name: 'rose-glow',
    label: 'Rose Glow',
    description: 'Hot rose and pink on a crisp paper-white canvas. Soft, lively, and bold.',
    bg: 'bg-rose-100',
    card: 'bg-white',
    text: 'text-rose-950',
    accent: 'text-rose-800',
    border: 'border-rose-300',
    muted: 'text-rose-700',
    button: 'bg-rose-800 hover:bg-rose-700',
    xpBar: 'bg-rose-700',
    preview: {
      bg: '#ffe9f3',
      card: '#ffffff',
      topbar: '#ffcfe1',
      sidebar: '#ffe1ee',
      accent: '#ff006f',
      text: '#36081f',
      muted: '#b14d7d',
      write: '#5a6dff',
      vocab: '#0fb48e',
      coach: '#d826ea',
      rewards: '#ff7f1f',
      xpBar: '#ff006f',
    },
  },
  'forest-moss': {
    name: 'forest-moss',
    label: 'Forest Moss',
    description: 'Deep forest sidebar, soft sage-green body, rich moss and pine accents.',
    bg: 'bg-green-100',
    card: 'bg-green-50',
    text: 'text-green-950',
    accent: 'text-green-800',
    border: 'border-green-300',
    muted: 'text-green-700',
    button: 'bg-green-800 hover:bg-green-700',
    xpBar: 'bg-green-700',
    preview: {
      bg: '#c8dbb8',
      card: '#e8f2e0',
      topbar: '#d4e6c4',
      sidebar: '#1a2e14',
      accent: '#2d6a1e',
      text: '#0c1e08',
      muted: '#4a7a38',
      write: '#6858ff',
      vocab: '#08b8c0',
      coach: '#a838f8',
      rewards: '#c07808',
      xpBar: '#2d6a1e',
    },
  },
  'sunset-glow': {
    name: 'sunset-glow',
    label: 'Sunset Glow',
    description: 'Burnished sunset with peach sky, ember accents, and a refined dusk-red sidebar.',
    bg: 'bg-orange-200',
    card: 'bg-amber-50',
    text: 'text-rose-950',
    accent: 'text-rose-700',
    border: 'border-orange-300',
    muted: 'text-rose-700',
    button: 'bg-rose-700 hover:bg-rose-600',
    xpBar: 'bg-rose-600',
    preview: {
      bg: '#ffe8c8',
      card: '#fff4e4',
      topbar: '#ffe4bf',
      sidebar: '#7c1f2f',
      accent: '#c7442f',
      text: '#2f1512',
      muted: '#8f5549',
      write: '#ff8a3d',
      vocab: '#0d9f97',
      coach: '#7b5cff',
      rewards: '#cf3d31',
      xpBar: '#f15b42',
    },
  },
} as const satisfies Record<ThemeName, ThemeConfig>;

export const UNLOCK_REQUIREMENTS: Record<ThemeName, string> = {
  'cloud-atlas': 'Free for all users',
  'midnight-blue': 'Free for all users',
  'midnight-bloom': 'Free for all users',
  'rose-glow': 'Free for all users',
  'forest-moss': 'Free for all users',
  'sunset-glow': 'Free for all users',
};

type ThemeState = {
  theme: ThemeName;
  themeConfig: (typeof THEMES)[ThemeName];
  setTheme: (t: ThemeName) => void;
};

const ThemeContext = createContext<ThemeState>({
  theme: 'cloud-atlas',
  themeConfig: THEMES['cloud-atlas'],
  setTheme: () => {},
});

const STORAGE_KEY = 'draftora-theme';

const LEGACY_THEME_ALIASES: Record<string, ThemeName> = {
  default: 'cloud-atlas',
  lavender: 'midnight-bloom',
  sunrise: 'sunset-glow',
  bubbles: 'cloud-atlas',
  golden: 'forest-moss',
};

function normalizeThemeName(theme: string | null | undefined): ThemeName | null {
  if (!theme) return null;
  const remapped = LEGACY_THEME_ALIASES[theme] ?? theme;
  return Object.prototype.hasOwnProperty.call(THEMES, remapped) ? (remapped as ThemeName) : null;
}

function readStoredTheme(): ThemeName | null {
  if (typeof window === 'undefined') return null;
  try {
    return normalizeThemeName(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function persistTheme(theme: ThemeName) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore storage failures
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();

  // Read from localStorage synchronously on first render for instant theme
  const [theme, setThemeState] = useState<ThemeName>(() => {
    return readStoredTheme() ?? 'cloud-atlas';
  });

  const applyThemeAttr = (t: ThemeName) => {
    document.documentElement.setAttribute('data-theme', t);
    document.body.setAttribute('data-theme', t);
  };

  useLayoutEffect(() => {
    applyThemeAttr(theme);
  }, [theme]);

  // When profile loads from Supabase, use the DB value as the source of truth
  useEffect(() => {
    const nextTheme = normalizeThemeName(profile?.active_theme);
    if (nextTheme) {
      setThemeState(nextTheme);
      persistTheme(nextTheme);
    }
  }, [profile?.active_theme]);

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    applyThemeAttr(t);
    persistTheme(t);
  };

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const nextTheme = normalizeThemeName(event.newValue);
      if (!nextTheme) return;
      setThemeState(nextTheme);
      applyThemeAttr(nextTheme);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, themeConfig: THEMES[theme], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
