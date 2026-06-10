import { NextRequest, NextResponse } from 'next/server';
import { areUsersFriends } from '@/app/lib/chat-server';
import { adminSupabase, requireRouteAuth } from '@/app/lib/server-auth';

export async function POST(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['student']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const receiverId = String(body.receiverId || '').trim();
  if (!receiverId) {
    return NextResponse.json({ error: 'Missing receiverId.' }, { status: 400 });
  }

  if (receiverId === auth.auth.userId) {
    return NextResponse.json({ error: 'You cannot add yourself.' }, { status: 400 });
  }

  const { data: receiver, error: receiverError } = await adminSupabase
    .from('profiles')
    .select('id, account_type, deleted_at')
    .eq('id', receiverId)
    .eq('account_type', 'student')
    .is('deleted_at', null)
    .maybeSingle();

  if (receiverError || !receiver) {
    return NextResponse.json({ error: 'That student could not be found.' }, { status: 404 });
  }

  if (await areUsersFriends(auth.auth.userId, receiverId)) {
    return NextResponse.json({ ok: true });
  }

  const { data: existing, error: existingError } = await adminSupabase
    .from('friend_requests')
    .select('id, status')
    .or(`and(requester_id.eq.${auth.auth.userId},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${auth.auth.userId})`)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message || 'Could not check existing requests.' }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await adminSupabase.from('friend_requests').insert({
    requester_id: auth.auth.userId,
    receiver_id: receiverId,
    status: 'pending',
  });

  if (error) {
    if (error.code === '23505' || error.message?.includes('friend_requests_pending_unique_idx')) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: error.message || 'Could not send friend request.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
