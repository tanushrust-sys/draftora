import { createHash } from 'crypto';

const IDEMPOTENCY_KEY_PATTERN = /^[a-zA-Z0-9:_\-.]{8,120}$/;

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== 'object') return value;

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => [key, sortValue(item)] as const);

  return Object.fromEntries(entries);
}

export function stableStringify(value: unknown) {
  return JSON.stringify(sortValue(value));
}

export function hashRequestPayload(value: unknown) {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function validateIdempotencyKey(value: string) {
  const key = value.trim();
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
    return null;
  }
  return key;
}
