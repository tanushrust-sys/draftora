'use client';

import type { EquippedCosmeticItem } from '@/app/context/EquippedCosmeticsContext';

export default function PrismWearableCrown({
  rarity,
  size = 44,
  ageGroup = null,
}: {
  rarity: NonNullable<EquippedCosmeticItem['rarity']>;
  size?: number;
  ageGroup?: string | null;
}) {
  const ageKey = (ageGroup ?? '').trim();
  const ageVariant =
    ageKey === '5-7'
      ? 'sprout'
      : ageKey === '8-10'
        ? 'spark'
        : ageKey === '11-13'
          ? 'nova'
          : ageKey === '14-17'
            ? 'edge'
            : ageKey === '18-21'
              ? 'studio'
              : ageKey === '22+'
                ? 'minimal'
                : 'studio';

  const spec = {
    common: {
      rim: 'rgba(59, 130, 246, 0.55)',
      glow: 'rgba(59, 130, 246, 0.22)',
      crown: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(219,234,254,0.85) 30%, rgba(96,165,250,0.74) 100%)',
      gem: 'linear-gradient(145deg, #e0f2fe 0%, #93c5fd 45%, #60a5fa 100%)',
    },
    rare: {
      rim: 'rgba(6, 182, 212, 0.62)',
      glow: 'rgba(14, 165, 233, 0.26)',
      crown: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(207,250,254,0.82) 36%, rgba(6,182,212,0.74) 100%)',
      gem: 'linear-gradient(145deg, #cffafe 0%, #67e8f9 46%, #06b6d4 100%)',
    },
    epic: {
      rim: 'rgba(192, 132, 252, 0.72)',
      glow: 'rgba(168, 85, 247, 0.32)',
      crown: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(250,232,255,0.82) 35%, rgba(168,85,247,0.76) 100%)',
      gem: 'linear-gradient(145deg, #fae8ff 0%, #d8b4fe 48%, #a855f7 100%)',
    },
    legendary: {
      rim: 'rgba(251, 146, 60, 0.78)',
      glow: 'rgba(245, 158, 11, 0.38)',
      crown: 'conic-gradient(from 210deg, rgba(34,211,238,0.95), rgba(96,165,250,0.9), rgba(168,85,247,0.9), rgba(244,114,182,0.86), rgba(245,158,11,0.92), rgba(34,211,238,0.95))',
      gem: 'conic-gradient(from 220deg, #22d3ee, #60a5fa, #a855f7, #f472b6, #f59e0b, #22d3ee)',
    },
  }[rarity];

  const s = Math.max(28, size);
  const w = Math.round(s * 1.28);
  const h = Math.round(s * 0.6);
  const top = -Math.round(s * 0.36);

  const gem = Math.max(10, Math.round(s * 0.26));
  const bandH = Math.max(8, Math.round(s * 0.2));
  const orbit = Math.max(3, Math.round(s * 0.12));
  const flair = Math.max(8, Math.round(s * 0.2));

  return (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '50%',
        top,
        transform: 'translateX(-50%)',
        width: w,
        height: h,
        pointerEvents: 'none',
        zIndex: 6,
        filter: `drop-shadow(0 ${Math.round(s * 0.22)}px ${Math.round(s * 0.3)}px ${spec.glow})`,
      }}
    >
      <span
        className={`prism-wear prism-wear--${rarity} prism-wear--${ageVariant}`}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: Math.round(s * 0.26),
          border: `1px solid ${spec.rim}`,
          background: spec.crown,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.75)`,
          overflow: 'hidden',
          clipPath: 'polygon(6% 82%, 10% 44%, 22% 62%, 34% 30%, 50% 58%, 66% 30%, 78% 62%, 90% 44%, 94% 82%, 94% 100%, 6% 100%)',
        }}
      >
        <span
          className="prism-wear__band"
          style={{
            height: bandH,
            borderColor: spec.rim,
          }}
        />
        {(rarity === 'epic' || rarity === 'legendary') ? <span className="prism-wear__inner-rim" /> : null}
        {(rarity === 'rare' || rarity === 'epic' || rarity === 'legendary') ? (
          <>
            <span className="prism-wear__sidegem prism-wear__sidegem--l" style={{ width: Math.max(6, Math.round(s * 0.16)), height: Math.max(6, Math.round(s * 0.16)), background: spec.gem }} />
            <span className="prism-wear__sidegem prism-wear__sidegem--r" style={{ width: Math.max(6, Math.round(s * 0.16)), height: Math.max(6, Math.round(s * 0.16)), background: spec.gem }} />
          </>
        ) : null}
        {/* Age-group accessories */}
        {ageVariant === 'sprout' ? (
          <>
            <span className="prism-wear__tiara" />
            <span className="prism-wear__star" />
          </>
        ) : null}
        {ageVariant === 'spark' ? (
          <>
            <span className="prism-wear__bolt" />
            <span className="prism-wear__pin" />
          </>
        ) : null}
        {ageVariant === 'nova' ? (
          <>
            <span className="prism-wear__nova" />
            <span className="prism-wear__pin" />
          </>
        ) : null}
        {ageVariant === 'edge' ? (
          <>
            <span className="prism-wear__edge-spike prism-wear__edge-spike--l" />
            <span className="prism-wear__edge-spike prism-wear__edge-spike--r" />
          </>
        ) : null}
        {ageVariant === 'studio' ? (
          <>
            <span className="prism-wear__laurel prism-wear__laurel--l" />
            <span className="prism-wear__laurel prism-wear__laurel--r" />
          </>
        ) : null}
        {ageVariant === 'minimal' ? (
          <>
            <span className="prism-wear__minimal-halo" />
          </>
        ) : null}

        {/* Rarity extras */}
        {(rarity === 'epic' || rarity === 'legendary') ? (
          <>
            <span className="prism-wear__wing prism-wear__wing--l" />
            <span className="prism-wear__wing prism-wear__wing--r" />
          </>
        ) : null}
        {rarity === 'legendary' ? <span className="prism-wear__halo" /> : null}
      </span>

      <span
        className="prism-wear__gem"
        style={{
          position: 'absolute',
          left: '50%',
          top: Math.round(s * 0.16),
          width: gem,
          height: gem,
          marginLeft: -Math.round(gem / 2),
          borderRadius: Math.max(4, Math.round(gem * 0.34)),
          transform: 'rotate(14deg)',
          background: spec.gem,
          boxShadow: `0 0 0 1px ${spec.rim}, 0 ${Math.round(s * 0.22)}px ${Math.round(s * 0.34)}px ${spec.glow}`,
          clipPath: 'polygon(50% 0%, 92% 18%, 100% 52%, 84% 92%, 50% 100%, 16% 92%, 0% 52%, 8% 18%)',
        }}
      >
        {(rarity === 'epic' || rarity === 'legendary') ? <span className="prism-wear__shine" /> : null}
        {rarity === 'legendary' ? <span className="prism-wear__aurora" /> : null}
      </span>

      {rarity === 'legendary' ? (
        <>
          <span className="prism-wear__orbit prism-wear__orbit--a" style={{ width: orbit + 2, height: orbit + 2 }} />
          <span className="prism-wear__orbit prism-wear__orbit--b" style={{ width: orbit, height: orbit }} />
          <span className="prism-wear__spark prism-wear__spark--a" />
          <span className="prism-wear__spark prism-wear__spark--b" />
        </>
      ) : null}

      <style jsx>{`
        .prism-wear::before {
          content: '';
          position: absolute;
          inset: -10px;
          background: radial-gradient(circle at 30% 40%, rgba(255,255,255,0.62), rgba(255,255,255,0) 55%);
          opacity: 0.7;
          pointer-events: none;
        }

        /* Age-group accessories (on-crown attachments) */
        .prism-wear__tiara {
          position: absolute;
          left: 50%;
          top: -6px;
          width: 38px;
          height: 18px;
          margin-left: -19px;
          border-radius: 999px;
          background: conic-gradient(from 220deg, rgba(34,211,238,0.95), rgba(96,165,250,0.9), rgba(168,85,247,0.9), rgba(244,114,182,0.86), rgba(245,158,11,0.92), rgba(34,211,238,0.95));
          opacity: 0.75;
          filter: blur(0.2px);
          clip-path: polygon(6% 76%, 18% 40%, 32% 62%, 50% 22%, 68% 62%, 82% 40%, 94% 76%, 94% 100%, 6% 100%);
          box-shadow: 0 12px 22px rgba(96,165,250,0.18);
          animation: prism-bob 2.2s ease-in-out infinite;
          pointer-events: none;
        }

        .prism-wear__star {
          position: absolute;
          left: 50%;
          top: -10px;
          width: 12px;
          height: 12px;
          margin-left: -6px;
          border-radius: 6px;
          background: radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,255,255,0.0) 70%);
          filter: drop-shadow(0 0 12px rgba(245,158,11,0.35));
          clip-path: polygon(50% 0%, 62% 34%, 98% 38%, 70% 58%, 80% 92%, 50% 72%, 20% 92%, 30% 58%, 2% 38%, 38% 34%);
          opacity: 0.9;
          animation: prism-twinkle 1.8s ease-in-out infinite;
          pointer-events: none;
        }

        .prism-wear__bolt {
          position: absolute;
          left: 50%;
          top: -6px;
          width: 16px;
          height: 16px;
          margin-left: -8px;
          background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(34,211,238,0.35));
          clip-path: polygon(45% 0%, 70% 0%, 54% 40%, 80% 40%, 38% 100%, 48% 58%, 24% 58%);
          filter: drop-shadow(0 10px 16px rgba(34,211,238,0.18));
          opacity: 0.85;
          animation: prism-pop 1.9s ease-in-out infinite;
          pointer-events: none;
        }

        .prism-wear__pin {
          position: absolute;
          right: 6px;
          top: 8px;
          width: ${flair}px;
          height: ${flair}px;
          border-radius: 999px;
          background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9), rgba(255,255,255,0) 60%), color-mix(in srgb, rgba(34,211,238,0.38) 65%, transparent);
          box-shadow: 0 10px 18px rgba(6,182,212,0.14);
          opacity: 0.8;
          pointer-events: none;
        }

        .prism-wear__nova {
          position: absolute;
          left: 50%;
          top: -10px;
          width: 18px;
          height: 18px;
          margin-left: -9px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,255,255,0.9), rgba(168,85,247,0.18), rgba(255,255,255,0) 70%);
          filter: drop-shadow(0 0 18px rgba(168,85,247,0.22));
          opacity: 0.85;
          animation: prism-pulse 2.4s ease-in-out infinite;
          pointer-events: none;
        }

        .prism-wear__edge-spike {
          position: absolute;
          top: -8px;
          width: 16px;
          height: 14px;
          border-radius: 10px;
          background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(124,58,237,0.18));
          clip-path: polygon(50% 0%, 88% 100%, 12% 100%);
          opacity: 0.88;
          filter: drop-shadow(0 10px 18px rgba(124,58,237,0.18));
          pointer-events: none;
        }
        .prism-wear__edge-spike--l { left: 6px; transform: rotate(-10deg); }
        .prism-wear__edge-spike--r { right: 6px; transform: rotate(10deg); }

        .prism-wear__laurel {
          position: absolute;
          top: -4px;
          width: 22px;
          height: 18px;
          border-radius: 999px;
          background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.85), rgba(255,255,255,0) 60%), color-mix(in srgb, rgba(59,130,246,0.26) 60%, transparent);
          clip-path: polygon(50% 0%, 76% 14%, 92% 38%, 78% 64%, 54% 84%, 28% 70%, 12% 44%, 22% 18%);
          opacity: 0.78;
          pointer-events: none;
        }
        .prism-wear__laurel--l { left: 2px; transform: rotate(-18deg); }
        .prism-wear__laurel--r { right: 2px; transform: rotate(18deg); }

        .prism-wear__minimal-halo {
          position: absolute;
          left: 50%;
          top: -8px;
          width: 44px;
          height: 16px;
          transform: translateX(-50%);
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.42);
          background: linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0));
          opacity: 0.75;
          box-shadow: 0 12px 22px rgba(15,23,42,0.08);
          pointer-events: none;
        }

        @keyframes prism-bob {
          0%, 100% { transform: translateX(-50%) translateY(0px); }
          50% { transform: translateX(-50%) translateY(-1.4px); }
        }
        @keyframes prism-twinkle {
          0%, 100% { transform: translateY(0) scale(0.95); opacity: 0.7; }
          50% { transform: translateY(-0.6px) scale(1.08); opacity: 0.95; }
        }
        @keyframes prism-pop {
          0%, 100% { transform: translateX(-50%) scale(0.96); opacity: 0.7; }
          50% { transform: translateX(-50%) scale(1.08); opacity: 0.95; }
        }
        @keyframes prism-pulse {
          0%, 100% { transform: scale(0.98); opacity: 0.75; }
          50% { transform: scale(1.06); opacity: 0.95; }
        }

        .prism-wear__band {
          position: absolute;
          left: 8px;
          right: 8px;
          bottom: 1px;
          border-radius: 999px;
          border: 1px solid;
          background: linear-gradient(180deg, rgba(255,255,255,0.64) 0%, rgba(255,255,255,0.18) 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.72);
          opacity: 0.92;
          pointer-events: none;
        }

        .prism-wear__inner-rim {
          position: absolute;
          inset: -12px;
          border-radius: 999px;
          background: conic-gradient(from 220deg, rgba(34,211,238,0.0), rgba(34,211,238,0.32), rgba(96,165,250,0.26), rgba(168,85,247,0.3), rgba(244,114,182,0.22), rgba(245,158,11,0.26), rgba(34,211,238,0.0));
          filter: blur(10px);
          opacity: 0.55;
          mix-blend-mode: screen;
          pointer-events: none;
        }

        .prism-wear__sidegem {
          position: absolute;
          top: 42%;
          border-radius: 3px;
          transform: translateY(-50%) rotate(14deg);
          clip-path: polygon(50% 0%, 92% 18%, 100% 52%, 84% 92%, 50% 100%, 16% 92%, 0% 52%, 8% 18%);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.32);
          opacity: 0.88;
          pointer-events: none;
        }
        .prism-wear__sidegem--l { left: 10px; }
        .prism-wear__sidegem--r { right: 10px; }

        .prism-wear__wing {
          position: absolute;
          top: 26%;
          width: 18px;
          height: 16px;
          border-radius: 999px;
          background: radial-gradient(circle at 35% 40%, rgba(255,255,255,0.88), rgba(255,255,255,0.0) 68%);
          opacity: 0.72;
          mix-blend-mode: screen;
          pointer-events: none;
        }
        .prism-wear__wing--l { left: -6px; transform: rotate(-22deg); }
        .prism-wear__wing--r { right: -6px; transform: rotate(22deg); }

        .prism-wear__halo {
          position: absolute;
          left: 50%;
          top: -10px;
          width: 54px;
          height: 22px;
          transform: translateX(-50%);
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.38);
          box-shadow: 0 0 18px rgba(251, 146, 60, 0.24);
          opacity: 0.85;
          animation: prism-wear-halo 2.9s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes prism-wear-halo {
          0% { transform: translateX(-50%) scale(0.98); opacity: 0.55; }
          45% { opacity: 0.92; }
          100% { transform: translateX(-50%) scale(1.03); opacity: 0.55; }
        }

        .prism-wear--legendary {
          animation: prism-wear-hue 6.8s linear infinite;
        }
        @keyframes prism-wear-hue {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }

        .prism-wear__shine {
          position: absolute;
          inset: -6px;
          background: linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.92) 46%, transparent 74%);
          opacity: 0.65;
          transform: translateX(-140%);
          animation: prism-wear-shine 2.2s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes prism-wear-shine {
          0% { transform: translateX(-140%); opacity: 0; }
          28% { opacity: 0.65; }
          55% { opacity: 0.35; }
          100% { transform: translateX(140%); opacity: 0; }
        }

        .prism-wear__aurora {
          position: absolute;
          inset: -10px;
          background: conic-gradient(from 210deg, rgba(34,211,238,0.0), rgba(34,211,238,0.3), rgba(168,85,247,0.26), rgba(244,114,182,0.22), rgba(245,158,11,0.28), rgba(34,211,238,0.0));
          filter: blur(7px);
          opacity: 0.85;
          animation: prism-wear-aurora 4.2s linear infinite;
          mix-blend-mode: screen;
          pointer-events: none;
        }
        @keyframes prism-wear-aurora {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .prism-wear__orbit {
          position: absolute;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 0 14px rgba(251, 146, 60, 0.45);
          opacity: 0.85;
          animation: prism-wear-orbit 2.6s linear infinite;
        }
        .prism-wear__orbit--a { left: 10px; top: -6px; }
        .prism-wear__orbit--b { right: 12px; top: 12px; opacity: 0.7; animation-duration: 3.4s; animation-direction: reverse; }
        @keyframes prism-wear-orbit {
          0% { transform: translate3d(0,0,0) scale(0.85); opacity: 0.35; }
          30% { opacity: 0.95; }
          60% { opacity: 0.55; }
          100% { transform: translate3d(-12px,3px,0) scale(1.08); opacity: 0.25; }
        }

        .prism-wear__spark {
          position: absolute;
          width: 2px;
          height: 2px;
          border-radius: 999px;
          background: rgba(255,255,255,0.95);
          opacity: 0;
          box-shadow: 0 0 12px rgba(34,211,238,0.45), 0 0 18px rgba(168,85,247,0.38);
          animation: prism-wear-spark 2.6s ease-in-out infinite;
          pointer-events: none;
        }
        .prism-wear__spark--a { left: 6px; top: 0px; animation-delay: -0.4s; }
        .prism-wear__spark--b { right: 8px; top: 8px; animation-delay: -1.4s; }
        @keyframes prism-wear-spark {
          0% { transform: scale(0.8); opacity: 0; }
          22% { opacity: 0.9; }
          55% { opacity: 0.35; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .prism-wear--legendary,
          .prism-wear__shine,
          .prism-wear__aurora,
          .prism-wear__spark,
          .prism-wear__halo,
          .prism-wear__orbit {
            animation: none !important;
          }
          .prism-wear__tiara,
          .prism-wear__star,
          .prism-wear__bolt,
          .prism-wear__nova {
            animation: none !important;
          }
        }
      `}</style>
    </span>
  );
}
