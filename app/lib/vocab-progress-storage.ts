import type { VocabWord } from '@/app/types/database';

const VOCAB_PROGRESS_STORAGE_PREFIX = 'draftora-vocab-progress-v1';

type StoredVocabProgress = {
  user_sentence?: string | null;
  sentence_feedback?: VocabWord['sentence_feedback'];
};

function getVocabProgressKey(userId: string, word: string) {
  return `${VOCAB_PROGRESS_STORAGE_PREFIX}:${userId}:${word.toLowerCase()}`;
}

export function readStoredVocabProgress(userId?: string | null, word?: string | null) {
  if (typeof window === 'undefined' || !userId || !word) return null;

  try {
    const raw = localStorage.getItem(getVocabProgressKey(userId, word));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredVocabProgress;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeStoredVocabProgress(
  userId: string,
  word: string,
  progress: StoredVocabProgress,
) {
  if (typeof window === 'undefined' || !userId || !word) return;

  try {
    const existing = readStoredVocabProgress(userId, word) ?? {};
    localStorage.setItem(
      getVocabProgressKey(userId, word),
      JSON.stringify({ ...existing, ...progress }),
    );
  } catch {
    // ignore storage failures
  }
}

export function hydrateVocabWordWithStoredProgress(userId: string, word: VocabWord): VocabWord {
  const stored = readStoredVocabProgress(userId, word.word);
  if (!stored) return word;

  return {
    ...word,
    user_sentence: word.user_sentence ?? stored.user_sentence ?? null,
    sentence_feedback: word.sentence_feedback ?? stored.sentence_feedback ?? null,
  };
}
