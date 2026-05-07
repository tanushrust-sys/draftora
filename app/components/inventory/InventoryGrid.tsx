'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Lock, Palette, Sparkles, WandSparkles } from 'lucide-react';
import CosmeticLivePreview from '@/app/components/rewards/CosmeticLivePreview';
import { getRarityStyles } from '@/app/lib/rewards/rarity-ui';
import {
  FIRE_THEMES_BY_RARITY,
  FIRE_THEME_UPDATED_EVENT,
  getSavedFireThemeIndex,
  saveFireThemeIndex,
} from '@/app/lib/rewards/fire-theme';
import {
  CATEGORY_LABELS,
  SHOP_INVENTORY_CATEGORIES,
  COSMETIC_RARITIES,
  getStreakEffectDisplayName,
  type CosmeticCategory,
  type CosmeticRarity,
} from '@/app/lib/rewards/catalog';

type InventoryItem = {
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

type InventoryGridProps = {
  ownedItems: InventoryItem[];
  equippedByCategory: Record<CosmeticCategory, string | null>;
  ageGroup?: string | null;
  isPracticeMode?: boolean;
  actionKey: string | null;
  onEquip: (category: CosmeticCategory, itemId: string) => Promise<void>;
  onUnequip: (category: CosmeticCategory) => Promise<void>;
};

function AppliedItemPreview({
  entry,
  ageGroup,
  className,
}: {
  entry: InventoryItem;
  ageGroup?: string | null;
  className?: string;
}) {
  return (
    <CosmeticLivePreview
      category={entry.item.category}
      rarity={entry.item.rarity}
      name={entry.item.name}
      slug={entry.item.slug}
      collection={String(entry.item.metadata?.collection ?? 'Live Preview')}
      ageGroup={ageGroup}
      fireThemeItemId={entry.item.category === 'streak_effects' ? entry.item.id : null}
      showMeta={false}
      className={className}
    />
  );
}

const RARITY_STYLES: Record<CosmeticRarity, {
  label: string;
}> = {
  common: {
    label: 'Common',
  },
  rare: {
    label: 'Rare',
  },
  epic: {
    label: 'Epic',
  },
  legendary: {
    label: 'Legendary',
  },
};

const ACQUIRED_VIA_LABEL: Record<string, string> = {
  starter_pack: 'Starter',
  shop_purchase: 'Shop',
};

function formatAcquiredVia(value: string) {
  if (ACQUIRED_VIA_LABEL[value]) return ACQUIRED_VIA_LABEL[value];
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function InventoryGrid({
  ownedItems,
  equippedByCategory,
  ageGroup = null,
  isPracticeMode = false,
  actionKey,
  onEquip,
  onUnequip,
}: InventoryGridProps) {
  const [categoryFilter, setCategoryFilter] = useState<'all' | CosmeticCategory>('all');
  const [rarityFilter, setRarityFilter] = useState<'all' | CosmeticRarity>('all');
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [, setFireThemeVersion] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onFireThemeUpdated = () => setFireThemeVersion((value) => value + 1);
    window.addEventListener(FIRE_THEME_UPDATED_EVENT, onFireThemeUpdated as EventListener);
    return () => window.removeEventListener(FIRE_THEME_UPDATED_EVENT, onFireThemeUpdated as EventListener);
  }, []);

  const equippedCount = SHOP_INVENTORY_CATEGORIES.reduce((count, category) => {
    return equippedByCategory[category] ? count + 1 : count;
  }, 0);

  const filteredItems = useMemo(() => {
    const rarityRank: Record<CosmeticRarity, number> = { common: 1, rare: 2, epic: 3, legendary: 4 };

    const filtered = ownedItems.filter((entry) => {
      if (categoryFilter !== 'all' && entry.item.category !== categoryFilter) return false;
      if (rarityFilter !== 'all' && entry.item.rarity !== rarityFilter) return false;
      return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const aEquipped = equippedByCategory[a.item.category] === a.item.id;
      const bEquipped = equippedByCategory[b.item.category] === b.item.id;
      if (aEquipped !== bEquipped) return aEquipped ? -1 : 1;
      if (a.item.rarity !== b.item.rarity) return rarityRank[b.item.rarity] - rarityRank[a.item.rarity];
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sorted;
  }, [ownedItems, categoryFilter, rarityFilter, equippedByCategory]);

  useEffect(() => {
    if (filteredItems.length === 0) {
      setPreviewItemId(null);
      return;
    }

    setPreviewItemId((current) => {
      if (current && filteredItems.some((entry) => entry.item.id === current)) return current;
      const equippedCandidate = filteredItems.find((entry) => equippedByCategory[entry.item.category] === entry.item.id);
      return (equippedCandidate ?? filteredItems[0]).item.id;
    });
  }, [filteredItems, equippedByCategory]);

  const previewItem = useMemo(() => {
    if (!previewItemId) return filteredItems[0] ?? null;
    return filteredItems.find((entry) => entry.item.id === previewItemId) ?? filteredItems[0] ?? null;
  }, [filteredItems, previewItemId]);
  const previewRarityUi = previewItem ? getRarityStyles(previewItem.item.rarity) : null;

  const compactEquippedSummary = useMemo(() => {
    return SHOP_INVENTORY_CATEGORIES
      .map((category) => {
        const equippedId = equippedByCategory[category];
        if (!equippedId) return null;
        const item = ownedItems.find((entry) => entry.item.id === equippedId);
        if (!item) return null;
        return {
          category,
          label: CATEGORY_LABELS[category],
          name: item.item.name,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, [equippedByCategory, ownedItems]);

  if (ownedItems.length === 0) {
    return (
      <section
        style={{
          borderRadius: 24,
          border: '1px solid var(--t-brd)',
          background: 'var(--t-card)',
          padding: '1.2rem',
        }}
      >
        <div
          style={{
            borderRadius: 18,
            border: '1px dashed var(--t-brd)',
            background: 'var(--t-bg)',
            padding: '1.4rem',
            textAlign: 'center',
          }}
        >
          <Palette style={{ width: 28, height: 28, color: 'var(--t-acc)', margin: '0 auto 0.6rem' }} />
          <h3 style={{ margin: 0, color: 'var(--t-tx)', fontSize: 18, fontWeight: 850 }}>No cosmetics in inventory yet</h3>
          <p style={{ margin: '0.45rem 0 0', color: 'var(--t-tx3)', fontSize: 13 }}>
            Practice more to unlock your starter set, then equip styles here.
          </p>
          {isPracticeMode ? (
            <p style={{ margin: '0.6rem 0 0', color: '#b45309', fontSize: 12, fontWeight: 700 }}>
              Practice inventory is temporary and resets after session close.
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div
        style={{
          borderRadius: 18,
          border: '1px solid var(--t-brd)',
          background: 'linear-gradient(145deg, color-mix(in srgb, var(--t-card) 92%, var(--t-acc) 8%) 0%, var(--t-card) 100%)',
          padding: '0.78rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, color: 'var(--t-tx)', fontSize: 13.2, fontWeight: 900 }}>Inventory Locker</p>
            <span className="inv-chip inv-chip--blue">{ownedItems.length} owned</span>
            <span className="inv-chip inv-chip--green">{equippedCount} equipped</span>
          </div>
          <span style={{ color: 'var(--t-tx3)', fontSize: 10.8, fontWeight: 700 }}>Tap card to preview</span>
        </div>

        <div className="inv-filter-row">
          <button type="button" className="inv-filter" data-active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>
            All Categories
          </button>
          {SHOP_INVENTORY_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className="inv-filter"
              data-active={categoryFilter === category}
              onClick={() => setCategoryFilter(category)}
            >
              {CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>

        <div className="inv-filter-row">
          <button type="button" className="inv-filter inv-filter--rarity" data-active={rarityFilter === 'all'} onClick={() => setRarityFilter('all')}>
            All Rarity
          </button>
          {COSMETIC_RARITIES.map((rarity) => (
            <button
              key={rarity}
              type="button"
              className="inv-filter inv-filter--rarity"
              data-active={rarityFilter === rarity}
              onClick={() => setRarityFilter(rarity)}
            >
              {RARITY_STYLES[rarity].label}
            </button>
          ))}
        </div>
      </div>

      {previewItem ? (
        <div className="inv-live-stage">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: 12.8, fontWeight: 860, color: 'var(--t-tx)' }}>
                {previewItem.item.category === 'streak_effects'
                  ? getStreakEffectDisplayName(previewItem.item.rarity)
                  : previewItem.item.name}
              </p>
              <p style={{ margin: '0.15rem 0 0', fontSize: 10.8, color: 'var(--t-tx3)' }}>
                {CATEGORY_LABELS[previewItem.item.category]} · {RARITY_STYLES[previewItem.item.rarity].label}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              {equippedByCategory[previewItem.item.category] === previewItem.item.id ? (
                <button
                  type="button"
                  className="inv-action inv-action--secondary"
                  disabled={actionKey === `unequip:${previewItem.item.category}`}
                  onClick={() => onUnequip(previewItem.item.category)}
                >
                  <Lock style={{ width: 12, height: 12 }} />
                  {actionKey === `unequip:${previewItem.item.category}` ? 'Updating...' : 'Unequip'}
                </button>
              ) : (
                <button
                  type="button"
                  className="inv-action"
                  disabled={actionKey === `equip:${previewItem.item.id}`}
                  onClick={() => onEquip(previewItem.item.category, previewItem.item.id)}
                >
                  <Check style={{ width: 12, height: 12 }} />
                  {actionKey === `equip:${previewItem.item.id}` ? 'Updating...' : 'Equip'}
                </button>
              )}
            </div>
          </div>

          <AppliedItemPreview
            entry={previewItem}
            ageGroup={ageGroup}
            className={[
              'inv-tile-preview',
              previewRarityUi?.previewClass ?? '',
              previewItem.item.category === 'streak_effects' ? 'shop-preview--streak' : '',
            ].filter(Boolean).join(' ')}
          />
        </div>
      ) : null}

      {compactEquippedSummary.length > 0 ? (
        <div
          style={{
            borderRadius: 14,
            border: '1px solid var(--t-brd)',
            background: 'var(--t-card)',
            padding: '0.58rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.38rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 10.2, fontWeight: 800, color: 'var(--t-tx3)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
            Equipped
          </span>
          {compactEquippedSummary.map((slot) => (
            <span key={slot.category} className="equip-pill" title={`${slot.label}: ${slot.name}`}>
              {slot.name}
            </span>
          ))}
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(176px, 1fr))',
          gap: '0.55rem',
        }}
      >
        {filteredItems.map((entry) => {
          const rarityStyle = RARITY_STYLES[entry.item.rarity];
          const rarityUi = getRarityStyles(entry.item.rarity);
          const category = entry.item.category;
          const isEquipped = equippedByCategory[category] === entry.item.id;
          const isBusy = actionKey === `equip:${entry.item.id}` || actionKey === `unequip:${category}`;
          const isPreviewing = previewItem?.item.id === entry.item.id;
          const acquiredLabel = entry.pricePaidXp > 0 ? `${entry.pricePaidXp} XP` : formatAcquiredVia(entry.acquiredVia);
          const fireThemes = category === 'streak_effects' ? FIRE_THEMES_BY_RARITY[entry.item.rarity] : null;
          const fireThemeCount = fireThemes?.length ?? 0;
          const fireThemeIndex = fireThemes && fireThemes.length > 0
            ? getSavedFireThemeIndex(entry.item.rarity, { itemId: entry.item.id }) % fireThemes.length
            : 0;
          const fireThemeLabel = fireThemes?.[fireThemeIndex]?.label ?? 'Classic';

          return (
            <article
              key={entry.id}
              className={`inv-item-card ${rarityUi.cardClass} ${isPreviewing ? 'inv-item-card--previewing' : ''}`}
              onMouseEnter={() => setPreviewItemId(entry.item.id)}
              onFocusCapture={() => setPreviewItemId(entry.item.id)}
              onClick={() => setPreviewItemId(entry.item.id)}
              style={{
                borderRadius: 13,
                border: `1px solid ${
                  isPreviewing || isEquipped
                    ? 'var(--t-acc-c)'
                    : `color-mix(in srgb, ${rarityUi.accent} 34%, transparent)`
                }`,
                background: isEquipped
                  ? 'linear-gradient(150deg, color-mix(in srgb, var(--t-acc) 12%, var(--t-card)) 0%, var(--t-card) 100%)'
                  : 'var(--t-card)',
                padding: '0.56rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.38rem',
                boxShadow: isPreviewing ? '0 10px 20px color-mix(in srgb, var(--t-acc) 16%, transparent)' : '0 5px 12px rgba(5, 28, 59, 0.05)',
                transition: 'border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <p style={{ margin: 0, color: 'var(--t-tx)', fontSize: 13.2, fontWeight: 820, lineHeight: 1.24 }}>{entry.item.name}</p>
                {isEquipped ? <span className="inv-chip inv-chip--green">On</span> : null}
              </div>

	              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
	                <span className={`inv-rarity-chip inv-rarity-chip--${entry.item.rarity}`}>
	                  {rarityStyle.label}
	                </span>
	                <span style={{ borderRadius: 999, padding: '0.14rem 0.4rem', border: '1px solid color-mix(in srgb, var(--t-acc) 24%, transparent)', background: 'color-mix(in srgb, var(--t-acc) 10%, transparent)', color: 'var(--t-acc)', fontSize: 10, fontWeight: 800 }}>
	                  {acquiredLabel}
	                </span>
	              </div>

                <AppliedItemPreview
                  entry={entry}
                  ageGroup={ageGroup}
                  className={[
                    'inv-tile-preview',
                    rarityUi.previewClass,
                    entry.item.category === 'streak_effects' ? 'shop-preview--streak' : '',
                  ].filter(Boolean).join(' ')}
                />

	              {category === 'streak_effects' ? (
	                <button
	                  type="button"
	                  className="inv-theme-toggle"
	                  disabled={fireThemeCount <= 1}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!fireThemes || fireThemes.length <= 1) return;
                    const next = (fireThemeIndex + 1) % fireThemes.length;
                    saveFireThemeIndex(entry.item.rarity, next, { itemId: entry.item.id });
                  }}
                  title={fireThemeCount <= 1 ? `Theme: ${fireThemeLabel}` : `Switch fire color (current: ${fireThemeLabel})`}
                >
                  <Sparkles style={{ width: 11, height: 11 }} />
                  {fireThemeCount <= 1
                    ? `Color: ${fireThemeLabel}`
                    : `Color: ${fireThemeLabel} (${fireThemeIndex + 1}/${fireThemeCount})`}
                </button>
              ) : null}

              <button
                type="button"
                className={`inv-action ${isEquipped ? 'inv-action--secondary' : ''}`}
                disabled={isBusy}
                onClick={(event) => {
                  event.stopPropagation();
                  if (isEquipped) {
                    void onUnequip(category);
                  } else {
                    void onEquip(category, entry.item.id);
                  }
                }}
              >
                {isEquipped ? <Lock style={{ width: 12, height: 12 }} /> : <Check style={{ width: 12, height: 12 }} />}
                {isBusy ? 'Updating...' : isEquipped ? 'Unequip' : 'Equip'}
              </button>
            </article>
          );
        })}
      </div>

      {filteredItems.length === 0 ? (
        <div
          style={{
            borderRadius: 14,
            border: '1px dashed var(--t-brd)',
            background: 'var(--t-card)',
            padding: '0.72rem',
            color: 'var(--t-tx3)',
            fontSize: 11.5,
            display: 'flex',
            alignItems: 'center',
            gap: '0.42rem',
          }}
        >
          <WandSparkles style={{ width: 13, height: 13 }} />
          No items match this filter.
        </div>
      ) : null}

      <style jsx>{`
        .inv-filter-row {
          display: flex;
          flex-wrap: nowrap;
          gap: 0.34rem;
          overflow-x: auto;
          padding-bottom: 0.1rem;
          scrollbar-width: thin;
        }

	        .inv-item-card {
	          position: relative;
	          overflow: hidden;
	        }

	        .inv-item-card > * {
	          position: relative;
	          z-index: 1;
	        }

	        .inv-item-card::before {
	          content: '';
	          position: absolute;
	          inset: 0;
	          pointer-events: none;
	          z-index: 0;
	          background: radial-gradient(circle at 14% 18%, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0) 48%);
	          opacity: 0.85;
	        }

	        .inv-item-card::after {
	          content: '';
	          position: absolute;
	          inset: -1px;
	          border-radius: inherit;
	          pointer-events: none;
	          z-index: 0;
	          opacity: 0;
	          transition: opacity 0.2s ease;
	          filter: blur(14px);
	          mix-blend-mode: screen;
	        }

        .inv-item-card:hover::after,
        .inv-item-card--previewing::after {
          opacity: 0.75;
        }

        .inv-item-card.shop-rarity-card--common::after {
          background: conic-gradient(from 210deg, rgba(59,130,246,0.0), rgba(59,130,246,0.32), rgba(147,197,253,0.18), rgba(59,130,246,0.0));
        }

        .inv-item-card.shop-rarity-card--rare::after {
          background: conic-gradient(from 210deg, rgba(34,211,238,0.0), rgba(34,211,238,0.34), rgba(165,243,252,0.18), rgba(34,211,238,0.0));
        }

        .inv-item-card.shop-rarity-card--epic::after {
          background: conic-gradient(from 210deg, rgba(192,132,252,0.0), rgba(192,132,252,0.4), rgba(219,39,119,0.22), rgba(192,132,252,0.0));
        }

        .inv-item-card.shop-rarity-card--legendary::after {
          background: conic-gradient(from 210deg, rgba(251,146,60,0.0), rgba(251,146,60,0.44), rgba(251,191,36,0.26), rgba(244,114,182,0.16), rgba(251,146,60,0.0));
        }

        .inv-item-card.shop-rarity-card--epic::after,
        .inv-item-card.shop-rarity-card--legendary::after {
          animation: inv-aura-spin 7.6s linear infinite;
        }

        @keyframes inv-aura-spin {
          0% { transform: rotate(0deg) scale(1.02); }
          100% { transform: rotate(360deg) scale(1.02); }
        }

        .inv-item-card:hover {
          transform: translateY(-2px);
        }

        .inv-item-card:active {
          transform: translateY(-1px) scale(0.996);
        }

        .inv-item-card--previewing {
          transform: translateY(-1px);
        }

        .inv-item-card.shop-rarity-card--rare {
          box-shadow: 0 10px 20px rgba(8, 145, 178, 0.14);
        }

        .inv-item-card.shop-rarity-card--epic {
          box-shadow: 0 12px 22px rgba(168, 85, 247, 0.16);
        }

	        .inv-item-card.shop-rarity-card--legendary {
	          box-shadow: 0 14px 26px rgba(217, 119, 6, 0.18);
	        }

	        /* Keep tile previews visually consistent with full live previews. */
	        :global(.inv-tile-preview.cos-prev) {
	          min-height: 120px;
	          border-radius: 14px;
	          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16), 0 18px 34px rgba(15, 23, 42, 0.12);
	          margin-top: 2px;
	          transform: translateZ(0);
	          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
	        }

	        .inv-item-card:hover :global(.inv-tile-preview.cos-prev),
	        .inv-item-card--previewing :global(.inv-tile-preview.cos-prev) {
	          transform: translateY(-1px) scale(1.01);
	          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2), 0 18px 44px rgba(15, 23, 42, 0.14);
	          filter: saturate(1.04);
	        }

	        .inv-rarity-chip {
	          position: relative;
	          border-radius: 999px;
	          padding: 0.14rem 0.44rem;
          border: 1px solid transparent;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          overflow: hidden;
          backdrop-filter: blur(6px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.65);
        }

        .inv-rarity-chip::after {
          content: '';
          position: absolute;
          inset: -10px;
          background: linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.72) 46%, transparent 74%);
          transform: translateX(-140%);
          opacity: 0;
          pointer-events: none;
        }

        .inv-item-card:hover .inv-rarity-chip::after {
          opacity: 0.55;
          animation: inv-chip-shine 2.8s ease-in-out infinite;
        }

        .inv-rarity-chip--common {
          border-color: rgba(37, 99, 235, 0.32);
          background: linear-gradient(180deg, rgba(255,255,255,0.7), rgba(37, 99, 235, 0.14));
          color: #1d4ed8;
        }

        .inv-rarity-chip--rare {
          border-color: rgba(2, 132, 199, 0.34);
          background: linear-gradient(180deg, rgba(255,255,255,0.7), rgba(2, 132, 199, 0.16));
          color: #0c4a6e;
        }

        .inv-rarity-chip--epic {
          border-color: rgba(124, 58, 237, 0.38);
          background: linear-gradient(180deg, rgba(255,255,255,0.68), rgba(124, 58, 237, 0.18));
          color: #6d28d9;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.65), 0 10px 18px rgba(168, 85, 247, 0.12);
        }

        .inv-rarity-chip--legendary {
          border-color: rgba(217, 119, 6, 0.42);
          background: linear-gradient(130deg, rgba(255,255,255,0.62), rgba(251, 191, 36, 0.22), rgba(249, 115, 22, 0.22));
          color: #92400e;
          box-shadow: inset 0 0 12px rgba(251, 191, 36, 0.16), 0 10px 18px rgba(217, 119, 6, 0.12);
        }

        @keyframes inv-chip-shine {
          0% { transform: translateX(-140%); opacity: 0; }
          28% { opacity: 0.55; }
          55% { opacity: 0.28; }
          100% { transform: translateX(140%); opacity: 0; }
        }

        .inv-chip {
          border-radius: 999px;
          border: 1px solid transparent;
          padding: 0.16rem 0.42rem;
          font-size: 10px;
          font-weight: 800;
        }

        .inv-chip--green {
          border-color: rgba(74, 222, 128, 0.35);
          background: rgba(74, 222, 128, 0.14);
          color: #15803d;
        }

        .inv-chip--blue {
          border-color: color-mix(in srgb, var(--t-acc) 24%, transparent);
          background: color-mix(in srgb, var(--t-acc) 10%, transparent);
          color: var(--t-acc);
        }

        .inv-filter {
          border-radius: 999px;
          border: 1px solid var(--t-brd);
          background: var(--t-card2);
          color: var(--t-tx3);
          font-size: 10.5px;
          font-weight: 700;
          padding: 0.28rem 0.54rem;
          cursor: pointer;
          white-space: nowrap;
        }

        .inv-filter[data-active='true'] {
          border-color: var(--t-acc-c);
          background: color-mix(in srgb, var(--t-acc) 13%, var(--t-card2));
          color: var(--t-acc);
        }

        .inv-filter--rarity[data-active='true'] {
          background: color-mix(in srgb, #2563eb 13%, var(--t-card2));
          border-color: rgba(37, 99, 235, 0.28);
          color: #1d4ed8;
        }

        .inv-live-stage {
          border-radius: 16px;
          border: 1px solid var(--t-brd);
          background: linear-gradient(150deg, color-mix(in srgb, var(--t-card) 90%, var(--t-acc) 10%) 0%, var(--t-card) 100%);
          padding: 0.68rem;
          display: flex;
          flex-direction: column;
          gap: 0.52rem;
        }

        .equip-pill {
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--t-acc) 24%, transparent);
          background: color-mix(in srgb, var(--t-acc) 10%, transparent);
          color: var(--t-acc);
          padding: 0.14rem 0.42rem;
          font-size: 10px;
          font-weight: 800;
          max-width: 180px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .inv-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.24rem;
          border-radius: 9px;
          border: 1px solid var(--t-acc-c);
          background: color-mix(in srgb, var(--t-acc) 14%, var(--t-card));
          color: var(--t-acc);
          font-size: 11px;
          font-weight: 800;
          padding: 0.34rem 0.58rem;
          cursor: pointer;
        }

        .inv-action:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .inv-action--secondary {
          border-color: var(--t-brd);
          background: var(--t-card2);
          color: var(--t-tx3);
        }

        .inv-theme-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.24rem;
          border-radius: 9px;
          border: 1px solid color-mix(in srgb, var(--t-acc) 24%, transparent);
          background: color-mix(in srgb, var(--t-acc) 10%, transparent);
          color: var(--t-acc);
          font-size: 10.6px;
          font-weight: 820;
          padding: 0.32rem 0.52rem;
          cursor: pointer;
        }

        .inv-theme-toggle:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (prefers-reduced-motion: reduce) {
          .inv-item-card,
          .inv-item-card *,
          .inv-item-card::before,
          .inv-item-card::after {
            animation: none !important;
            transition: none !important;
            transform: none !important;
          }
        }
          :global(.applied-preview.inv-tile-preview) {
            position: relative;
            min-height: 120px;
            border-radius: 14px;
            border: 1px solid color-mix(in srgb, var(--t-acc) 24%, transparent);
            background: linear-gradient(145deg, color-mix(in srgb, var(--t-card) 86%, var(--t-acc-a) 14%) 0%, var(--t-card) 100%);
            overflow: hidden;
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.15), 0 18px 34px rgba(15, 23, 42, 0.12);
          }

          :global(.applied-preview--editor.inv-tile-preview) {
            padding: 10px;
          }

          :global(.applied-preview.inv-tile-preview .applied-editor-pane) {
            position: relative;
            z-index: 1;
            height: 100%;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.55);
            background: rgba(255,255,255,0.62);
          }

          :global(.applied-preview.inv-tile-preview .applied-editor-line) {
            position: absolute;
            left: 12px;
            height: 6px;
            border-radius: 999px;
            background: color-mix(in srgb, var(--t-acc) 24%, white);
          }

          :global(.applied-preview.inv-tile-preview .applied-editor-line--1) { top: 16px; width: 62%; }
          :global(.applied-preview.inv-tile-preview .applied-editor-line--2) { top: 30px; width: 48%; }
          :global(.applied-preview.inv-tile-preview .applied-editor-line--3) { top: 44px; width: 36%; }

          :global(.applied-preview--frame.inv-tile-preview) {
            display: grid;
            place-items: center;
          }

          :global(.applied-preview.inv-tile-preview .applied-avatar) {
            position: relative;
            width: 42px;
            height: 42px;
            border-radius: 999px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            font-weight: 900;
            color: #fff;
            background: linear-gradient(145deg, #1eb6d0, #22d3ee);
            box-shadow: 0 12px 24px rgba(14, 116, 144, 0.25);
          }

          :global(.applied-preview--badge.inv-tile-preview) {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }

          :global(.applied-preview.inv-tile-preview .applied-badge-dot) {
            width: 26px;
            height: 26px;
            border-radius: 8px;
            background: linear-gradient(135deg, #7c3aed, #a855f7);
            box-shadow: 0 8px 20px rgba(124, 58, 237, 0.32);
          }

          :global(.applied-preview.inv-tile-preview .applied-badge-text) {
            font-size: 12px;
            font-weight: 800;
            color: var(--t-tx2);
          }

          :global(.applied-preview--streak.inv-tile-preview) {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }

          :global(.applied-preview.inv-tile-preview .applied-streak-count) {
            font-size: 26px;
            font-weight: 900;
            color: #0f172a;
          }

          :global(.applied-preview--xp.inv-tile-preview) {
            padding: 14px;
          }

          :global(.applied-preview.inv-tile-preview .applied-xp-gain) {
            position: absolute;
            top: 12px;
            right: 12px;
            font-size: 22px;
            font-weight: 900;
            color: color-mix(in srgb, var(--t-acc) 72%, #0f172a);
          }

          :global(.applied-preview.inv-tile-preview .applied-xp-track) {
            position: absolute;
            left: 14px;
            right: 14px;
            bottom: 18px;
            height: 14px;
            border-radius: 999px;
            background: rgba(255,255,255,0.65);
            overflow: hidden;
          }

          :global(.applied-preview.inv-tile-preview .applied-xp-fill) {
            display: block;
            width: 56%;
            height: 100%;
            border-radius: inherit;
            background: linear-gradient(90deg, #06b6d4, #22d3ee);
          }

          :global(.applied-preview--ui.inv-tile-preview) {
            padding: 14px;
          }

          :global(.applied-preview.inv-tile-preview .applied-ui-pill) {
            position: absolute;
            left: 14px;
            height: 10px;
            border-radius: 999px;
            background: rgba(255,255,255,0.6);
          }

          :global(.applied-preview.inv-tile-preview .applied-ui-pill--1) { top: 20px; width: 54px; }
          :global(.applied-preview.inv-tile-preview .applied-ui-pill--2) { top: 42px; width: 74px; }

          :global(.applied-preview.inv-tile-preview .applied-ui-dot) {
            position: absolute;
            top: 24px;
            right: 20px;
            width: 28px;
            height: 28px;
            border-radius: 999px;
            background: color-mix(in srgb, var(--t-acc) 42%, #818cf8);
          }
      `}</style>
    </section>
  );
}
