'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

export type ThemeName = 'default' | 'lavender' | 'sunrise' | 'bubbles' | 'golden';

export const THEMES = {
  default: {
    name: 'default',
    label: 'Midnight Ink',
    description: 'Obsidian black canvas with liquid gold accents — bold, sharp, editorial.',
    bg: 'bg-zinc-950', card: 'bg-zinc-900', text: 'text-zinc-100',
    accent: 'text-yellow-400', border: 'border-zinc-800', muted: 'text-zinc-400',
    button: 'bg-yellow-500 hover:bg-yellow-400', xpBar: 'bg-yellow-500',
    preview: {
      bg: '#05060d',
      card: '#0d1020',
      topbar: '#111526',
      sidebar: '#08091a',
      accent: '#f0c846',
      text: '#f8f9fd',
      muted: '#6a758f',
      write: '#6a9fff',
      vocab: '#4dd4a8',
      coach: '#b090ff',
      rewards: '#f8c440',
      xpBar: '#d8ac3a',
    },
  },
  lavender: {
    name: 'lavender',
    label: 'Aurora Nebula',
    description: 'Deep space violet with electric neon star-glow — cosmic and immersive.',
    bg: 'bg-purple-50', card: 'bg-white', text: 'text-purple-950',
    accent: 'text-purple-500', border: 'border-purple-200', muted: 'text-purple-400',
    button: 'bg-purple-600 hover:bg-purple-500', xpBar: 'bg-purple-500',
    preview: {
      bg: '#080512',
      card: '#110e22',
      topbar: '#18143a',
      sidebar: '#060318',
      accent: '#c878ff',
      text: '#f5f0ff',
      muted: '#8070b8',
      write: '#88aaff',
      vocab: '#60e4c0',
      coach: '#d898ff',
      rewards: '#ffcc70',
      xpBar: '#ac70f8',
    },
  },
  sunrise: {
    name: 'sunrise',
    label: 'Ember Forge',
    description: 'Molten volcanic darkness with fiery copper and smouldering amber heat.',
    bg: 'bg-orange-50', card: 'bg-white', text: 'text-orange-950',
    accent: 'text-orange-500', border: 'border-orange-200', muted: 'text-orange-400',
    button: 'bg-orange-600 hover:bg-orange-500', xpBar: 'bg-orange-500',
    preview: {
      bg: '#0e0502',
      card: '#190b08',
      topbar: '#221009',
      sidebar: '#0a0301',
      accent: '#ff8844',
      text: '#fff8f0',
      muted: '#b88060',
      write: '#ff9c66',
      vocab: '#8cdea0',
      coach: '#cc88ff',
      rewards: '#ffc058',
      xpBar: '#e06030',
    },
  },
  bubbles: {
    name: 'bubbles',
    label: 'Cloud Atlas',
    description: 'Pure white clarity with electric sky blue — clean, modern, fresh energy.',
    bg: 'bg-sky-50', card: 'bg-white', text: 'text-sky-950',
    accent: 'text-blue-600', border: 'border-sky-200', muted: 'text-sky-500',
    button: 'bg-blue-600 hover:bg-blue-500', xpBar: 'bg-blue-500',
    preview: {
      bg: '#f0f5ff',
      card: '#ffffff',
      topbar: '#e8f0ff',
      sidebar: '#0f1e3a',
      accent: '#3378e8',
      text: '#0c1e3a',
      muted: '#6680a8',
      write: '#3878f8',
      vocab: '#18b098',
      coach: '#6055f0',
      rewards: '#d88000',
      xpBar: '#4890f0',
    },
  },
  golden: {
    name: 'golden',
    label: 'Parchment Guild',
    description: 'Antique ivory and cognac ink — like writing in a leather-bound journal.',
    bg: 'bg-yellow-50', card: 'bg-amber-50', text: 'text-yellow-950',
    accent: 'text-amber-700', border: 'border-yellow-300', muted: 'text-amber-600',
    button: 'bg-amber-700 hover:bg-amber-600', xpBar: 'bg-amber-600',
    preview: {
      bg: '#f4ebd8',
      card: '#fdf8ee',
      topbar: '#f2e8d0',
      sidebar: '#1c1008',
      accent: '#a86820',
      text: '#2c1a08',
      muted: '#907050',
      write: '#7060cc',
      vocab: '#389870',
      coach: '#8860cc',
      rewards: '#b07830',
      xpBar: '#b87e2c',
    },
  },
} as const;

export const UNLOCK_REQUIREMENTS: Record<ThemeName, string> = {
  default:  'Free for all users',
  lavender: 'Free for all users',
  sunrise:  'Free for all users',
  bubbles:  'Free for all users',
  golden:   'Free for all users',
};

type ThemeState = {
  theme: ThemeName;
  themeConfig: typeof THEMES[ThemeName];
  setTheme: (t: ThemeName) => void;
};

const ThemeContext = createContext<ThemeState>({
  theme: 'default',
  themeConfig: THEMES.default,
  setTheme: () => {},
});

const STORAGE_KEY = 'draftly-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();

  // Read from localStorage synchronously on first render for instant theme
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
      if (stored && THEMES[stored]) return stored;
    }
    return 'default';
  });

  const applyThemeAttr = (t: ThemeName) => {
    document.documentElement.setAttribute('data-theme', t);
  };

  // Apply stored theme instantly on mount (avoids flash)
  useEffect(() => {
    applyThemeAttr(theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When profile loads from Supabase, use the DB value as the source of truth
  useEffect(() => {
    if (profile?.active_theme) {
      const t = profile.active_theme as ThemeName;
      if (THEMES[t]) {
        setThemeState(t);
        applyThemeAttr(t);
        localStorage.setItem(STORAGE_KEY, t);
      }
    }
  }, [profile?.active_theme]);

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    applyThemeAttr(t);
    localStorage.setItem(STORAGE_KEY, t);
  };

  return (
    <ThemeContext.Provider value={{ theme, themeConfig: THEMES[theme], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
