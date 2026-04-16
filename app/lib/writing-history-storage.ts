import type { Writing } from '@/app/types/database';

const WRITING_HISTORY_PREFIX = 'draftora:writing-history:';

function getWritingHistoryKey(userId: string) {
  return `${WRITING_HISTORY_PREFIX}${userId}`;
}

function sortByMostRecent<T extends { created_at: string; updated_at: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.updated_at || a.created_at || '') || 0;
    const bTime = Date.parse(b.updated_at || b.created_at || '') || 0;
    return bTime - aTime;
  });
}

export function readStoredWritingHistory(userId: string): Writing[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(getWritingHistoryKey(userId));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortByMostRecent(parsed as Writing[]) : [];
  } catch {
    return [];
  }
}

function writeStoredWritingHistory(userId: string, writings: Writing[]) {
  if (typeof window === 'undefined') return;

  localStorage.setItem(
    getWritingHistoryKey(userId),
    JSON.stringify(sortByMostRecent(writings)),
  );
}

export function mergeStoredWritingHistory(userId: string, incoming: Writing[]) {
  const merged = new Map<string, Writing>();

  for (const writing of readStoredWritingHistory(userId)) {
    merged.set(writing.id, writing);
  }

  for (const writing of incoming) {
    const current = merged.get(writing.id);
    if (!current) {
      merged.set(writing.id, writing);
      continue;
    }

    const currentTime = Date.parse(current.updated_at || current.created_at || '') || 0;
    const nextTime = Date.parse(writing.updated_at || writing.created_at || '') || 0;
    merged.set(writing.id, nextTime >= currentTime ? writing : current);
  }

  const next = sortByMostRecent([...merged.values()]);
  writeStoredWritingHistory(userId, next);
  return next;
}

export function upsertStoredWritingHistory(userId: string, writing: Writing) {
  return mergeStoredWritingHistory(userId, [writing]);
}

export function removeStoredWritingHistory(userId: string, writingId: string) {
  const next = readStoredWritingHistory(userId).filter(writing => writing.id !== writingId);
  writeStoredWritingHistory(userId, next);
  return next;
}
