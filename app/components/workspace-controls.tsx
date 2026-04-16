'use client';

import type { ReactNode } from 'react';

export function SectionTitle({
  eyebrow,
  title,
  copy,
  accent,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  accent: string;
}) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: accent }}>
        {eyebrow}
      </div>
      <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: '-0.04em', color: 'var(--workspace-text)' }}>{title}</div>
      {copy ? <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--workspace-text2)' }}>{copy}</div> : null}
    </div>
  );
}

export function PillButton({
  active,
  children,
  onClick,
  accent,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        borderRadius: 999,
        padding: '10px 14px',
        background: active
          ? `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 70%, white))`
          : 'var(--workspace-chip-bg, rgba(255,255,255,0.04))',
        color: active ? '#fff' : 'var(--workspace-text)',
        fontSize: 13,
        fontWeight: 800,
        boxShadow: active ? `0 12px 26px color-mix(in srgb, ${accent} 18%, transparent)` : 'none',
        border: active ? `1px solid color-mix(in srgb, ${accent} 22%, transparent)` : '1px solid var(--workspace-border)',
      }}
    >
      {children}
    </button>
  );
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '14px 16px',
        borderRadius: 18,
        background: 'var(--workspace-surface2, rgba(255,255,255,0.04))',
        border: '1px solid var(--workspace-border, rgba(255,255,255,0.1))',
        cursor: 'pointer',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 850, color: 'var(--workspace-text)' }}>{label}</div>
        <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.6, color: 'var(--workspace-text2)' }}>{description}</div>
      </div>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
