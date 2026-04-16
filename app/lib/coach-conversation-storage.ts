type StoredMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type StoredCoachConversation = {
  id: string;
  mode: 'thinking' | 'creative';
  trainer_type: string;
  messages: StoredMessage[];
  updated_at: string;
};

const COACH_CONVERSATIONS_PREFIX = 'draftora:coach-conversations:';

function getCoachConversationsKey(userId: string) {
  return `${COACH_CONVERSATIONS_PREFIX}${userId}`;
}

function sortByMostRecent<T extends { updated_at: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.updated_at || '') || 0;
    const bTime = Date.parse(b.updated_at || '') || 0;
    return bTime - aTime;
  });
}

export function readStoredCoachConversations(userId: string): StoredCoachConversation[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(getCoachConversationsKey(userId));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortByMostRecent(parsed as StoredCoachConversation[]) : [];
  } catch {
    return [];
  }
}

function writeStoredCoachConversations(userId: string, conversations: StoredCoachConversation[]) {
  if (typeof window === 'undefined') return;

  localStorage.setItem(
    getCoachConversationsKey(userId),
    JSON.stringify(sortByMostRecent(conversations)),
  );
}

export function mergeStoredCoachConversations(userId: string, incoming: StoredCoachConversation[]) {
  const merged = new Map<string, StoredCoachConversation>();

  for (const conversation of readStoredCoachConversations(userId)) {
    merged.set(conversation.id, conversation);
  }

  for (const conversation of incoming) {
    const current = merged.get(conversation.id);
    if (!current) {
      merged.set(conversation.id, conversation);
      continue;
    }

    const currentTime = Date.parse(current.updated_at || '') || 0;
    const nextTime = Date.parse(conversation.updated_at || '') || 0;
    merged.set(conversation.id, nextTime >= currentTime ? conversation : current);
  }

  const next = sortByMostRecent([...merged.values()]);
  writeStoredCoachConversations(userId, next);
  return next;
}

export function upsertStoredCoachConversation(userId: string, conversation: StoredCoachConversation) {
  return mergeStoredCoachConversations(userId, [conversation]);
}
