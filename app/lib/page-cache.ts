/**
 * Tiny module-level cache for dashboard page data.
 *
 * Because Next.js App Router shares a single JS module instance across all
 * client-side navigations within a session, data stored here persists when
 * the user clicks between tabs — so pages render *instantly* from cache and
 * then silently refresh in the background.
 *
 * Usage:
 *   import { pageCache } from '@/app/lib/page-cache';
 *   const cached = pageCache.get<DailyStats>('daily-stats');
 *   pageCache.set('daily-stats', data, 60_000); // 60 s TTL
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class PageCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { this.store.delete(key); return null; }
    return entry.data;
  }

  set<T>(key: string, data: T, ttlMs = 120_000): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

export const pageCache = new PageCache();
