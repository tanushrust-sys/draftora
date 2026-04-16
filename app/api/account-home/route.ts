import { NextRequest, NextResponse } from 'next/server';
import { getAccountHomePath } from '@/app/lib/account-type';
import { requireRouteAuth } from '@/app/lib/server-auth';

export async function GET(request: NextRequest) {
  const auth = await requireRouteAuth(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const accountType = auth.auth.profile.account_type;
  return NextResponse.json({
    accountType,
    homePath: getAccountHomePath(accountType),
  });
}
