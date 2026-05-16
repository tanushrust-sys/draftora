import { NextRequest, NextResponse } from 'next/server';
import { requireRouteAuth } from '@/app/lib/server-auth';

type ProfileLite = {
  id: string;
  deleted_at?: string | null;
  suburb?: string | null;
  country?: string | null;
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

function normalizeScopeValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(request: NextRequest) {
  const authResult = await requireRouteAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { auth, adminSupabase } = authResult;
  const me = auth.profile as unknown as ProfileLite;
  const userSuburb = normalizeScopeValue(me.suburb);
  const weekStartISO = getWeekStartISO();

  let supportsLocationColumns = true;
  let profileRows: ProfileLite[] | null = null;
  let profileError: { message?: string } | null = null;

  {
    const firstAttempt = await adminSupabase
      .from('profiles')
      .select('id, deleted_at, suburb, country');

    if (firstAttempt.error && firstAttempt.error.message?.toLowerCase().includes('column')) {
      supportsLocationColumns = false;
      const retry = await adminSupabase
        .from('profiles')
        .select('id, deleted_at');
      profileRows = asProfileLiteArray(retry.data);
      profileError = retry.error as { message?: string } | null;
    } else {
      profileRows = asProfileLiteArray(firstAttempt.data);
      profileError = firstAttempt.error as { message?: string } | null;
    }
  }

  if (profileError) {
    return NextResponse.json({ error: 'Could not load leaderboard summary.' }, { status: 500 });
  }

  const profiles = asProfileLiteArray(profileRows).filter((profile) => !profile.deleted_at);

  const { data: weeklyRows, error: weeklyError } = await adminSupabase
    .from('xp_log')
    .select('user_id, amount')
    .gt('amount', 0)
    .gte('created_at', weekStartISO);

  if (weeklyError) {
    return NextResponse.json({ error: 'Could not load weekly leaderboard summary.' }, { status: 500 });
  }

  const weeklyTotals = new Map<string, number>();
  for (const row of (weeklyRows ?? []) as Array<{ user_id: string; amount: number }>) {
    if ((row.amount ?? 0) <= 0) continue;
    weeklyTotals.set(row.user_id, (weeklyTotals.get(row.user_id) ?? 0) + (row.amount ?? 0));
  }

  const { data: allTimeRows, error: allTimeError } = await adminSupabase
    .from('xp_log')
    .select('user_id, amount')
    .gt('amount', 0);

  if (allTimeError) {
    return NextResponse.json({ error: 'Could not load all-time leaderboard summary.' }, { status: 500 });
  }

  const allTimeTotals = new Map<string, number>();
  for (const row of (allTimeRows ?? []) as Array<{ user_id: string; amount: number }>) {
    if ((row.amount ?? 0) <= 0) continue;
    allTimeTotals.set(row.user_id, (allTimeTotals.get(row.user_id) ?? 0) + (row.amount ?? 0));
  }

  const allTimeSorted = profiles
    .map((profile) => ({ id: profile.id, xp: allTimeTotals.get(profile.id) ?? 0 }))
    .sort((a, b) => b.xp - a.xp);
  const allTimeRank = allTimeSorted.findIndex((profile) => profile.id === auth.userId) + 1;

  const suburbProfiles = (supportsLocationColumns && userSuburb)
    ? profiles.filter((profile) => normalizeScopeValue(profile.suburb) === userSuburb)
    : [];
  const suburbSorted = suburbProfiles
    .map((profile) => ({ id: profile.id, xp: allTimeTotals.get(profile.id) ?? 0 }))
    .sort((a, b) => b.xp - a.xp);
  const suburbRank = suburbSorted.findIndex((profile) => profile.id === auth.userId) + 1;

  const weeklySorted = profiles
    .map((profile) => ({ id: profile.id, xp: weeklyTotals.get(profile.id) ?? 0 }))
    .sort((a, b) => b.xp - a.xp);
  const weeklyRank = weeklySorted.findIndex((entry) => entry.id === auth.userId) + 1;
  const weeklyXpEarned = weeklyTotals.get(auth.userId) ?? 0;

  return NextResponse.json({
    weekStartISO,
    suburbLabel: userSuburb,
    countryLabel: null,
    weeklyRank: weeklyRank > 0 ? weeklyRank : null,
    allTimeRank: allTimeRank > 0 ? allTimeRank : null,
    countryRank: null,
    suburbRank: suburbRank > 0 ? suburbRank : null,
    weeklyXpEarned,
  });
}
