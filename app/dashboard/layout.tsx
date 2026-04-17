'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bot,
  ChevronRight,
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
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { hardSignOut } from '@/app/lib/supabase';
import { getXPProgress } from '@/app/types/database';
import OnboardingModal from '@/app/components/OnboardingModal';
import LevelUpPopup from '@/app/components/LevelUpPopup';
import { clearAccountTypeOverride } from '@/app/lib/account-type';
import { getAccountHomePath } from '@/app/lib/account-type';

function createNavLinks() {
  return [
    { href: '/dashboard',         icon: Home,          label: 'Dashboard',   color: 'var(--t-acc)',         description: 'Your dashboard overview' },
    { href: '/dashboard/writings', icon: PenLine,       label: 'Write',       color: 'var(--t-mod-write)',   description: 'My writings and progress' },
    { href: '/dashboard/vocab',    icon: GraduationCap, label: 'Vocab',       color: 'var(--t-mod-vocab)',   description: 'Daily words and saves' },
    { href: '/dashboard/coach',    icon: Bot,           label: 'Coach',       color: 'var(--t-mod-coach)',   description: 'Feedback and guidance' },
    { href: '/dashboard/rewards',  icon: Trophy,        label: 'Rewards',     color: 'var(--t-mod-rewards)', description: 'XP and milestones' },
    { href: '/dashboard/settings', icon: Settings,      label: 'Settings',    color: 'var(--t-acc-light)',   description: 'Account and theme' },
  ];
}

function getPageMeta(pathname: string, accountType?: string) {
  if (pathname === '/dashboard') return 'Dashboard';
  if (pathname === '/dashboard/journal') return 'Write';
  return 'Workspace';
}

function isNavActive(pathname: string, href: string, homeHref: string) {
  if (href === homeHref) return pathname === homeHref;
  if (href === '/dashboard/writings') return pathname === '/dashboard/writings' || pathname === '/dashboard/journal';
  if (href === '/dashboard/settings') return pathname === '/dashboard/settings';
  return pathname.startsWith(href);
}

const SIDEBAR_W  = 264;
const COLLAPSED_W = 72;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const hasAuthContext = Boolean(user || profile);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('draftora-sidebar-collapsed') === '1';
  });
  const homeHref = '/dashboard';
  const navLinks = useMemo(() => createNavLinks(), []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('draftora-sidebar-collapsed', next ? '1' : '0');
      return next;
    });
  };

  useEffect(() => {
    if (!loading && !hasAuthContext) router.replace('/login');
  }, [hasAuthContext, loading, router]);

  useEffect(() => {
    if (loading || !profile?.account_type) return;
    if (profile.account_type === 'teacher' || profile.account_type === 'parent') {
      const accountHomePath = getAccountHomePath(profile.account_type);
      if (pathname !== accountHomePath) {
        router.replace(accountHomePath);
      }
      return;
    }
  }, [loading, pathname, profile?.account_type, router]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const handleLogout = async () => {
    try { localStorage.removeItem('draftora-profile-v1'); } catch {}
    if (profile?.id) {
      clearAccountTypeOverride(profile.id);
    }
    router.replace('/login');
    window.location.replace('/login');
    void hardSignOut();
  };

  const xp          = profile ? getXPProgress(profile.xp) : null;
  const initial     = profile?.username?.[0]?.toUpperCase() ?? '?';
  const displayName = profile?.username
    ? profile.username[0].toUpperCase() + profile.username.slice(1)
    : '';
  const pageTitle   = useMemo(() => getPageMeta(pathname), [pathname]);
  const activeNav   = useMemo(
    () => navLinks.find((item) => isNavActive(pathname, item.href, homeHref)) ?? navLinks[0],
    [homeHref, navLinks, pathname],
  );
  const themeAccent = 'var(--t-acc)';
  const isSunsetTheme = profile?.active_theme === 'sunset-glow';
  const inactiveNavLabelColor = isSunsetTheme
    ? 'rgba(255,255,255,0.94)'
    : 'color-mix(in srgb, var(--t-sb-mu) 95%, white 5%)';
  const inactiveNavDescriptionColor = isSunsetTheme
    ? 'rgba(255,255,255,0.74)'
    : 'color-mix(in srgb, var(--t-sb-mu) 72%, transparent)';

  if (loading) {
    return (
      <div className="app-frame min-h-screen" style={{ background: 'radial-gradient(circle at top, color-mix(in srgb, var(--t-acc) 10%, transparent) 0%, transparent 34%), var(--t-bg)' }}>
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-3xl overflow-hidden rounded-[32px] border"
            style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--t-card) 96%, var(--t-acc) 4%) 0%, color-mix(in srgb, var(--t-card) 98%, black) 100%)', borderColor: 'color-mix(in srgb, var(--t-brd) 58%, transparent)', boxShadow: '0 30px 80px rgba(0,0,0,0.28)' }}>
            <div className="flex items-center gap-4 border-b px-6 py-5" style={{ borderColor: 'color-mix(in srgb, var(--t-brd) 40%, transparent)' }}>
              <div className="h-12 w-12 rounded-2xl" style={{ background: 'linear-gradient(135deg, var(--t-acc-b), var(--t-acc-a))' }} />
              <div className="min-w-0">
                <div className="h-4 w-40 rounded-full" style={{ background: 'color-mix(in srgb, var(--t-tx) 18%, transparent)' }} />
                <div className="mt-2 h-3 w-56 rounded-full" style={{ background: 'color-mix(in srgb, var(--t-tx3) 18%, transparent)' }} />
              </div>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-28 rounded-3xl"
                  style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--t-card) 88%, var(--t-acc) 12%) 0%, color-mix(in srgb, var(--t-card) 96%, transparent) 100%)', border: '1px solid color-mix(in srgb, var(--t-brd) 38%, transparent)' }} />
              ))}
            </div>
            <div className="border-t px-6 py-5" style={{ borderColor: 'color-mix(in srgb, var(--t-brd) 40%, transparent)' }}>
              <div className="h-4 w-48 rounded-full" style={{ background: 'color-mix(in srgb, var(--t-tx) 18%, transparent)' }} />
              <div className="mt-3 h-3 w-72 rounded-full" style={{ background: 'color-mix(in srgb, var(--t-tx3) 18%, transparent)' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-frame">
      <OnboardingModal />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <button type="button" className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'var(--t-overlay)' }}
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation" />
      )}

      <div className="flex min-h-screen gap-0">

        {/* ─── SIDEBAR ─── */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          style={{ width: collapsed ? COLLAPSED_W : SIDEBAR_W }}
        >
          <div style={{
            margin: 8,
            height: 'calc(100dvh - 16px)',
            borderRadius: 24,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--t-sb, var(--t-card))',
            border: '1px solid color-mix(in srgb, var(--t-sb-brd, var(--t-brd)) 70%, transparent)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}>

            {/* ── BRAND ── */}
            <div style={{
              padding: collapsed ? '14px 0 12px' : '15px 16px',
              borderBottom: '1px solid color-mix(in srgb, var(--t-brd) 40%, transparent)',
              flexShrink: 0,
            }}>
              {collapsed ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 13,
                      background: 'linear-gradient(135deg, var(--t-acc), color-mix(in srgb, var(--t-acc) 60%, white))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 6px 20px color-mix(in srgb, var(--t-acc) 30%, transparent)',
                    }}>
                      <PenLine style={{ width: 18, height: 18, color: '#fff' }} />
                    </div>
                  </Link>
                  <button type="button" onClick={toggleCollapsed} title="Expand" style={{
                    width: 28, height: 28, borderRadius: 9,
                    background: 'color-mix(in srgb, var(--t-acc) 8%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--t-brd) 50%, transparent)',
                    color: 'var(--t-tx3)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ChevronRight style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--t-acc), color-mix(in srgb, var(--t-acc) 60%, white))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 6px 20px color-mix(in srgb, var(--t-acc) 28%, transparent)',
                    }}>
                      <PenLine style={{ width: 16, height: 16, color: '#fff' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--t-sb-tx)', letterSpacing: '-0.02em', lineHeight: 1 }}>Draftora</p>
                      <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--t-sb-mu)', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: 1.5 }}>Writing Studio</p>
                    </div>
                  </Link>
                  <button type="button"
                    onClick={() => window.innerWidth >= 768 ? toggleCollapsed() : setSidebarOpen(false)}
                    style={{
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      background: 'color-mix(in srgb, var(--t-tx3) 8%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--t-brd) 40%, transparent)',
                      color: 'var(--t-tx3)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    aria-label="Collapse sidebar">
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              )}
            </div>

            {/* ── USER CARD (expanded only) ── */}
            {profile && !collapsed && (
              <div style={{
                margin: '10px 12px 0',
                borderRadius: 18,
                padding: '12px 12px 10px',
                background: isSunsetTheme
                  ? 'linear-gradient(135deg, #ffd7a6 0%, #ffb980 45%, #ff9963 100%)'
                  : `linear-gradient(135deg, color-mix(in srgb, ${themeAccent} 8%, var(--t-card2)) 0%, color-mix(in srgb, ${themeAccent} 4%, var(--t-card2)) 100%)`,
                border: isSunsetTheme
                  ? '1px solid rgba(199, 68, 47, 0.36)'
                  : `1px solid color-mix(in srgb, ${themeAccent} 12%, var(--t-brd))`,
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 14, flexShrink: 0,
                    background: isSunsetTheme
                      ? 'linear-gradient(135deg, #ff9a4d, #f15b42)'
                      : `linear-gradient(135deg, var(--t-acc), color-mix(in srgb, var(--t-acc) 60%, white))`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 17, fontWeight: 900, color: '#fff',
                    boxShadow: isSunsetTheme
                      ? '0 8px 20px rgba(199, 68, 47, 0.30)'
                      : '0 8px 20px color-mix(in srgb, var(--t-acc) 24%, transparent)',
                  }}>{initial}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--t-tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
                      {/* Level badge */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        background: 'color-mix(in srgb, var(--t-acc) 14%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--t-acc) 25%, transparent)',
                        borderRadius: 99, padding: '2px 7px', flexShrink: 0,
                      }}>
                        <Star style={{ width: 9, height: 9, color: 'var(--t-acc)' }} />
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--t-acc)' }}>Lv {profile.level}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 10.5, color: 'var(--t-tx3)', fontWeight: 500, marginTop: 1 }}>{profile.title}</p>
                  </div>
                </div>

                {/* Streak + XP inline */}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'color-mix(in srgb, var(--t-tx3) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--t-tx3) 20%, transparent)', borderRadius: 99, padding: '4px 9px' }}>
                    <Flame style={{ width: 10, height: 10, color: 'var(--t-tx3)' }} />
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--t-tx3)' }}>{profile.streak} day streak</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'color-mix(in srgb, var(--t-tx3) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--t-tx3) 20%, transparent)', borderRadius: 99, padding: '4px 9px' }}>
                    <Zap style={{ width: 10, height: 10, color: 'var(--t-tx3)' }} />
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--t-tx3)' }}>{profile.xp >= 1000 ? `${(profile.xp / 1000).toFixed(1)}k` : profile.xp} XP</span>
                  </div>
                </div>

                {/* XP bar */}
                {xp && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 10, color: 'var(--t-tx3)', fontWeight: 500 }}>Level {profile.level} → {profile.level + 1}</span>
                      <span style={{ fontSize: 10, color: 'var(--t-acc)', fontWeight: 700 }}>{Math.round(xp.percent)}%</span>
                    </div>
                    <div style={{ height: 5, background: 'color-mix(in srgb, var(--t-tx3) 14%, transparent)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${xp.percent}%`, background: 'linear-gradient(90deg, var(--t-acc), color-mix(in srgb, var(--t-acc) 70%, white))', borderRadius: 99, transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── NAV ── */}
            <nav style={{
              flex: '1 1 auto',
              overflow: 'hidden',
              padding: collapsed ? '10px 0 0' : '10px 10px 0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: collapsed ? 'center' : 'stretch',
            }}>
              {!collapsed && (
                <p style={{ fontSize: 9.5, fontWeight: 800, color: 'color-mix(in srgb, var(--t-sb-mu) 92%, white 8%)', letterSpacing: '0.26em', textTransform: 'uppercase', padding: '4px 8px 10px' }}>Navigate</p>
              )}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                width: '100%',
                alignItems: collapsed ? 'center' : 'stretch',
              }}>
                {navLinks.map(({ href, icon: Icon, label, color, description }) => {
                  const active = isNavActive(pathname, href, homeHref);

                  if (collapsed) {
                    return (
                      <Link key={href} href={href} title={label}
                        style={{
                          width: 50, height: 50, borderRadius: 15, margin: '0 auto',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          textDecoration: 'none',
                          background: active ? `linear-gradient(180deg, color-mix(in srgb, ${color} 20%, var(--t-sb-act)) 0%, color-mix(in srgb, ${color} 12%, var(--t-sb)) 100%)` : 'transparent',
                          border: active ? '1px solid var(--t-sb-act-brd)' : '1px solid color-mix(in srgb, var(--t-sb-mu) 18%, transparent)',
                          boxShadow: active ? `0 8px 20px color-mix(in srgb, ${color} 34%, transparent)` : 'none',
                          transition: 'all 0.2s ease',
                        }}>
                        <Icon style={{ width: 20, height: 20, color: active ? color : 'var(--t-sb-mu)' }} />
                      </Link>
                    );
                  }

                  return (
                    <Link key={href} href={href}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 11,
                        padding: '9px 11px',
                        borderRadius: 15,
                        textDecoration: 'none',
                        background: active
                          ? `linear-gradient(135deg, color-mix(in srgb, ${color} 16%, var(--t-sb-act)) 0%, color-mix(in srgb, ${color} 8%, var(--t-sb-hov)) 100%)`
                          : 'transparent',
                        border: active
                          ? '1px solid var(--t-sb-act-brd)'
                          : '1px solid color-mix(in srgb, var(--t-sb-mu) 14%, transparent)',
                        boxShadow: active ? `0 10px 24px color-mix(in srgb, ${color} 22%, transparent)` : 'none',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                      }}
                      onMouseEnter={e => {
                        if (!active) {
                          const el = e.currentTarget as HTMLElement;
                          el.style.background = 'var(--t-sb-hov)';
                          el.style.border = '1px solid var(--t-sb-hov-brd)';
                          el.style.transform = 'translateY(-1px)';
                          el.style.boxShadow = '0 8px 18px color-mix(in srgb, var(--t-shadow) 18%, transparent)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!active) {
                          const el = e.currentTarget as HTMLElement;
                          el.style.background = 'transparent';
                          el.style.border = '1px solid color-mix(in srgb, var(--t-sb-mu) 14%, transparent)';
                          el.style.transform = 'translateY(0)';
                          el.style.boxShadow = 'none';
                        }
                      }}
                    >
                      {active && (
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 9,
                          bottom: 9,
                          width: 3,
                          borderRadius: 99,
                          background: `linear-gradient(180deg, ${color} 0%, color-mix(in srgb, ${color} 65%, white) 100%)`,
                          boxShadow: `0 0 10px color-mix(in srgb, ${color} 45%, transparent)`,
                        }} />
                      )}
                      {/* Icon box */}
                      <div style={{
                        width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                        background: active
                          ? `linear-gradient(180deg, color-mix(in srgb, ${color} 30%, transparent) 0%, color-mix(in srgb, ${color} 16%, transparent) 100%)`
                          : 'color-mix(in srgb, var(--t-sb-mu) 13%, transparent)',
                        border: `1px solid ${active ? `color-mix(in srgb, ${color} 48%, transparent)` : 'color-mix(in srgb, var(--t-sb-mu) 26%, transparent)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        boxShadow: active ? `0 0 0 1px color-mix(in srgb, ${color} 18%, transparent), 0 8px 14px color-mix(in srgb, ${color} 22%, transparent)` : 'none',
                      }}>
                        <Icon style={{ width: 16, height: 16, color: active ? color : 'var(--t-sb-mu)', transition: 'color 0.18s' }} />
                      </div>

                      {/* Label + description */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: active ? 800 : 600, color: active ? 'var(--t-sb-tx)' : inactiveNavLabelColor, lineHeight: 1.08, transition: 'color 0.18s', letterSpacing: active ? '0.01em' : '0' }}>{label}</p>
                        <p style={{ fontSize: 10.5, color: active ? 'color-mix(in srgb, var(--t-sb-tx) 74%, transparent)' : inactiveNavDescriptionColor, marginTop: 2, lineHeight: 1.25 }}>{description}</p>
                      </div>

                      {/* Active indicator */}
                      {active && (
                        <div style={{ width: 20, height: 20, borderRadius: 999, background: `color-mix(in srgb, ${color} 16%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <ChevronRight style={{ width: 12, height: 12, color }} />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* ── SIGN OUT ── */}
            <div style={{
              padding: collapsed ? '8px 10px 10px' : '8px 10px 10px',
              borderTop: '1px solid color-mix(in srgb, var(--t-brd) 40%, transparent)',
              marginTop: 'auto',
              marginBottom: 0,
              flexShrink: 0,
            }}>
              <button type="button" onClick={handleLogout}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: 10,
                  padding: collapsed ? '12px' : '12px 14px',
                  borderRadius: 14,
                  background: 'color-mix(in srgb, var(--t-danger) 18%, rgba(0,0,0,0.10))',
                  border: '1px solid color-mix(in srgb, var(--t-danger) 34%, rgba(255,255,255,0.20))',
                  color: 'var(--t-sb-tx)', cursor: 'pointer',
                  fontSize: 16, fontWeight: 700,
                  boxShadow: '0 0 0 1px color-mix(in srgb, var(--t-danger) 12%, transparent), 0 6px 14px color-mix(in srgb, var(--t-danger) 14%, transparent)',
                  transition: 'all 0.15s',
                }}
                title="Sign out">
                <LogOut style={{ width: 18, height: 18, flexShrink: 0 }} />
                {!collapsed && <span>Sign out</span>}
              </button>
            </div>

          </div>
        </aside>

        {/* ─── MAIN CONTENT ─── */}
        <div className={`min-w-0 flex-1 ${collapsed ? 'sidebar-offset-collapsed' : 'sidebar-offset'}`}>
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
              <LevelUpPopup />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
