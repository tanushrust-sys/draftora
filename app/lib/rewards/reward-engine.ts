import { getLevelFromXP, getTitleForLevel, type Profile } from '@/app/types/database';
import { isPracticeEmail, PRACTICE_DISPLAY_USERNAME } from '@/app/lib/practice-mode';
import {
  getEventCaps,
  resolveReward,
  STREAK_BONUS_XP,
  type RewardEventType,
  type RewardMetadata,
} from '@/app/lib/rewards/economy';

type SupabaseAdmin = {
  from: (table: string) => {
    select: (query: string, options?: { count?: 'exact'; head?: boolean }) => any;
    insert: (values: Record<string, unknown> | Array<Record<string, unknown>>) => any;
    update: (values: Record<string, unknown>) => any;
  };
};

type EngineInput = {
  adminSupabase: SupabaseAdmin;
  userId: string;
  profile: Profile;
  eventType: RewardEventType;
  eventSource: string;
  sourceRef: string | null;
  idempotencyKey: string;
  requestHash: string;
  metadata: RewardMetadata;
};

type ClaimRow = {
  id: string;
  status: 'processing' | 'applied' | 'failed';
  request_hash: string;
  response_payload: unknown;
};

type EngineResponse = {
  ok: true;
  idempotentReplay: boolean;
  eventId: string;
  eventType: RewardEventType;
  deltas: { xp: number };
  balances: {
    xp: number;
    level: number;
    title: string;
    streak: number;
    longestStreak: number;
  };
  celebrations: {
    levelUp: { fromLevel: number; toLevel: number; title: string } | null;
    streakMilestone: { streak: number; xp: number } | null;
  };
  cap: { applied: boolean; reason: string | null };
  practiceMode: boolean;
};

const CLAIM_ENDPOINT = '/api/rewards/award';

function isLikelyDuplicateKey(error: unknown) {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : '';
  return message.toLowerCase().includes('duplicate key');
}

export class RewardEngineError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function getUtcDateKey(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayDateKey(dateKey: string) {
  const parsed = new Date(`${dateKey}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return getUtcDateKey(parsed);
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getPeriodStarts() {
  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const weekStart = new Date(dayStart);
  const day = dayStart.getUTCDay();
  const diff = (day + 6) % 7; // Monday=0
  weekStart.setUTCDate(weekStart.getUTCDate() - diff);

  return {
    dayStartIso: dayStart.toISOString(),
    weekStartIso: weekStart.toISOString(),
  };
}

async function getEventCountSince(adminSupabase: SupabaseAdmin, userId: string, eventType: RewardEventType, sinceIso: string) {
  const { count, error } = await adminSupabase
    .from('reward_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', eventType)
    .gte('created_at', sinceIso);

  if (error) throw error;
  return count ?? 0;
}

async function acquireClaimOrReplay(adminSupabase: SupabaseAdmin, params: {
  userId: string;
  idempotencyKey: string;
  requestHash: string;
}) {
  const nowIso = new Date().toISOString();

  const { data: insertedRows, error: insertError } = await adminSupabase
    .from('reward_claims')
    .insert({
      user_id: params.userId,
      endpoint: CLAIM_ENDPOINT,
      idempotency_key: params.idempotencyKey,
      request_hash: params.requestHash,
      status: 'processing',
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select('id, status, request_hash, response_payload')
    .limit(1);

  if (!insertError && insertedRows?.[0]) {
    return {
      claimId: String(insertedRows[0].id),
      replay: null as EngineResponse | null,
    };
  }

  if (!isLikelyDuplicateKey(insertError)) {
    throw insertError;
  }

  const { data: existingRows, error: selectError } = await adminSupabase
    .from('reward_claims')
    .select('id, status, request_hash, response_payload')
    .eq('user_id', params.userId)
    .eq('endpoint', CLAIM_ENDPOINT)
    .eq('idempotency_key', params.idempotencyKey)
    .limit(1);

  if (selectError || !existingRows?.[0]) {
    throw selectError || new Error('Could not resolve idempotency key.');
  }

  const existing = existingRows[0] as ClaimRow;
  if (existing.request_hash !== params.requestHash) {
    throw new RewardEngineError(409, 'idempotency_mismatch', 'Idempotency key was reused with a different payload.');
  }

  if (existing.status === 'applied' && existing.response_payload && typeof existing.response_payload === 'object') {
    const replayPayload = existing.response_payload as EngineResponse;
    return {
      claimId: existing.id,
      replay: {
        ...replayPayload,
        idempotentReplay: true,
      } satisfies EngineResponse,
    };
  }

  if (existing.status === 'processing') {
    throw new RewardEngineError(409, 'idempotency_in_progress', 'This reward request is already being processed.');
  }

  const { error: retryError } = await adminSupabase
    .from('reward_claims')
    .update({ status: 'processing', error_message: null, updated_at: nowIso })
    .eq('id', existing.id)
    .eq('status', 'failed');

  if (retryError) throw retryError;

  return {
    claimId: existing.id,
    replay: null as EngineResponse | null,
  };
}

function isPracticeProfile(profile: Profile) {
  return (
    isPracticeEmail(profile.email) ||
    (profile.username || '').trim().toUpperCase() === PRACTICE_DISPLAY_USERNAME
  );
}

async function markClaimFailed(adminSupabase: SupabaseAdmin, claimId: string, message: string) {
  await adminSupabase
    .from('reward_claims')
    .update({ status: 'failed', error_message: message, updated_at: new Date().toISOString() })
    .eq('id', claimId)
    .then(() => null, () => null);
}

export async function awardRewardEvent(input: EngineInput): Promise<EngineResponse> {
  const {
    adminSupabase,
    userId,
    profile,
    eventType,
    eventSource,
    sourceRef,
    idempotencyKey,
    requestHash,
    metadata,
  } = input;

  const claim = await acquireClaimOrReplay(adminSupabase, {
    userId,
    idempotencyKey,
    requestHash,
  });

  if (claim.replay) return claim.replay;

  const claimId = claim.claimId;

  try {
    const isPractice = isPracticeProfile(profile);
    const nowIso = new Date().toISOString();

    let currentXP = profile.xp ?? 0;
    let currentLevel = profile.level ?? 1;
    let currentTitle = profile.title ?? getTitleForLevel(currentLevel);
    let currentStreak = profile.streak ?? 0;
    let currentLongestStreak = profile.longest_streak ?? 0;
    let currentLastWritingDate = profile.last_writing_date ?? null;

    let resolved = resolveReward(eventType, metadata);
    let capReason: string | null = null;
    let nextStreak = currentStreak;
    let nextLongestStreak = currentLongestStreak;
    let nextLastWritingDate = currentLastWritingDate;
    let streakMilestone: { streak: number; xp: number } | null = null;

    const { dayStartIso, weekStartIso } = getPeriodStarts();

    if (eventType === 'streak_checkin') {
      const localDate = isDateKey(metadata.localDate) ? metadata.localDate : getUtcDateKey();
      const yesterdayDate = isDateKey(metadata.yesterdayDate)
        ? metadata.yesterdayDate
        : getYesterdayDateKey(localDate);

      if (currentLastWritingDate === localDate) {
        capReason = 'streak_already_counted_today';
        resolved = {
          xp: 0,
          reason: 'Streak already counted today',
        };
      } else {
        nextStreak = currentLastWritingDate === yesterdayDate ? currentStreak + 1 : 1;
        nextLongestStreak = Math.max(nextStreak, currentLongestStreak);
        nextLastWritingDate = localDate;

        const bonusXP = STREAK_BONUS_XP[nextStreak] ?? 0;
        if (bonusXP > 0) {
          streakMilestone = {
            streak: nextStreak,
            xp: bonusXP,
          };
        }

        resolved = {
          xp: bonusXP,
          reason: streakMilestone
            ? `${nextStreak}-day streak bonus`
            : 'Daily streak check-in',
        };
      }
    }

    const caps = getEventCaps(eventType);
    if (!capReason && caps?.perDay) {
      const countToday = await getEventCountSince(adminSupabase, userId, eventType, dayStartIso);
      if (countToday >= caps.perDay) {
        capReason = `${eventType}_daily_cap_reached`;
      }
    }

    if (!capReason && caps?.perWeek) {
      const countWeek = await getEventCountSince(adminSupabase, userId, eventType, weekStartIso);
      if (countWeek >= caps.perWeek) {
        capReason = `${eventType}_weekly_cap_reached`;
      }
    }

    if (capReason) {
      resolved = {
        xp: 0,
        reason: resolved.reason,
      };
      streakMilestone = null;
    }

    let xpDelta = Math.max(0, Math.round(resolved.xp));

    const nextXP = currentXP + xpDelta;
    const nextLevel = getLevelFromXP(nextXP);
    const levelTitleNow = getTitleForLevel(currentLevel);
    const hasCustomTitleEquipped = (currentTitle || '').trim() !== (levelTitleNow || '').trim();
    const nextTitle = hasCustomTitleEquipped ? currentTitle : getTitleForLevel(nextLevel);

    const profilePatch: Record<string, unknown> = {
      xp: nextXP,
      level: nextLevel,
      title: nextTitle,
    };

    if (eventType === 'streak_checkin') {
      profilePatch.streak = nextStreak;
      profilePatch.longest_streak = nextLongestStreak;
      profilePatch.last_writing_date = nextLastWritingDate;
    }

    const { error: profileError } = await adminSupabase
      .from('profiles')
      .update(profilePatch)
      .eq('id', userId);

    if (profileError) throw profileError;

    const rewardState = capReason ? 'capped' : 'applied';

    const { data: rewardRows, error: rewardError } = await adminSupabase
      .from('reward_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_source: eventSource,
        source_ref: sourceRef,
        idempotency_key: idempotencyKey,
        payload: metadata,
        xp_awarded: xpDelta,
        coins_awarded: 0,
        state: rewardState,
        cap_reason: capReason,
        practice_mode: isPractice,
        created_at: nowIso,
      })
      .select('id')
      .limit(1);

    if (rewardError || !rewardRows?.[0]?.id) {
      throw rewardError || new Error('Could not persist reward event.');
    }

    const eventId = String(rewardRows[0].id);

    if (xpDelta > 0) {
      const { error: ledgerError } = await adminSupabase
        .from('user_xp_ledger')
        .insert({
          user_id: userId,
          reward_event_id: eventId,
          delta: xpDelta,
          balance_after: nextXP,
          reason: resolved.reason,
          created_at: nowIso,
        });

      if (ledgerError) throw ledgerError;

      await adminSupabase
        .from('xp_log')
        .insert({
          user_id: userId,
          amount: xpDelta,
          reason: resolved.reason,
          created_at: nowIso,
        })
        .then(() => null, () => null);
    }

    const responsePayload: EngineResponse = {
      ok: true,
      idempotentReplay: false,
      eventId,
      eventType,
      deltas: { xp: xpDelta },
      balances: {
        xp: nextXP,
        level: nextLevel,
        title: nextTitle,
        streak: eventType === 'streak_checkin' ? nextStreak : currentStreak,
        longestStreak: eventType === 'streak_checkin' ? nextLongestStreak : currentLongestStreak,
      },
      celebrations: {
        levelUp: nextLevel > currentLevel
          ? {
              fromLevel: currentLevel,
              toLevel: nextLevel,
              title: nextTitle,
            }
          : null,
        streakMilestone,
      },
      cap: {
        applied: Boolean(capReason),
        reason: capReason,
      },
      practiceMode: isPractice,
    };

    const { error: claimUpdateError } = await adminSupabase
      .from('reward_claims')
      .update({
        status: 'applied',
        response_payload: responsePayload,
        reward_event_id: eventId,
        error_message: null,
        updated_at: nowIso,
      })
      .eq('id', claimId);

    if (claimUpdateError) {
      console.error('reward_claims update failed after successful reward apply:', claimUpdateError);
    }

    return responsePayload;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reward awarding failed.';
    await markClaimFailed(adminSupabase, claimId, message);

    if (error instanceof RewardEngineError) {
      throw error;
    }

    throw new RewardEngineError(500, 'reward_engine_failure', message);
  }
}
