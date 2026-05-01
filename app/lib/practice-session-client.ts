import { isPracticeEmail, PRACTICE_DISPLAY_USERNAME } from '@/app/lib/practice-mode';

const PRACTICE_STORAGE_PREFIX = 'draftora:practice:v1';
const TAB_ID_KEY = `${PRACTICE_STORAGE_PREFIX}:tab-id`;
const JUST_STARTED_KEY = `${PRACTICE_STORAGE_PREFIX}:just-started`;
const TAB_HEARTBEAT_KEY = `${PRACTICE_STORAGE_PREFIX}:tabs`;
const HEARTBEAT_MS = 4000;
const STALE_ENTRY_MS = 20000;

type PracticeTabEntry = {
  userId: string;
  lastSeenAt: number;
};

type PracticeTabMap = Record<string, PracticeTabEntry>;

function isBrowser() {
  return typeof window !== 'undefined';
}

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function readTabMap(): PracticeTabMap {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(TAB_HEARTBEAT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as PracticeTabMap;
  } catch {
    return {};
  }
}

function writeTabMap(next: PracticeTabMap) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(TAB_HEARTBEAT_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage write failures.
  }
}

function pruneTabMap(source: PracticeTabMap, now = Date.now()) {
  const next: PracticeTabMap = {};
  for (const [tabId, entry] of Object.entries(source)) {
    if (!entry || typeof entry !== 'object') continue;
    if (!entry.userId || typeof entry.lastSeenAt !== 'number') continue;
    if (now - entry.lastSeenAt > STALE_ENTRY_MS) continue;
    next[tabId] = entry;
  }
  return next;
}

function getTabId() {
  if (!isBrowser()) return '';
  return window.sessionStorage.getItem(TAB_ID_KEY) || '';
}

function setTabId(tabId: string) {
  if (!isBrowser()) return;
  window.sessionStorage.setItem(TAB_ID_KEY, tabId);
}

function ensureTabId() {
  const current = getTabId();
  if (current) return current;
  const next = randomId();
  setTabId(next);
  return next;
}

function getNavigationType() {
  if (!isBrowser() || typeof window.performance === 'undefined') return 'navigate';
  const entry = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  return entry?.type || 'navigate';
}

function hasActiveTabForUser(tabMap: PracticeTabMap, userId: string) {
  return Object.values(tabMap).some((entry) => entry.userId === userId);
}

function removeTabEntry(tabId: string) {
  if (!isBrowser() || !tabId) return;
  const tabMap = pruneTabMap(readTabMap());
  if (!tabMap[tabId]) {
    writeTabMap(tabMap);
    return;
  }
  delete tabMap[tabId];
  writeTabMap(tabMap);
}

function setHeartbeatEntry(userId: string, tabId: string, now = Date.now()) {
  if (!isBrowser() || !userId || !tabId) return;
  const tabMap = pruneTabMap(readTabMap(), now);
  tabMap[tabId] = { userId, lastSeenAt: now };
  writeTabMap(tabMap);
}

function markPracticeJustStarted(userId: string) {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(JUST_STARTED_KEY, userId || '1');
  } catch {
    // ignore
  }
}

function consumePracticeJustStarted(userId: string) {
  if (!isBrowser()) return false;
  try {
    const raw = window.sessionStorage.getItem(JUST_STARTED_KEY);
    if (!raw) return false;
    window.sessionStorage.removeItem(JUST_STARTED_KEY);
    return raw === '1' || raw === userId;
  } catch {
    return false;
  }
}

export function bootstrapPracticeSession(userId: string) {
  if (!isBrowser() || !userId) return;
  markPracticeJustStarted(userId);
  const tabId = ensureTabId();
  setHeartbeatEntry(userId, tabId);
}

export function isStalePracticeSessionOnLoad(userId: string) {
  if (!isBrowser() || !userId) return false;

  const justStarted = consumePracticeJustStarted(userId);
  const existingTabId = getTabId();
  const prunedMap = pruneTabMap(readTabMap());
  writeTabMap(prunedMap);

  if (justStarted) {
    const tabId = existingTabId || ensureTabId();
    setHeartbeatEntry(userId, tabId);
    return false;
  }

  if (existingTabId) {
    const currentTabEntry = prunedMap[existingTabId];
    const hasCurrentUserEntry = Boolean(currentTabEntry && currentTabEntry.userId === userId);
    const navigationType = getNavigationType();
    if (!hasCurrentUserEntry && navigationType !== 'reload' && !hasActiveTabForUser(prunedMap, userId)) {
      return true;
    }
    setHeartbeatEntry(userId, existingTabId);
    return false;
  }

  if (hasActiveTabForUser(prunedMap, userId)) {
    const tabId = ensureTabId();
    setHeartbeatEntry(userId, tabId);
    return false;
  }

  return true;
}

export async function endPracticeSessionKeepalive(accessToken: string, reason: string) {
  if (!isBrowser() || !accessToken) return;
  try {
    await fetch('/api/practice-session/end', {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ reason }),
    });
  } catch {
    // Best effort.
  }
}

export function startPracticeHeartbeat(options: { userId: string }) {
  const { userId } = options;
  if (!isBrowser() || !userId) return () => {};

  const tabId = ensureTabId();
  setHeartbeatEntry(userId, tabId);

  const interval = window.setInterval(() => {
    setHeartbeatEntry(userId, tabId);
  }, HEARTBEAT_MS);

  const onVisible = () => {
    if (document.visibilityState === 'visible') {
      setHeartbeatEntry(userId, tabId);
    }
  };

  const onPageExit = () => {
    removeTabEntry(tabId);
    const prunedMap = pruneTabMap(readTabMap());
    writeTabMap(prunedMap);
  };

  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('pagehide', onPageExit);
  window.addEventListener('beforeunload', onPageExit);

  return () => {
    window.clearInterval(interval);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('pagehide', onPageExit);
    window.removeEventListener('beforeunload', onPageExit);
  };
}

function shouldRemoveKeyForUser(key: string, userId: string) {
  if (!userId) return false;
  if (!key.startsWith('draftora')) return false;
  return key.includes(userId);
}

export function clearPracticeClientState(userId?: string | null) {
  if (!isBrowser()) return;

  try {
    window.sessionStorage.removeItem(TAB_ID_KEY);
    window.sessionStorage.removeItem(JUST_STARTED_KEY);
  } catch {
    // ignore
  }

  try {
    const keys = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index)).filter((key): key is string => Boolean(key));
    for (const key of keys) {
      const lower = key.toLowerCase();
      if (lower.startsWith(PRACTICE_STORAGE_PREFIX)) {
        window.localStorage.removeItem(key);
        continue;
      }
      if (userId && shouldRemoveKeyForUser(key, userId)) {
        window.localStorage.removeItem(key);
      }
    }

    const cachedProfileRaw = window.localStorage.getItem('draftora-profile-v1');
    if (cachedProfileRaw) {
      const parsed = JSON.parse(cachedProfileRaw) as { id?: string; email?: string; username?: string } | null;
      if (
        parsed &&
        (parsed.id === userId || isPracticeEmail(parsed.email) || (parsed.username || '').toUpperCase() === PRACTICE_DISPLAY_USERNAME)
      ) {
        window.localStorage.removeItem('draftora-profile-v1');
      }
    }
  } catch {
    // ignore
  }
}
