'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bot,
  Flame,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  PenLine,
  Settings,
  Star,
  Trophy,
  X,
  Zap,
  Target,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/app/lib/supabase';
import { getXPProgress } from '@/app/types/database';
import OnboardingModal from '@/app/components/OnboardingModal';
import UpgradeModal from '@/app/components/UpgradeModal';
import { getTrialStatus } from '@/app/lib/trial';

const NAV_LINKS = [
  { href: '/dashboard',          icon: Home,          label: 'Dashboard', color: 'var(--t-acc)',  iconBg: 'var(--t-acc-a)'         },
  { href: '/dashboard/writings', icon: PenLine,       label: 'Write',     color: 'var(--t-mod-write)',   iconBg: 'color-mix(in srgb, var(--t-mod-write) 14%, transparent)'  },
  { href: '/dashboard/vocab',    icon: GraduationCap, label: 'Vocab',     color: 'var(--t-mod-vocab)',   iconBg: 'color-mix(in srgb, var(--t-mod-vocab) 14%, transparent)'  },
  { href: '/dashboard/coach',    icon: Bot,           label: 'Coach',     color: 'var(--t-mod-coach)',   iconBg: 'color-mix(in srgb, var(--t-mod-coach) 14%, transparent)' },
  { href: '/dashboard/rewards',  icon: Trophy,        label: 'Rewards',   color: 'var(--t-mod-rewards)', iconBg: 'color-mix(in srgb, var(--t-mod-rewards) 14%, transparent)'  },
  { href: '/dashboard/settings', icon: Settings,      label: 'Settings',  color: 'var(--t-tx2)', iconBg: 'var(--t-bg)'            },
];

function getPageMeta(pathname: string) {
  if (pathname === '/dashboard/journal') return 'Write';
  const match = NAV_LINKS.find((item) => item.href === pathname);
  return match?.label ?? 'Workspace';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const xp          = profile ? getXPProgress(profile.xp) : null;
  const initial     = profile?.username?.[0]?.toUpperCase() ?? '?';
  const pageTitle   = useMemo(() => getPageMeta(pathname), [pathname]);
  const trialStatus = profile ? getTrialStatus(profile) : null;

  if (loading || !user) {
    return (
      <div className="app-frame flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-pulse rounded-2xl" style={{ background: 'var(--t-btn)' }} />
      </div>
    );
  }

  return (
    <div className="app-frame">
      <OnboardingModal />
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'var(--t-overlay)' }}
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <div className="flex min-h-screen gap-0">
        {/* ─── SIDEBAR ─── */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform duration-200 md:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div
            className="m-3 flex h-[calc(100vh-1.5rem)] flex-col overflow-hidden"
            style={{
              borderRadius: 24,
              background: 'linear-gradient(180deg, color-mix(in srgb, var(--t-card) 92%, var(--t-acc) 8%) 0%, var(--t-card) 100%)',
              border: '1px solid color-mix(in srgb, var(--t-brd) 50%, transparent)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)',
            }}
          >
            {/* ── Brand ── */}
            <div className="flex items-center justify-between px-5 py-4">
              <Link href="/dashboard" className="flex items-center gap-3 no-underline">
                <div
                  className="flex h-10 w-10 items-center justify-center"
                  style={{
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, var(--t-acc-b), var(--t-acc-a))',
                    color: 'var(--t-acc)',
                    border: '1px solid var(--t-brd-a)',
                  }}
                >
                  <PenLine className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[15px] font-black leading-tight" style={{ color: 'var(--t-tx)' }}>Draftly</p>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--t-tx3)' }}>Writing Studio</p>
                </div>
              </Link>
              <button type="button" className="dashboard-topbar__menu md:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── User card ── */}
            {profile && (
              <div className="mx-4 mb-2" style={{ borderRadius: 18, background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', padding: '14px 16px' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center text-sm font-black"
                    style={{
                      borderRadius: 13,
                      background: 'linear-gradient(135deg, color-mix(in srgb, var(--t-acc) 80%, white), var(--t-acc))',
                      color: 'var(--t-btn-color)',
                      fontSize: 16,
                    }}
                  >
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold" style={{ color: 'var(--t-tx)' }}>{profile.username}</p>
                    <p className="truncate text-[11px]" style={{ color: 'var(--t-tx3)' }}>{profile.title}</p>
                  </div>
                  <div
                    className="flex items-center gap-1 px-2.5 py-1"
                    style={{ background: 'var(--t-acc-b)', borderRadius: 10, border: '1px solid var(--t-brd-a)' }}
                  >
                    <Star style={{ width: 10, height: 10, color: 'var(--t-acc)' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-acc)' }}>Lv {profile.level}</span>
                  </div>
                </div>
                {xp && (
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span style={{ fontSize: 10, color: 'var(--t-tx3)' }}>
                        <span style={{ color: 'var(--t-acc)', fontWeight: 700 }}>{xp.current}</span> / {xp.needed} XP
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--t-tx3)' }}>Level {profile.level} → {profile.level + 1}</span>
                    </div>
                    <div className="h-[6px] overflow-hidden rounded-full" style={{ background: 'var(--t-xp-track)' }}>
                      <div className="h-full rounded-full" style={{ width: `${xp.percent}%`, background: 'var(--t-xp)', transition: 'width 0.5s' }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Streak + XP strip ── */}
            {profile && (
            <div className="mx-4 mb-3 grid grid-cols-2 gap-2">
              {/* Streak card */}
              <div style={{
                borderRadius: 16,
                padding: '12px 14px',
                background: 'linear-gradient(135deg, color-mix(in srgb, var(--t-warning) 18%, transparent) 0%, color-mix(in srgb, var(--t-warning) 7%, transparent) 100%)',
                border: '1px solid color-mix(in srgb, var(--t-warning) 30%, transparent)',
                boxShadow: '0 4px 16px color-mix(in srgb, var(--t-warning) 12%, transparent)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Subtle glow blob */}
                <div style={{
                  position: 'absolute', bottom: -8, right: -8,
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'color-mix(in srgb, var(--t-warning) 20%, transparent)',
                  filter: 'blur(14px)',
                  pointerEvents: 'none',
                }} />
                <div className="flex items-center gap-1.5 mb-2">
                  <div style={{
                    width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                    background: 'color-mix(in srgb, var(--t-warning) 22%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--t-warning) 35%, transparent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Flame style={{ width: 12, height: 12, color: 'var(--t-warning)' }} />
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--t-warning)', textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.85 }}>Streak</span>
                </div>
                <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--t-warning)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {profile.streak}
                </p>
                <p style={{ fontSize: 10, color: 'var(--t-warning)', marginTop: 3, opacity: 0.6, fontWeight: 600 }}>
                  day{profile.streak !== 1 ? 's' : ''} in a row
                </p>
              </div>

              {/* XP card */}
              <div style={{
                borderRadius: 16,
                padding: '12px 14px',
                background: 'linear-gradient(135deg, color-mix(in srgb, var(--t-mod-rewards) 18%, transparent) 0%, color-mix(in srgb, var(--t-mod-rewards) 7%, transparent) 100%)',
                border: '1px solid color-mix(in srgb, var(--t-mod-rewards) 30%, transparent)',
                boxShadow: '0 4px 16px color-mix(in srgb, var(--t-mod-rewards) 12%, transparent)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', bottom: -8, right: -8,
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'color-mix(in srgb, var(--t-mod-rewards) 20%, transparent)',
                  filter: 'blur(14px)',
                  pointerEvents: 'none',
                }} />
                <div className="flex items-center gap-1.5 mb-2">
                  <div style={{
                    width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                    background: 'color-mix(in srgb, var(--t-mod-rewards) 22%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--t-mod-rewards) 35%, transparent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Zap style={{ width: 12, height: 12, color: 'var(--t-mod-rewards)' }} />
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--t-mod-rewards)', textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.85 }}>Total XP</span>
                </div>
                <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--t-mod-rewards)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {profile.xp >= 1000 ? `${(profile.xp / 1000).toFixed(1)}k` : profile.xp}
                </p>
                <p style={{ fontSize: 10, color: 'var(--t-mod-rewards)', marginTop: 3, opacity: 0.6, fontWeight: 600 }}>
                  points earned
                </p>
              </div>
            </div>
            )}

            {/* ── Nav links ── */}
            <nav className="flex-1 overflow-y-auto px-3 pb-2">
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--t-tx3)', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '4px 12px 8px' }}>Navigate</p>
              <div className="flex flex-col gap-[2px]">
                {NAV_LINKS.map(({ href, icon: Icon, label, color, iconBg }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-3 no-underline transition-all duration-150"
                      style={{
                        borderRadius: 14,
                        padding: '7px 10px',
                        background: active
                          ? 'linear-gradient(135deg, var(--t-acc-b), var(--t-acc-a))'
                          : 'transparent',
                        border: active ? '1px solid var(--t-brd-a)' : '1px solid transparent',
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: active ? color : iconBg,
                        border: active ? 'none' : '1px solid var(--t-brd)',
                        transition: 'background 0.15s',
                      }}>
                        <Icon style={{ width: 17, height: 17, color: active ? '#fff' : color }} />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: active ? 'var(--t-acc)' : 'var(--t-tx2)' }}>
                        {label}
                      </span>
                      {active && (
                        <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: 99, background: 'var(--t-acc)' }} />
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* ── Quick actions ── */}
              <div className="mt-4">
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--t-tx3)', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '4px 12px 8px' }}>Quick Actions</p>
                <div className="flex flex-col gap-[3px]">
                  <Link
                    href="/dashboard/writings"
                    className="no-underline flex items-center gap-3 transition-all duration-150"
                    style={{ borderRadius: 16, padding: '11px 16px', color: 'var(--t-tx3)', fontSize: 13, fontWeight: 500 }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 9, background: 'var(--t-acc-a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <PenLine style={{ width: 13, height: 13, color: 'var(--t-acc)' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-tx2)', lineHeight: 1 }}>Write today&apos;s piece</p>
                      <p style={{ fontSize: 10, color: 'var(--t-tx3)', marginTop: 2 }}>Daily prompt waiting</p>
                    </div>
                  </Link>
                  <Link
                    href="/dashboard/vocab"
                    className="no-underline flex items-center gap-3 transition-all duration-150"
                    style={{ borderRadius: 16, padding: '11px 16px', color: 'var(--t-tx3)', fontSize: 13, fontWeight: 500 }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 9, background: 'color-mix(in srgb, var(--t-mod-vocab) 14%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Target style={{ width: 13, height: 13, color: 'var(--t-mod-vocab)' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-tx2)', lineHeight: 1 }}>Practise vocab</p>
                      <p style={{ fontSize: 10, color: 'var(--t-tx3)', marginTop: 2 }}>3 words to learn today</p>
                    </div>
                  </Link>
                </div>
              </div>
            </nav>

            {/* ── Sign out ── */}
            <div className="px-4 pb-4 pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 transition"
                style={{
                  borderRadius: 14,
                  padding: '10px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  background: 'color-mix(in srgb, var(--t-danger) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--t-danger) 22%, transparent)',
                  color: 'var(--t-danger)',
                }}
              >
                <LogOut style={{ width: 14, height: 14 }} />
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* ─── MAIN CONTENT ─── */}
        <div className="min-w-0 flex-1 sidebar-offset">
          <div className="dashboard-main">
            <div className="dashboard-content app-surface">
              <div className="dashboard-topbar">
                <div className="dashboard-topbar__meta">
                  <button type="button" className="dashboard-topbar__menu md:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
                    <Menu className="h-4 w-4" />
                  </button>
                  <div>
                    <h1>{pageTitle}</h1>
                    <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                {profile && (
                  <div className="dashboard-topbar__badge">
                    <Star className="h-4 w-4" />
                    Level {profile.level}
                  </div>
                )}
              </div>
              <main className="theme-main">{children}</main>
            </div>
          </div>
        </div>
      </div>
      {/* ── Full-app block when trial expired or all limits hit ── */}
      {trialStatus?.fullBlocked && (
        <UpgradeModal
          reason={trialStatus.expired ? 'expired' : 'all'}
          status={trialStatus}
          /* no onClose → non-dismissible */
        />
      )}
    </div>
  );
}
