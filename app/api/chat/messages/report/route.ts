import { NextRequest, NextResponse } from 'next/server';
import { adminSupabase, requireRouteAuth } from '@/app/lib/server-auth';

export async function POST(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['student']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const messageId = String(body.messageId || '').trim();
  const reason = String(body.reason || '').trim().slice(0, 240);

  if (!messageId || !reason) {
    return NextResponse.json({ error: 'Missing messageId or reason.' }, { status: 400 });
  }

  const { data: message, error: messageError } = await adminSupabase
    .from('chat_messages')
    .select('id, sender_id, receiver_id, report_count')
    .eq('id', messageId)
    .maybeSingle();

  if (messageError || !message) {
    return NextResponse.json({ error: 'Message not found.' }, { status: 404 });
  }

  if (![message.sender_id, message.receiver_id].includes(auth.auth.userId)) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  }

  const { error: reportError } = await adminSupabase.from('message_reports').insert({
    message_id: messageId,
    reporter_id: auth.auth.userId,
    reason,
  });

  if (reportError) {
    return NextResponse.json({ error: reportError.message || 'Could not save report.' }, { status: 500 });
  }

  const { error: updateError } = await adminSupabase
    .from('chat_messages')
    .update({
      report_count: (message.report_count ?? 0) + 1,
      moderation_status: 'reported',
    })
    .eq('id', messageId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message || 'Could not update message report state.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
