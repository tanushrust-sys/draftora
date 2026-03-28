'use client';

import { Crown, Sparkles, Bot, PenLine, GraduationCap, X, ArrowRight, Zap, CheckCircle, Clock, Lock } from 'lucide-react';
import type { TrialStatus } from '@/app/lib/trial';
import { TRIAL_LIMITS } from '@/app/lib/trial';

export type BlockReason = 'coach' | 'writings' | 'vocab' | 'expired' | 'all';

interface Props {
  reason    : BlockReason;
  status    : TrialStatus;
  /** If provided, modal shows a close button. Omit for non-dismissible (full block). */
  onClose  ?: () => void;
}

const REASON_META: Record<BlockReason, {
  emoji: string;
  headline: string;
  sub: string;
  icon: React.ElementType;
  color: string;
}> = {
  coach: {
    emoji: '🤖', headline: "You've used all 50 coach messages",
    sub: 'Upgrade to Plus for unlimited AI coaching sessions.',
    icon: Bot, color: '#f0c846',
  },
  writings: {
    emoji: '✍️', headline: "You've reached 30 writings",
    sub: 'Upgrade to Plus to keep writing without limits.',
    icon: PenLine, color: '#4dd4a8',
  },
  vocab: {
    emoji: '📚', headline: "You've saved 90 vocab words",
    sub: 'Upgrade to Plus to continue building your word bank.',
    icon: GraduationCap, color: '#b090ff',
  },
  expired: {
    emoji: '⏰', headline: 'Your 30-day free trial has ended',
    sub: 'Upgrade to Plus to keep all your progress and unlock unlimited access.',
    icon: Clock, color: '#ff8844',
  },
  all: {
    emoji: '🚀', headline: "You've unlocked everything the trial offers",
    sub: "You've made the most of your free trial! Upgrade to keep going.",
    icon: Sparkles, color: '#f0c846',
  },
};

const isFull = (reason: BlockReason) => reason === 'expired' || reason === 'all';

export default function UpgradeModal({ reason, status, onClose }: Props) {
  const meta  = REASON_META[reason];
  const full  = isFull(reason);

  const stats = [
    { label: 'Coach messages', used: TRIAL_LIMITS.COACH_MESSAGES - status.coachLeft,    max: TRIAL_LIMITS.COACH_MESSAGES, icon: Bot,           color: '#f0c846' },
    { label: 'Writings',       used: TRIAL_LIMITS.WRITINGS        - status.writingsLeft, max: TRIAL_LIMITS.WRITINGS,       icon: PenLine,       color: '#4dd4a8' },
    { label: 'Vocab words',    used: TRIAL_LIMITS.VOCAB_WORDS     - status.vocabLeft,    max: TRIAL_LIMITS.VOCAB_WORDS,    icon: GraduationCap, color: '#b090ff' },
    ...(full ? [{ label: 'Trial days',  used: Math.min(status.daysUsed, TRIAL_LIMITS.DAYS), max: TRIAL_LIMITS.DAYS,  icon: Clock,         color: '#ff8844' }] : []),
  ];

  const plusFeatures = [
    { icon: Bot,          text: 'Unlimited AI coach sessions',    color: '#f0c846' },
    { icon: PenLine,      text: 'Unlimited writing submissions',  color: '#4dd4a8' },
    { icon: GraduationCap,text: 'Unlimited vocabulary words',     color: '#b090ff' },
    { icon: Zap,          text: 'Priority AI feedback',           color: '#ff8844' },
    { icon: Sparkles,     text: 'Advanced writing analytics',     color: '#6a9fff' },
    { icon: Crown,        text: 'Full access, forever',           color: '#f0c846' },
  ];

  return (
    /* Full-screen backdrop */
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.72)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: 520,
        background: 'var(--t-card)',
        border: '1px solid var(--t-brd)',
        borderTop: `3px solid ${meta.color}`,
        borderRadius: 28,
        overflow: 'hidden',
        boxShadow: `0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px ${meta.color}20`,
        position: 'relative',
        maxHeight: '92vh',
        overflowY: 'auto',
      }}>

        {/* Glow blob */}
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 220, height: 220,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${meta.color}22 0%, transparent 65%)`,
          pointerEvents: 'none',
        }} />

        {/* Close button (only when dismissible) */}
        {onClose && (
          <button onClick={onClose} style={{
            position: 'absolute', top: 16, right: 16,
            width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'var(--t-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--t-tx3)', zIndex: 1,
          }}>
            <X style={{ width: 15, height: 15 }} />
          </button>
        )}

        <div style={{ padding: '32px 28px 28px', position: 'relative' }}>
          {/* Lock badge (full-block only) */}
          {full && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
              border: `1px solid color-mix(in srgb, ${meta.color} 30%, transparent)`,
              borderRadius: 99, padding: '4px 12px', marginBottom: 16,
            }}>
              <Lock style={{ width: 11, height: 11, color: meta.color }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: meta.color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {reason === 'expired' ? 'Trial Expired' : 'Trial Complete'}
              </span>
            </div>
          )}

          {/* Hero emoji + headline */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 10, lineHeight: 1 }}>{meta.emoji}</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--t-tx)', margin: '0 0 8px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {meta.headline}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--t-tx3)', margin: 0, lineHeight: 1.5 }}>
              {meta.sub}
            </p>
          </div>

          {/* Trial usage stats */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${full ? 2 : 3}, 1fr)`, gap: 8, marginBottom: 22 }}>
            {stats.map(s => {
              const pct = Math.min((s.used / s.max) * 100, 100);
              const SIcon = s.icon;
              return (
                <div key={s.label} style={{
                  borderRadius: 14, padding: '12px',
                  background: `color-mix(in srgb, ${s.color} 8%, var(--t-card2))`,
                  border: `1px solid color-mix(in srgb, ${s.color} 22%, transparent)`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
                    <SIcon style={{ width: 12, height: 12, color: s.color }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {s.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--t-tx)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                    {s.used}<span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t-tx3)', marginLeft: 2 }}>/ {s.max}</span>
                  </p>
                  <div style={{ height: 4, borderRadius: 99, background: 'var(--t-bg)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: s.color, transition: 'width 0.4s' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--t-brd)', margin: '0 0 20px' }} />

          {/* Plus features */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--t-tx3)', margin: '0 0 12px' }}>
              What you get with Plus
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {plusFeatures.map(f => {
                const FIcon = f.icon;
                return (
                  <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                      background: `color-mix(in srgb, ${f.color} 14%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${f.color} 26%, transparent)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <FIcon style={{ width: 12, height: 12, color: f.color }} />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--t-tx2)', lineHeight: 1.35 }}>{f.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <button style={{
            width: '100%', padding: '14px', borderRadius: 16, border: 'none', cursor: 'pointer',
            background: 'var(--t-btn)', color: 'var(--t-btn-color)',
            fontSize: 15, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 20px var(--t-acc-a)',
          }}>
            <Crown style={{ width: 16, height: 16 }} />
            Upgrade to Plus
            <ArrowRight style={{ width: 15, height: 15 }} />
          </button>

          {!full && (
            <p style={{ fontSize: 11, color: 'var(--t-tx3)', textAlign: 'center', marginTop: 10 }}>
              {status.daysLeft > 0
                ? `${status.daysLeft} day${status.daysLeft !== 1 ? 's' : ''} left on your free trial`
                : 'Your free trial has ended'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Inline "feature blocked" wall — used inside feature pages ── */
export function FeatureBlockWall({
  reason,
  status,
  onUpgradeClick,
}: {
  reason: Exclude<BlockReason, 'expired' | 'all'>;
  status: TrialStatus;
  onUpgradeClick: () => void;
}) {
  const meta  = REASON_META[reason];
  const Icon  = meta.icon;

  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px',
    }}>
      <div style={{
        maxWidth: 440, width: '100%', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
      }}>
        {/* Icon orb */}
        <div style={{
          width: 72, height: 72, borderRadius: 22, flexShrink: 0,
          background: `color-mix(in srgb, ${meta.color} 18%, transparent)`,
          border: `2px solid color-mix(in srgb, ${meta.color} 35%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 8px 28px color-mix(in srgb, ${meta.color} 18%, transparent)`,
          fontSize: 32,
        }}>
          {meta.emoji}
        </div>

        <div>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: meta.color, margin: '0 0 8px' }}>
            Limit Reached
          </p>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: 'var(--t-tx)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            {meta.headline}
          </h3>
          <p style={{ fontSize: 14, color: 'var(--t-tx3)', margin: 0, lineHeight: 1.55 }}>
            {meta.sub}
          </p>
        </div>

        {/* Quick stat */}
        <div style={{
          display: 'flex', gap: 12, justifyContent: 'center', width: '100%',
        }}>
          {([
            { label: 'Coach', used: TRIAL_LIMITS.COACH_MESSAGES - status.coachLeft,    max: TRIAL_LIMITS.COACH_MESSAGES, color: '#f0c846', Icon: Bot },
            { label: 'Writings', used: TRIAL_LIMITS.WRITINGS - status.writingsLeft,    max: TRIAL_LIMITS.WRITINGS,        color: '#4dd4a8', Icon: PenLine },
            { label: 'Vocab',    used: TRIAL_LIMITS.VOCAB_WORDS - status.vocabLeft,    max: TRIAL_LIMITS.VOCAB_WORDS,     color: '#b090ff', Icon: GraduationCap },
          ] as const).map(s => (
            <div key={s.label} style={{
              flex: 1, borderRadius: 14, padding: '10px 8px', textAlign: 'center',
              background: `color-mix(in srgb, ${s.color} 8%, var(--t-card))`,
              border: `1px solid color-mix(in srgb, ${s.color} 20%, transparent)`,
            }}>
              <p style={{ fontSize: 16, fontWeight: 900, color: s.used >= s.max ? s.color : 'var(--t-tx)', margin: '0 0 2px' }}>
                {s.used}<span style={{ fontSize: 10, color: 'var(--t-tx3)', fontWeight: 600 }}>/{s.max}</span>
              </p>
              <p style={{ fontSize: 10, color: 'var(--t-tx3)', margin: 0, fontWeight: 600 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Days remaining */}
        {status.daysLeft > 0 && (
          <p style={{ fontSize: 12, color: 'var(--t-tx3)', margin: 0 }}>
            <span style={{ color: meta.color, fontWeight: 700 }}>{status.daysLeft}</span> trial day{status.daysLeft !== 1 ? 's' : ''} remaining
          </p>
        )}

        <button onClick={onUpgradeClick} style={{
          width: '100%', padding: '14px', borderRadius: 16, border: 'none', cursor: 'pointer',
          background: 'var(--t-btn)', color: 'var(--t-btn-color)',
          fontSize: 15, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 4px 20px var(--t-acc-a)',
        }}>
          <Crown style={{ width: 16, height: 16 }} />
          Upgrade to Plus
          <ArrowRight style={{ width: 15, height: 15 }} />
        </button>

        <p style={{ fontSize: 11, color: 'var(--t-tx3)', margin: 0 }}>
          All your progress is safe — upgrading unlocks everything instantly.
        </p>
      </div>
    </div>
  );
}

/* ── Small "approaching limit" banner ── */
export function LimitWarningBanner({
  left, total, label, color,
}: {
  left: number; total: number; label: string; color: string;
}) {
  const pct = ((total - left) / total) * 100;
  if (pct < 70) return null; // only show at 70%+ usage
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: `color-mix(in srgb, ${color} 10%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      borderRadius: 12, padding: '8px 14px',
      marginBottom: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {left === 0 ? `${label} limit reached` : `${left} ${label.toLowerCase()} remaining`}
          </span>
          <span style={{ fontSize: 11, color, fontWeight: 600 }}>{total - left}/{total}</span>
        </div>
        <div style={{ height: 3, borderRadius: 99, background: `color-mix(in srgb, ${color} 18%, transparent)`, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}
