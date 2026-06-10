import { NextRequest, NextResponse } from 'next/server';
import { areUsersFriends, getMessagesBetweenFriends } from '@/app/lib/chat-server';
import { moderateChatMessage, normalizeChatMessage } from '@/app/lib/chatModeration';
import { adminSupabase, requireRouteAuth } from '@/app/lib/server-auth';

const RATE_LIMIT_WINDOW_MS = 30_000;
const MAX_MESSAGES_PER_WINDOW = 6;
const DUPLICATE_WINDOW_MS = 120_000;

async function logModerationEvent(userId: string, content: string, reason: string) {
  await adminSupabase.from('moderation_events').insert({
    user_id: userId,
    content,
    reason,
  });
}

export async function GET(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['student']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const friendId = request.nextUrl.searchParams.get('friendId')?.trim() || '';
  if (!friendId) {
    return NextResponse.json({ error: 'Missing friendId.' }, { status: 400 });
  }

  try {
    const isFriend = await areUsersFriends(auth.auth.userId, friendId);
    if (!isFriend) {
      return NextResponse.json({ error: 'You can only view messages with friends.' }, { status: 403 });
    }

    const messages = await getMessagesBetweenFriends(auth.auth.userId, friendId);
    return NextResponse.json({ friendId, messages });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load messages.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['student']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const receiverId = String(body.receiverId || '').trim();
  const replyToMessageId = body.replyToMessageId ? String(body.replyToMessageId).trim() : null;
  const rawMessage = String(body.messageText || '');

  if (!receiverId) {
    return NextResponse.json({ error: 'Missing receiverId.' }, { status: 400 });
  }

  if (!(await areUsersFriends(auth.auth.userId, receiverId))) {
    return NextResponse.json({ error: 'You can only message accepted friends.' }, { status: 403 });
  }

  const moderation = moderateChatMessage(rawMessage);
  if (!moderation.allowed) {
    await logModerationEvent(auth.auth.userId, rawMessage.slice(0, 500), moderation.reason || 'blocked_message');
    return NextResponse.json({ error: moderation.reason || 'Message blocked.' }, { status: 400 });
  }

  const cleanMessage = moderation.cleanMessage || normalizeChatMessage(rawMessage);
  const sinceRateLimit = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { data: recentMessages, error: recentError } = await adminSupabase
    .from('chat_messages')
    .select('message_text, created_at')
    .eq('sender_id', auth.auth.userId)
    .gte('created_at', sinceRateLimit)
    .order('created_at', { ascending: false });

  if (recentError) {
    return NextResponse.json({ error: recentError.message || 'Could not validate message limits.' }, { status: 500 });
  }

  if ((recentMessages?.length ?? 0) >= MAX_MESSAGES_PER_WINDOW) {
    await logModerationEvent(auth.auth.userId, cleanMessage, 'rate_limited');
    return NextResponse.json({ error: 'That message can’t be sent yet. Please slow down a little.' }, { status: 429 });
  }

  const duplicateCutoff = Date.now() - DUPLICATE_WINDOW_MS;
  const duplicateRecent = (recentMessages ?? []).find((entry) =>
    normalizeChatMessage(entry.message_text) === cleanMessage
    && new Date(entry.created_at).getTime() >= duplicateCutoff
  );

  if (duplicateRecent) {
    await logModerationEvent(auth.auth.userId, cleanMessage, 'duplicate_message');
    return NextResponse.json({ error: 'That message looks repeated. Try adding something new.' }, { status: 400 });
  }

  if (replyToMessageId) {
    const { data: replyRow, error: replyError } = await adminSupabase
      .from('chat_messages')
      .select('id, sender_id, receiver_id')
      .eq('id', replyToMessageId)
      .maybeSingle();

    if (replyError || !replyRow) {
      return NextResponse.json({ error: 'Reply target not found.' }, { status: 400 });
    }

    const replyVisible = [replyRow.sender_id, replyRow.receiver_id].includes(auth.auth.userId)
      && [replyRow.sender_id, replyRow.receiver_id].includes(receiverId);
    if (!replyVisible) {
      return NextResponse.json({ error: 'Reply target is not available.' }, { status: 400 });
    }
  }

  const { data, error } = await adminSupabase
    .from('chat_messages')
    .insert({
      sender_id: auth.auth.userId,
      receiver_id: receiverId,
      message_text: cleanMessage,
      reply_to_message_id: replyToMessageId,
    })
    .select('id')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Could not send message.' }, { status: 500 });
  }

  try {
    const messages = await getMessagesBetweenFriends(auth.auth.userId, receiverId);
    const message = messages.find((entry) => entry.id === data.id);
    if (!message) throw new Error('Message not found after send.');
    return NextResponse.json({ message });
  } catch (sendError) {
    return NextResponse.json({ error: sendError instanceof Error ? sendError.message : 'Message sent but could not be loaded.' }, { status: 500 });
  }
}
