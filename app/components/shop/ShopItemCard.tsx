'use client';

import type { CSSProperties } from 'react';
import { Sparkles, WandSparkles } from 'lucide-react';
import CosmeticLivePreview from '@/app/components/rewards/CosmeticLivePreview';
import { getRarityStyles } from '@/app/lib/rewards/rarity-ui';
import {
  CATEGORY_LABELS,
  getStreakEffectDisplayName,
  getStreakEffectDescription,
  type CosmeticCategory,
  type CosmeticRarity,
} from '@/app/lib/rewards/catalog';

type ShopCardItem = {
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

type ShopItemCardProps = {
  entry: ShopCardItem;
  canAfford: boolean;
  actionKey: string | null;
  ageGroup?: string | null;
  onBuy: (itemId: string) => Promise<boolean | void>;
  onBuyAndEquip?: (category: CosmeticCategory, itemId: string) => Promise<void>;
  onEquip: (category: CosmeticCategory, itemId: string) => Promise<void>;
  onPreview?: (itemId: string) => void;
  isPreviewActive?: boolean;
};

export default function ShopItemCard({
  entry,
  canAfford,
  actionKey,
  ageGroup = null,
  onBuy,
  onBuyAndEquip,
  onEquip,
  onPreview,
  isPreviewActive = false,
}: ShopItemCardProps) {
  const rarity = getRarityStyles(entry.item.rarity);
  const busyBuy = actionKey === `buy:${entry.item.id}`;
  const busyEquip = actionKey === `equip:${entry.item.id}`;
  const isLocked = !entry.owned && !canAfford;
  const displayName = entry.item.category === 'streak_effects'
    ? getStreakEffectDisplayName(entry.item.rarity)
    : entry.item.name;
  const displayDescription = entry.item.category === 'streak_effects'
    ? getStreakEffectDescription(entry.item.rarity)
    : entry.item.description;

  const cardClasses = [
    'shop-item-card',
    rarity.cardClass,
    rarity.animationClass,
    isPreviewActive ? 'shop-item-card--active' : '',
    entry.featured ? 'shop-item-card--featured' : '',
    entry.owned ? 'shop-item-card--owned' : '',
    entry.equipped ? 'shop-item-card--equipped' : '',
    isLocked ? 'shop-item-card--locked' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const cardStyle = {
    '--shop-rarity-accent': rarity.accent,
  } as CSSProperties;

  return (
    <article
      className={cardClasses}
      style={cardStyle}
      onMouseEnter={() => onPreview?.(entry.item.id)}
      onFocusCapture={() => onPreview?.(entry.item.id)}
      onClick={() => onPreview?.(entry.item.id)}
    >
      <div className="shop-item-card__head">
        <div className="shop-item-card__title-wrap">
          <p className="shop-item-card__title">{displayName}</p>
          <p className="shop-item-card__category">{CATEGORY_LABELS[entry.item.category]}</p>
        </div>

        <div className="shop-item-card__right">
          <span className={`shop-rarity-badge ${rarity.badgeClass}`}>{rarity.label}</span>
          <span className="shop-price-pill">{entry.price} XP</span>
        </div>
      </div>

      <div className="shop-item-card__tokens">
        {entry.affordable && !entry.owned ? <span className="shop-token shop-token--green">Ready</span> : null}
        {entry.featured || entry.slotType === 'featured' || entry.position <= 2 ? (
          <span className="shop-token shop-token--blue">
            <WandSparkles style={{ width: 11, height: 11 }} />
            New
          </span>
        ) : null}
        {entry.owned ? <span className="shop-token shop-token--indigo">Owned</span> : null}
      </div>

      <CosmeticLivePreview
        category={entry.item.category}
        rarity={entry.item.rarity}
        name={displayName}
        slug={entry.item.slug}
        collection={entry.item.category === 'streak_effects'
          ? displayName
          : String(entry.item.metadata?.collection ?? 'Live Preview')}
        ageGroup={ageGroup}
        compact
        showMeta={false}
        fireThemeItemId={entry.item.category === 'streak_effects' ? entry.item.id : null}
        className={[
          rarity.previewClass,
          entry.item.category === 'streak_effects' ? 'shop-preview--streak' : '',
        ].filter(Boolean).join(' ')}
      />

      <p className="shop-desc" title={displayDescription || 'Preview this cosmetic before unlock.'}>
        {displayDescription || 'Preview this cosmetic before unlock.'}
      </p>

      <div className="shop-actions">
        <div className="shop-actions__row">
          {entry.owned ? (
            <button
              type="button"
              className={`shop-card-action ${rarity.buttonClass} ${entry.equipped ? 'shop-card-action--equipped' : 'shop-card-action--equip'}`}
              disabled={entry.equipped || busyEquip}
              aria-busy={busyEquip}
              onClick={() => onEquip(entry.item.category, entry.item.id)}
            >
              {entry.equipped ? 'Equipped' : busyEquip ? 'Equipping...' : 'Equip'}
            </button>
          ) : (
            <button
              type="button"
              className={`shop-card-action ${rarity.buttonClass} ${isLocked ? 'shop-card-action--locked' : 'shop-card-action--buy'}`}
              disabled={!canAfford || busyBuy}
              aria-busy={busyBuy}
              onClick={() => onBuy(entry.item.id)}
            >
              {busyBuy ? (
                <>
                  <Sparkles style={{ width: 12, height: 12 }} />
                  Unlocking...
                </>
              ) : isLocked ? 'Not enough XP' : `Unlock ${entry.price} XP`}
            </button>
          )}

          <span className="shop-item-state">{entry.owned ? (entry.equipped ? 'Equipped' : 'Owned') : 'Available'}</span>
        </div>

        {!entry.owned && onBuyAndEquip ? (
          <button
            type="button"
            className={`shop-card-action shop-card-action--combo ${rarity.buttonClass}`}
            disabled={!canAfford || busyBuy}
            onClick={() => onBuyAndEquip(entry.item.category, entry.item.id)}
          >
            {busyBuy ? 'Unlocking...' : 'Unlock + Equip'}
          </button>
        ) : null}
      </div>

      <style jsx>{`
        .shop-item-card {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid var(--t-brd);
          background: linear-gradient(152deg, var(--t-card) 0%, color-mix(in srgb, var(--t-card) 88%, var(--shop-rarity-accent) 12%) 100%);
          padding: 0.72rem;
          display: flex;
          flex-direction: column;
          gap: 0.52rem;
          box-shadow: 0 8px 16px rgba(8, 21, 46, 0.08);
          isolation: isolate;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, background 0.2s ease;
        }

        .shop-item-card::before,
        .shop-item-card::after {
          content: '';
          position: absolute;
          pointer-events: none;
          z-index: 0;
        }

        .shop-item-card::before {
          inset: 0;
          background:
            radial-gradient(circle at 14% 16%, color-mix(in srgb, var(--shop-rarity-accent) 20%, rgba(255,255,255,0.0)) 0%, transparent 54%),
            radial-gradient(circle at 86% 78%, color-mix(in srgb, var(--shop-rarity-accent) 10%, rgba(255,255,255,0.0)) 0%, transparent 56%),
            conic-gradient(
              from 220deg,
              rgba(255,255,255,0.0),
              color-mix(in srgb, var(--shop-rarity-accent) 32%, rgba(255,255,255,0.0)),
              rgba(255,255,255,0.0)
            );
          opacity: 0.9;
          filter: blur(0.2px);
          mix-blend-mode: screen;
        }

        .shop-item-card::after {
          inset: -1px;
          border-radius: inherit;
          background: linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.54) 45%, transparent 70%);
          opacity: 0;
          transform: translateX(-140%);
        }

        .shop-item-card:hover,
        .shop-item-card--active {
          transform: translateY(-2px);
        }

        .shop-item-card.shop-rarity-card--epic::after,
        .shop-item-card.shop-rarity-card--legendary::after {
          opacity: 0.22;
          animation: shop-shine 4.8s linear infinite;
        }

        .shop-item-card:hover.shop-rarity-card--epic::after,
        .shop-item-card:hover.shop-rarity-card--legendary::after,
        .shop-item-card--active.shop-rarity-card--epic::after,
        .shop-item-card--active.shop-rarity-card--legendary::after {
          opacity: 0.66;
          animation-duration: 3.4s;
        }

        .shop-item-card:active {
          transform: translateY(-1px) scale(0.996);
        }

        .shop-item-card--active {
          box-shadow: 0 14px 24px color-mix(in srgb, var(--shop-rarity-accent) 24%, transparent);
        }

        .shop-item-card__head,
        .shop-item-card__tokens,
        .shop-desc,
        .shop-actions {
          position: relative;
          z-index: 1;
        }

        .shop-item-card__head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }

        .shop-item-card__title-wrap {
          min-width: 0;
        }

        .shop-item-card__title {
          margin: 0;
          color: var(--t-tx);
          font-size: 1.04rem;
          font-weight: 900;
          letter-spacing: -0.01em;
          line-height: 1.18;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .shop-item-card__category {
          margin: 0.12rem 0 0;
          color: var(--t-tx3);
          font-size: 0.73rem;
          font-weight: 700;
        }

        .shop-item-card__right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.28rem;
        }

        .shop-rarity-badge {
          border-radius: 999px;
          border: 1px solid transparent;
          padding: 0.14rem 0.42rem;
          font-size: 0.6rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          backdrop-filter: blur(4px);
        }

        .shop-price-pill {
          border-radius: 999px;
          border: 1px solid rgba(15, 23, 42, 0.26);
          background: rgba(15, 23, 42, 0.84);
          color: #ffffff;
          padding: 0.16rem 0.48rem;
          font-size: 0.7rem;
          font-weight: 880;
          white-space: nowrap;
        }

        .shop-item-card__tokens {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem;
        }

        .shop-token {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 999px;
          padding: 0.13rem 0.38rem;
          border: 1px solid transparent;
          font-size: 0.65rem;
          font-weight: 850;
          letter-spacing: 0.01em;
        }

        .shop-token--green {
          border-color: rgba(74, 222, 128, 0.35);
          background: rgba(74, 222, 128, 0.14);
          color: #157338;
        }

        .shop-token--blue {
          border-color: rgba(59, 130, 246, 0.35);
          background: rgba(59, 130, 246, 0.14);
          color: #1d4ed8;
        }

        .shop-token--indigo {
          border-color: rgba(99, 102, 241, 0.3);
          background: rgba(99, 102, 241, 0.12);
          color: #4338ca;
        }

        .shop-desc {
          margin: 0;
          color: var(--t-tx3);
          font-size: 0.78rem;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 2.2em;
        }

        .shop-actions {
          display: flex;
          flex-direction: column;
          gap: 0.42rem;
        }

        .shop-actions__row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.45rem;
        }

        .shop-item-state {
          color: var(--t-tx3);
          font-size: 0.69rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .shop-card-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.24rem;
          border-radius: 10px;
          border: 1px solid transparent;
          background: var(--t-card2);
          color: var(--t-tx2);
          font-size: 0.75rem;
          font-weight: 850;
          padding: 0.36rem 0.62rem;
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
          min-height: 32px;
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.22);
        }

        .shop-card-action:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .shop-card-action:active:not(:disabled) {
          transform: translateY(0px) scale(0.99);
        }

        .shop-card-action::after {
          content: '';
          position: absolute;
          inset: -10px;
          background: linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.55) 46%, transparent 74%);
          transform: translateX(-140%);
          opacity: 0;
          pointer-events: none;
        }

        .shop-card-action:hover:not(:disabled)::after {
          opacity: 0.55;
          animation: shop-action-shine 2.6s ease-in-out infinite;
        }

        .shop-card-action:disabled {
          cursor: not-allowed;
          filter: saturate(0.84);
        }

        .shop-card-action--buy {
          color: #ffffff;
          box-shadow: 0 10px 18px color-mix(in srgb, var(--shop-rarity-accent) 26%, transparent);
        }

        .shop-card-action--locked {
          background: color-mix(in srgb, var(--shop-rarity-accent) 10%, var(--t-card2));
          color: color-mix(in srgb, var(--shop-rarity-accent) 76%, #ffffff 24%);
          border-color: color-mix(in srgb, var(--shop-rarity-accent) 32%, transparent);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.35);
        }

        .shop-card-action--equip {
          color: #ffffff;
        }

        .shop-card-action--equipped {
          border-color: rgba(34, 197, 94, 0.3);
          background: rgba(34, 197, 94, 0.14);
          color: #166534;
          box-shadow: none;
        }

        .shop-card-action--combo {
          width: 100%;
          border-color: color-mix(in srgb, var(--shop-rarity-accent) 30%, transparent);
          background: color-mix(in srgb, var(--shop-rarity-accent) 11%, var(--t-card));
          color: color-mix(in srgb, var(--shop-rarity-accent) 82%, #ffffff 18%);
        }

        .shop-item-card--owned {
          border-color: color-mix(in srgb, var(--shop-rarity-accent) 40%, var(--t-brd));
        }

        .shop-item-card--equipped {
          border-color: rgba(34, 197, 94, 0.34);
          background: linear-gradient(152deg, color-mix(in srgb, #22c55e 10%, var(--t-card)) 0%, var(--t-card) 100%);
          box-shadow: 0 12px 22px rgba(21, 128, 61, 0.12);
        }

        .shop-item-card--locked {
          filter: saturate(0.9);
        }

        .shop-item-card--featured {
          box-shadow: 0 14px 24px color-mix(in srgb, var(--shop-rarity-accent) 18%, transparent);
        }

        .shop-rarity-card--common {
          border-color: rgba(59, 130, 246, 0.26);
          background:
            radial-gradient(circle at 18% 16%, rgba(219,234,254,0.7), rgba(255,255,255,0) 44%),
            linear-gradient(160deg, color-mix(in srgb, #eff6ff 58%, var(--t-card) 42%) 0%, var(--t-card) 100%);
        }

        .shop-rarity-card--rare {
          border-color: rgba(34, 211, 238, 0.38);
          background:
            radial-gradient(circle at 20% 18%, rgba(165,243,252,0.62), rgba(255,255,255,0) 46%),
            radial-gradient(circle at 86% 74%, rgba(34,211,238,0.16), rgba(255,255,255,0) 52%),
            var(--t-card);
          box-shadow: 0 12px 24px rgba(6, 182, 212, 0.14);
        }

        .shop-rarity-card--epic {
          border-color: rgba(192, 132, 252, 0.5);
          background:
            radial-gradient(circle at 24% 22%, rgba(216,180,254,0.62), rgba(255,255,255,0) 48%),
            radial-gradient(circle at 82% 76%, rgba(219,39,119,0.14), rgba(255,255,255,0) 56%),
            linear-gradient(160deg, color-mix(in srgb, #f5d0fe 22%, var(--t-card) 78%) 0%, var(--t-card) 100%);
          box-shadow: 0 14px 28px rgba(168, 85, 247, 0.16);
        }

        .shop-rarity-card--legendary {
          border-color: rgba(251, 146, 60, 0.58);
          background:
            radial-gradient(circle at 20% 18%, rgba(254,215,170,0.72), rgba(255,255,255,0) 48%),
            radial-gradient(circle at 86% 70%, rgba(251,191,36,0.22), rgba(255,255,255,0) 56%),
            linear-gradient(160deg, color-mix(in srgb, #ffedd5 30%, var(--t-card) 70%) 0%, color-mix(in srgb, #fef3c7 12%, var(--t-card) 88%) 100%);
          box-shadow: 0 16px 34px rgba(217, 119, 6, 0.2);
        }

        .shop-rarity-badge--common {
          border-color: rgba(59, 130, 246, 0.34);
          background: linear-gradient(180deg, rgba(255,255,255,0.7), rgba(59,130,246,0.14));
          color: #1d4ed8;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.65);
        }

        .shop-rarity-badge--rare {
          border-color: rgba(34, 211, 238, 0.4);
          background: linear-gradient(180deg, rgba(255,255,255,0.7), rgba(34,211,238,0.16));
          color: #0e7490;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.65);
        }

        .shop-rarity-badge--epic {
          border-color: rgba(192, 132, 252, 0.46);
          background: linear-gradient(180deg, rgba(255,255,255,0.68), rgba(192,132,252,0.22));
          color: #7e22ce;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.65), 0 10px 18px rgba(168, 85, 247, 0.14);
          position: relative;
          overflow: hidden;
        }

        .shop-rarity-badge--legendary {
          border-color: rgba(251, 146, 60, 0.52);
          background: linear-gradient(130deg, rgba(255,255,255,0.62), rgba(251, 191, 36, 0.22), rgba(249, 115, 22, 0.22));
          color: #b45309;
          box-shadow: inset 0 0 12px rgba(251, 191, 36, 0.18), 0 10px 18px rgba(217, 119, 6, 0.16);
          position: relative;
          overflow: hidden;
        }

        .shop-rarity-badge--epic::after,
        .shop-rarity-badge--legendary::after {
          content: '';
          position: absolute;
          inset: -8px;
          background: linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.82) 46%, transparent 72%);
          opacity: 0.0;
          transform: translateX(-140%);
          pointer-events: none;
        }

        .shop-item-card:hover .shop-rarity-badge--epic::after,
        .shop-item-card:hover .shop-rarity-badge--legendary::after {
          opacity: 0.65;
          animation: rarity-badge-shine 2.6s ease-in-out infinite;
        }

        .shop-rarity-button--common {
          border-color: rgba(59, 130, 246, 0.38);
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          color: #ffffff;
        }

        .shop-rarity-button--rare {
          border-color: rgba(14, 165, 233, 0.42);
          background: linear-gradient(135deg, #0284c7, #06b6d4);
          color: #ffffff;
        }

        .shop-rarity-button--epic {
          border-color: rgba(168, 85, 247, 0.46);
          background: linear-gradient(135deg, #7e22ce, #db2777);
          color: #ffffff;
        }

        .shop-rarity-button--legendary {
          border-color: rgba(245, 158, 11, 0.58);
          background: linear-gradient(135deg, #f59e0b, #f97316, #ef4444);
          color: #ffffff;
          background-size: 160% 100%;
        }

        .shop-rarity-anim--rare:hover {
          box-shadow: 0 14px 26px rgba(8, 145, 178, 0.2);
        }

        .shop-rarity-anim--epic {
          animation: shop-epic-pulse 4.4s ease-in-out infinite;
        }

        .shop-rarity-anim--epic::before,
        .shop-rarity-anim--legendary::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          pointer-events: none;
          opacity: 0.0;
          transition: opacity 0.2s ease;
        }

        .shop-rarity-anim--epic::before {
          background: conic-gradient(from 210deg, rgba(192,132,252,0.0), rgba(192,132,252,0.44), rgba(219,39,119,0.28), rgba(192,132,252,0.0));
          filter: blur(12px);
        }

        .shop-rarity-anim--legendary::before {
          background: conic-gradient(from 210deg, rgba(251,146,60,0.0), rgba(251,146,60,0.52), rgba(251,191,36,0.38), rgba(244,114,182,0.18), rgba(251,146,60,0.0));
          filter: blur(14px);
        }

        .shop-item-card:hover.shop-rarity-anim--epic::before,
        .shop-item-card:hover.shop-rarity-anim--legendary::before {
          opacity: 0.75;
        }

        .shop-rarity-anim--epic::after {
          opacity: 0.36;
          animation: shop-shine 4.8s linear infinite;
        }

        .shop-rarity-anim--legendary::after {
          opacity: 0.66;
          animation: shop-shine 3.2s linear infinite;
        }

        .shop-rarity-anim--legendary .shop-rarity-button--legendary:not(:disabled) {
          animation: legend-button-shift 2.4s linear infinite;
        }

        @keyframes shop-shine {
          0% { transform: translateX(-140%); }
          100% { transform: translateX(180%); }
        }

        @keyframes shop-action-shine {
          0% { transform: translateX(-140%); opacity: 0; }
          28% { opacity: 0.55; }
          55% { opacity: 0.28; }
          100% { transform: translateX(140%); opacity: 0; }
        }

        @keyframes shop-epic-pulse {
          0%,
          100% { box-shadow: 0 12px 24px rgba(168, 85, 247, 0.14); }
          50% { box-shadow: 0 16px 30px rgba(219, 39, 119, 0.2); }
        }

        @keyframes legend-button-shift {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }

        @keyframes rarity-badge-shine {
          0% { transform: translateX(-140%); opacity: 0; }
          28% { opacity: 0.65; }
          55% { opacity: 0.35; }
          100% { transform: translateX(140%); opacity: 0; }
        }

        @media (max-width: 580px) {
          .shop-item-card {
            padding: 0.66rem;
            gap: 0.45rem;
          }

          .shop-item-card__title {
            font-size: 0.97rem;
          }

          .shop-desc {
            font-size: 0.74rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .shop-item-card,
          .shop-item-card *,
          .shop-item-card::before,
          .shop-item-card::after {
            animation: none !important;
            transition: none !important;
            transform: none !important;
          }

          .shop-item-card--active,
          .shop-item-card:hover {
            transform: none;
          }
        }
      `}</style>
    </article>
  );
}
