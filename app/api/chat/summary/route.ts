import { NextRequest, NextResponse } from 'next/server';
import { getChatSummaryCounts } from '@/app/lib/chat-server';
import { requireRouteAuth } from '@/app/lib/server-auth';

export async function GET(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['student']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const counts = await getChatSummaryCounts(auth.auth.userId);
    return NextResponse.json(counts);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load chat summary.' }, { status: 500 });
  }
}
