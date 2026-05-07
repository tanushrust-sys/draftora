import { NextRequest, NextResponse } from 'next/server';
import { requireRouteAuth } from '@/app/lib/server-auth';
import { ensureCurrentWeeklyRotation } from '@/app/lib/rewards/shop';
import { hashRequestPayload, validateIdempotencyKey } from '@/app/lib/rewards/idempotency';
import { SHOP_INVENTORY_CATEGORIES } from '@/app/lib/rewards/catalog';
import { getLevelFromXP, getTitleForLevel } from '@/app/types/database';

const CLAIM_ENDPOINT = '/api/shop/purchase';

type ClaimRow = {
  id: string;
  status: 'processing' | 'applied' | 'failed';
  request_hash: string;
  response_payload: unknown;
};

type PurchaseResponse = {
  ok: true;
  idempotentReplay: boolean;
  purchase: {
    itemId: string;
    rotationId: string;
    slotType: 'affordable' | 'featured' | 'standard';
    pricePaid: number;
    purchasedAt: string;
  };
  newXpBalance: number;
  inventoryItem: {
    id: string;
    itemId: string;
    acquiredVia: string;
    pricePaidXp: number;
    createdAt: string;
  };
};

class ShopPurchaseError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function likelyDuplicateError(error: unknown) {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : '';
  return message.toLowerCase().includes('duplicate key');
}

function parseBody(body: unknown) {
  if (!isObject(body)) {
    throw new ShopPurchaseError(400, 'invalid_body', 'Request body must be an object.');
  }

  const itemId = body.itemId;
  if (typeof itemId !== 'string' || !looksLikeUuid(itemId)) {
    throw new ShopPurchaseError(400, 'invalid_item_id', 'itemId is required and must be a UUID.');
  }

  const rotationIdRaw = body.rotationId;
  if (rotationIdRaw !== undefined && rotationIdRaw !== null && (typeof rotationIdRaw !== 'string' || !looksLikeUuid(rotationIdRaw))) {
    throw new ShopPurchaseError(400, 'invalid_rotation_id', 'rotationId must be a UUID when provided.');
  }

  return {
    itemId,
    rotationId: (rotationIdRaw as string | null | undefined) ?? null,
  };
}

async function acquirePurchaseClaim(params: {
  adminSupabase: {
    from: (table: string) => {
      insert: (values: Record<string, unknown>) => any;
      select: (...args: any[]) => any;
      update: (values: Record<string, unknown>) => any;
    };
  };
  userId: string;
  idempotencyKey: string;
  requestHash: string;
}) {
  const { adminSupabase, userId, idempotencyKey, requestHash } = params;
  const nowIso = new Date().toISOString();

  const { data: insertedRows, error: insertError } = await adminSupabase
    .from('reward_claims')
    .insert({
      user_id: userId,
      endpoint: CLAIM_ENDPOINT,
      idempotency_key: idempotencyKey,
      request_hash: requestHash,
      status: 'processing',
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select('id, status, request_hash, response_payload')
    .limit(1);

  if (!insertError && insertedRows?.[0]) {
    return {
      claimId: String(insertedRows[0].id),
      replay: null as PurchaseResponse | null,
    };
  }

  if (!likelyDuplicateError(insertError)) {
    throw insertError;
  }

  const { data: existingRows, error: existingError } = await adminSupabase
    .from('reward_claims')
    .select('id, status, request_hash, response_payload')
    .eq('user_id', userId)
    .eq('endpoint', CLAIM_ENDPOINT)
    .eq('idempotency_key', idempotencyKey)
    .limit(1);

  if (existingError || !existingRows?.[0]) {
    throw existingError || new Error('Could not resolve idempotency claim.');
  }

  const existing = existingRows[0] as ClaimRow;

  if (existing.request_hash !== requestHash) {
    throw new ShopPurchaseError(409, 'idempotency_mismatch', 'Idempotency key was reused with a different payload.');
  }

  if (existing.status === 'applied' && existing.response_payload && typeof existing.response_payload === 'object') {
    return {
      claimId: existing.id,
      replay: {
        ...(existing.response_payload as PurchaseResponse),
        idempotentReplay: true,
      },
    };
  }

  if (existing.status === 'processing') {
    throw new ShopPurchaseError(409, 'idempotency_in_progress', 'This purchase request is already being processed.');
  }

  const { error: retryError } = await adminSupabase
    .from('reward_claims')
    .update({ status: 'processing', error_message: null, updated_at: nowIso })
    .eq('id', existing.id)
    .eq('status', 'failed');

  if (retryError) throw retryError;

  return {
    claimId: existing.id,
    replay: null as PurchaseResponse | null,
  };
}

async function markClaimFailed(adminSupabase: {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => any;
  };
}, claimId: string, errorMessage: string) {
  await adminSupabase
    .from('reward_claims')
    .update({
      status: 'failed',
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', claimId)
    .then(() => null, () => null);
}

export async function POST(request: NextRequest) {
  const auth = await requireRouteAuth(request, ['student']);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const idempotencyHeader = request.headers.get('idempotency-key') || request.headers.get('Idempotency-Key') || '';
  const idempotencyKey = validateIdempotencyKey(idempotencyHeader);
  if (!idempotencyKey) {
    return NextResponse.json({ error: 'Missing or invalid Idempotency-Key header.' }, { status: 400 });
  }

  const rawBody = await request.json().catch(() => ({}));

  try {
    const body = parseBody(rawBody);
    const { adminSupabase } = auth;
    const { userId } = auth.auth;

    const requestHash = hashRequestPayload({
      userId,
      itemId: body.itemId,
      rotationId: body.rotationId,
    });

    const claim = await acquirePurchaseClaim({
      adminSupabase,
      userId,
      idempotencyKey,
      requestHash,
    });

    if (claim.replay) {
      return NextResponse.json(claim.replay);
    }

    const claimId = claim.claimId;

    try {
      const currentShop = await ensureCurrentWeeklyRotation(adminSupabase);

      if (body.rotationId && body.rotationId !== currentShop.rotation.id) {
        throw new ShopPurchaseError(410, 'stale_rotation', 'This shop rotation is no longer active.');
      }

      const shopEntry = currentShop.items.find((entry) => entry.item.id === body.itemId);
      if (!shopEntry) {
        throw new ShopPurchaseError(404, 'item_not_found', 'Item is not in the current weekly shop.');
      }
      if (!SHOP_INVENTORY_CATEGORIES.includes(shopEntry.item.category)) {
        throw new ShopPurchaseError(410, 'category_retired', 'Titles are now unlocked through Title Progression.');
      }

      const { data: ownedRow, error: ownedError } = await adminSupabase
        .from('user_inventory')
        .select('id')
        .eq('user_id', userId)
        .eq('item_id', body.itemId)
        .maybeSingle();

      if (ownedError) throw ownedError;
      if (ownedRow) {
        throw new ShopPurchaseError(409, 'already_owned', 'You already own this item.');
      }

      const { data: profileRow, error: profileError } = await adminSupabase
        .from('profiles')
        .select('xp, level, title')
        .eq('id', userId)
        .maybeSingle();

      if (profileError || !profileRow) {
        throw profileError || new ShopPurchaseError(404, 'profile_missing', 'Profile not found.');
      }

      const xpBalance = Math.max(0, Number((profileRow as { xp?: number }).xp ?? 0));
      if (xpBalance < shopEntry.price) {
        throw new ShopPurchaseError(422, 'insufficient_currency', 'Not enough XP for this purchase.');
      }

      const storedLevel = Math.max(1, Number((profileRow as { level?: number }).level ?? 1));
      const previousLevel = Number.isFinite(storedLevel) ? storedLevel : getLevelFromXP(xpBalance);
      const previousTitle = String((profileRow as { title?: string }).title ?? getTitleForLevel(previousLevel));
      const nextXP = xpBalance - shopEntry.price;
      const nextLevel = getLevelFromXP(nextXP);
      const hasCustomTitleEquipped = previousTitle.trim() !== getTitleForLevel(previousLevel).trim();
      const nextTitle = hasCustomTitleEquipped ? previousTitle : getTitleForLevel(nextLevel);

      const { data: updatedProfileRow, error: xpUpdateError } = await adminSupabase
        .from('profiles')
        .update({ xp: nextXP, level: nextLevel, title: nextTitle })
        .eq('id', userId)
        .eq('xp', xpBalance)
        .select('xp')
        .maybeSingle();

      if (xpUpdateError || !updatedProfileRow) {
        throw new ShopPurchaseError(409, 'balance_conflict', 'XP balance changed. Please try again.');
      }

      const purchasedAt = new Date().toISOString();

      const { data: inventoryRows, error: inventoryInsertError } = await adminSupabase
        .from('user_inventory')
        .insert({
          user_id: userId,
          item_id: body.itemId,
          acquired_via: 'shop_purchase',
          source_rotation_id: currentShop.rotation.id,
          price_paid_coins: shopEntry.price,
          created_at: purchasedAt,
        })
        .select('id, item_id, acquired_via, price_paid_coins, created_at')
        .limit(1);

      if (inventoryInsertError) {
        if (likelyDuplicateError(inventoryInsertError)) {
          await adminSupabase
            .from('profiles')
            .update({ xp: xpBalance, level: previousLevel, title: previousTitle })
            .eq('id', userId)
            .then(() => null, () => null);
          throw new ShopPurchaseError(409, 'already_owned', 'You already own this item.');
        }
        throw inventoryInsertError;
      }

      const inventoryItemRow = (inventoryRows?.[0] ?? null) as {
        id: string;
        item_id: string;
        acquired_via: string;
        price_paid_coins: number;
        created_at: string;
      } | null;

      if (!inventoryItemRow) {
        throw new Error('Purchase completed but inventory row was missing.');
      }

      const { error: xpLogError } = await adminSupabase
        .from('xp_log')
        .insert({
          user_id: userId,
          amount: -shopEntry.price,
          reason: `shop_purchase:${shopEntry.item.slug}`,
          created_at: purchasedAt,
        });

      if (xpLogError) {
        // Logging should never block a successful cosmetic purchase.
        console.error('shop_purchase xp_log insert failed:', xpLogError);
      }

      const responsePayload: PurchaseResponse = {
        ok: true,
        idempotentReplay: false,
        purchase: {
          itemId: body.itemId,
          rotationId: currentShop.rotation.id,
          slotType: shopEntry.slotType,
          pricePaid: shopEntry.price,
          purchasedAt,
        },
        newXpBalance: nextXP,
        inventoryItem: {
          id: inventoryItemRow.id,
          itemId: inventoryItemRow.item_id,
          acquiredVia: inventoryItemRow.acquired_via,
          pricePaidXp: inventoryItemRow.price_paid_coins,
          createdAt: inventoryItemRow.created_at,
        },
      };

      const { error: claimUpdateError } = await adminSupabase
        .from('reward_claims')
        .update({
          status: 'applied',
          response_payload: responsePayload,
          error_message: null,
          updated_at: purchasedAt,
        })
        .eq('id', claimId);

      if (claimUpdateError) {
        console.error('shop_purchase claim update failed:', claimUpdateError);
      }

      return NextResponse.json(responsePayload);
    } catch (innerError) {
      const message = innerError instanceof Error ? innerError.message : 'Purchase failed.';
      await markClaimFailed(adminSupabase, claimId, message);

      if (innerError instanceof ShopPurchaseError) {
        return NextResponse.json({ error: innerError.message, code: innerError.code }, { status: innerError.status });
      }

      return NextResponse.json({ error: message, code: 'shop_purchase_failed' }, { status: 500 });
    }
  } catch (outerError) {
    if (outerError instanceof ShopPurchaseError) {
      return NextResponse.json({ error: outerError.message, code: outerError.code }, { status: outerError.status });
    }

    const message = outerError instanceof Error ? outerError.message : 'Could not process purchase request.';
    return NextResponse.json({ error: message, code: 'bad_request' }, { status: 400 });
  }
}
