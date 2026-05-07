'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Eye, Filter, ShoppingBag, Sparkles } from 'lucide-react';
import CosmeticLivePreview from '@/app/components/rewards/CosmeticLivePreview';
import ShopItemCard from '@/app/components/shop/ShopItemCard';
import { getRarityStyles } from '@/app/lib/rewards/rarity-ui';
import {
  CATEGORY_LABELS,
  SHOP_INVENTORY_CATEGORIES,
  COSMETIC_RARITIES,
  type CosmeticCategory,
  type CosmeticRarity,
} from '@/app/lib/rewards/catalog';

type ShopItem = {
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
    slug: string;
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
      category_line?: string;
    };
  };
};

type WeeklyShopGridProps = {
  items: ShopItem[];
  xpBalance: number;
  actionKey: string | null;
  ageGroup?: string | null;
  onBuy: (itemId: string) => Promise<boolean | void>;
  onBuyAndEquip?: (category: CosmeticCategory, itemId: string) => Promise<void>;
  onEquip: (category: CosmeticCategory, itemId: string) => Promise<void>;
};

const CATEGORY_SCENE: Record<CosmeticCategory, { a: string; b: string; c: string }> = {
  editor_themes: { a: '#1d4ed8', b: '#60a5fa', c: '#dbeafe' },
  profile_frames: { a: '#0f766e', b: '#22d3ee', c: '#ccfbf1' },
  badges: { a: '#6d28d9', b: '#c084fc', c: '#fae8ff' },
  streak_effects: { a: '#be123c', b: '#fb7185', c: '#ffe4e6' },
  xp_visuals: { a: '#0f766e', b: '#34d399', c: '#d1fae5' },
  ui_custom: { a: '#4338ca', b: '#818cf8', c: '#e0e7ff' },
};

const RARITY_LABELS: Record<CosmeticRarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

const RARITY_SORT: Record<CosmeticRarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

function toNumber(value: unknown, fallback = 1) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export default function WeeklyShopGrid({ items, xpBalance, actionKey, ageGroup = null, onBuy, onBuyAndEquip, onEquip }: WeeklyShopGridProps) {
  const [categoryFilter, setCategoryFilter] = useState<'all' | CosmeticCategory>('all');
  const [rarityFilter, setRarityFilter] = useState<'all' | CosmeticRarity>('all');
  const [sortMode, setSortMode] = useState<'featured' | 'price_low' | 'price_high'>('featured');
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const next = items.filter((entry) => {
      if (categoryFilter !== 'all' && entry.item.category !== categoryFilter) return false;
      if (rarityFilter !== 'all' && entry.item.rarity !== rarityFilter) return false;
      return true;
    });

    const sorted = [...next];

    if (sortMode === 'price_low') {
      sorted.sort((a, b) => a.price - b.price || a.position - b.position);
      return sorted;
    }

    if (sortMode === 'price_high') {
      sorted.sort((a, b) => b.price - a.price || a.position - b.position);
      return sorted;
    }

    sorted.sort((a, b) => {
      const score = (entry: ShopItem) => {
        if (entry.featured || entry.slotType === 'featured') return 4;
        if (entry.affordable || entry.slotType === 'affordable') return 3;
        if (entry.owned && entry.equipped) return 2;
        if (entry.owned) return 1;
        return 0;
      };

      const scoreDiff = score(b) - score(a);
      if (scoreDiff !== 0) return scoreDiff;

      const rarityDiff = RARITY_SORT[b.item.rarity] - RARITY_SORT[a.item.rarity];
      if (rarityDiff !== 0) return rarityDiff;

      return a.position - b.position;
    });

    return sorted;
  }, [items, categoryFilter, rarityFilter, sortMode]);

  useEffect(() => {
    if (filteredItems.length === 0) {
      setPreviewItemId(null);
      return;
    }

    setPreviewItemId((current) => {
      if (current && filteredItems.some((entry) => entry.item.id === current)) return current;
      const featured = filteredItems.find((entry) => entry.featured) ?? filteredItems.find((entry) => entry.affordable);
      return (featured ?? filteredItems[0]).item.id;
    });
  }, [filteredItems]);

  const previewItem = useMemo(() => {
    if (!previewItemId) return filteredItems[0] ?? null;
    return filteredItems.find((entry) => entry.item.id === previewItemId) ?? filteredItems[0] ?? null;
  }, [filteredItems, previewItemId]);

  const affordableCount = items.filter((entry) => !entry.owned && entry.price <= xpBalance).length;
  const ownedInRotation = items.filter((entry) => entry.owned).length;

  if (items.length === 0) {
    return (
      <div
        style={{
          borderRadius: 16,
          border: '1px dashed var(--t-brd)',
          background: 'var(--t-card)',
          padding: '0.95rem',
          color: 'var(--t-tx3)',
          fontSize: 13,
        }}
      >
        Shop rotation is being prepared. Refresh in a moment.
      </div>
    );
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div
        style={{
          borderRadius: 18,
          border: '1px solid var(--t-brd)',
          background: 'linear-gradient(145deg, color-mix(in srgb, var(--t-card) 92%, var(--t-acc) 8%) 0%, var(--t-card) 100%)',
          padding: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.72rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--t-tx)', fontSize: 12.5, fontWeight: 850 }}>
            <ShoppingBag style={{ width: 14, height: 14, color: 'var(--t-acc)' }} />
            Rotation: {items.length} live items
          </span>
          <span className="shop-chip shop-chip--green">{affordableCount} affordable now</span>
          <span className="shop-chip shop-chip--indigo">{ownedInRotation} owned in rotation</span>
          <span className="shop-chip shop-chip--blue">Balance: {xpBalance.toLocaleString()} XP</span>
        </div>

        <div className="shop-filter-row">
          <button type="button" className="shop-filter" data-active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>
            All Categories
          </button>
          {SHOP_INVENTORY_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className="shop-filter"
              data-active={categoryFilter === category}
              onClick={() => setCategoryFilter(category)}
            >
              {CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--t-tx3)', fontSize: 11.5, fontWeight: 800 }}>
            <Filter style={{ width: 12, height: 12 }} />
            Filters
          </span>
          <div className="shop-filter-row shop-filter-row--compact">
            <button type="button" className="shop-filter shop-filter--mini" data-active={rarityFilter === 'all'} onClick={() => setRarityFilter('all')}>
              All Rarity
            </button>
            {COSMETIC_RARITIES.map((rarity) => (
              <button
                key={rarity}
                type="button"
                className="shop-filter shop-filter--mini"
                data-active={rarityFilter === rarity}
                onClick={() => setRarityFilter(rarity)}
              >
                {RARITY_LABELS[rarity]}
              </button>
            ))}
            <button type="button" className="shop-filter shop-filter--mini" data-active={sortMode === 'featured'} onClick={() => setSortMode('featured')}>
              Featured First
            </button>
            <button type="button" className="shop-filter shop-filter--mini" data-active={sortMode === 'price_low'} onClick={() => setSortMode('price_low')}>
              Cheapest
            </button>
            <button type="button" className="shop-filter shop-filter--mini" data-active={sortMode === 'price_high'} onClick={() => setSortMode('price_high')}>
              Premium
            </button>
          </div>
        </div>
      </div>

      {previewItem ? (
        (() => {
          const scene = CATEGORY_SCENE[previewItem.item.category] ?? CATEGORY_SCENE.xp_visuals ?? { a: '#0f766e', b: '#34d399', c: '#d1fae5' };
          const rarity = RARITY_LABELS[previewItem.item.rarity];
          const rarityStyle = getRarityStyles(previewItem.item.rarity);
          const collection = String(previewItem.item.metadata?.collection ?? 'Rotation Collection');
          const categoryLine = String(previewItem.item.metadata?.category_line ?? previewItem.item.description ?? 'Premium cosmetic drop.');
          const collectionIndex = Math.max(1, toNumber(previewItem.item.metadata?.collection_index, 1));
          const previewVars = {
            '--scene-a': scene?.a ?? '#0f766e',
            '--scene-b': scene?.b ?? '#34d399',
            '--scene-c': scene?.c ?? '#d1fae5',
            '--scene-rot': `${(collectionIndex * 18) % 360}deg`,
          } as CSSProperties;

          return (
            <div className={`shop-showcase ${rarityStyle.cardClass} ${rarityStyle.animationClass}`} style={previewVars}>
              <div className="shop-showcase__bg" aria-hidden="true" />
              <div className="shop-showcase__top">
                <span className="shop-showcase__kicker">
                  <Eye style={{ width: 12, height: 12 }} />
                  Live Preview Booth
                </span>
                <span className={`shop-showcase__rarity ${rarityStyle.badgeClass}`}>{rarity}</span>
              </div>
              <div className="shop-showcase__main">
                <div style={{ minWidth: 0 }}>
                  <p className="shop-showcase__name">{previewItem.item.name}</p>
                  <p className="shop-showcase__meta">{CATEGORY_LABELS[previewItem.item.category]} · {collection}</p>
                  <p className="shop-showcase__copy">{categoryLine}</p>
                </div>
                <CosmeticLivePreview
                  category={previewItem.item.category}
                  rarity={previewItem.item.rarity}
                  name={previewItem.item.name}
                  slug={previewItem.item.slug}
                  collection={collection}
                  ageGroup={ageGroup}
                  showMeta={false}
                  className={[
                    rarityStyle.previewClass,
                    previewItem.item.category === 'streak_effects' ? 'shop-preview--streak' : '',
                  ].filter(Boolean).join(' ')}
                />
                <div className="shop-showcase__price">{previewItem.price} XP</div>
              </div>
            </div>
          );
        })()
      ) : null}

      {filteredItems.length === 0 ? (
        <div
          style={{
            borderRadius: 16,
            border: '1px dashed var(--t-brd)',
            background: 'var(--t-card)',
            padding: '0.9rem',
            color: 'var(--t-tx3)',
            fontSize: 12.5,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Sparkles style={{ width: 14, height: 14, color: 'var(--t-acc)' }} />
          No items match your current shop filters.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(206px, 1fr))',
            gap: '0.72rem',
          }}
        >
          {filteredItems.map((entry) => (
            <ShopItemCard
              key={entry.id}
              entry={entry}
              actionKey={actionKey}
              canAfford={xpBalance >= entry.price}
              ageGroup={ageGroup}
              onBuy={onBuy}
              onBuyAndEquip={onBuyAndEquip}
              onEquip={onEquip}
              onPreview={setPreviewItemId}
              isPreviewActive={previewItem?.item.id === entry.item.id}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        .shop-filter-row {
          display: flex;
          gap: 0.45rem;
          flex-wrap: nowrap;
          overflow-x: auto;
          padding-bottom: 0.1rem;
          scrollbar-width: thin;
        }

        .shop-filter-row--compact {
          gap: 0.36rem;
          max-width: 100%;
        }

        .shop-chip {
          border-radius: 999px;
          border: 1px solid transparent;
          padding: 0.18rem 0.5rem;
          font-size: 11px;
          font-weight: 800;
        }

        .shop-chip--green {
          border-color: rgba(74, 222, 128, 0.34);
          background: rgba(74, 222, 128, 0.14);
          color: #166534;
        }

        .shop-chip--indigo {
          border-color: rgba(99, 102, 241, 0.34);
          background: rgba(99, 102, 241, 0.14);
          color: #3730a3;
        }

        .shop-chip--blue {
          border-color: color-mix(in srgb, var(--t-acc) 28%, transparent);
          background: color-mix(in srgb, var(--t-acc) 12%, transparent);
          color: var(--t-acc);
        }

        .shop-filter {
          border-radius: 999px;
          border: 1px solid var(--t-brd);
          background: var(--t-card2);
          color: var(--t-tx3);
          font-size: 11px;
          font-weight: 700;
          padding: 0.34rem 0.62rem;
          cursor: pointer;
          transition: background 0.16s ease, color 0.16s ease, border-color 0.16s ease;
        }

        .shop-filter--mini {
          padding: 0.28rem 0.56rem;
          font-size: 10.5px;
        }

        .shop-filter[data-active='true'] {
          border-color: var(--t-acc-c);
          background: color-mix(in srgb, var(--t-acc) 14%, var(--t-card2));
          color: var(--t-acc);
        }

        .shop-showcase {
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          border: 1px solid color-mix(in srgb, var(--scene-a) 26%, var(--t-brd));
          background: linear-gradient(145deg, color-mix(in srgb, var(--t-card) 92%, var(--scene-b) 8%) 0%, var(--t-card) 100%);
          padding: 0.82rem;
          box-shadow: 0 18px 40px color-mix(in srgb, var(--scene-a) 18%, transparent);
        }

        .shop-showcase::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(circle at 18% 18%, rgba(255,255,255,0.18) 0%, transparent 20%), radial-gradient(circle at 82% 22%, rgba(255,255,255,0.12) 0%, transparent 18%);
          opacity: 0.3;
          pointer-events: none;
          z-index: 0;
        }

        .shop-showcase__bg {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle at 14% 18%, rgba(255,255,255,0.34) 0, rgba(255,255,255,0) 42%), radial-gradient(circle at 82% 72%, rgba(255,255,255,0.24) 0, rgba(255,255,255,0) 46%);
          filter: hue-rotate(var(--scene-rot, 0deg));
          pointer-events: none;
          animation: showcase-glow 16s ease-in-out infinite;
        }

        .shop-showcase__top {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 0.72rem;
        }

        .shop-showcase__kicker {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--scene-a) 34%, transparent);
          background: rgba(255, 255, 255, 0.48);
          color: #1f2937;
          padding: 0.18rem 0.52rem;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .shop-showcase__rarity {
          border-radius: 999px;
          padding: 0.18rem 0.52rem;
          font-size: 10.5px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .shop-showcase__main {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(180px, 1fr) minmax(180px, 250px) auto;
          align-items: center;
          gap: 0.66rem;
        }

        .shop-showcase__name {
          margin: 0;
          color: #0f172a;
          font-size: clamp(1.02rem, 2.6vw, 1.24rem);
          font-weight: 900;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .shop-showcase__meta {
          margin: 0.16rem 0 0;
          color: rgba(30, 41, 59, 0.78);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.07em;
          text-transform: uppercase;
        }

        .shop-showcase__copy {
          margin: 0.28rem 0 0;
          color: rgba(30, 41, 59, 0.84);
          font-size: 12px;
          line-height: 1.45;
          max-width: 620px;
        }

        .shop-showcase__price {
          border-radius: 999px;
          border: 1px solid rgba(15, 23, 42, 0.2);
          background: rgba(15, 23, 42, 0.78);
          color: white;
          padding: 0.35rem 0.68rem;
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
        }

        .shop-showcase.shop-rarity-card--common {
          border-color: rgba(59, 130, 246, 0.28);
          box-shadow: 0 14px 28px rgba(30, 64, 175, 0.14);
        }

        .shop-showcase.shop-rarity-card--rare {
          border-color: rgba(34, 211, 238, 0.38);
          box-shadow: 0 16px 30px rgba(8, 145, 178, 0.2);
        }

        .shop-showcase.shop-rarity-card--epic {
          border-color: rgba(192, 132, 252, 0.5);
          box-shadow: 0 18px 34px rgba(168, 85, 247, 0.24);
        }

        .shop-showcase.shop-rarity-card--legendary {
          border-color: rgba(251, 146, 60, 0.58);
          box-shadow: 0 20px 38px rgba(217, 119, 6, 0.26);
        }

        .shop-showcase__rarity.shop-rarity-badge--common {
          border: 1px solid rgba(59, 130, 246, 0.35);
          background: linear-gradient(180deg, rgba(255,255,255,0.7), rgba(59,130,246,0.16));
          color: #1d4ed8;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.65);
        }

        .shop-showcase__rarity.shop-rarity-badge--rare {
          border: 1px solid rgba(34, 211, 238, 0.4);
          background: linear-gradient(180deg, rgba(255,255,255,0.7), rgba(34,211,238,0.18));
          color: #0e7490;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.65);
        }

        .shop-showcase__rarity.shop-rarity-badge--epic {
          border: 1px solid rgba(192, 132, 252, 0.42);
          background: linear-gradient(180deg, rgba(255,255,255,0.68), rgba(192,132,252,0.24));
          color: #7e22ce;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.65), 0 10px 18px rgba(168, 85, 247, 0.16);
          position: relative;
          overflow: hidden;
        }

        .shop-showcase__rarity.shop-rarity-badge--legendary {
          border: 1px solid rgba(251, 146, 60, 0.54);
          background: linear-gradient(130deg, rgba(255,255,255,0.62), rgba(251, 191, 36, 0.22), rgba(249, 115, 22, 0.24));
          color: #b45309;
          box-shadow: inset 0 0 14px rgba(251, 191, 36, 0.2);
          position: relative;
          overflow: hidden;
        }

        .shop-showcase__rarity.shop-rarity-badge--epic::after,
        .shop-showcase__rarity.shop-rarity-badge--legendary::after {
          content: '';
          position: absolute;
          inset: -10px;
          background: linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.82) 46%, transparent 72%);
          opacity: 0.0;
          transform: translateX(-140%);
          pointer-events: none;
        }

        .shop-showcase:hover .shop-showcase__rarity.shop-rarity-badge--epic::after,
        .shop-showcase:hover .shop-showcase__rarity.shop-rarity-badge--legendary::after {
          opacity: 0.65;
          animation: showcase-rarity-shine 2.6s ease-in-out infinite;
        }

        .shop-showcase.shop-rarity-anim--epic {
          animation: showcase-epic-pulse 4.8s ease-in-out infinite;
        }

        .shop-showcase.shop-rarity-anim--legendary::after {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          background: linear-gradient(112deg, transparent 0%, rgba(255,255,255,0.7) 46%, transparent 72%);
          animation: showcase-legend-shine 3.4s linear infinite;
          pointer-events: none;
          opacity: 0.66;
        }

        .shop-showcase.shop-rarity-anim--epic::after {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          background: linear-gradient(112deg, transparent 0%, rgba(255,255,255,0.62) 46%, transparent 72%);
          animation: showcase-legend-shine 4.6s linear infinite;
          pointer-events: none;
          opacity: 0.32;
        }

        @keyframes showcase-epic-pulse {
          0%,
          100% { box-shadow: 0 18px 34px rgba(168, 85, 247, 0.18); }
          50% { box-shadow: 0 22px 38px rgba(219, 39, 119, 0.24); }
        }

        @keyframes showcase-glow {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.96; }
          50% { transform: translate3d(1.5px, -1.5px, 0); opacity: 1; }
        }

        @keyframes showcase-legend-shine {
          0% { transform: translateX(-140%); }
          100% { transform: translateX(180%); }
        }

        @keyframes showcase-rarity-shine {
          0% { transform: translateX(-140%); opacity: 0; }
          28% { opacity: 0.65; }
          55% { opacity: 0.35; }
          100% { transform: translateX(140%); opacity: 0; }
        }

        @media (max-width: 760px) {
          .shop-showcase__main {
            grid-template-columns: 1fr;
            justify-items: flex-start;
          }

          .shop-showcase__price {
            margin-top: 0.2rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .shop-showcase,
          .shop-showcase *,
          .shop-showcase::before,
          .shop-showcase::after {
            animation: none !important;
            transition: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </section>
  );
}
