import { NextRequest, NextResponse } from 'next/server';
import { requireRouteAuth } from '@/app/lib/server-auth';

type ProfileLite = {
  id: string;
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
  const me = auth.profile as unknown as ProfileLite;
  const weekStartISO = getWeekStartISO();

  let supportsAreaColumns = true;
  let profileRows: ProfileLite[] | null = null;
  let profileError: { message?: string } | null = null;

  {
    const firstAttempt = await adminSupabase
      .from('profiles')
      .select('id, account_type, deleted_at, suburb, country, latitude, longitude, lat, lng');

    if (firstAttempt.error && firstAttempt.error.message?.toLowerCase().includes('column')) {
      supportsAreaColumns = false;
      const retry = await adminSupabase
        .from('profiles')
        .select('id, account_type, deleted_at');
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

  const profiles = asProfileLiteArray(profileRows).filter((profile) => {
    if (profile.deleted_at) return false;
    if (profile.account_type === 'teacher' || profile.account_type === 'parent') return false;
    return true;
  });
  const meProfile = profiles.find((profile) => profile.id === auth.userId) ?? me;
  const myCoords = getCoords(meProfile);
  const areaRadiusKm = 5;

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

  const suburbProfiles = (supportsAreaColumns && myCoords)
    ? profiles.filter((profile) => {
      const targetCoords = getCoords(profile);
      if (!targetCoords) return false;
      return distanceKm(myCoords, targetCoords) <= areaRadiusKm;
    })
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
    suburbLabel: 'Your Area (5km)',
    countryLabel: null,
    weeklyRank: weeklyRank > 0 ? weeklyRank : null,
    allTimeRank: allTimeRank > 0 ? allTimeRank : null,
    countryRank: null,
    suburbRank: suburbRank > 0 ? suburbRank : null,
    weeklyXpEarned,
  });
}
