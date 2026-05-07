import { NextRequest, NextResponse } from 'next/server';
import { requireRouteAuth } from '@/app/lib/server-auth';
import { getXPProgress } from '@/app/types/database';

export async function GET(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['student']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { adminSupabase } = auth;
  const { userId, profile } = auth.auth;

  try {
    const { data: events, error: eventsError } = await adminSupabase
      .from('reward_events')
      .select('id, event_type, event_source, source_ref, xp_awarded, cap_reason, state, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (eventsError) throw eventsError;

    const eventCounts: Record<string, number> = {};
    for (const row of events ?? []) {
      eventCounts[row.event_type] = (eventCounts[row.event_type] ?? 0) + 1;
    }

    const xpProgress = getXPProgress(profile.xp ?? 0);

    return NextResponse.json({
      profileSnapshot: {
        id: profile.id,
        username: profile.username,
        level: profile.level,
        title: profile.title,
      },
      xpProgress,
      streak: {
        current: profile.streak,
        longest: profile.longest_streak,
      },
      recentRewardEvents: (events ?? []).map((event) => ({
        id: event.id,
        eventType: event.event_type,
        eventSource: event.event_source,
        sourceRef: event.source_ref,
        xpAwarded: event.xp_awarded,
        capReason: event.cap_reason,
        state: event.state,
        createdAt: event.created_at,
      })),
      dailyCaps: {
        eventCounts,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load rewards summary.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
