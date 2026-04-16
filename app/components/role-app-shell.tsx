'use client';

import { useEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight, LogOut, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { hardSignOut } from '@/app/lib/supabase';
import { getAccountHomePath } from '@/app/lib/account-type';

type RoleAppTab = {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

type RoleAppShellProps = {
  roleLabel: string;
  eyebrow: string;
  title: string;
  description?: string;
  accent: string;
  expectedRole: 'teacher' | 'parent';
  mode?: 'dark' | 'light';
  showHero?: boolean;
  tabs?: RoleAppTab[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  topRightSlot?: ReactNode;
  children: ReactNode;
};

export function RoleAppShell({
  roleLabel,
  eyebrow,
  title,
  description,
  accent,
  expectedRole,
  mode = 'dark',
  showHero = true,
  tabs = [],
  activeTab,
  onTabChange,
  topRightSlot,
  children,
}: RoleAppShellProps) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const isLight = mode === 'light';

  const shellBg = isLight
    ? 'linear-gradient(180deg, #f8fbff 0%, #edf7f5 100%)'
    : `
          radial-gradient(circle at 12% 0%, color-mix(in srgb, ${accent} 22%, transparent) 0%, transparent 30%),
          radial-gradient(circle at 88% 0%, rgba(91,216,255,0.14) 0%, transparent 24%),
          radial-gradient(circle at 50% 108%, rgba(168,85,247,0.10) 0%, transparent 30%),
          linear-gradient(180deg, #040714 0%, #091326 52%, #050711 100%)
        `;
  const shellCard = isLight ? 'rgba(255,255,255,0.9)' : `color-mix(in srgb, rgba(12, 18, 32, 0.92) 90%, ${accent} 10%)`;
  const shellSurface2 = isLight ? 'rgba(247,250,255,0.92)' : 'rgba(16, 23, 42, 0.84)';
  const shellChipBg = isLight ? 'rgba(15, 23, 42, 0.04)' : 'rgba(255,255,255,0.07)';
  const shellBorder = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(125, 211, 252, 0.14)';
  const shellText = isLight ? '#0f172a' : '#f8fbff';
  const shellText2 = isLight ? '#475569' : '#dbe8f5';
  const shellText3 = isLight ? '#64748b' : '#93a9c4';

  useEffect(() => {
    if (!loading && !profile) {
      router.replace('/login');
      return;
    }
    if (!profile?.account_type) return;
    if (profile.account_type !== expectedRole) {
      router.replace(getAccountHomePath(profile.account_type));
    }
  }, [expectedRole, loading, profile, router]);

  if (loading || !profile) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: shellBg,
          color: shellText2,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Loading workspace...
      </div>
    );
  }

  const handleLogout = async () => {
    router.replace('/login');
    window.location.replace('/login');
    void hardSignOut();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: shellBg,
        color: shellText,
        paddingBottom: tabs.length ? 116 : 0,
        ['--workspace-text' as string]: shellText,
        ['--workspace-text2' as string]: shellText2,
        ['--workspace-text3' as string]: shellText3,
        ['--workspace-border' as string]: shellBorder,
        ['--workspace-surface' as string]: shellCard,
        ['--workspace-surface2' as string]: shellSurface2,
        ['--workspace-chip-bg' as string]: shellChipBg,
      } as CSSProperties}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '1.25rem 1.25rem 2rem' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '12px 18px',
            borderRadius: 22,
            background: isLight ? shellCard : 'linear-gradient(180deg, rgba(13, 19, 36, 0.94) 0%, rgba(8, 12, 24, 0.88) 100%)',
            border: `1px solid ${shellBorder}`,
            boxShadow: isLight ? '0 18px 50px rgba(0,0,0,0.16)' : '0 28px 82px rgba(0,0,0,0.38)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 52%, white))`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 14px 30px color-mix(in srgb, ${accent} 28%, transparent)`,
              }}
            >
              <Sparkles style={{ width: 18, height: 18, color: '#fff' }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: shellText3 }}>
                {roleLabel}
              </p>
              <h1 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: shellText }}>
                Draftora
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 999,
                background: isLight ? 'color-mix(in srgb, var(--t-acc) 8%, transparent)' : shellChipBg,
                border: `1px solid ${shellBorder}`,
                color: shellText2,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {profile.username}
            </div>
            {topRightSlot}
            <button
              type="button"
              onClick={handleLogout}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 14,
                border: '1px solid color-mix(in srgb, var(--t-danger) 40%, rgba(255,255,255,0.16))',
                background: 'color-mix(in srgb, var(--t-danger) 22%, rgba(0,0,0,0.08))',
                color: 'var(--t-sb-tx)',
                fontSize: 13,
                fontWeight: 700,
                padding: '10px 14px',
                boxShadow: '0 6px 14px color-mix(in srgb, var(--t-danger) 18%, transparent)',
                cursor: 'pointer',
              }}
            >
              <LogOut style={{ width: 14, height: 14 }} />
              Sign out
            </button>
          </div>
        </header>

        <main style={{ paddingTop: 18 }}>
          {showHero ? (
            <section
              style={{
                borderRadius: 30,
                padding: '2rem',
                background: isLight
                  ? 'rgba(255,255,255,0.85)'
                  : 'linear-gradient(180deg, rgba(12, 18, 34, 0.94) 0%, rgba(10, 14, 26, 0.90) 100%)',
                border: `1px solid ${shellBorder}`,
                boxShadow: isLight ? '0 24px 80px rgba(0,0,0,0.18)' : '0 32px 96px rgba(0,0,0,0.36)',
                overflow: 'hidden',
                position: 'relative',
                backdropFilter: 'blur(18px)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 'auto -100px -120px auto',
                  width: 320,
                  height: 320,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, color-mix(in srgb, ${accent} 18%, transparent) 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }}
              />
              <div style={{ position: 'relative' }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: accent }}>
                  {eyebrow}
                </p>
                <h2 style={{ margin: '10px 0 8px', fontSize: 'clamp(2.2rem, 5vw, 4.2rem)', lineHeight: 0.96, fontWeight: 950, letterSpacing: '-0.06em', color: shellText }}>
                  {title}
                </h2>
                {description ? (
                  <p style={{ margin: 0, maxWidth: 720, fontSize: 15.5, lineHeight: 1.7, color: shellText2 }}>
                    {description}
                  </p>
                ) : null}
              </div>

              <div style={{ paddingTop: 24 }}>
                {children}
              </div>
            </section>
          ) : (
            <div>{children}</div>
          )}
        </main>
      </div>

      {!!tabs.length && (
        <nav
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 16,
            transform: 'translateX(-50%)',
            width: 'min(1180px, calc(100vw - 1.5rem))',
            zIndex: 30,
            borderRadius: 24,
            background: isLight ? 'rgba(255,255,255,0.92)' : 'linear-gradient(180deg, rgba(10, 16, 30, 0.88) 0%, rgba(8, 12, 24, 0.84) 100%)',
            border: `1px solid ${shellBorder}`,
            boxShadow: isLight ? '0 18px 60px rgba(0,0,0,0.22)' : '0 28px 82px rgba(0,0,0,0.40)',
            backdropFilter: 'blur(18px)',
            padding: 10,
            display: 'grid',
            gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
            gap: 8,
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.key === activeTab;
            const hasDescription = Boolean(tab.description);

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange?.(tab.key)}
                style={{
                  border: 'none',
                  borderRadius: 18,
                  padding: '11px 12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: active
                    ? `linear-gradient(135deg, color-mix(in srgb, ${accent} 20%, transparent) 0%, color-mix(in srgb, ${accent} 10%, transparent) 100%)`
                    : 'transparent',
                  color: shellText,
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: hasDescription ? 66 : 58,
                  borderLeft: active ? `1px solid color-mix(in srgb, ${accent} 26%, transparent)` : '1px solid transparent',
                  borderTop: active ? `1px solid color-mix(in srgb, ${accent} 22%, transparent)` : '1px solid transparent',
                  boxShadow: active ? `0 12px 26px color-mix(in srgb, ${accent} 14%, transparent)` : 'none',
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: active
                      ? `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 65%, white))`
                      : isLight ? 'color-mix(in srgb, var(--t-tx3) 12%, transparent)' : 'rgba(255,255,255,0.06)',
                    color: active ? '#fff' : shellText2,
                    flexShrink: 0,
                  }}
                >
                  <Icon style={{ width: 16, height: 16 }} />
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 850, lineHeight: 1.2 }}>
                    {tab.label}
                  </span>
                  {hasDescription ? (
                    <span style={{ display: 'block', fontSize: 11, lineHeight: 1.3, color: shellText3, marginTop: 3 }}>
                      {tab.description}
                    </span>
                  ) : null}
                </span>
                <ChevronRight
                  style={{
                    width: 14,
                    height: 14,
                    color: active ? accent : shellText3,
                    opacity: active ? 1 : 0.7,
                    flexShrink: 0,
                  }}
                />
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
