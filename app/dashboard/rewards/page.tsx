'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/app/lib/supabase';
import { getXPProgress, MAX_LEVEL } from '@/app/types/database';
import InventoryGrid from '@/app/components/inventory/InventoryGrid';
import WeeklyShopGrid from '@/app/components/shop/WeeklyShopGrid';
import XpProgressBar from '@/app/components/rewards/XpProgressBar';
import EquippedFireIcon from '@/app/components/rewards/EquippedFireIcon';
import {
  COSMETIC_CATEGORIES,
  EQUIPPED_SLOT_BY_CATEGORY,
  SHOP_INVENTORY_CATEGORIES,
  type CosmeticCategory,
  type CosmeticRarity,
} from '@/app/lib/rewards/catalog';
import { createIdempotencyKey } from '@/app/lib/xp';
import { trackEvent } from '@/app/lib/analytics';
import {
  Trophy, Zap, PenLine, BookOpen, Bot,
  Star, CheckCircle2, Lock, TrendingUp, Sparkles,
  Target, Feather, GraduationCap, Palette, WandSparkles,
  type LucideIcon,
} from 'lucide-react';

/* ─── XP Sources ───────────────────────────────────────────────── */
type XPSource = { icon: LucideIcon; title: string; desc: string; xp: string; color: string };

const XP_SOURCES: XPSource[] = [
  { icon: PenLine,      title: 'Submit Writing',   desc: 'Complete and submit a writing piece',         xp: '+25 XP',    color: '#fb923c' },
  { icon: Feather,      title: 'Daily Writing',    desc: 'First writing session of the day',            xp: '+10 XP',    color: '#a78bfa' },
  { icon: Bot,          title: 'AI Feedback',      desc: 'Get AI feedback on your submission',          xp: '+10 XP',    color: '#22d3ee' },
  { icon: Target,       title: 'Daily Goal Met',   desc: 'Reach your daily word or vocab goal',         xp: '+15 XP',    color: '#4ade80' },
  { icon: BookOpen,     title: 'Vocab in Writing', desc: 'Use a learned vocab word in your piece',      xp: '+3 XP ea.', color: '#60a5fa' },
  { icon: Zap,          title: 'Vocab Sentence',   desc: 'Practice a word with a new sentence',         xp: '+8 XP',     color: '#f472b6' },
  { icon: GraduationCap,title: 'Master a Word',    desc: 'Fully master a vocabulary word',              xp: '+20 XP',    color: '#fbbf24' },
  { icon: Star,         title: 'Vocab Test',       desc: 'Complete weekly test + bonus per correct',    xp: '+15+3/Q',   color: '#818cf8' },
];

/* ─── Streak milestones ─────────────────────────────────────────── */
const STREAK_MILESTONES = [
  { days: 3,   xp: 15,  label: '3 Days',    emoji: '🔥' },
  { days: 7,   xp: 40,  label: '1 Week',    emoji: '⚡' },
  { days: 14,  xp: 85,  label: '2 Weeks',   emoji: '🌟' },
  { days: 30,  xp: 200, label: '1 Month',   emoji: '💫' },
  { days: 60,  xp: 400, label: '2 Months',  emoji: '🏅' },
  { days: 100, xp: 800, label: 'Legendary', emoji: '👑' },
];

type XPLogEntry = { id: string; amount: number; reason: string; created_at: string };
type RewardsTab = 'progress' | 'inventory' | 'shop';

type InventoryOwnedItem = {
  id: string;
  itemId: string;
  acquiredVia: string;
  pricePaidXp: number;
  createdAt: string;
  item: {
    id: string;
    slug: string;
    name: string;
    description: string;
    category: CosmeticCategory;
    rarity: CosmeticRarity;
    price_xp: number;
    asset_ref: string;
    metadata: Record<string, unknown>;
    is_active: boolean;
    is_seasonal: boolean;
    season_key: string | null;
  };
};

type InventoryResponse = {
  ownedItems: InventoryOwnedItem[];
  equippedByCategory: Record<CosmeticCategory, string | null>;
  categories: Array<{
    category: CosmeticCategory;
    label: string;
    ownedCount: number;
  }>;
};

type ShopResponse = {
  rotation: {
    id: string;
    weekStart: string;
    weekEnd: string;
    expiresAt: string;
    generatedFallback: boolean;
    seed: string;
  };
  items: Array<{
    id: string;
    slotType: 'affordable' | 'featured' | 'standard';
    position: number;
    featured: boolean;
    affordable: boolean;
    price: number;
    owned: boolean;
    equipped: boolean;
    item: {
      id: string;
      name: string;
      description: string;
      category: CosmeticCategory;
      rarity: CosmeticRarity;
      asset_ref?: string;
      metadata?: {
        display_category?: string;
        collection?: string;
        collection_index?: number;
        rarity_rank?: number;
      };
    };
  }>;
  equippedByCategory: Record<CosmeticCategory, string | null>;
  xpBalance: number;
};

const COSMETICS_UPDATED_EVENT = 'draftora:cosmetics-updated';
const MUTATION_TIMEOUT_MS = 30000;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createEmptyEquippedByCategory() {
  return COSMETIC_CATEGORIES.reduce((acc, category) => {
    acc[category] = null;
    return acc;
  }, {} as Record<CosmeticCategory, string | null>);
}

function readEquippedByCategory(payload: unknown): Record<CosmeticCategory, string | null> | null {
  if (!isObject(payload)) return null;

  const direct = payload.equippedByCategory;
  if (isObject(direct)) {
    const normalized = createEmptyEquippedByCategory();
    for (const category of COSMETIC_CATEGORIES) {
      const value = direct[category];
      normalized[category] = typeof value === 'string' && value.length > 0 ? value : null;
    }
    return normalized;
  }

  const slotShape = payload.equipped;
  if (isObject(slotShape)) {
    const normalized = createEmptyEquippedByCategory();
    for (const category of COSMETIC_CATEGORIES) {
      const slot = EQUIPPED_SLOT_BY_CATEGORY[category];
      const value = slotShape[slot];
      normalized[category] = typeof value === 'string' && value.length > 0 ? value : null;
    }
    return normalized;
  }

  return null;
}

function formatCountdown(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return 'Refresh soon';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

async function fetchJsonWithTimeout(url: string, init: RequestInit, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({} as { error?: string }));
    return { response, payload };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function notifyCosmeticsUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(COSMETICS_UPDATED_EVENT, { detail: { at: Date.now() } }));
}

/* ─── Component ─────────────────────────────────────────────────── */
export default function RewardsPage() {
  const { profile, session, isPracticeMode, refreshProfile } = useAuth();
  const [tab, setTab] = useState<RewardsTab>('progress');
  const [xpLog, setXpLog]       = useState<XPLogEntry[]>([]);
  const [xpLogLoading, setXpLogLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState('');
  const [inventoryActionKey, setInventoryActionKey] = useState<string | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryResponse | null>(null);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopError, setShopError] = useState('');
  const [shopActionKey, setShopActionKey] = useState<string | null>(null);
  const [shopData, setShopData] = useState<ShopResponse | null>(null);
  const [shopNow, setShopNow] = useState(() => Date.now());
  const fetchedForUser = useRef<string | null>(null);
  const inventoryFetchedForUser = useRef<string | null>(null);
  const shopFetchedForUser = useRef<string | null>(null);
  const cosmeticMutationInFlight = useRef(false);
  const cosmeticMutationQueue = useRef(Promise.resolve());
  // Hold the last non-null profile so the page doesn't flash to spinner on re-renders
  const stableProfile = useRef(profile);
  if (profile) stableProfile.current = profile;
  const p = stableProfile.current;

  const fetchInventory = useCallback(async () => {
    if (!session?.access_token || !p?.id) return;
    setInventoryLoading(true);
    setInventoryError('');

    try {
      const { response, payload } = await fetchJsonWithTimeout('/api/inventory', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) {
        throw new Error(payload.error || `Inventory request failed (${response.status})`);
      }
      setInventoryData(payload as InventoryResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load inventory.';
      setInventoryError(message);
    } finally {
      setInventoryLoading(false);
    }
  }, [p?.id, session?.access_token]);

  const fetchShop = useCallback(async () => {
    if (!session?.access_token || !p?.id) return;
    setShopLoading(true);
    setShopError('');

    try {
      const { response, payload } = await fetchJsonWithTimeout('/api/shop/current', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) {
        throw new Error(payload.error || `Shop request failed (${response.status})`);
      }
      const nextShop = payload as ShopResponse;
      setShopData(nextShop);

      trackEvent('shop_viewed', {
        rotation_id: nextShop.rotation.id,
        week_start: nextShop.rotation.weekStart,
        week_end: nextShop.rotation.weekEnd,
        item_count: nextShop.items.length,
        featured_item_id: nextShop.items.find((entry) => entry.featured)?.item.id ?? null,
        is_practice: isPracticeMode,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load weekly shop.';
      setShopError(message);
    } finally {
      setShopLoading(false);
    }
  }, [isPracticeMode, p?.id, session?.access_token]);

  const syncCosmeticState = useCallback(async () => {
    notifyCosmeticsUpdated();
    await Promise.allSettled([
      refreshProfile(),
      fetchInventory(),
      fetchShop(),
    ]);
  }, [fetchInventory, fetchShop, refreshProfile]);

  const runQueuedCosmeticMutation = useCallback(async (task: () => Promise<unknown>): Promise<unknown> => {
    const previous = cosmeticMutationQueue.current;
    let release: () => void = () => {};
    cosmeticMutationQueue.current = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      return await task();
    } finally {
      release();
    }
  }, []);

  const equipItem = useCallback(async (category: CosmeticCategory, itemId: string) => {
    if (!session?.access_token) return;
    await runQueuedCosmeticMutation(async () => {
      cosmeticMutationInFlight.current = true;
      setInventoryActionKey(`equip:${itemId}`);
      setInventoryError('');
      setShopError('');

      try {
        const { response, payload } = await fetchJsonWithTimeout('/api/inventory/equip', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ category, itemId }),
        }, MUTATION_TIMEOUT_MS);
        if (!response.ok) {
          throw new Error(payload.error || `Equip failed (${response.status})`);
        }

        const nextEquipped = readEquippedByCategory(payload);
        if (nextEquipped) {
          setInventoryData((prev) => {
            if (!prev) return prev;
            return { ...prev, equippedByCategory: nextEquipped };
          });
          setShopData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              equippedByCategory: nextEquipped,
              items: prev.items.map((entry) => ({
                ...entry,
                equipped: nextEquipped[entry.item.category] === entry.item.id,
              })),
            };
          });
          trackEvent('cosmetic_equipped', {
            item_id: itemId,
            category,
            is_practice: isPracticeMode,
          });
        }
        await syncCosmeticState();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not equip item.';
        setInventoryError(message);
        await syncCosmeticState();
      } finally {
        setInventoryActionKey(null);
        cosmeticMutationInFlight.current = false;
      }
    });
  }, [isPracticeMode, runQueuedCosmeticMutation, session?.access_token, syncCosmeticState]);

  const unequipItem = useCallback(async (category: CosmeticCategory) => {
    if (!session?.access_token) return;
    await runQueuedCosmeticMutation(async () => {
      cosmeticMutationInFlight.current = true;
      setInventoryActionKey(`unequip:${category}`);
      setInventoryError('');
      setShopError('');

      try {
        const { response, payload } = await fetchJsonWithTimeout('/api/inventory/unequip', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ category }),
        }, MUTATION_TIMEOUT_MS);
        if (!response.ok) {
          throw new Error(payload.error || `Unequip failed (${response.status})`);
        }

        const nextEquipped = readEquippedByCategory(payload);
        if (nextEquipped) {
          setInventoryData((prev) => {
            if (!prev) return prev;
            return { ...prev, equippedByCategory: nextEquipped };
          });
          setShopData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              equippedByCategory: nextEquipped,
              items: prev.items.map((entry) => ({
                ...entry,
                equipped: nextEquipped[entry.item.category] === entry.item.id,
              })),
            };
          });
        }
        await syncCosmeticState();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not unequip item.';
        setInventoryError(message);
        await syncCosmeticState();
      } finally {
        setInventoryActionKey(null);
        cosmeticMutationInFlight.current = false;
      }
    });
  }, [runQueuedCosmeticMutation, session?.access_token, syncCosmeticState]);

  const buyShopItem = useCallback(async (itemId: string): Promise<boolean> => {
    if (!session?.access_token || !shopData) return false;
    return runQueuedCosmeticMutation(async () => {
      cosmeticMutationInFlight.current = true;
      setShopActionKey(`buy:${itemId}`);
      setShopError('');

      const selectedEntry = shopData.items.find((entry) => entry.item.id === itemId);
      if (selectedEntry) {
        trackEvent('shop_item_clicked', {
          item_id: itemId,
          category: selectedEntry.item.category,
          rarity: selectedEntry.item.rarity,
          price: selectedEntry.price,
          owned: selectedEntry.owned,
          equipped: selectedEntry.equipped,
          is_practice: isPracticeMode,
        });
        trackEvent('shop_purchase_attempted', {
          item_id: itemId,
          price: selectedEntry.price,
          xp_balance_before: shopData.xpBalance ?? profile?.xp ?? 0,
          rotation_id: shopData.rotation.id,
          is_practice: isPracticeMode,
        });
      }

      try {
        const { response, payload } = await fetchJsonWithTimeout('/api/shop/purchase', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': createIdempotencyKey(['shop-purchase', profile?.id ?? 'user', itemId, shopData.rotation.id, Date.now()]),
          },
          body: JSON.stringify({
            itemId,
            rotationId: shopData.rotation.id,
          }),
        }, MUTATION_TIMEOUT_MS);
        if (!response.ok) {
          const payloadCode = typeof payload === 'object' && payload && 'code' in payload
            ? String((payload as { code?: unknown }).code ?? '')
            : '';
          if (payloadCode === 'already_owned') {
            await syncCosmeticState();
            return true;
          }
          if (payloadCode === 'idempotency_in_progress' || payloadCode === 'balance_conflict') {
            await syncCosmeticState();
            throw new Error('Processing previous request. Inventory and shop were refreshed.');
          }
          throw new Error(payload.error || `Purchase failed (${response.status})`);
        }

        const purchasePayload = payload as { newXpBalance: number; purchase: { pricePaid: number } };
        await syncCosmeticState();

        trackEvent('shop_purchase_success', {
          item_id: itemId,
          price_paid: purchasePayload.purchase.pricePaid,
          xp_balance_after: purchasePayload.newXpBalance,
          rarity: selectedEntry?.item.rarity ?? null,
          category: selectedEntry?.item.category ?? null,
          is_practice: isPracticeMode,
        });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not complete purchase.';
        setShopError(message);
        await syncCosmeticState();
        return false;
      } finally {
        setShopActionKey(null);
        cosmeticMutationInFlight.current = false;
      }
    }) as Promise<boolean>;
  }, [isPracticeMode, profile?.id, profile?.xp, runQueuedCosmeticMutation, session?.access_token, shopData, syncCosmeticState]);

  const unlockAndEquipShopItem = useCallback(async (category: CosmeticCategory, itemId: string) => {
    if (!session?.access_token || !shopData) return;
    setShopActionKey(`buy:${itemId}`);
    setShopError('');

    try {
      const purchased = await buyShopItem(itemId);
      if (!purchased) return;
      await equipItem(category, itemId);
      await fetchShop();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not complete buy & equip.';
      setShopError(message);
    } finally {
      setShopActionKey(null);
    }
  }, [buyShopItem, equipItem, fetchShop, session?.access_token, shopData]);

  const equipFromShop = useCallback(async (category: CosmeticCategory, itemId: string) => {
    setShopActionKey(`equip:${itemId}`);
    try {
      await equipItem(category, itemId);
      await fetchShop();
    } finally {
      setShopActionKey(null);
    }
  }, [equipItem, fetchShop]);

  useEffect(() => {
    if (!p) return;
    // Only fetch once per user — profile re-renders shouldn't retrigger this
    if (fetchedForUser.current === p.id) return;
    fetchedForUser.current = p.id;
    setXpLogLoading(true);
    supabase
      .from('xp_log')
      .select('id, amount, reason, created_at')
      .eq('user_id', p.id)
      .order('created_at', { ascending: false })
      .limit(7)
      .then(({ data }) => {
        setXpLog((data || []) as XPLogEntry[]);
        setXpLogLoading(false);
      });
  }, [p]);

  useEffect(() => {
    if (!p?.id || !session?.access_token) return;
    if (inventoryFetchedForUser.current === p.id) return;
    inventoryFetchedForUser.current = p.id;
    void fetchInventory();
  }, [fetchInventory, p?.id, session?.access_token]);

  useEffect(() => {
    if (!p?.id || !session?.access_token) return;
    if (shopFetchedForUser.current === p.id) return;
    shopFetchedForUser.current = p.id;
    void fetchShop();
  }, [fetchShop, p?.id, session?.access_token]);

  useEffect(() => {
    const timer = window.setInterval(() => setShopNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (tab !== 'inventory' || !inventoryData) return;
    trackEvent('inventory_viewed', {
      owned_count: inventoryData.ownedItems.length,
      equipped_count: SHOP_INVENTORY_CATEGORIES.reduce((count, category) => {
        return inventoryData.equippedByCategory[category] ? count + 1 : count;
      }, 0),
      is_practice: isPracticeMode,
    });
  }, [inventoryData, isPracticeMode, tab]);

  if (!p) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-bg)' }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--t-acc)', animation: 'pulse 1.5s infinite' }} />
    </div>
  );

  const xp          = getXPProgress(p.xp);
  const isMaxLevel  = p.level >= MAX_LEVEL;
  const nextStreak  = STREAK_MILESTONES.find(m => p.streak < m.days);
  const daysToNext  = nextStreak ? nextStreak.days - p.streak : 0;
  const inventoryOwnedCount = inventoryData?.ownedItems.length ?? 0;
  const inventoryEquippedCount = SHOP_INVENTORY_CATEGORIES.reduce((count, category) => {
    const value = inventoryData?.equippedByCategory?.[category];
    return value ? count + 1 : count;
  }, 0);
  const effectiveXpBalance = shopData?.xpBalance ?? profile?.xp ?? 0;
  const shopExpiresAtMs = shopData?.rotation?.expiresAt ? new Date(shopData.rotation.expiresAt).getTime() : 0;
  const shopCountdownLabel = formatCountdown(shopExpiresAtMs - shopNow);
  const featuredShopItem = shopData?.items.find((entry) => entry.featured) ?? null;

  return (
    <div style={{ background: 'var(--t-bg)', minHeight: '100vh', padding: 'clamp(1rem, 2.4vw, 2rem) clamp(0.85rem, 2.8vw, 2rem) 5rem' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 18, flexShrink: 0,
            background: 'var(--t-acc-b)', border: '1px solid var(--t-brd-a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Trophy style={{ width: 24, height: 24, color: 'var(--t-acc)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--t-tx)', margin: 0 }}>
              Rewards &amp; XP
            </h1>
            <p style={{ color: 'var(--t-tx3)', fontSize: 14, margin: '3px 0 0' }}>
              Level up, earn XP, and track your writing journey
            </p>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.8rem',
          flexWrap: 'wrap',
          borderRadius: 20,
          border: '1px solid var(--t-brd)',
          background: 'linear-gradient(145deg, color-mix(in srgb, var(--t-card) 92%, var(--t-acc) 8%) 0%, var(--t-card) 100%)',
          padding: '0.7rem',
          boxShadow: '0 12px 28px color-mix(in srgb, var(--t-shadow) 10%, transparent)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setTab('progress')}
              style={{
                borderRadius: 999,
                border: `1px solid ${tab === 'progress' ? 'var(--t-acc-c)' : 'var(--t-brd)'}`,
                background: tab === 'progress'
                  ? 'linear-gradient(180deg, color-mix(in srgb, var(--t-acc) 18%, white 82%) 0%, color-mix(in srgb, var(--t-acc) 10%, white 90%) 100%)'
                  : 'var(--t-card2)',
                color: tab === 'progress' ? 'var(--t-acc)' : 'var(--t-tx3)',
                padding: '0.42rem 0.86rem',
                fontSize: 12.2,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: tab === 'progress' ? '0 8px 16px color-mix(in srgb, var(--t-acc) 18%, transparent)' : 'none',
              }}
            >
              Progress
            </button>
            <button
              type="button"
              onClick={() => setTab('inventory')}
              style={{
                borderRadius: 999,
                border: `1px solid ${tab === 'inventory' ? 'var(--t-acc-c)' : 'var(--t-brd)'}`,
                background: tab === 'inventory'
                  ? 'linear-gradient(180deg, color-mix(in srgb, var(--t-acc) 18%, white 82%) 0%, color-mix(in srgb, var(--t-acc) 10%, white 90%) 100%)'
                  : 'var(--t-card2)',
                color: tab === 'inventory' ? 'var(--t-acc)' : 'var(--t-tx3)',
                padding: '0.42rem 0.86rem',
                fontSize: 12.2,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: tab === 'inventory' ? '0 8px 16px color-mix(in srgb, var(--t-acc) 18%, transparent)' : 'none',
              }}
            >
              <Palette style={{ width: 13, height: 13 }} />
              Inventory
            </button>
            <button
              type="button"
              onClick={() => setTab('shop')}
              style={{
                borderRadius: 999,
                border: `1px solid ${tab === 'shop' ? 'var(--t-acc-c)' : 'var(--t-brd)'}`,
                background: tab === 'shop'
                  ? 'linear-gradient(180deg, color-mix(in srgb, var(--t-acc) 18%, white 82%) 0%, color-mix(in srgb, var(--t-acc) 10%, white 90%) 100%)'
                  : 'var(--t-card2)',
                color: tab === 'shop' ? 'var(--t-acc)' : 'var(--t-tx3)',
                padding: '0.42rem 0.86rem',
                fontSize: 12.2,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: tab === 'shop' ? '0 8px 16px color-mix(in srgb, var(--t-acc) 18%, transparent)' : 'none',
              }}
            >
              <Star style={{ width: 13, height: 13 }} />
              Shop
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <span style={{
              borderRadius: 999,
              border: '1px solid color-mix(in srgb, var(--t-acc) 26%, transparent)',
              background: 'color-mix(in srgb, var(--t-acc) 12%, transparent)',
              color: 'var(--t-acc)',
              padding: '0.3rem 0.66rem',
              fontSize: 11,
              fontWeight: 800,
            }}>
              {inventoryOwnedCount} owned
            </span>
            <span style={{
              borderRadius: 999,
              border: '1px solid rgba(74, 222, 128, 0.32)',
              background: 'rgba(74, 222, 128, 0.14)',
              color: '#166534',
              padding: '0.3rem 0.66rem',
              fontSize: 11,
              fontWeight: 800,
            }}>
              {inventoryEquippedCount} equipped
            </span>
          </div>
        </div>

        {tab === 'inventory' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{
              borderRadius: 22,
              border: '1px solid var(--t-acc-c)',
              background: 'linear-gradient(145deg, color-mix(in srgb, var(--t-acc) 18%, var(--t-card)) 0%, color-mix(in srgb, var(--t-card) 94%, white 6%) 100%)',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.7rem',
              flexWrap: 'wrap',
              boxShadow: '0 14px 30px color-mix(in srgb, var(--t-acc) 14%, transparent)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  border: '1px solid color-mix(in srgb, var(--t-acc) 28%, transparent)',
                  background: 'color-mix(in srgb, var(--t-acc) 15%, transparent)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Palette style={{ width: 18, height: 18, color: 'var(--t-acc)' }} />
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--t-tx)', fontSize: 17, fontWeight: 900 }}>
                    Cosmetic Inventory
                  </p>
                  <p style={{ margin: '0.2rem 0 0', color: 'var(--t-tx3)', fontSize: 12.5 }}>
                    Build your loadout, preview each piece live, and equip instantly.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void fetchInventory()}
                disabled={inventoryLoading}
                style={{
                  borderRadius: 11,
                  border: '1px solid color-mix(in srgb, var(--t-acc) 26%, transparent)',
                  background: 'color-mix(in srgb, var(--t-acc) 12%, transparent)',
                  color: 'var(--t-acc)',
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '0.44rem 0.76rem',
                  cursor: inventoryLoading ? 'default' : 'pointer',
                  opacity: inventoryLoading ? 0.75 : 1,
                }}
              >
                {inventoryLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {inventoryError ? (
              <div style={{
                borderRadius: 14,
                border: '1px solid rgba(248, 113, 113, 0.35)',
                background: 'rgba(248, 113, 113, 0.1)',
                color: '#b91c1c',
                fontSize: 12,
                fontWeight: 700,
                padding: '0.62rem 0.8rem',
              }}>
                {inventoryError}
              </div>
            ) : null}

            {inventoryLoading && !inventoryData ? (
              <div style={{
                borderRadius: 18,
                border: '1px solid var(--t-brd)',
                background: 'var(--t-card)',
                padding: '1rem',
                color: 'var(--t-tx3)',
                fontSize: 13,
              }}>
                Loading inventory...
              </div>
            ) : (
              <InventoryGrid
                ownedItems={inventoryData?.ownedItems ?? []}
                equippedByCategory={
                  inventoryData?.equippedByCategory ?? COSMETIC_CATEGORIES.reduce((acc, category) => {
                    acc[category] = null;
                    return acc;
                  }, {} as Record<CosmeticCategory, string | null>)
                }
                ageGroup={p?.age_group ?? null}
                actionKey={inventoryActionKey}
                isPracticeMode={isPracticeMode}
                onEquip={equipItem}
                onUnequip={unequipItem}
              />
            )}

            {isPracticeMode ? (
              <div style={{
                borderRadius: 14,
                border: '1px solid rgba(217, 119, 6, 0.32)',
                background: 'rgba(245, 158, 11, 0.12)',
                color: '#b45309',
                fontSize: 12,
                fontWeight: 700,
                padding: '0.62rem 0.8rem',
              }}>
                Practice Mode: cosmetic unlocks are temporary until you create a full account.
              </div>
            ) : null}
          </div>
        ) : tab === 'shop' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{
              borderRadius: 24,
              border: '1px solid var(--t-acc-c)',
              background: 'linear-gradient(145deg, color-mix(in srgb, var(--t-acc) 20%, var(--t-card)) 0%, color-mix(in srgb, var(--t-card) 92%, white 8%) 84%)',
              padding: '1.05rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.8rem',
              boxShadow: '0 16px 34px color-mix(in srgb, var(--t-acc) 15%, transparent)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 13,
                  border: '1px solid color-mix(in srgb, var(--t-acc) 28%, transparent)',
                  background: 'color-mix(in srgb, var(--t-acc) 16%, transparent)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Star style={{ width: 18, height: 18, color: 'var(--t-acc)' }} />
                </div>
                <div>
                  <p style={{ margin: 0, color: 'var(--t-tx)', fontSize: 19, fontWeight: 900 }}>
                    Weekly Cosmetic Shop
                  </p>
                  <p style={{ margin: '0.2rem 0 0', color: 'var(--t-tx3)', fontSize: 12.5 }}>
                    Fresh drops every Monday with live previews and instant equip.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                <span style={{
                  borderRadius: 999,
                  border: '1px solid color-mix(in srgb, var(--t-acc) 24%, transparent)',
                  background: 'color-mix(in srgb, var(--t-acc) 12%, transparent)',
                  color: 'var(--t-acc)',
                  padding: '0.3rem 0.62rem',
                  fontSize: 11,
                  fontWeight: 900,
                }}>
                  XP Balance: {effectiveXpBalance.toLocaleString()}
                </span>
                <span style={{
                  borderRadius: 999,
                  border: '1px solid var(--t-brd-a)',
                  background: 'var(--t-acc-a)',
                  color: 'var(--t-acc)',
                  padding: '0.3rem 0.62rem',
                  fontSize: 11,
                  fontWeight: 800,
                }}>
                  {shopCountdownLabel}
                </span>
                <span style={{
                  borderRadius: 999,
                  border: '1px solid rgba(59, 130, 246, 0.28)',
                  background: 'rgba(59, 130, 246, 0.12)',
                  color: '#1d4ed8',
                  padding: '0.3rem 0.62rem',
                  fontSize: 11,
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <WandSparkles style={{ width: 11, height: 11 }} />
                  New items live now
                </span>
                <button
                  type="button"
                  onClick={() => void fetchShop()}
                  disabled={shopLoading}
                  style={{
                    borderRadius: 11,
                    border: '1px solid color-mix(in srgb, var(--t-acc) 26%, transparent)',
                    background: 'color-mix(in srgb, var(--t-acc) 12%, transparent)',
                    color: 'var(--t-acc)',
                    fontSize: 12,
                    fontWeight: 800,
                    padding: '0.44rem 0.76rem',
                    cursor: shopLoading ? 'default' : 'pointer',
                    opacity: shopLoading ? 0.75 : 1,
                  }}
                >
                  {shopLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            {featuredShopItem ? (
              <div style={{
                borderRadius: 20,
                border: '1px solid color-mix(in srgb, var(--t-acc) 22%, var(--t-brd))',
                background: 'linear-gradient(150deg, color-mix(in srgb, var(--t-acc) 14%, var(--t-card)) 0%, color-mix(in srgb, var(--t-card) 96%, white 4%) 84%)',
                padding: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.8rem',
                flexWrap: 'wrap',
                boxShadow: '0 12px 30px color-mix(in srgb, var(--t-acc) 12%, transparent)',
              }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--t-acc)', fontSize: 11, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                    Featured
                  </p>
                  <p style={{ margin: '0.2rem 0 0', color: 'var(--t-tx)', fontSize: 16, fontWeight: 850 }}>
                    {featuredShopItem.item.name}
                  </p>
                  <p style={{ margin: '0.2rem 0 0', color: 'var(--t-tx3)', fontSize: 12 }}>
                    {featuredShopItem.item.description || 'Premium cosmetic style for this week.'} New drops are marked directly on each card.
                  </p>
                </div>
                <div style={{
                  borderRadius: 999,
                  border: '1px solid color-mix(in srgb, var(--t-acc) 24%, transparent)',
                  background: 'color-mix(in srgb, var(--t-acc) 12%, transparent)',
                  color: 'var(--t-acc)',
                  padding: '0.3rem 0.66rem',
                  fontSize: 13,
                  fontWeight: 900,
                }}>
                  {featuredShopItem.price} XP
                </div>
              </div>
            ) : null}

            {shopError ? (
              <div style={{
                borderRadius: 14,
                border: '1px solid rgba(248, 113, 113, 0.35)',
                background: 'rgba(248, 113, 113, 0.1)',
                color: '#b91c1c',
                fontSize: 12,
                fontWeight: 700,
                padding: '0.62rem 0.8rem',
              }}>
                {shopError}
              </div>
            ) : null}

            {shopLoading && !shopData ? (
              <div style={{
                borderRadius: 18,
                border: '1px solid var(--t-brd)',
                background: 'var(--t-card)',
                padding: '1rem',
                color: 'var(--t-tx3)',
                fontSize: 13,
              }}>
                Loading weekly shop...
              </div>
            ) : (
              <WeeklyShopGrid
                items={shopData?.items ?? []}
                xpBalance={effectiveXpBalance}
                actionKey={shopActionKey}
                ageGroup={p?.age_group ?? null}
                onBuy={buyShopItem}
                onBuyAndEquip={unlockAndEquipShopItem}
                onEquip={equipFromShop}
              />
            )}

            {isPracticeMode ? (
              <div style={{
                borderRadius: 14,
                border: '1px solid rgba(217, 119, 6, 0.32)',
                background: 'rgba(245, 158, 11, 0.12)',
                color: '#b45309',
                fontSize: 12,
                fontWeight: 700,
                padding: '0.62rem 0.8rem',
              }}>
                Practice Mode: purchases and cosmetics reset when the practice session ends.
              </div>
            ) : null}
          </div>
        ) : (
        <>
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: 'var(--t-card)', border: '1px solid var(--t-brd-a)',
          borderRadius: 28, padding: '2rem',
        }}>
          {/* Glow */}
          <div style={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, var(--t-acc-b) 0%, transparent 65%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem', alignItems: 'center' }}>
            {/* Level badge */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 100, height: 100, borderRadius: 24,
                background: 'var(--t-acc-b)', border: '2px solid var(--t-acc-c)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 32px var(--t-acc-a)',
	              }}>
	                <span style={{ fontSize: 44, fontWeight: 900, color: 'var(--t-acc)', lineHeight: 1 }}>{p.level}</span>
	                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--t-acc)', opacity: 0.7 }}>LEVEL</span>
	              </div>
	              <p style={{ fontSize: 11, color: 'var(--t-tx3)', marginTop: 2 }}>
	                {isMaxLevel ? 'Max level!' : 'Current level'}
	              </p>
	            </div>

            {/* XP bar + stats */}
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 32, fontWeight: 900, color: 'var(--t-tx)', letterSpacing: '-0.03em' }}>
                    {p.xp.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 15, color: 'var(--t-tx3)', marginLeft: 8 }}>total XP</span>
                </div>
                <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--t-acc)' }}>{Math.round(xp.percent)}%</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--t-tx3)', marginBottom: 12 }}>
                {isMaxLevel ? 'Maximum level — incredible!' : `${xp.current} / ${xp.needed} XP to Level ${p.level + 1}`}
              </p>
              <div style={{ marginBottom: 8 }}>
                <XpProgressBar percent={xp.percent} height={12} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--t-tx3)' }}>
                <span>Level {p.level}</span>
                <span>{isMaxLevel ? 'MAX' : `Level ${p.level + 1}`}</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{
            position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem',
            borderTop: '1px solid var(--t-brd)',
          }}>
            {[
              { icon: null,  label: 'Hot Streak', value: p.streak,              color: 'var(--t-acc)' },
              { icon: Star,  label: 'XP Stash',   value: p.xp.toLocaleString(), color: 'var(--t-acc)' },
              { icon: TrendingUp, label: 'Best Run', value: p.longest_streak,   color: '#4ade80' },
            ].map((s, i) => (
              <div key={s.label} style={{
                textAlign: 'center',
                borderLeft: i > 0 ? '1px solid var(--t-brd)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                  {s.label === 'Hot Streak' ? <EquippedFireIcon size={18} /> : s.icon ? <s.icon style={{ width: 18, height: 18, color: s.color }} /> : null}
                  <span style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</span>
                </div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--t-tx3)' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ══ XP ACTIVITY FEED ══ */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Zap style={{ width: 18, height: 18, color: 'var(--t-acc)' }} />
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--t-tx)', margin: 0 }}>Recent Activity</h2>
          </div>
          <p style={{ color: 'var(--t-tx3)', fontSize: 13, marginBottom: '1.25rem' }}>
            Your 7 most recent XP gains
          </p>

          <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 24, overflow: 'hidden' }}>
            {xpLogLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < 4 ? '1px solid var(--t-brd)' : 'none' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--t-card2)', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ height: 13, borderRadius: 6, background: 'var(--t-card2)', width: '60%', animation: 'pulse 1.5s infinite' }} />
                    <div style={{ height: 11, borderRadius: 6, background: 'var(--t-card2)', width: '30%', animation: 'pulse 1.5s infinite' }} />
                  </div>
                  <div style={{ width: 40, height: 16, borderRadius: 6, background: 'var(--t-card2)', animation: 'pulse 1.5s infinite' }} />
                </div>
              ))
            ) : xpLog.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <Zap style={{ width: 32, height: 32, color: 'var(--t-tx3)', margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--t-tx3)', fontSize: 14 }}>No activity yet — start earning XP!</p>
              </div>
            ) : xpLog.map((entry, i) => {
              const r = entry.reason?.toLowerCase() ?? '';
              const meta: { Icon: LucideIcon; label: string; color: string } =
                r.includes('submit') || r.includes('writing')
                  ? { Icon: PenLine,       label: 'Writing Submitted',         color: '#fb923c' }
                  : r.includes('feedback') || r.includes('ai feedback')
                  ? { Icon: Bot,           label: 'AI Feedback Received',      color: '#22d3ee' }
                  : r.includes('vocab') && r.includes('master')
                  ? { Icon: GraduationCap, label: 'Word Mastered',             color: '#fbbf24' }
                  : r.includes('vocab') && r.includes('sentence')
                  ? { Icon: Zap,           label: 'Vocab Sentence Practice',   color: '#f472b6' }
                  : r.includes('vocab') || r.includes('word')
                  ? { Icon: BookOpen,      label: 'Vocabulary Used in Writing', color: '#60a5fa' }
                  : r.includes('test') || r.includes('quiz')
                  ? { Icon: Star,          label: 'Vocab Test Completed',      color: '#818cf8' }
                  : r.includes('streak') || r.includes('milestone')
                  ? { Icon: null,          label: 'Streak Milestone',          color: '#f97316' }
                  : r.includes('goal') || r.includes('daily')
                  ? { Icon: Target,        label: 'Daily Goal Reached',        color: '#4ade80' }
                  : r.includes('level')
                  ? { Icon: TrendingUp,    label: 'Level Up',                  color: '#a78bfa' }
                  : { Icon: Zap,           label: 'XP Earned',                 color: 'var(--t-acc)' };

              return (
                <div key={entry.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px',
                  borderBottom: i < xpLog.length - 1 ? '1px solid var(--t-brd)' : 'none',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {meta.label === 'Streak Milestone' ? <EquippedFireIcon size={17} /> : meta.Icon ? <meta.Icon style={{ width: 17, height: 17, color: meta.color }} /> : null}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t-tx)', margin: 0 }}>{meta.label}</p>
                    <p style={{ fontSize: 12, color: 'var(--t-tx3)', margin: '3px 0 0' }}>
                      {new Date(entry.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 900, color: meta.color, flexShrink: 0 }}>+{entry.amount} XP</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══ HOW TO EARN XP ══ */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Sparkles style={{ width: 18, height: 18, color: 'var(--t-acc)' }} />
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--t-tx)', margin: 0 }}>How to Earn XP</h2>
          </div>
          <p style={{ color: 'var(--t-tx3)', fontSize: 13, marginBottom: '1.25rem' }}>
            Every action in Draftora earns XP toward your next level.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.75rem' }}>
            {XP_SOURCES.map(src => {
              const Icon = src.icon;
              return (
                <div key={src.title} style={{
                  background: 'var(--t-card)',
                  border: '1px solid var(--t-brd)',
                  borderLeft: `3px solid ${src.color}`,
                  borderRadius: 16,
                  padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  {/* Icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: `${src.color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon style={{ width: 18, height: 18, color: src.color }} />
                  </div>
                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t-tx)', margin: 0 }}>{src.title}</p>
                      <span style={{
                        fontSize: 12, fontWeight: 800, flexShrink: 0,
                        background: 'var(--t-acc-a)', color: 'var(--t-acc)',
                        border: '1px solid var(--t-brd-a)',
                        borderRadius: 8, padding: '3px 10px',
                      }}>{src.xp}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--t-tx3)', margin: '3px 0 0' }}>{src.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Word count bonuses */}
          <div style={{
            marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.75rem',
          }}>
            {[
              { label: '250+ Words', sub: '+5 bonus XP per submission', color: '#60a5fa', n: '250' },
              { label: '500+ Words', sub: '+10 bonus XP per submission', color: '#a78bfa', n: '500' },
            ].map(b => (
              <div key={b.n} style={{
                background: 'var(--t-card)', border: '1px solid var(--t-brd)',
                borderLeft: `3px solid ${b.color}`,
                borderRadius: 16, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: `${b.color}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <PenLine style={{ width: 18, height: 18, color: b.color }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t-tx)', margin: 0 }}>{b.label}</p>
                  <p style={{ fontSize: 12, color: 'var(--t-tx3)', margin: '3px 0 0' }}>{b.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ STREAK BONUSES ══ */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <EquippedFireIcon size={18} />
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--t-tx)', margin: 0 }}>Streak Boosts</h2>
          </div>
          <p style={{ color: 'var(--t-tx3)', fontSize: 13, marginBottom: '1.25rem' }}>
            {nextStreak
              ? daysToNext === 0
                ? 'You just hit a milestone! Keep going for the next one.'
                : `${daysToNext} more day${daysToNext === 1 ? '' : 's'} until your next streak bonus (+${nextStreak.xp} XP)`
              : "You've hit all streak milestones — legendary!"}
          </p>

          <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 24, overflow: 'hidden' }}>
            {STREAK_MILESTONES.map((m, i) => {
              const reached = p.streak >= m.days;
              const isNext  = nextStreak?.days === m.days;
              const pct     = Math.min((p.streak / m.days) * 100, 100);

              return (
                <div key={m.days} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '16px 20px',
                  borderBottom: i < STREAK_MILESTONES.length - 1 ? '1px solid var(--t-brd)' : 'none',
                  borderLeft: reached ? '3px solid #4ade80' : isNext ? '3px solid var(--t-acc)' : '3px solid transparent',
                  background: isNext ? 'var(--t-acc-a)' : 'transparent',
                }}>
                  {/* Emoji */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                    background: reached ? 'rgba(74,222,128,0.1)' : isNext ? 'var(--t-acc-a)' : 'var(--t-card2)',
                    border: reached ? '1px solid rgba(74,222,128,0.2)' : isNext ? '1px solid var(--t-acc-c)' : '1px solid var(--t-brd)',
                    opacity: reached || isNext ? 1 : 0.45,
                  }}>
                    {m.emoji}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: reached || isNext ? 'var(--t-tx)' : 'var(--t-tx3)', margin: 0 }}>
                        {m.label}
                      </p>
                      <span style={{ fontSize: 12, color: 'var(--t-tx3)' }}>({m.days} days)</span>
                      {isNext && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                          background: 'var(--t-acc-a)', color: 'var(--t-acc)',
                          border: '1px solid var(--t-brd-a)', borderRadius: 99, padding: '2px 8px',
                        }}>Next</span>
                      )}
                    </div>
                    {reached && <p style={{ fontSize: 12, color: '#4ade80', margin: 0 }}>Bonus earned ✓</p>}
                    {!reached && !isNext && <p style={{ fontSize: 12, color: 'var(--t-tx3)', margin: 0 }}>{m.days - p.streak} days to go</p>}
                    {isNext && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ height: 5, background: 'var(--t-xp-track)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--t-xp)', borderRadius: 99 }} />
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--t-tx3)', marginTop: 4 }}>{p.streak} / {m.days} days</p>
                      </div>
                    )}
                  </div>

                  {/* XP + check */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: reached ? '#4ade80' : isNext ? 'var(--t-acc)' : 'var(--t-tx3)', opacity: reached || isNext ? 1 : 0.35 }}>
                      +{m.xp} XP
                    </span>
                    {reached
                      ? <CheckCircle2 style={{ width: 18, height: 18, color: '#4ade80' }} />
                      : <Lock style={{ width: 15, height: 15, color: 'var(--t-tx3)', opacity: isNext ? 0.5 : 0.25 }} />
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        </>
        )}

      </div>
    </div>
  );
}
