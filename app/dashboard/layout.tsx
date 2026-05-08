'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowRight,
  Bot,
  Clock3,
  ChevronRight,
  FlaskConical,
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
import RewardToast from '@/app/components/rewards/RewardToast';
import XpProgressBar from '@/app/components/rewards/XpProgressBar';
import EquippedFireIcon from '@/app/components/rewards/EquippedFireIcon';
import { clearAccountTypeOverride } from '@/app/lib/account-type';
import { getAccountHomePath } from '@/app/lib/account-type';
import BrandLogo from '@/app/components/BrandLogo';
import { awardRewardEvent, createIdempotencyKey, getLocalDateKey, REWARD_AWARDED_EVENT, type RewardAwardResponse, updateStreak } from '@/app/lib/xp';
import { STREAK_UP_GIF } from '@/app/lib/reaction-gifs';
import { endPracticeSessionKeepalive } from '@/app/lib/practice-session-client';
import { trackEvent } from '@/app/lib/analytics';
import { CATEGORY_LABELS, COSMETIC_CATEGORIES, type CosmeticCategory } from '@/app/lib/rewards/catalog';
import { EquippedCosmeticsProvider, type EquippedCosmeticItem } from '@/app/context/EquippedCosmeticsContext';
import { isPrismAccessory } from '@/app/lib/rewards/prism';
import PrismWearableCrown from '@/app/components/rewards/PrismWearableCrown';

function PrismNameAccessory({ rarity }: { rarity: NonNullable<EquippedCosmeticItem['rarity']> }) {
  const spec = {
    common: {
      label: 'PRISM',
      ring: 'rgba(59, 130, 246, 0.5)',
      glow: 'rgba(59, 130, 246, 0.22)',
      gem: 'linear-gradient(145deg, #e0f2fe 0%, #93c5fd 40%, #60a5fa 100%)',
      aura: 'radial-gradient(circle at 50% 35%, rgba(147, 197, 253, 0.55) 0%, rgba(147, 197, 253, 0) 72%)',
    },
    rare: {
      label: 'PRISM+',
      ring: 'rgba(6, 182, 212, 0.55)',
      glow: 'rgba(14, 165, 233, 0.26)',
      gem: 'linear-gradient(145deg, #cffafe 0%, #67e8f9 44%, #06b6d4 100%)',
      aura: 'radial-gradient(circle at 50% 35%, rgba(34, 211, 238, 0.6) 0%, rgba(34, 211, 238, 0) 74%)',
    },
    epic: {
      label: 'PRISM★',
      ring: 'rgba(192, 132, 252, 0.62)',
      glow: 'rgba(168, 85, 247, 0.32)',
      gem: 'linear-gradient(145deg, #fae8ff 0%, #d8b4fe 46%, #a855f7 100%)',
      aura: 'radial-gradient(circle at 50% 35%, rgba(216, 180, 254, 0.68) 0%, rgba(216, 180, 254, 0) 76%)',
    },
    legendary: {
      label: 'PRISM∞',
      ring: 'rgba(251, 146, 60, 0.72)',
      glow: 'rgba(245, 158, 11, 0.36)',
      gem: 'conic-gradient(from 220deg, #22d3ee, #60a5fa, #a855f7, #f472b6, #f59e0b, #22d3ee)',
      aura: 'radial-gradient(circle at 50% 35%, rgba(251, 146, 60, 0.78) 0%, rgba(251, 146, 60, 0) 78%)',
    },
  }[rarity];

  return (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: 0,
        top: -14,
        height: 18,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 9px 0 7px',
        borderRadius: 999,
        border: `1px solid ${spec.ring}`,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.62) 100%)',
        boxShadow: `0 12px 26px ${spec.glow}, inset 0 1px 0 rgba(255,255,255,0.75)`,
        backdropFilter: 'blur(8px) saturate(1.1)',
        WebkitBackdropFilter: 'blur(8px) saturate(1.1)',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {(rarity === 'epic' || rarity === 'legendary') ? <span className={`prism-rim prism-rim--${rarity}`} /> : null}
      <span
        className={`prism-gem prism-gem--${rarity}`}
        style={{
          position: 'relative',
          width: 12,
          height: 12,
          borderRadius: 4,
          transform: 'rotate(14deg)',
          background: spec.gem,
          boxShadow: `0 0 0 1px ${spec.ring}, 0 12px 22px ${spec.glow}`,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <span style={{ position: 'absolute', inset: -10, background: spec.aura, opacity: 0.9 }} />
        <span className="prism-facet prism-facet--a" />
        <span className="prism-facet prism-facet--b" />
        <span className="prism-facet prism-facet--c" />
        <span className="prism-cut" />
        {(rarity === 'epic' || rarity === 'legendary') ? <span className="prism-shine" /> : null}
        {rarity === 'legendary' ? <span className="prism-aurora" /> : null}
      </span>
      <span style={{ fontSize: 9.2, fontWeight: 950, letterSpacing: '0.12em', color: 'rgba(15, 23, 42, 0.78)' }}>
        {spec.label}
      </span>
      {rarity === 'legendary' ? (
        <>
          <span className="prism-orbit prism-orbit--a" />
          <span className="prism-orbit prism-orbit--b" />
          <span className="prism-spark prism-spark--1" />
          <span className="prism-spark prism-spark--2" />
          <span className="prism-spark prism-spark--3" />
        </>
      ) : null}
      <style jsx>{`
        .prism-rim {
          position: absolute;
          inset: -2px;
          border-radius: 999px;
          pointer-events: none;
          opacity: 0.65;
          background:
            conic-gradient(
              from 220deg,
              rgba(34,211,238,0.0),
              rgba(34,211,238,0.45),
              rgba(96,165,250,0.35),
              rgba(168,85,247,0.42),
              rgba(244,114,182,0.28),
              rgba(245,158,11,0.38),
              rgba(34,211,238,0.0)
            );
          filter: blur(6px);
          mix-blend-mode: screen;
          animation: prism-rim 6.5s linear infinite;
        }

        .prism-rim--epic {
          opacity: 0.5;
          filter: blur(7px);
          animation-duration: 9s;
        }

        @keyframes prism-rim {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .prism-gem {
          clip-path: polygon(50% 0%, 92% 18%, 100% 52%, 84% 92%, 50% 100%, 16% 92%, 0% 52%, 8% 18%);
        }

        .prism-gem::before {
          content: '';
          position: absolute;
          inset: -6px;
          background: conic-gradient(from 200deg, rgba(255,255,255,0.0), rgba(255,255,255,0.7), rgba(255,255,255,0.0));
          opacity: 0.22;
          filter: blur(6px);
          animation: prism-spin 4.6s linear infinite;
          pointer-events: none;
        }

        .prism-facet {
          position: absolute;
          inset: -2px;
          opacity: 0.95;
          pointer-events: none;
        }

        .prism-facet--a {
          background: linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 48%);
          clip-path: polygon(0 0, 68% 0, 35% 55%, 0 38%);
        }

        .prism-facet--b {
          background: linear-gradient(225deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 56%);
          clip-path: polygon(100% 0, 100% 70%, 58% 48%, 72% 12%);
          mix-blend-mode: screen;
        }

        .prism-facet--c {
          background: radial-gradient(circle at 40% 70%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 62%);
          clip-path: polygon(18% 72%, 52% 100%, 0 100%);
          opacity: 0.75;
        }

        .prism-cut {
          position: absolute;
          inset: 1px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.42);
          clip-path: inherit;
          opacity: 0.55;
        }

        .prism-shine {
          position: absolute;
          inset: -4px;
          background: linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.88) 44%, transparent 74%);
          opacity: 0.6;
          transform: translateX(-140%);
          animation: prism-shine 2.4s ease-in-out infinite;
        }

        .prism-aurora {
          position: absolute;
          inset: -10px;
          background: conic-gradient(from 210deg, rgba(34,211,238,0.0), rgba(34,211,238,0.28), rgba(168,85,247,0.26), rgba(244,114,182,0.22), rgba(245,158,11,0.26), rgba(34,211,238,0.0));
          filter: blur(7px);
          opacity: 0.75;
          animation: prism-spin 4.2s linear infinite;
          mix-blend-mode: screen;
        }

        @keyframes prism-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes prism-shine {
          0% { transform: translateX(-140%); opacity: 0; }
          28% { opacity: 0.6; }
          55% { opacity: 0.35; }
          100% { transform: translateX(140%); opacity: 0; }
        }

        .prism-orbit {
          position: absolute;
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 0 10px rgba(251, 146, 60, 0.55);
          opacity: 0.8;
          animation: prism-orbit 2.4s linear infinite;
        }
        .prism-orbit--a {
          right: 6px;
          top: -3px;
          animation-duration: 2.4s;
        }
        .prism-orbit--b {
          right: 18px;
          top: 14px;
          width: 3px;
          height: 3px;
          opacity: 0.7;
          animation-duration: 3.2s;
          animation-direction: reverse;
        }
        @keyframes prism-orbit {
          0% { transform: translate3d(0,0,0) scale(0.85); opacity: 0.35; }
          30% { opacity: 0.85; }
          60% { opacity: 0.55; }
          100% { transform: translate3d(-10px,2px,0) scale(1.05); opacity: 0.25; }
        }

        .prism-spark {
          position: absolute;
          width: 2px;
          height: 2px;
          border-radius: 999px;
          background: rgba(255,255,255,0.95);
          box-shadow: 0 0 12px rgba(34,211,238,0.45), 0 0 18px rgba(168,85,247,0.38);
          opacity: 0;
          animation: prism-spark 2.8s ease-in-out infinite;
          pointer-events: none;
        }

        .prism-spark--1 { left: 34px; top: -2px; animation-delay: -0.2s; }
        .prism-spark--2 { left: 58px; top: 15px; animation-delay: -1.1s; }
        .prism-spark--3 { left: 14px; top: 12px; animation-delay: -1.8s; }

        @keyframes prism-spark {
          0% { transform: scale(0.8); opacity: 0; }
          25% { opacity: 0.9; }
          55% { opacity: 0.35; }
          100% { transform: scale(1.4); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .prism-shine,
          .prism-aurora,
          .prism-orbit,
          .prism-rim,
          .prism-spark {
            animation: none !important;
          }
        }
      `}</style>
    </span>
  );
}

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

type RewardToastEntry = {
  id: string;
  title: string;
  subtitle: string;
  xp: number;
  levelUpTitle?: string | null;
  streakMilestone?: number | null;
};

type EquippedCosmeticsResponse = {
  equippedByCategory: Record<CosmeticCategory, string | null>;
  equippedItemsByCategory: Record<CosmeticCategory, EquippedCosmeticItem | null>;
};

const COSMETICS_UPDATED_EVENT = 'draftora:cosmetics-updated';

function createEmptyEquippedItemsByCategory() {
  return COSMETIC_CATEGORIES.reduce((acc, category) => {
    acc[category] = null;
    return acc;
  }, {} as Record<CosmeticCategory, EquippedCosmeticItem | null>);
}

function getRewardToastTitle(eventType: RewardAwardResponse['eventType']) {
  if (eventType === 'writing_submit') return 'Writing Reward';
  if (eventType === 'ai_feedback_received') return 'Feedback Reward';
  if (eventType === 'vocab_sentence_success') return 'Vocab Sentence Reward';
  if (eventType === 'vocab_drill_completed') return 'Drill Complete Reward';
  if (eventType === 'vocab_test_completed') return 'Weekly Test Reward';
  if (eventType === 'vocab_mastered') return 'Word Mastered Reward';
  if (eventType === 'daily_goal_met') return 'Daily Goal Reward';
  if (eventType === 'streak_checkin') return 'Streak Progress';
  return 'Reward Earned';
}

function formatRewardSubtitle(payload: RewardAwardResponse) {
  if (payload.celebrations.levelUp) {
    return `Level ${payload.celebrations.levelUp.toLevel} reached`;
  }
  if (payload.celebrations.streakMilestone) {
    return `${payload.celebrations.streakMilestone.streak}-day streak milestone`;
  }
  if (payload.cap.applied && payload.cap.reason) {
    return payload.cap.reason.replace(/_/g, ' ');
  }
  return 'Progress saved instantly';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, session, profile, isPracticeMode, loading, refreshProfile } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const hasAuthContext = Boolean(user || profile);
  const isPublicDashboardRoute = pathname === '/dashboard';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLargeViewport, setIsLargeViewport] = useState(false);
  const [streakGifPopup, setStreakGifPopup] = useState<{ streak: number } | null>(null);
  const streakGifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rewardToasts, setRewardToasts] = useState<RewardToastEntry[]>([]);
  const [equippedItemsByCategory, setEquippedItemsByCategory] = useState<Record<CosmeticCategory, EquippedCosmeticItem | null>>(
    () => createEmptyEquippedItemsByCategory(),
  );
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

  const fetchEquippedCosmetics = useCallback(async () => {
    if (!profile?.id || !session?.access_token) {
      setEquippedItemsByCategory(createEmptyEquippedItemsByCategory());
      return;
    }

    try {
      const response = await fetch('/api/inventory/equipped', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = await response.json().catch(() => ({} as { error?: string }));
      if (!response.ok) {
        throw new Error(payload.error || `Equipped cosmetic fetch failed (${response.status})`);
      }
      const next = payload as EquippedCosmeticsResponse;
      setEquippedItemsByCategory({
        ...createEmptyEquippedItemsByCategory(),
        ...(next.equippedItemsByCategory ?? {}),
      });
    } catch (error) {
      console.error('Failed to fetch equipped cosmetics:', error);
    }
  }, [profile?.id, session?.access_token]);

  useEffect(() => {
    if (!loading && !hasAuthContext && !isPublicDashboardRoute) router.replace('/login');
  }, [hasAuthContext, isPublicDashboardRoute, loading, router]);

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

  useEffect(() => {
    if (loading || !profile?.id || profile.account_type !== 'student') return;
    if (typeof window === 'undefined') return;

    const today = getLocalDateKey();
    const checkInKey = `draftora:streak-checkin:${profile.id}`;
    const lastCheckIn = window.localStorage.getItem(checkInKey);
    if (lastCheckIn === today) return;

    window.localStorage.setItem(checkInKey, today);
    const previousStreak = profile.streak ?? 0;
    const yesterday = getLocalDateKey(new Date(Date.now() - 86400000));

    void (async () => {
      let nextStreak: number | undefined;
      try {
        if (!session?.access_token) throw new Error('Missing session token.');
        const reward = await awardRewardEvent({
          token: session.access_token,
          eventType: 'streak_checkin',
          idempotencyKey: createIdempotencyKey(['streak-checkin', profile.id, today]),
          sourceRef: today,
          metadata: {
            localDate: today,
            yesterdayDate: yesterday,
          },
          eventSource: 'dashboard-layout',
        });
        nextStreak = reward.balances.streak;
      } catch (rewardError) {
        console.error('streak_checkin reward call failed, using legacy fallback:', rewardError);
        nextStreak = await updateStreak(profile.id);
      }

      if (typeof nextStreak === 'number' && nextStreak > previousStreak) {
        setStreakGifPopup({ streak: nextStreak });
        if (streakGifTimerRef.current) clearTimeout(streakGifTimerRef.current);
        streakGifTimerRef.current = setTimeout(() => {
          setStreakGifPopup(null);
          streakGifTimerRef.current = null;
        }, 6500);
      }
      await refreshProfile();
    })();
  }, [loading, profile?.account_type, profile?.id, profile?.streak, refreshProfile, session?.access_token]);

  useEffect(() => {
    return () => {
      if (streakGifTimerRef.current) clearTimeout(streakGifTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!profile?.id || !session?.access_token) {
      setEquippedItemsByCategory(createEmptyEquippedItemsByCategory());
      return;
    }
    void fetchEquippedCosmetics();
  }, [fetchEquippedCosmetics, profile?.id, session?.access_token]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onCosmeticsUpdated = () => {
      void fetchEquippedCosmetics();
    };

    window.addEventListener(COSMETICS_UPDATED_EVENT, onCosmeticsUpdated);
    return () => {
      window.removeEventListener(COSMETICS_UPDATED_EVENT, onCosmeticsUpdated);
    };
  }, [fetchEquippedCosmetics]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onRewardAwarded = (event: Event) => {
      const custom = event as CustomEvent<RewardAwardResponse>;
      const payload = custom.detail;
      if (!payload || typeof payload !== 'object') return;

      const xp = Math.max(0, payload.deltas?.xp ?? 0);
      if (xp <= 0 && !payload.celebrations?.levelUp && !payload.celebrations?.streakMilestone) {
        return;
      }

      const toast: RewardToastEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title: getRewardToastTitle(payload.eventType),
        subtitle: formatRewardSubtitle(payload),
        xp,
        levelUpTitle: payload.celebrations?.levelUp?.title ?? null,
        streakMilestone: payload.celebrations?.streakMilestone?.streak ?? null,
      };

      setRewardToasts((prev) => [toast, ...prev].slice(0, 4));
      trackEvent('reward_toast_seen', {
        event_type: payload.eventType,
        xp_delta: xp,
        position_in_queue: 0,
        is_practice: isPracticeMode,
      });

      trackEvent('reward_awarded', {
        event_type: payload.eventType,
        xp_delta: xp,
        idempotent_replay: payload.idempotentReplay,
        cap_applied: payload.cap.applied,
        is_practice: payload.practiceMode,
        level_after: payload.balances.level,
      });

      if (payload.celebrations.levelUp) {
        trackEvent('level_up', {
          from_level: payload.celebrations.levelUp.fromLevel,
          to_level: payload.celebrations.levelUp.toLevel,
          title: payload.celebrations.levelUp.title,
          trigger_event_type: payload.eventType,
          is_practice: payload.practiceMode,
        });
      }

      if (payload.eventType === 'streak_checkin') {
        trackEvent('streak_extended', {
          streak: payload.balances.streak,
          longest_streak: payload.balances.longestStreak,
          milestone_hit: payload.celebrations.streakMilestone?.streak ?? null,
          is_practice: payload.practiceMode,
        });
      }

    };

    window.addEventListener(REWARD_AWARDED_EVENT, onRewardAwarded as EventListener);
    return () => {
      window.removeEventListener(REWARD_AWARDED_EVENT, onRewardAwarded as EventListener);
    };
  }, [isPracticeMode]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    if (!streakGifPopup) return;
    const timer = window.setTimeout(() => setStreakGifPopup(null), 7000);
    return () => window.clearTimeout(timer);
  }, [streakGifPopup]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 1280px)');
    const apply = () => setIsLargeViewport(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!isLargeViewport) setSidebarOpen(false);
  }, [isLargeViewport]);

  const handleLogout = async () => {
    try { localStorage.removeItem('draftora-profile-v1'); } catch {}
    if (profile?.id) {
      clearAccountTypeOverride(profile.id);
    }
    if (isPracticeMode && session?.access_token) {
      void endPracticeSessionKeepalive(session.access_token, 'manual-signout');
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
  const effectiveCollapsed = isLargeViewport ? collapsed : false;
  const themeAccent = 'var(--t-acc)';
  const isSunsetTheme = profile?.active_theme === 'sunset-glow';
	  const equippedBadge = equippedItemsByCategory.badges;
	  const equippedFrame = equippedItemsByCategory.profile_frames;
	  const equippedStreakEffect = equippedItemsByCategory.streak_effects;
	  const equippedXpVisual = equippedItemsByCategory.xp_visuals;
	  const hasPrismFrame = isPrismAccessory(equippedFrame);
  const rarityAccentByName: Record<NonNullable<EquippedCosmeticItem['rarity']>, string> = {
    common: 'var(--t-acc)',
    rare: '#0ea5a6',
    epic: '#7c3aed',
    legendary: '#d97706',
  };
  const frameAccent = equippedFrame ? rarityAccentByName[equippedFrame.rarity] : 'var(--t-acc)';
  const badgeAccent = equippedBadge ? rarityAccentByName[equippedBadge.rarity] : 'var(--t-acc)';
  const badgeIconByRarity: Record<NonNullable<EquippedCosmeticItem['rarity']>, string> = {
    common: '★',
    rare: '✦',
    epic: '✶',
    legendary: '✹',
  };
  const streakBadgeStyle = equippedStreakEffect
    ? {
        background: 'linear-gradient(180deg, rgba(251, 146, 60, 0.18) 0%, rgba(249, 115, 22, 0.08) 100%)',
        border: '1px solid rgba(249, 115, 22, 0.28)',
        boxShadow: '0 0 16px rgba(251, 146, 60, 0.25)',
      }
    : {
        background: 'color-mix(in srgb, var(--t-tx3) 12%, transparent)',
        border: '1px solid color-mix(in srgb, var(--t-tx3) 20%, transparent)',
      };
  const streakBadgeTextColor = equippedStreakEffect
    ? '#92400e'
    : 'var(--t-tx3)';
  const inactiveNavLabelColor = isSunsetTheme
    ? 'rgba(255,255,255,0.94)'
    : 'color-mix(in srgb, var(--t-sb-mu) 95%, white 5%)';
  const inactiveNavDescriptionColor = isSunsetTheme
    ? 'rgba(255,255,255,0.74)'
    : 'color-mix(in srgb, var(--t-sb-mu) 72%, transparent)';
  const dismissRewardToast = useCallback((id: string) => {
    setRewardToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

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

  if (!hasAuthContext && isPublicDashboardRoute) {
    return (
      <div className="app-frame min-h-screen" style={{ background: 'radial-gradient(circle at top, color-mix(in srgb, var(--t-acc) 10%, transparent) 0%, transparent 32%), var(--t-bg)' }}>
        <div className="dashboard-main">
          <div className="dashboard-content app-surface">
            <div className="dashboard-topbar">
              <div className="dashboard-topbar__meta">
                <div>
                  <h1>Dashboard</h1>
                  <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Link href="/login" className="dashboard-topbar__badge" style={{ textDecoration: 'none' }}>
                  Log in
                </Link>
                <Link href="/signup" className="dashboard-topbar__badge" style={{ textDecoration: 'none' }}>
                  Create account
                </Link>
              </div>
            </div>
            <main className="theme-main">{children}</main>
          </div>
        </div>
      </div>
    );
  }

  if (!hasAuthContext && !isPublicDashboardRoute) {
    return (
      <div className="app-frame min-h-screen" style={{ display: 'grid', placeItems: 'center' }}>
        <div style={{ color: 'var(--t-tx2)', fontSize: 13, fontWeight: 600 }}>Redirecting to login…</div>
      </div>
    );
  }

  return (
    <EquippedCosmeticsProvider value={{ equippedItemsByCategory }}>
      <div className="app-frame">
      {!isPracticeMode && <OnboardingModal />}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <button type="button" className="fixed inset-0 z-40 xl:hidden"
          style={{ background: 'var(--t-overlay)' }}
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation" />
      )}

      <div className="flex min-h-screen gap-0">

        {/* ─── SIDEBAR ─── */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 xl:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          style={{ width: effectiveCollapsed ? COLLAPSED_W : `min(${SIDEBAR_W}px, 86vw)` }}
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
              padding: effectiveCollapsed ? '14px 0 12px' : '15px 16px',
              borderBottom: '1px solid color-mix(in srgb, var(--t-brd) 40%, transparent)',
              flexShrink: 0,
            }}>
              {effectiveCollapsed ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 13,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 8px 22px color-mix(in srgb, var(--t-acc) 34%, transparent)',
                    }}>
                      <BrandLogo size={40} />
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
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 8px 20px color-mix(in srgb, var(--t-acc) 30%, transparent)',
                    }}>
                      <BrandLogo size={36} />
                    </div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--t-sb-tx)', letterSpacing: '-0.02em', lineHeight: 1 }}>Draftora</p>
                      <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--t-sb-mu)', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: 1.5 }}>Writing Studio</p>
                    </div>
                  </Link>
                  <button type="button"
                    onClick={() => window.innerWidth >= 1280 ? toggleCollapsed() : setSidebarOpen(false)}
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
            {profile && !effectiveCollapsed && (
              <div style={{
                margin: '10px 12px 0',
                borderRadius: 22,
                padding: '11px 11px 10px',
                background: isSunsetTheme
                  ? 'linear-gradient(135deg, #ffd7a6 0%, #ffb980 45%, #ff9963 100%)'
                  : `linear-gradient(140deg, color-mix(in srgb, ${themeAccent} 20%, var(--t-card2)) 0%, color-mix(in srgb, ${themeAccent} 10%, var(--t-card2)) 100%)`,
                border: isSunsetTheme
                  ? '1px solid rgba(199, 68, 47, 0.36)'
                  : `1px solid color-mix(in srgb, ${themeAccent} 26%, var(--t-brd))`,
                boxShadow: isSunsetTheme
                  ? '0 14px 32px rgba(199, 68, 47, 0.2)'
                  : `0 12px 24px color-mix(in srgb, ${themeAccent} 16%, transparent)`,
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
              }}>
                <div style={{ position: 'absolute', top: -34, right: -12, width: 104, height: 104, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 36%)', pointerEvents: 'none' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
                  {/* Avatar */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 15,
                      padding: 3,
                      flexShrink: 0,
                      position: 'relative',
                      overflow: 'visible',
                      background: equippedFrame
                        ? `linear-gradient(145deg, color-mix(in srgb, ${frameAccent} 72%, white 28%) 0%, color-mix(in srgb, ${frameAccent} 46%, var(--t-card2)) 100%)`
                        : 'transparent',
                      boxShadow: equippedFrame
                        ? `0 10px 24px color-mix(in srgb, ${frameAccent} 26%, transparent)`
                        : 'none',
                    }}
                    title={equippedFrame ? `${CATEGORY_LABELS.profile_frames}: ${equippedFrame.name}` : undefined}
                  >
                    {hasPrismFrame && equippedFrame ? <PrismWearableCrown rarity={equippedFrame.rarity} size={44} ageGroup={profile.age_group ?? null} /> : null}
                    <div style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 12,
                      background: isSunsetTheme
                        ? 'linear-gradient(135deg, #ff9a4d, #f15b42)'
                        : `linear-gradient(135deg, var(--t-acc), color-mix(in srgb, var(--t-acc) 60%, white))`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      fontWeight: 900,
                      color: '#fff',
                      boxShadow: isSunsetTheme
                        ? '0 8px 20px rgba(199, 68, 47, 0.30)'
                        : '0 8px 20px color-mix(in srgb, var(--t-acc) 24%, transparent)',
                    }}>
                      {initial}
                    </div>
                  </div>

	                  <div style={{ flex: 1, minWidth: 0 }}>
	                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
	                      <div style={{ position: 'relative', minWidth: 0, flex: 1 }}>
	                        <p style={{ fontSize: 13.8, fontWeight: 860, color: 'var(--t-tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
	                      </div>
	                      {/* Level badge */}
	                      <div style={{
	                        display: 'flex', alignItems: 'center', gap: 3,
                        background: 'color-mix(in srgb, var(--t-acc) 18%, white 82%)',
                        border: '1px solid color-mix(in srgb, var(--t-acc) 32%, transparent)',
                        borderRadius: 99, padding: '2px 8px', flexShrink: 0,
                        boxShadow: '0 4px 10px color-mix(in srgb, var(--t-acc) 14%, transparent)',
                      }}>
                        <Star style={{ width: 9, height: 9, color: 'var(--t-acc)' }} />
                        <span style={{ fontSize: 10.5, fontWeight: 820, color: 'var(--t-acc)' }}>Lv {profile.level}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Title + streak + XP inline */}
                <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
	                  <div style={{
	                    display: 'flex',
	                    alignItems: 'center',
	                    gap: 4,
	                    background: 'color-mix(in srgb, var(--t-acc) 16%, white 84%)',
	                    border: '1px solid color-mix(in srgb, var(--t-acc) 30%, transparent)',
	                    borderRadius: 99,
	                    padding: '3px 9px',
	                    minWidth: 0,
	                  }}>
	                    <Star style={{ width: 10, height: 10, color: 'var(--t-acc)' }} />
	                    <span
	                      style={{
	                        fontSize: 10.3,
	                        fontWeight: 700,
	                        color: 'var(--t-acc)',
	                        maxWidth: 132,
	                        overflow: 'hidden',
	                        textOverflow: 'ellipsis',
	                        whiteSpace: 'nowrap',
	                      }}
	                      title={profile.title}
	                    >
	                      {profile.title}
	                    </span>
	                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    borderRadius: 99,
                    padding: '3px 9px',
                    ...streakBadgeStyle,
                  }}>
                    <EquippedFireIcon size={11} />
                    <span style={{ fontSize: 10.3, fontWeight: 700, color: streakBadgeTextColor }}>{profile.streak} day streak</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: equippedXpVisual
                      ? 'linear-gradient(180deg, rgba(59, 130, 246, 0.18) 0%, rgba(37, 99, 235, 0.08) 100%)'
                      : 'color-mix(in srgb, var(--t-tx3) 12%, transparent)',
                    border: equippedXpVisual
                      ? '1px solid rgba(37, 99, 235, 0.34)'
                      : '1px solid color-mix(in srgb, var(--t-tx3) 20%, transparent)',
                    borderRadius: 99,
                    padding: '3px 9px',
                  }}>
                    <Zap style={{ width: 10, height: 10, color: 'var(--t-tx3)' }} />
                    <span style={{ fontSize: 10.3, fontWeight: 700, color: 'var(--t-tx3)' }}>{profile.xp >= 1000 ? `${(profile.xp / 1000).toFixed(1)}k` : profile.xp} XP</span>
                  </div>
                </div>

                {/* XP bar */}
                {xp && (
                  <div style={{ marginTop: 10, position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 10, color: 'var(--t-tx3)', fontWeight: 500 }}>Level {profile.level} → {profile.level + 1}</span>
                      <span style={{ fontSize: 10, color: 'var(--t-acc)', fontWeight: 700 }}>{Math.round(xp.percent)}%</span>
                    </div>
                    <div style={equippedXpVisual ? { filter: 'drop-shadow(0 0 10px color-mix(in srgb, var(--t-acc) 30%, transparent))' } : undefined}>
                      <XpProgressBar percent={xp.percent} height={equippedXpVisual ? 7 : 5} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── NAV ── */}
            <nav style={{
              flex: '1 1 auto',
              minHeight: 0,
              overflow: 'hidden',
              padding: effectiveCollapsed ? '10px 0 0' : '10px 10px 0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignItems: effectiveCollapsed ? 'center' : 'stretch',
            }}>
              {!effectiveCollapsed && (
                <p style={{ fontSize: 9.5, fontWeight: 800, color: 'color-mix(in srgb, var(--t-sb-mu) 92%, white 8%)', letterSpacing: '0.26em', textTransform: 'uppercase', padding: '4px 8px 10px' }}>Navigate</p>
              )}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                width: '100%',
                alignItems: effectiveCollapsed ? 'center' : 'stretch',
              }}>
                {navLinks.map(({ href, icon: Icon, label, color, description }) => {
                  const active = isNavActive(pathname, href, homeHref);

                  if (effectiveCollapsed) {
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
              padding: effectiveCollapsed ? '8px 10px 10px' : '8px 10px 10px',
              borderTop: '1px solid color-mix(in srgb, var(--t-brd) 40%, transparent)',
              marginTop: 'auto',
              marginBottom: 0,
              flexShrink: 0,
            }}>
              <button type="button" onClick={handleLogout}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                  gap: 10,
                  padding: effectiveCollapsed ? '12px' : '12px 14px',
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
                {!effectiveCollapsed && <span>Sign out</span>}
              </button>
            </div>

          </div>
        </aside>

        {/* ─── MAIN CONTENT ─── */}
        <div className={`min-w-0 flex-1 ${effectiveCollapsed ? 'sidebar-offset-collapsed' : 'sidebar-offset'}`}>
          <div className="dashboard-main">
            <nav className="dashboard-bottomnav xl:hidden" aria-label="Primary navigation">
              {navLinks.map((link) => {
                const active = isNavActive(pathname, link.href, homeHref);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`dashboard-bottomnav__link${active ? ' dashboard-bottomnav__link--active' : ''}`}
                    style={active ? { color: link.color } : undefined}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="dashboard-bottomnav__icon" />
                    <span className="dashboard-bottomnav__label">{link.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="dashboard-content app-surface">
              <div className="dashboard-topbar">
                <div className="dashboard-topbar__meta">
                  <button
                    type="button"
                    className="dashboard-topbar__menu xl:hidden"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="Open navigation"
                  >
                    <Menu className="h-4 w-4" />
                  </button>
                  <div>
                    <h1>{pageTitle}</h1>
                    <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                {profile && (
                  <div className="dashboard-topbar__actions">
                    <div className="dashboard-topbar__badge">
                      <Star className="h-4 w-4" />
                      Level {profile.level}
                    </div>
                    {equippedBadge ? (
                      <div
                        className="dashboard-topbar__badge"
                        style={{
                          borderColor: `color-mix(in srgb, ${badgeAccent} 30%, transparent)`,
                          background: `color-mix(in srgb, ${badgeAccent} 10%, transparent)`,
                          color: badgeAccent,
                          gap: 6,
                        }}
                        title={`${CATEGORY_LABELS.badges}: ${equippedBadge.name}`}
                      >
                        <span style={{
                          width: 18,
                          height: 18,
                          borderRadius: 999,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 900,
                          border: `1px solid color-mix(in srgb, ${badgeAccent} 42%, transparent)`,
                          background: `color-mix(in srgb, ${badgeAccent} 16%, transparent)`,
                        }}>
                          {badgeIconByRarity[equippedBadge.rarity]}
                        </span>
                        <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {equippedBadge.name}
                        </span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              {isPracticeMode && (
                <section className="practice-banner" role="status" aria-live="polite">
                  <div className="practice-banner__tone" aria-hidden="true" />
                  <div className="practice-banner__content">
                    <div className="practice-banner__kicker">
                      <span className="practice-banner__label">
                        <FlaskConical style={{ width: 13, height: 13 }} />
                        Practice Mode
                      </span>
                      <span className="practice-banner__identity">USER</span>
                    </div>
                    <h2 className="practice-banner__title">Temporary workspace active</h2>
                    <p className="practice-banner__copy">
                      Everything works like a real student account, but your drafts reset after the last browser tab closes.
                    </p>
                    <div className="practice-banner__facts">
                      <span>
                        <Clock3 style={{ width: 13, height: 13 }} />
                        Session survives tab switches
                      </span>
                      <span>
                        <Star style={{ width: 13, height: 13 }} />
                        Create an account to keep progress forever
                      </span>
                    </div>
                  </div>
                  <Link href="/signup" className="practice-banner__cta">
                    <span className="practice-banner__cta-icon">
                      <Star style={{ width: 14, height: 14 }} />
                    </span>
                    Create Account To Save Progress
                    <ArrowRight style={{ width: 14, height: 14 }} />
                  </Link>
                </section>
              )}
              <main
                className="theme-main"
              >
                {children}
              </main>
              <LevelUpPopup />
            </div>
          </div>
        </div>
      </div>
      {rewardToasts.length > 0 && (
        <div className="reward-toast-stack">
          {rewardToasts.map((toast) => (
            <RewardToast
              key={toast.id}
              id={toast.id}
              title={toast.title}
              subtitle={toast.subtitle}
              xp={toast.xp}
              levelUpTitle={toast.levelUpTitle}
              streakMilestone={toast.streakMilestone}
              onClose={dismissRewardToast}
            />
          ))}
        </div>
      )}
      {streakGifPopup && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setStreakGifPopup(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 85,
            background: 'rgba(2, 12, 30, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backdropFilter: 'blur(3px)',
          }}
        >
          <button
            type="button"
            onClick={() => setStreakGifPopup(null)}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              width: 36,
              height: 36,
              borderRadius: 12,
              border: '1px solid color-mix(in srgb, white 30%, transparent)',
              background: 'rgba(255,255,255,0.08)',
              color: 'white',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Close streak GIF"
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
          <img
            src={STREAK_UP_GIF}
            alt="Streak up GIF"
            loading="lazy"
            onError={() => setStreakGifPopup(null)}
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(560px, 90vw)',
              height: 'min(560px, 74vh)',
              objectFit: 'cover',
              borderRadius: 18,
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.55)',
              display: 'block',
            }}
          />
        </div>
      )}
      </div>
    </EquippedCosmeticsProvider>
  );
}
