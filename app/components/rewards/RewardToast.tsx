'use client';

import { useEffect } from 'react';
import { Sparkles, Trophy, X, Zap } from 'lucide-react';
import EquippedFireIcon from '@/app/components/rewards/EquippedFireIcon';

type RewardToastProps = {
  id: string;
  title: string;
  subtitle: string;
  xp: number;
  levelUpTitle?: string | null;
  streakMilestone?: number | null;
  onClose: (id: string) => void;
};

export default function RewardToast({
  id,
  title,
  subtitle,
  xp,
  levelUpTitle,
  streakMilestone,
  onClose,
}: RewardToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => onClose(id), 4300);
    return () => window.clearTimeout(timer);
  }, [id, onClose]);

  return (
    <article className="reward-toast" role="status" aria-live="polite">
      <div className="reward-toast__shine" aria-hidden="true" />
      <header className="reward-toast__top">
        <div className="reward-toast__icon">
          <Sparkles style={{ width: 14, height: 14 }} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="reward-toast__title">{title}</p>
          <p className="reward-toast__subtitle">{subtitle}</p>
        </div>
        <button type="button" className="reward-toast__close" onClick={() => onClose(id)} aria-label="Dismiss reward toast">
          <X style={{ width: 14, height: 14 }} />
        </button>
      </header>

      <div className="reward-toast__chips">
        <span className="reward-toast__chip reward-toast__chip--xp">
          <Zap style={{ width: 12, height: 12 }} />
          +{xp} XP
        </span>
        {levelUpTitle ? (
          <span className="reward-toast__chip reward-toast__chip--level">
            <Trophy style={{ width: 12, height: 12 }} />
            {levelUpTitle}
          </span>
        ) : null}
        {streakMilestone ? (
          <span className="reward-toast__chip reward-toast__chip--streak">
            <EquippedFireIcon size={12} />
            {streakMilestone}-day streak
          </span>
        ) : null}
      </div>

      <div className="reward-toast__progress" aria-hidden="true">
        <div className="reward-toast__progress-fill" />
      </div>

      <style jsx>{`
        .reward-toast {
          position: relative;
          overflow: hidden;
          width: min(360px, calc(100vw - 1.3rem));
          border-radius: 18px;
          border: 1px solid color-mix(in srgb, var(--t-acc) 28%, var(--t-brd));
          background: linear-gradient(145deg, color-mix(in srgb, var(--t-card) 88%, var(--t-acc) 12%) 0%, var(--t-card) 100%);
          box-shadow: 0 20px 38px color-mix(in srgb, var(--t-shadow) 22%, transparent);
          padding: 0.82rem 0.88rem 0.72rem;
          animation: toast-in 0.24s ease;
        }

        .reward-toast__shine {
          position: absolute;
          inset: -60px -95px auto auto;
          width: 180px;
          height: 180px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--t-acc) 18%, transparent);
          filter: blur(14px);
          pointer-events: none;
        }

        .reward-toast__top {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
        }

        .reward-toast__icon {
          width: 26px;
          height: 26px;
          border-radius: 10px;
          background: color-mix(in srgb, var(--t-acc) 16%, transparent);
          border: 1px solid color-mix(in srgb, var(--t-acc) 30%, transparent);
          color: var(--t-acc);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .reward-toast__title {
          margin: 0;
          font-size: 0.83rem;
          font-weight: 800;
          color: var(--t-tx);
          letter-spacing: 0.01em;
        }

        .reward-toast__subtitle {
          margin: 0.14rem 0 0;
          font-size: 0.72rem;
          font-weight: 500;
          color: var(--t-tx3);
          line-height: 1.35;
        }

        .reward-toast__close {
          width: 22px;
          height: 22px;
          border-radius: 8px;
          border: 1px solid color-mix(in srgb, var(--t-brd) 65%, transparent);
          background: color-mix(in srgb, var(--t-card2) 64%, transparent);
          color: var(--t-tx3);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          cursor: pointer;
        }

        .reward-toast__chips {
          margin-top: 0.62rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }

        .reward-toast__chip {
          display: inline-flex;
          align-items: center;
          gap: 0.28rem;
          border-radius: 999px;
          padding: 0.24rem 0.5rem;
          font-size: 0.67rem;
          font-weight: 800;
          line-height: 1;
          letter-spacing: 0.02em;
          border: 1px solid transparent;
        }

        .reward-toast__chip--xp {
          color: color-mix(in srgb, var(--t-acc) 90%, white 10%);
          background: color-mix(in srgb, var(--t-acc) 15%, transparent);
          border-color: color-mix(in srgb, var(--t-acc) 30%, transparent);
        }

        .reward-toast__chip--level {
          color: #0e7b65;
          background: rgba(74, 222, 128, 0.16);
          border-color: rgba(74, 222, 128, 0.32);
        }

        .reward-toast__chip--streak {
          color: #d97706;
          background: rgba(251, 191, 36, 0.16);
          border-color: rgba(251, 191, 36, 0.32);
        }

        .reward-toast__chip--effect {
          color: #0c4a6e;
          background: rgba(14, 165, 233, 0.16);
          border-color: rgba(14, 165, 233, 0.3);
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .reward-toast__progress {
          margin-top: 0.55rem;
          height: 3px;
          border-radius: 999px;
          overflow: hidden;
          background: color-mix(in srgb, var(--t-brd) 55%, transparent);
        }

        .reward-toast__progress-fill {
          height: 100%;
          width: 100%;
          background: linear-gradient(90deg, var(--t-acc), color-mix(in srgb, var(--t-warning) 80%, var(--t-acc)));
          transform-origin: left;
          animation: toast-progress 4.25s linear forwards;
        }

        @keyframes toast-in {
          from {
            opacity: 0;
            transform: translate3d(24px, 0, 0) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </article>
  );
}
