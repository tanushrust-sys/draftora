import { NextRequest, NextResponse } from 'next/server';
import { normalizeFriendshipPair } from '@/app/lib/chat-server';
import { adminSupabase, requireRouteAuth } from '@/app/lib/server-auth';

export async function POST(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['student']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const requestId = String(body.requestId || '').trim();
  const action = body.action === 'accepted' ? 'accepted' : body.action === 'declined' ? 'declined' : null;

  if (!requestId || !action) {
    return NextResponse.json({ error: 'Missing requestId or action.' }, { status: 400 });
  }

  const { data: friendRequest, error } = await adminSupabase
    .from('friend_requests')
    .select('id, requester_id, receiver_id, status')
    .eq('id', requestId)
    .eq('receiver_id', auth.auth.userId)
    .maybeSingle();

  if (error || !friendRequest) {
    return NextResponse.json({ error: 'Friend request not found.' }, { status: 404 });
  }

  if (friendRequest.status !== 'pending') {
    return NextResponse.json({ ok: true });
  }

  const { error: updateError } = await adminSupabase
    .from('friend_requests')
    .update({ status: action, updated_at: new Date().toISOString() })
    .eq('id', friendRequest.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message || 'Could not update friend request.' }, { status: 500 });
  }

  if (action === 'accepted') {
    const pair = normalizeFriendshipPair(friendRequest.requester_id, friendRequest.receiver_id);
    const { data: existing } = await adminSupabase
      .from('friendships')
      .select('id')
      .eq('user_1_id', pair.user1)
      .eq('user_2_id', pair.user2)
      .maybeSingle();

    if (!existing) {
      const { error: insertError } = await adminSupabase.from('friendships').insert({
        user_1_id: pair.user1,
        user_2_id: pair.user2,
      });

      if (insertError) {
        if (insertError.code === '23505' || insertError.message?.includes('friendships_unique_pair_idx')) {
          return NextResponse.json({ ok: true });
        }
        return NextResponse.json({ error: insertError.message || 'Could not create friendship.' }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
