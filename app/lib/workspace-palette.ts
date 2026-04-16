import type { WorkspaceMode } from './workspace-mode';

export type WorkspacePalette = {
  mode: WorkspaceMode;
  pageBg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  text2: string;
  text3: string;
  inputBg: string;
  inputBorder: string;
  shadow: string;
  softShadow: string;
  chipBg: string;
  chipBorder: string;
  muted: string;
  dangerBg: string;
  dangerBorder: string;
};

export function getWorkspacePalette(mode: WorkspaceMode): WorkspacePalette {
  const isLight = mode === 'light';

  return {
    mode,
    pageBg: isLight
      ? 'linear-gradient(180deg, #f8fbff 0%, #edf7f5 100%)'
      : 'radial-gradient(circle at 12% 0%, rgba(56,189,248,0.16) 0%, transparent 28%), radial-gradient(circle at 86% 0%, rgba(168,85,247,0.12) 0%, transparent 24%), radial-gradient(circle at 50% 110%, rgba(45,212,191,0.08) 0%, transparent 30%), linear-gradient(180deg, #040714 0%, #091326 52%, #050711 100%)',
    surface: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(12, 18, 32, 0.9)',
    surface2: isLight ? 'rgba(247,250,255,0.9)' : 'rgba(16, 23, 42, 0.84)',
    border: isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(125, 211, 252, 0.14)',
    text: isLight ? '#0f172a' : '#f8fbff',
    text2: isLight ? '#475569' : '#dbe8f5',
    text3: isLight ? '#64748b' : '#93a9c4',
    inputBg: isLight ? 'rgba(255,255,255,0.98)' : 'rgba(8, 12, 22, 0.88)',
    inputBorder: isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(125, 211, 252, 0.18)',
    shadow: isLight ? '0 18px 50px rgba(15,23,42,0.08)' : '0 32px 90px rgba(0,0,0,0.50)',
    softShadow: isLight ? '0 14px 38px rgba(15,23,42,0.06)' : '0 20px 54px rgba(0,0,0,0.30)',
    chipBg: isLight ? 'rgba(15, 23, 42, 0.04)' : 'rgba(255,255,255,0.07)',
    chipBorder: isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(125, 211, 252, 0.14)',
    muted: isLight ? 'rgba(15, 23, 42, 0.5)' : 'rgba(227, 236, 245, 0.66)',
    dangerBg: isLight ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.16)',
    dangerBorder: isLight ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.26)',
  };
}
