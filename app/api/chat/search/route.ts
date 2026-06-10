import { NextRequest, NextResponse } from 'next/server';
import { getFriendRequestsForUser, getFriendshipsForUser } from '@/app/lib/chat-server';
import { adminSupabase, requireRouteAuth } from '@/app/lib/server-auth';

export async function GET(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['student']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const email = request.nextUrl.searchParams.get('email')?.trim().toLowerCase() || '';
  const query = request.nextUrl.searchParams.get('q')?.trim().toLowerCase() || '';
  const term = query || email;
  if (!term) {
    return NextResponse.json(query ? [] : null);
  }

  const isSuggestionMode = Boolean(query);
  const profileQuery = adminSupabase
    .from('profiles')
    .select('id, username, email, title, level, account_type, deleted_at')
    .eq('account_type', 'student')
    .is('deleted_at', null);

  const profileResult = isSuggestionMode
    ? await profileQuery
        .or(`username.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(5)
    : await profileQuery
        .ilike('email', email)
        .maybeSingle();

  if (profileResult.error) {
    return NextResponse.json({ error: profileResult.error.message || 'Could not search users.' }, { status: 500 });
  }

  const profiles = isSuggestionMode
    ? ((profileResult.data ?? []) as Array<{
        id: string;
        username: string;
        email: string;
        title: string;
        level: number;
      }>)
    : profileResult.data
      ? [profileResult.data as {
          id: string;
          username: string;
          email: string;
          title: string;
          level: number;
        }]
      : [];

  if (profiles.length === 0) return NextResponse.json(isSuggestionMode ? [] : null);

  const [friendships, requests] = await Promise.all([
    getFriendshipsForUser(auth.auth.userId),
    getFriendRequestsForUser(auth.auth.userId),
  ]);

  const friendIds = new Set(
    friendships.map((friendship) => friendship.user_1_id === auth.auth.userId ? friendship.user_2_id : friendship.user_1_id),
  );

  const mapped = profiles.map((profile) => {
    if (profile.id === auth.auth.userId) {
      return {
        profile: {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          title: profile.title,
          level: profile.level,
        },
        status: 'self' as const,
        requestId: null,
      };
    }

    const pending = requests.find((request) =>
      (request.requester_id === auth.auth.userId && request.receiver_id === profile.id)
      || (request.receiver_id === auth.auth.userId && request.requester_id === profile.id)
    );

    const alreadyFriends = friendIds.has(profile.id);
    const status = alreadyFriends
      ? 'friends'
      : pending
        ? pending.requester_id === auth.auth.userId ? 'pending_outgoing' : 'pending_incoming'
        : 'addable';

    return {
      profile: {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        title: profile.title,
        level: profile.level,
      },
      status,
      requestId: pending?.id ?? null,
    };
  });

  if (isSuggestionMode) {
    return NextResponse.json(mapped);
  }

  return NextResponse.json(mapped[0] ?? null);
}
