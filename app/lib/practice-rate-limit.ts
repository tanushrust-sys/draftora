type PracticeLimitKey = {
  userId: string;
  bucket: string;
};

type BucketState = {
  windowStartedAt: number;
  count: number;
};

type ConsumeParams = PracticeLimitKey & {
  limit: number;
  windowMs: number;
};

type ConsumeResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

const usageBuckets = new Map<string, BucketState>();

function makeKey(key: PracticeLimitKey) {
  return `${key.userId}::${key.bucket}`;
}

export function consumePracticeRateLimit(params: ConsumeParams): ConsumeResult {
  const now = Date.now();
  const key = makeKey(params);
  const current = usageBuckets.get(key);

  if (!current || now - current.windowStartedAt >= params.windowMs) {
    usageBuckets.set(key, {
      windowStartedAt: now,
      count: 1,
    });
    return {
      allowed: true,
      remaining: Math.max(0, params.limit - 1),
      retryAfterMs: params.windowMs,
    };
  }

  if (current.count >= params.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, params.windowMs - (now - current.windowStartedAt)),
    };
  }

  current.count += 1;
  usageBuckets.set(key, current);

  return {
    allowed: true,
    remaining: Math.max(0, params.limit - current.count),
    retryAfterMs: Math.max(0, params.windowMs - (now - current.windowStartedAt)),
  };
}
