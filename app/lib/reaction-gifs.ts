export const ENCOURAGE_GIFS = [
  '/gifs/encourage/encourage-1.gif',
  '/gifs/encourage/encourage-2.gif',
  '/gifs/encourage/encourage-3.gif',
  '/gifs/encourage/encourage-4.gif',
  '/gifs/encourage/encourage-5.gif',
  '/gifs/encourage/encourage-6.gif',
] as const;

export const SUCCESS_GIFS = [
  '/gifs/success/success-1.gif',
  '/gifs/success/success-2.gif',
  '/gifs/success/success-3.gif',
  '/gifs/success/success-4.gif',
  '/gifs/success/success-5.gif',
  '/gifs/success/success-6.gif',
] as const;

// Keep streak-up as one specific GIF, per product requirement.
export const STREAK_UP_GIF = '/gifs/streak/streak-6.gif';

// Rank-up / level-up GIF set.
export const LEVEL_UP_GIFS = [
  '/gifs/streak/streak-2.gif',
  '/gifs/streak/streak-3.gif',
  '/gifs/streak/streak-4.gif',
  '/gifs/streak/streak-5.gif',
] as const;

export function pickRandomGif(gifs: readonly string[]) {
  if (gifs.length === 0) return '';
  return gifs[Math.floor(Math.random() * gifs.length)];
}

export function pickLevelUpGif(level: number) {
  if (LEVEL_UP_GIFS.length === 0) return '';
  const safeLevel = Math.max(1, Math.floor(level || 1));
  return LEVEL_UP_GIFS[(safeLevel - 1) % LEVEL_UP_GIFS.length];
}
