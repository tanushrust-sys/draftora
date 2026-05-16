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
  deleted_at?: string | null;
  suburb?: string | null;
  country?: string | null;
};

function getWeekStartISO(now = new Date()) {
  const d = new Date(now);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function normalizeScopeValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

  const userSuburb = normalizeScopeValue(userProfile.suburb);
  const effectiveFilter: LeaderboardFilter =
    filter === 'suburb' && !userSuburb
      ? 'weekly'
      : filter;

  let supportsLocationColumns = true;
  let allProfilesRaw: ProfileLite[] | null = null;
  let profilesError: { message?: string } | null = null;

  {
    const firstAttempt = await adminSupabase
      .from('profiles')
      .select('id, username, xp, streak, level, deleted_at, suburb, country');

    if (firstAttempt.error && firstAttempt.error.message?.toLowerCase().includes('column')) {
      supportsLocationColumns = false;
      const retry = await adminSupabase
        .from('profiles')
        .select('id, username, xp, streak, level, deleted_at');
      allProfilesRaw = (retry.data ?? []) as ProfileLite[];
      profilesError = retry.error as { message?: string } | null;
    } else {
      allProfilesRaw = (firstAttempt.data ?? []) as ProfileLite[];
      profilesError = firstAttempt.error as { message?: string } | null;
    }
  }

  if (profilesError) {
    return NextResponse.json({ error: 'Could not load leaderboard profiles.' }, { status: 500 });
  }

  const allProfiles = ((allProfilesRaw ?? []) as ProfileLite[]).filter((profile) => {
    if (!profile || !profile.id) return false;
    if (profile.deleted_at) return false;
    return true;
  });

  const scopedProfiles = allProfiles.filter((profile) => {
    if (!supportsLocationColumns && effectiveFilter === 'suburb') {
      return true;
    }
    if (effectiveFilter === 'suburb') {
      return normalizeScopeValue(profile.suburb) === userSuburb;
    }
    return true;
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
      ? (supportsLocationColumns ? (userSuburb ?? 'Your Area') : 'Weekly')
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
