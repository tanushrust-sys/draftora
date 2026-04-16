import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import type { AccountType, Database, Profile } from '@/app/types/database';
import { resolveAccountType } from '@/app/lib/account-type';
import { normalizeTeacherSubscriptionPlan } from '@/app/lib/teacher-subscription';

const adminSupabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type RouteAuthResult = {
  userId: string;
  profile: Profile;
};

type RouteAuthSuccess = {
  auth: RouteAuthResult;
  adminSupabase: typeof adminSupabase;
};

function getBearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || '';
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
}

export async function requireRouteAuth(
  request: NextRequest,
  allowedRoles?: AccountType[],
): Promise<RouteAuthSuccess | { error: string; status: 401 | 403 | 404 }> {
  const token = getBearerToken(request);
  if (!token) {
    return { error: 'Missing authorization token.', status: 401 as const };
  }

  const { data: userData, error: userError } = await adminSupabase.auth.getUser(token);
  const user = userData.user ?? null;
  if (userError || !user) {
    return { error: 'Invalid session.', status: 401 as const };
  }

  const { data: profile, error: profileError } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: 'Profile not found.', status: 404 as const };
  }

  const typedProfile = profile as Profile;

  if ('deleted_at' in typedProfile && typedProfile.deleted_at) {
    return { error: 'Profile not found.', status: 404 as const };
  }

  const resolvedAccountType = resolveAccountType(
    typedProfile.account_type,
    user.user_metadata?.account_type ?? null,
  );
  const resolvedPlan = normalizeTeacherSubscriptionPlan(
    typeof user.user_metadata?.plan === 'string' ? user.user_metadata.plan : typedProfile.plan,
  );
  const resolvedProfile = {
    ...typedProfile,
    account_type: resolvedAccountType,
    plan: resolvedPlan,
  } as Profile;

  if (allowedRoles && !allowedRoles.includes(resolvedAccountType)) {
    return { error: 'Not allowed.', status: 403 as const };
  }

  return {
    auth: { userId: user.id, profile: resolvedProfile } satisfies RouteAuthResult,
    adminSupabase,
  } satisfies RouteAuthSuccess;
}

export { adminSupabase };
