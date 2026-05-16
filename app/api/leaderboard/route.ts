import { NextRequest, NextResponse } from 'next/server';
import { requireRouteAuth } from '@/app/lib/server-auth';

type LeaderboardFilter = 'weekly' | 'all_time' | 'suburb';

type LeaderboardRow = {
  userId: string;
  username: string;
  rank: number;
  xp: number;
  streak: number;
  level: number;
  isCurrentUser: boolean;
};

type ProfileLite = {
  id: string;
  username: string | null;
  xp: number | null;
  streak: number | null;
  level: number | null;
  account_type?: string | null;
  deleted_at?: string | null;
  suburb?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  lat?: number | null;
  lng?: number | null;
};

function asProfileLiteArray(value: unknown): ProfileLite[] {
  if (!Array.isArray(value)) return [];
  return value as ProfileLite[];
}

function getWeekStartISO(now = new Date()) {
  const d = new Date(now);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function scoreWeeklyXP(logRows: Array<{ user_id: string; amount: number }>, scopedIds: Set<string>) {
  const totals = new Map<string, number>();
  for (const row of logRows) {
    if (!scopedIds.has(row.user_id)) continue;
    if ((row.amount ?? 0) <= 0) continue;
    totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + (row.amount ?? 0));
  }
  return totals;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function getCoords(profile: ProfileLite): { lat: number; lng: number } | null {
  const lat = asFiniteNumber(profile.latitude ?? profile.lat);
  const lng = asFiniteNumber(profile.longitude ?? profile.lng);
  if (lat === null || lng === null) return null;
  return { lat, lng };
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const aa = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

export async function GET(request: NextRequest) {
  const authResult = await requireRouteAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { auth, adminSupabase } = authResult;
  const userProfile = auth.profile as unknown as ProfileLite;
  const search = request.nextUrl.searchParams;
  const filterParam = search.get('filter');
  const filter: LeaderboardFilter = filterParam === 'weekly' || filterParam === 'all_time' || filterParam === 'suburb'
    ? filterParam
    : 'weekly';

  const effectiveFilter: LeaderboardFilter = filter;

  let supportsAreaColumns = true;
  let allProfilesRaw: ProfileLite[] | null = null;
  let profilesError: { message?: string } | null = null;

  {
    const firstAttempt = await adminSupabase
      .from('profiles')
      .select('id, username, xp, streak, level, account_type, deleted_at, suburb, country, latitude, longitude, lat, lng');

    if (firstAttempt.error && firstAttempt.error.message?.toLowerCase().includes('column')) {
      supportsAreaColumns = false;
      const retry = await adminSupabase
        .from('profiles')
        .select('id, username, xp, streak, level, account_type, deleted_at');
      allProfilesRaw = asProfileLiteArray(retry.data);
      profilesError = retry.error as { message?: string } | null;
    } else {
      allProfilesRaw = asProfileLiteArray(firstAttempt.data);
      profilesError = firstAttempt.error as { message?: string } | null;
    }
  }

  if (profilesError) {
    return NextResponse.json({ error: 'Could not load leaderboard profiles.' }, { status: 500 });
  }

  const allProfiles = asProfileLiteArray(allProfilesRaw).filter((profile) => {
    if (!profile || !profile.id) return false;
    if (profile.deleted_at) return false;
    if (profile.account_type === 'teacher' || profile.account_type === 'parent') return false;
    return true;
  });

  const myProfile = allProfiles.find((profile) => profile.id === auth.userId) ?? userProfile;
  const myCoords = getCoords(myProfile);
  const areaRadiusKm = 5;

  const scopedProfiles = allProfiles.filter((profile) => {
    if (effectiveFilter !== 'suburb') {
      return true;
    }

    if (!supportsAreaColumns || !myCoords) {
      return false;
    }

    const targetCoords = getCoords(profile);
    if (!targetCoords) return false;
    return distanceKm(myCoords, targetCoords) <= areaRadiusKm;
  });

  const scopedIds = new Set(scopedProfiles.map((profile) => profile.id));
  const weekStartISO = getWeekStartISO();

  let rows: LeaderboardRow[] = [];
  let currentUserWeeklyXp = 0;

  if (effectiveFilter === 'weekly') {
    const { data: weeklyLogRaw, error: weeklyError } = await adminSupabase
      .from('xp_log')
      .select('user_id, amount')
      .gt('amount', 0)
      .gte('created_at', weekStartISO);

    if (weeklyError) {
      return NextResponse.json({ error: 'Could not load weekly leaderboard.' }, { status: 500 });
    }

    const weeklyTotals = scoreWeeklyXP((weeklyLogRaw ?? []) as Array<{ user_id: string; amount: number }>, scopedIds);
    currentUserWeeklyXp = weeklyTotals.get(auth.userId) ?? 0;

    rows = scopedProfiles.map((profile) => ({
      userId: profile.id,
      username: profile.username?.trim() || 'Anonymous Writer',
      rank: 0,
      xp: weeklyTotals.get(profile.id) ?? 0,
      streak: profile.streak ?? 0,
      level: profile.level ?? 1,
      isCurrentUser: profile.id === auth.userId,
    }));
  } else {
    const { data: myWeeklyRaw } = await adminSupabase
      .from('xp_log')
      .select('amount')
      .eq('user_id', auth.userId)
      .gt('amount', 0)
      .gte('created_at', weekStartISO);
    currentUserWeeklyXp = ((myWeeklyRaw ?? []) as Array<{ amount: number }>).reduce((sum, row) => sum + (row.amount ?? 0), 0);

    const { data: allTimeRaw, error: allTimeError } = await adminSupabase
      .from('xp_log')
      .select('user_id, amount')
      .gt('amount', 0);
    if (allTimeError) {
      return NextResponse.json({ error: 'Could not load all-time leaderboard.' }, { status: 500 });
    }
    const allTimeTotals = scoreWeeklyXP((allTimeRaw ?? []) as Array<{ user_id: string; amount: number }>, scopedIds);

    rows = scopedProfiles.map((profile) => ({
      userId: profile.id,
      username: profile.username?.trim() || 'Anonymous Writer',
      rank: 0,
      xp: allTimeTotals.get(profile.id) ?? 0,
      streak: profile.streak ?? 0,
      level: profile.level ?? 1,
      isCurrentUser: profile.id === auth.userId,
    }));
  }

  rows.sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp;
    if (b.level !== a.level) return b.level - a.level;
    if (b.streak !== a.streak) return b.streak - a.streak;
    return a.username.localeCompare(b.username);
  });

  rows = rows.map((row, index) => ({ ...row, rank: index + 1 }));

  const top50 = rows.slice(0, 50);
  const currentUserRow = rows.find((row) => row.userId === auth.userId) ?? null;
  const currentUserInTop50 = !!currentUserRow && currentUserRow.rank <= 50;

  const scopeLabel =
    effectiveFilter === 'suburb'
      ? 'Your Area (5km)'
      : effectiveFilter === 'all_time'
        ? 'All Time'
        : 'Weekly';

  return NextResponse.json({
    filter: effectiveFilter,
    requestedFilter: filter,
    scopeLabel,
    weekStartISO,
    currentUserWeeklyXp,
    top: top50,
    currentUser: currentUserRow,
    currentUserInTop50,
  });
}
