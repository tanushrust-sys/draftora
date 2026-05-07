import { NextRequest, NextResponse } from 'next/server';
import { requireRouteAuth } from '@/app/lib/server-auth';
import { awardRewardEvent, RewardEngineError } from '@/app/lib/rewards/reward-engine';
import { hashRequestPayload, validateIdempotencyKey } from '@/app/lib/rewards/idempotency';
import type { RewardEventType } from '@/app/lib/rewards/economy';

const ALLOWED_EVENT_TYPES = new Set<RewardEventType>([
  'writing_submit',
  'ai_feedback_received',
  'vocab_sentence_success',
  'vocab_mastered',
  'vocab_drill_completed',
  'vocab_test_completed',
  'daily_goal_met',
  'streak_checkin',
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseBody(body: unknown) {
  if (!isObject(body)) {
    throw new RewardEngineError(400, 'invalid_payload', 'Request body must be a JSON object.');
  }

  const eventTypeRaw = body.eventType;
  if (typeof eventTypeRaw !== 'string' || !ALLOWED_EVENT_TYPES.has(eventTypeRaw as RewardEventType)) {
    throw new RewardEngineError(400, 'invalid_event_type', 'Unsupported reward event type.');
  }

  const sourceRefRaw = body.sourceRef;
  if (sourceRefRaw !== undefined && sourceRefRaw !== null && typeof sourceRefRaw !== 'string') {
    throw new RewardEngineError(400, 'invalid_source_ref', 'sourceRef must be a string when provided.');
  }

  const sourceRef = (sourceRefRaw ?? '').toString().trim();
  if (sourceRef.length > 180) {
    throw new RewardEngineError(400, 'invalid_source_ref', 'sourceRef is too long.');
  }

  const metadataRaw = body.metadata;
  if (metadataRaw !== undefined && !isObject(metadataRaw)) {
    throw new RewardEngineError(400, 'invalid_metadata', 'metadata must be an object when provided.');
  }

  const metadata = (metadataRaw ?? {}) as Record<string, unknown>;
  if (JSON.stringify(metadata).length > 6000) {
    throw new RewardEngineError(400, 'invalid_metadata', 'metadata payload is too large.');
  }

  const eventSourceRaw = body.eventSource;
  const eventSource = typeof eventSourceRaw === 'string' && eventSourceRaw.trim().length > 0
    ? eventSourceRaw.trim().slice(0, 80)
    : 'client';

  return {
    eventType: eventTypeRaw as RewardEventType,
    sourceRef: sourceRef || null,
    metadata,
    eventSource,
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRouteAuth(request, ['student']);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const idempotencyHeader = request.headers.get('idempotency-key') || request.headers.get('Idempotency-Key') || '';
    const idempotencyKey = validateIdempotencyKey(idempotencyHeader);
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: 'Missing or invalid Idempotency-Key header.' },
        { status: 400 },
      );
    }

    const rawBody = await request.json().catch(() => ({}));
    const payload = parseBody(rawBody);

    const requestHash = hashRequestPayload({
      userId: auth.auth.userId,
      eventType: payload.eventType,
      sourceRef: payload.sourceRef,
      metadata: payload.metadata,
      eventSource: payload.eventSource,
    });

    const result = await awardRewardEvent({
      adminSupabase: auth.adminSupabase,
      userId: auth.auth.userId,
      profile: auth.auth.profile,
      eventType: payload.eventType,
      eventSource: payload.eventSource,
      sourceRef: payload.sourceRef,
      idempotencyKey,
      requestHash,
      metadata: payload.metadata,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof RewardEngineError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    const message = error instanceof Error ? error.message : 'Unexpected reward error.';
    return NextResponse.json({ error: message, code: 'unknown_error' }, { status: 500 });
  }
}
