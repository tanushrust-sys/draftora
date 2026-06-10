import { NextRequest, NextResponse } from 'next/server';
import { areUsersFriends } from '@/app/lib/chat-server';
import { adminSupabase, requireRouteAuth } from '@/app/lib/server-auth';

export async function POST(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['student']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const friendId = String(body.friendId || '').trim();
  if (!friendId) {
    return NextResponse.json({ error: 'Missing friendId.' }, { status: 400 });
  }

  if (!(await areUsersFriends(auth.auth.userId, friendId))) {
    return NextResponse.json({ error: 'Friendship required.' }, { status: 403 });
  }

  const { error } = await adminSupabase
    .from('chat_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('sender_id', friendId)
    .eq('receiver_id', auth.auth.userId)
    .is('read_at', null);

  if (error) {
    return NextResponse.json({ error: error.message || 'Could not mark messages as read.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
