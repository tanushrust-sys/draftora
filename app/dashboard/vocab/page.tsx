'use client';

import { useState, useEffect, useCallback, useRef, useDeferredValue, useMemo } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { FetchTimeoutError, fetchWithTimeout } from '@/app/lib/fetch-with-timeout';
import { PromiseTimeoutError, withPromiseTimeout } from '@/app/lib/promise-with-timeout';
import { isMissingVocabSentenceColumnError } from '@/app/lib/supabase-schema-errors';
import { supabase } from '@/app/lib/supabase';
import {
  hydrateVocabWordWithStoredProgress,
  writeStoredVocabProgress,
} from '@/app/lib/vocab-progress-storage';
import { awardXP, XP_REWARDS } from '@/app/lib/xp';
import { getExperienceIncreaseForAction, persistWritingExperienceScore, readWritingExperienceOverride } from '@/app/lib/writing-experience';
import { incrementProfileOverride } from '@/app/lib/profile-overrides';
import { getDailyWords, getWeekWords, getVocabPool, simplifyMeaning } from '@/app/lib/vocab-utils';
import type { VocabWord } from '@/app/types/database';
import {
  GraduationCap, BookOpen, Trophy, Star, Search, PenLine,
  CheckCircle, XCircle, Sparkles, BookMarked, Zap,
  X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Clock,
  Brain, RotateCcw, TrendingUp,
} from 'lucide-react';

// ─── Daily word selection (3 per day, deterministic, age-aware) ───
function isTestDay() {
  const day = new Date().getDay(); // 5=Fri, 6=Sat, 0=Sun
  return day === 5 || day === 6 || day === 0;
}

const tone = (color: string, amount: number) => `color-mix(in srgb, ${color} ${amount}%, transparent)`;

const CARD_THEMES = [
  { topBorder: 'var(--t-mod-write)', glow: tone('var(--t-mod-write)', 8) },
  { topBorder: 'var(--t-mod-coach)', glow: tone('var(--t-mod-coach)', 8) },
  { topBorder: 'var(--t-mod-vocab)', glow: tone('var(--t-mod-vocab)', 8) },
];

const LABELS = ['A', 'B', 'C', 'D'];

type TestQuestion = {
  wordItem: { word: string; meaning: string };
  question: string;
  options: string[];
  correctIndex: number;
};

type SentenceFeedbackGrade = 'correct' | 'mostly correct' | 'mostly incorrect' | 'incorrect';

type SentenceFeedback = {
  grade?: SentenceFeedbackGrade;
  correct: boolean;
  strengths: string;
  improvements: string;
  summary: string;
  suggestion: string;
};

const SENTENCE_FEEDBACK_STYLE: Record<SentenceFeedbackGrade, { accent: string; background: string; border: string; icon: string; label: string }> = {
  correct: {
    accent: 'var(--t-success)',
    background: tone('var(--t-success)', 8),
    border: tone('var(--t-success)', 22),
    icon: tone('var(--t-success)', 16),
    label: 'Correct',
  },
  'mostly correct': {
    accent: '#18c7db',
    background: tone('#18c7db', 10),
    border: tone('#18c7db', 24),
    icon: tone('#18c7db', 18),
    label: 'Mostly correct',
  },
  'mostly incorrect': {
    accent: '#c96a16',
    background: tone('#c96a16', 10),
    border: tone('#c96a16', 24),
    icon: tone('#c96a16', 18),
    label: 'Mostly incorrect',
  },
  incorrect: {
    accent: 'var(--t-danger)',
    background: tone('var(--t-danger)', 8),
    border: tone('var(--t-danger)', 22),
    icon: tone('var(--t-danger)', 16),
    label: 'Incorrect',
  },
};

function normalizeSentenceFeedbackGrade(value: unknown): SentenceFeedbackGrade | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (normalized === 'correct') return 'correct';
  if (normalized === 'mostly correct' || normalized === 'almost correct' || normalized === 'partially correct' || normalized === 'nearly correct') {
    return 'mostly correct';
  }
  if (normalized === 'mostly incorrect' || normalized === 'mostly wrong' || normalized === 'almost incorrect' || normalized === 'partially incorrect' || normalized === 'partially wrong') {
    return 'mostly incorrect';
  }
  if (normalized === 'incorrect' || normalized === 'wrong' || normalized === 'false') return 'incorrect';
  return null;
}

function getSentenceFeedbackGrade(feedback?: SentenceFeedback | null): SentenceFeedbackGrade {
  if (!feedback) return 'incorrect';
  return feedback.grade ?? (feedback.correct ? 'correct' : 'incorrect');
}

function isPositiveSentenceFeedback(feedback?: SentenceFeedback | null) {
  const grade = getSentenceFeedbackGrade(feedback);
  return grade === 'correct' || grade === 'mostly correct';
}

function getSentenceFeedbackStyle(feedback?: SentenceFeedback | null) {
  return SENTENCE_FEEDBACK_STYLE[getSentenceFeedbackGrade(feedback)];
}

function normalizeSentenceFeedback(value: unknown): SentenceFeedback | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Record<string, unknown>;
  const grade = normalizeSentenceFeedbackGrade(candidate.grade)
    ?? normalizeSentenceFeedbackGrade(candidate.status)
    ?? normalizeSentenceFeedbackGrade(candidate.level)
    ?? (typeof candidate.correct === 'boolean' ? (candidate.correct ? 'correct' : 'incorrect') : null);

  if (!grade) return null;

  return {
    grade,
    correct: grade === 'correct' || grade === 'mostly correct',
    strengths: typeof candidate.strengths === 'string' ? candidate.strengths.trim() : '',
    improvements: typeof candidate.improvements === 'string' ? candidate.improvements.trim() : '',
    summary: typeof candidate.summary === 'string' ? candidate.summary.trim() : '',
    suggestion: typeof candidate.suggestion === 'string' ? candidate.suggestion.trim() : '',
  };
}

// ─── Word Bank Drill types ───
type DrillChallenge =
  | { type: 'recall';    word: string; meaning: string }
  | { type: 'use-it';    word: string; meaning: string }
  | { type: 'odd-one-out'; word: string; meaning: string; options: string[]; correctIndex: number };

type DrillResult = { word: string; challengeType: DrillChallenge['type']; correct: boolean; userAnswer: string };

const SENTENCE_FEEDBACK_TIMEOUT_MS = 20000;
const VOCAB_SAVE_TIMEOUT_MS = 25000;
const DAILY_VOCAB_BASE_COUNT = 3;
const DAILY_VOCAB_MAX_COUNT = 6;
const DAILY_VOCAB_MAX_BONUS = DAILY_VOCAB_MAX_COUNT - DAILY_VOCAB_BASE_COUNT;
const WORD_BANK_VISIBLE_ROWS = 8;
const WORD_BANK_ROW_HEIGHT = 76;
const VOCAB_FALLBACK_SELECT = [
  'id',
  'user_id',
  'word',
  'meaning',
  'example_sentence',
  'times_used',
  'times_to_master',
  'mastered',
  'source_writing_id',
  'created_at',
].join(', ');

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tokenizeSentence(text: string) {
  return text.toLowerCase().match(/[a-z']+/g)?.filter(Boolean) ?? [];
}

function extractMeaningKeywords(text: string) {
  const stopwords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'because', 'but', 'by', 'for', 'from', 'has', 'have',
    'he', 'her', 'his', 'i', 'in', 'is', 'it', 'its', 'just', 'like', 'me', 'my', 'not', 'of', 'on',
    'or', 'our', 'she', 'so', 'that', 'the', 'their', 'them', 'there', 'they', 'this', 'to', 'was',
    'we', 'were', 'with', 'you', 'your',
  ]);

  return tokenizeSentence(text).filter(token => token.length > 3 && !stopwords.has(token));
}

function buildQuickSentenceFeedback(word: string, meaning: string, sentence: string): SentenceFeedback {
  const trimmed = sentence.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const includesWord = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i').test(trimmed);
  const hasEndingPunctuation = /[.!?]$/.test(trimmed);
  const meaningKeywords = extractMeaningKeywords(meaning);
  const meaningHits = meaningKeywords.filter(keyword => new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i').test(trimmed));
  const meaningOverlap = meaningKeywords.length ? meaningHits.length / meaningKeywords.length : 0;
  const isDetailed = words.length >= 8;

  if (!includesWord) {
    if (meaningOverlap >= 0.35 || (meaningOverlap >= 0.2 && words.length >= 5)) {
      return {
        grade: 'mostly incorrect',
        correct: false,
        strengths: 'You captured part of the idea.',
        improvements: `Try using "${word}" more directly so the meaning is clearer.`,
        summary: 'Close, but not quite.',
        suggestion: '',
      };
    }

    return {
      grade: 'incorrect',
      correct: false,
      strengths: 'Your sentence is saved and ready for feedback.',
      improvements: `Make sure the exact word "${word}" appears in your sentence so the checker can judge how you used it.`,
      summary: 'Add the target word and try again.',
      suggestion: `Try: "${word}" can be used in a clear sentence that shows its meaning.`,
    };
  }

  if (!isDetailed) {
    return {
      grade: 'mostly correct',
      correct: true,
      strengths: `Nice start. You used "${word}" in a clear sentence.`,
      improvements: 'Add a little more detail so the meaning feels stronger and more natural in context.',
      summary: 'Quick feedback is ready while the AI does a deeper check.',
      suggestion: '',
    };
  }

  if (!hasEndingPunctuation) {
    return {
      grade: 'mostly correct',
      correct: true,
      strengths: `Good job using "${word}" in a full idea.`,
      improvements: 'Add ending punctuation to make the sentence feel complete and polished.',
      summary: 'Quick feedback is ready while the AI does a deeper check.',
      suggestion: '',
    };
  }

  return {
    grade: meaningOverlap >= 0.3 ? 'correct' : 'mostly correct',
    correct: true,
    strengths: `Strong start. You used "${word}" in a complete sentence with clear context.`,
    improvements: meaningOverlap >= 0.3
      ? ''
      : 'If you want to level it up, add one vivid detail that makes the meaning even more precise.',
    summary: 'Quick feedback is ready while the AI does a deeper check.',
    suggestion: '',
  };
}

function normalizeVocabWord(word: Partial<VocabWord> & Pick<VocabWord, 'id' | 'user_id' | 'word' | 'meaning' | 'example_sentence' | 'created_at'>): VocabWord {
  const hasSentence = Boolean(word.user_sentence?.trim());
  return {
    id: word.id,
    user_id: word.user_id,
    word: word.word,
    meaning: simplifyMeaning(word.meaning),
    example_sentence: word.example_sentence,
    times_used: word.times_used ?? 0,
    times_to_master: word.times_to_master ?? 5,
    mastered: word.mastered ?? hasSentence,
    source_writing_id: word.source_writing_id ?? null,
    user_sentence: word.user_sentence ?? null,
    sentence_feedback: word.sentence_feedback ?? null,
    created_at: word.created_at,
  };
}

function dedupeVocabWords(words: VocabWord[]) {
  const seen = new Set<string>();
  return words.filter(word => {
    const key = word.word.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function VocabPage() {
  const { profile, refreshProfile } = useAuth();
  const profileId = profile?.id ?? null;
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState<number | null>(null);
  // Which word-bank row is expanded to show sentence + feedback
  const [expandedWord, setExpandedWord] = useState<string | null>(null);

  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  // Sentence practice (always visible on daily cards)
  const [sentences, setSentences] = useState<Record<number, string>>({});
  const [checking, setChecking] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<number, SentenceFeedback>>({});
  const vocabBusy = submitting !== null;
  const deferredSearch = useDeferredValue(search);

  const [bonusCount, setBonusCount] = useState(0);

  const ageGroup   = profile?.age_group ?? '';
  const vocabPool  = getVocabPool(ageGroup);
  const dailyWords = getDailyWords(ageGroup, Math.min(DAILY_VOCAB_BASE_COUNT + bonusCount, DAILY_VOCAB_MAX_COUNT));

  // ─── WEEKLY TEST STATE ───
  const [testOpen, setTestOpen] = useState(false);
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testXP, setTestXP] = useState(0);
  const [testScore, setTestScore] = useState(0);
  const testXPAwarded = useRef(false); // prevent double XP on redo
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vocabMutationLock = useRef(false);
  const vocabReleaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── WORD BANK DRILL STATE ───
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillChallenges, setDrillChallenges] = useState<DrillChallenge[]>([]);
  const [drillIndex, setDrillIndex] = useState(0);
  const [drillAnswer, setDrillAnswer] = useState('');
  const [drillResults, setDrillResults] = useState<DrillResult[]>([]);
  const [drillChecking, setDrillChecking] = useState(false);
  const [drillFeedback, setDrillFeedback] = useState<{ grade?: SentenceFeedbackGrade; correct: boolean; message: string; tip?: string } | null>(null);
  const [drillDone, setDrillDone] = useState(false);
  const [drillXP, setDrillXP] = useState(0);
  const [drillReview, setDrillReview] = useState<{
    summary: string;
    weak_words: string[];
    strong_words: string[];
    next_steps: string;
    encouragement: string;
  } | null>(null);
  const [drillReviewLoading, setDrillReviewLoading] = useState(false);

  const persistSentenceFeedback = useCallback(async (
    wordId: string,
    sentence: string,
    feedbackData: SentenceFeedback,
  ) => {
    const { error: feedbackSaveError } = await supabase
      .from('vocab_words')
      .update({ user_sentence: sentence, sentence_feedback: feedbackData })
      .eq('id', wordId);

    if (feedbackSaveError && !isMissingVocabSentenceColumnError(feedbackSaveError.message)) {
      console.error('Failed to save vocab feedback:', feedbackSaveError.message);
    }
  }, []);

  const recoverTimedOutWord = useCallback(async (word: string) => {
    if (!profileId) return null;

    try {
      const { data, error } = await supabase
        .from('vocab_words')
        .select(VOCAB_FALLBACK_SELECT)
        .eq('user_id', profileId)
        .eq('word', word)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      return normalizeVocabWord(data as unknown as Partial<VocabWord> & Pick<VocabWord, 'id' | 'user_id' | 'word' | 'meaning' | 'example_sentence' | 'created_at'>);
    } catch {
      return null;
    }
  }, [profileId]);

  const recoverTimedOutWordWithRetry = useCallback(async (word: string) => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const recovered = await recoverTimedOutWord(word);
      if (recovered?.id) return recovered;
      if (attempt < 3) {
        await wait(2000);
      }
    }
    return null;
  }, [recoverTimedOutWord]);

  const loadWords = useCallback(async (silent = false) => {
    if (!profileId) return;
    if (!silent) setLoading(true);
    const { data, error } = await supabase
      .from('vocab_words')
      .select('*')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false });

    let loadedRows = data as Partial<VocabWord>[] | null;

    if (error) {
      const fallback = await supabase
        .from('vocab_words')
        .select(VOCAB_FALLBACK_SELECT)
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });

      if (fallback.error) {
        console.error('Failed to load vocab words:', fallback.error.message);
        if (!silent) {
          setWords([]);
          setLoading(false);
        }
        return;
      }

      loadedRows = fallback.data as Partial<VocabWord>[];
    }

    const loaded = (loadedRows || []).map(word =>
      normalizeVocabWord(word as Partial<VocabWord> & Pick<VocabWord, 'id' | 'user_id' | 'word' | 'meaning' | 'example_sentence' | 'created_at'>),
    ).map(word =>
      hydrateVocabWordWithStoredProgress(profileId, word),
    );
    setWords(dedupeVocabWords(loaded));
    if (!silent) setLoading(false);
  }, [profileId]);

  const upsertLocalWord = useCallback((word: VocabWord) => {
    if (!profileId) return;
    const hydrated = hydrateVocabWordWithStoredProgress(profileId, word);
    setWords(prev => {
      const index = prev.findIndex(item => item.id === hydrated.id);
      if (index === -1) return [hydrated, ...prev];
      const next = [...prev];
      next[index] = hydrated;
      return next;
    });
  }, [profileId]);

  const markWordMastered = useCallback(async (wordId: string) => {
    if (!profileId) return;

    try {
      const { error } = await supabase
        .from('vocab_words')
        .update({ mastered: true })
        .eq('id', wordId);

      if (error) {
        console.error('Failed to mark vocab word as mastered:', error.message);
        return;
      }

      setWords(prev => prev.map(item => (
        item.id === wordId
          ? { ...item, mastered: true }
          : item
      )));
    } catch (error) {
      console.error('Failed to mark vocab word as mastered:', error);
    }
  }, [profileId]);

  const requestSentenceFeedback = useCallback(async (
    index: number,
    wordId: string | null,
    word: string,
    meaning: string,
    sentence: string,
  ) => {
    if (!profile) return;

    setChecking(index);

    let nextFeedback: SentenceFeedback | null = null;

    try {
      const res = await fetchWithTimeout(
        '/api/check-vocab-sentence',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word, meaning, sentence, ageGroup: profile.age_group, writingExperienceScore: profile.writing_experience_score ?? 0 }),
        },
        SENTENCE_FEEDBACK_TIMEOUT_MS,
      );

      if (res.ok) {
        const parsed = await res.json();
        const normalized = normalizeSentenceFeedback(parsed);
        if (normalized && (normalized.strengths || normalized.improvements || normalized.summary)) {
          nextFeedback = normalized;
        }
      }
    } catch (error) {
      if (error instanceof FetchTimeoutError) {
        // Keep quick feedback — just append a note to the summary
        setFeedback(prev => {
          const existing = prev[index];
          if (!existing) return prev;
          return { ...prev, [index]: { ...existing, summary: 'AI feedback timed out. Your sentence has been saved.' } };
        });
      }
    } finally {
      setChecking(current => current === index ? null : current);
    }

    // Only overwrite quick feedback if AI returned something meaningful
    if (nextFeedback) {
      setFeedback(prev => ({ ...prev, [index]: nextFeedback! }));
    }
    if (nextFeedback) {
      try {
        writeStoredVocabProgress(profile.id, word, {
          user_sentence: sentence,
          sentence_feedback: nextFeedback,
        });
      } catch (storageError) {
        console.error('Failed to cache final vocab feedback locally:', storageError);
      }

      if (wordId) {
        void persistSentenceFeedback(wordId, sentence, nextFeedback)
          .then(() => {
            setWords(prev => prev.map(item => (
              item.id === wordId
                ? { ...item, user_sentence: sentence, sentence_feedback: nextFeedback! }
                : item
            )));
          })
          .catch(error => {
            console.error('Failed to sync vocab feedback:', error);
          });
      }
    }
  }, [loadWords, persistSentenceFeedback, profile]);

  useEffect(() => { loadWords(); }, [loadWords]);

  // After words load: mark daily cards as saved + pre-fill sentences + restore feedback
  useEffect(() => {
    if (!words.length) return;
    const alreadySaved = new Set<number>();
    const restoredSentences: Record<number, string> = {};
    const restoredFeedback: Record<number, SentenceFeedback> = {};

    dailyWords.forEach((dw, i) => {
      const match = words.find(w => w.word.toLowerCase() === dw.word.toLowerCase());
      if (match) {
        alreadySaved.add(i);
        if (match.user_sentence) restoredSentences[i] = match.user_sentence;
        const normalized = normalizeSentenceFeedback(match.sentence_feedback);
        if (normalized) restoredFeedback[i] = normalized;
      }
    });

    setSaved(alreadySaved);
    setSentences(prev => ({ ...restoredSentences, ...prev })); // don't overwrite live typing
    setFeedback(prev => ({ ...restoredFeedback, ...prev }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words]);

  const submitWord = async (i: number) => {
    const dw = dailyWords[i];
    const sentence = sentences[i]?.trim();
    if (!profile || !sentence) return;
    setSubmitting(i);

    // ── 1. Save/update word in bank with the user's sentence ──
    let wordId: string | null = null;

    if (!saved.has(i)) {
      // First submission: insert new row — mastered immediately on sentence write
      const { data: inserted } = await supabase
        .from('vocab_words')
          .insert({
            user_id: profile.id,
            word: dw.word,
            meaning: dw.meaning,
            example_sentence: dw.example,
            times_used: 1,
            times_to_master: 1,
            mastered: true,
            user_sentence: sentence,
          })
        .select('id')
        .single();
      wordId = inserted?.id ?? null;
      setSaved(prev => new Set(prev).add(i));
      setWords(prev => prev.map(w => w.word.toLowerCase() === dw.word.toLowerCase() ? { ...w, mastered: true, user_sentence: sentence } : w));
      await awardXP(profile.id, XP_REWARDS.VOCAB_SENTENCE, `Vocab sentence: ${dw.word}`);
    } else {
      // Already saved — find existing row and update sentence
      const existing = wordsByNormalized.get(dw.word.toLowerCase());
      wordId = existing?.id ?? null;
      if (wordId) {
        await supabase
          .from('vocab_words')
          .update({ user_sentence: sentence, mastered: true })
          .eq('id', wordId);
        setWords(prev => prev.map(w => w.id === wordId ? { ...w, mastered: true, user_sentence: sentence } : w));
      }
    }

    // ── 2. Get AI feedback ──
    setChecking(i);
    let feedbackData: SentenceFeedback = { correct: false, strengths: '', improvements: 'Could not check — try again.', summary: '', suggestion: '' };
    try {
      const res = await fetch('/api/check-vocab-sentence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: dw.word, meaning: dw.meaning, sentence, ageGroup: profile.age_group, writingExperienceScore: profile.writing_experience_score ?? 0 }),
      });
      if (res.ok) {
        const parsed = await res.json();
        const normalized = normalizeSentenceFeedback(parsed);
        if (normalized) {
          feedbackData = normalized;
        }
      }
    } catch { /* keep error placeholder */ }

    setFeedback(prev => ({ ...prev, [i]: feedbackData }));

    // ── 3. Persist feedback to DB so it survives refresh ──
    if (wordId) {
      await supabase
        .from('vocab_words')
        .update({ user_sentence: sentence, sentence_feedback: feedbackData })
        .eq('id', wordId);
    }

    setChecking(null);
    setSubmitting(null);
  };

  // ─── FRIDAY TEST LOGIC ───
  const submitWordSafe = async (i: number) => {
    if (vocabMutationLock.current || vocabBusy) return;
    const dw = dailyWords[i];
    const sentence = sentences[i]?.trim();
    if (!dw || !sentence) return;
    if (!profile) {
      setFeedback(prev => ({
        ...prev,
        [i]: {
          correct: false,
          strengths: '',
          improvements: 'Your session is not ready right now. Refresh the page and try again.',
          summary: 'We could not save this word yet.',
          suggestion: '',
        },
      }));
      return;
    }
    vocabMutationLock.current = true;
    setSubmitting(i);
    setChecking(i);
    setExpandedCard(i);

    if (vocabReleaseTimer.current) {
      clearTimeout(vocabReleaseTimer.current);
    }
    vocabReleaseTimer.current = setTimeout(() => {
      vocabMutationLock.current = false;
      setSubmitting(current => current === i ? null : current);
      // Don't clear checking here — requestSentenceFeedback manages it
    }, 500);

    setFeedback(prev => ({
      ...prev,
      [i]: buildQuickSentenceFeedback(dw.word, dw.meaning, sentence),
    }));

    void (async () => {
      try {
        try {
          writeStoredVocabProgress(profile.id, dw.word, { user_sentence: sentence });
        } catch (storageError) {
          console.error('Failed to cache vocab sentence locally:', storageError);
        }

        let wordId: string | null = null;

        if (!saved.has(i)) {
          const { data: inserted, error: insertError } = await withPromiseTimeout(
            supabase
              .from('vocab_words')
              .insert({
                user_id: profile.id,
                word: dw.word,
                meaning: dw.meaning,
                example_sentence: dw.example,
                times_used: 0,
                times_to_master: 3,
                mastered: false,
                user_sentence: sentence,
              })
              .select('*')
              .single(),
            VOCAB_SAVE_TIMEOUT_MS,
            'Saving vocab took too long.',
          );

          let insertedId = inserted?.id ?? null;

          if ((insertError || !insertedId) && isMissingVocabSentenceColumnError(insertError?.message)) {
            const fallbackInsert = await withPromiseTimeout(
              supabase
                .from('vocab_words')
                .insert({
                  user_id: profile.id,
                  word: dw.word,
                  meaning: dw.meaning,
                  example_sentence: dw.example,
                  times_used: 0,
                  times_to_master: 3,
                  mastered: false,
                })
                .select('*')
                .single(),
              VOCAB_SAVE_TIMEOUT_MS,
              'Saving vocab took too long.',
            );

          if (!fallbackInsert.error && fallbackInsert.data?.id) {
              insertedId = fallbackInsert.data.id;
              upsertLocalWord(normalizeVocabWord(fallbackInsert.data as Partial<VocabWord> & Pick<VocabWord, 'id' | 'user_id' | 'word' | 'meaning' | 'example_sentence' | 'created_at'>));
            }
          }

          if (!insertedId) {
            setFeedback(prev => ({
              ...prev,
              [i]: {
                correct: false,
                strengths: '',
                improvements: 'We could not save your sentence yet. Please try again.',
                summary: 'Your sentence was not saved this time.',
                suggestion: '',
              },
            }));
            return;
          }

          wordId = insertedId;
          setSaved(prev => new Set(prev).add(i));
          if (inserted) {
            upsertLocalWord(normalizeVocabWord(inserted as Partial<VocabWord> & Pick<VocabWord, 'id' | 'user_id' | 'word' | 'meaning' | 'example_sentence' | 'created_at'>));
          }
          incrementProfileOverride(profile.id, 'vocab_words_saved', 1);
          void (async () => {
            try {
              await supabase.from('profiles')
                .update({ vocab_words_saved: (profile.vocab_words_saved ?? 0) + 1 })
                .eq('id', profile.id);
              await refreshProfile();
            } catch { /* keep save successful even if counter update fails */ }
          })();
          void awardXP(profile.id, XP_REWARDS.VOCAB_SENTENCE, `Vocab sentence: ${dw.word}`).catch(() => {
            // Keep the save successful even if XP update fails.
          });
        } else {
          const existing = wordsByNormalized.get(dw.word.toLowerCase());
          wordId = existing?.id ?? null;

          if (!wordId) {
            setFeedback(prev => ({
              ...prev,
              [i]: {
                correct: false,
                strengths: '',
                improvements: 'We could not find your saved word entry. Please refresh and try again.',
                summary: 'Your sentence could not be updated.',
                suggestion: '',
              },
            }));
            return;
          }

          const { error: updateError } = await withPromiseTimeout(
            supabase
              .from('vocab_words')
              .update({ user_sentence: sentence })
              .eq('id', wordId),
            VOCAB_SAVE_TIMEOUT_MS,
            'Saving vocab took too long.',
          );

          if (updateError && !isMissingVocabSentenceColumnError(updateError.message)) {
            setFeedback(prev => ({
              ...prev,
              [i]: {
                correct: false,
                strengths: '',
                improvements: 'We could not save your latest sentence. Please try again.',
                summary: 'Your update did not go through this time.',
                suggestion: '',
              },
            }));
            return;
          }

          setSaved(prev => new Set(prev).add(i));

          if (existing) {
            upsertLocalWord({
              ...existing,
              user_sentence: sentence,
            });
          }
        }

        if (wordId) {
          void requestSentenceFeedback(i, wordId, dw.word, dw.meaning, sentence);
        }

        void persistWritingExperienceScore(
          profile.id,
          (readWritingExperienceOverride(profile.id) ?? profile.writing_experience_score ?? 0) + getExperienceIncreaseForAction('vocab'),
        ).catch(() => {});
      } catch (error) {
        console.error('submitWordSafe error:', error);
        if (error instanceof PromiseTimeoutError) {
          const recoveredWord = await recoverTimedOutWordWithRetry(dw.word);
          if (recoveredWord?.id) {
            setSaved(prev => new Set(prev).add(i));
            upsertLocalWord(recoveredWord);
          } else {
            setFeedback(prev => ({
              ...prev,
              [i]: {
                correct: false,
                strengths: 'Your sentence is still kept on this device.',
                improvements: 'Cloud save is still not confirmed. The sentence is safe on this device, but please try again in a moment so we can finish syncing it to your word bank.',
                summary: 'We retried the save in the background and it still did not confirm yet.',
                suggestion: '',
              },
            }));
          }
        } else {
          setFeedback(prev => ({
            ...prev,
            [i]: {
              correct: false,
              strengths: 'Your sentence is still kept on this device.',
              improvements: 'We could not save your sentence yet. Please try again.',
              summary: 'Your sentence was not saved this time.',
              suggestion: '',
            },
          }));
        }
      }
    })();
  };

  // ─── WORD BANK DRILL ───
  const startDrill = useCallback(() => {
    if (words.length === 0) return;
    // Prefer unmastered words; fall back to all if fewer than 3 unmastered
    const pool = words.filter(w => !w.mastered).length >= 1
      ? words.filter(w => !w.mastered)
      : words;

    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(8, pool.length));

    // With only 1 word: only recall + use-it. With 4+ words: also odd-one-out.
    const challenges: DrillChallenge[] = shuffled.flatMap((w, idx): DrillChallenge[] => {
      const type = idx % 3 === 0 ? 'recall' : idx % 3 === 1 ? 'use-it' : 'odd-one-out';
      if (type === 'odd-one-out' && pool.length >= 4) {
        const wrongPool = pool.filter(p => p.word !== w.word);
        const wrongs = wrongPool.sort(() => Math.random() - 0.5).slice(0, 3).map(p => p.meaning);
        const allOptions = [w.meaning, ...wrongs].sort(() => Math.random() - 0.5);
        return [{ type: 'odd-one-out', word: w.word, meaning: w.meaning, options: allOptions, correctIndex: allOptions.indexOf(w.meaning) }];
      }
      // Fall back to recall when odd-one-out isn't possible
      return [{ type: (type === 'odd-one-out' ? 'recall' : type) as 'recall' | 'use-it', word: w.word, meaning: w.meaning }];
    });

    setDrillChallenges(challenges);
    setDrillIndex(0);
    setDrillAnswer('');
    setDrillResults([]);
    setDrillFeedback(null);
    setDrillDone(false);
    setDrillXP(0);
    setDrillReview(null);
    setDrillReviewLoading(false);
    setDrillOpen(true);
  }, [words]);

  const submitDrillAnswer = useCallback(async (answerOverride?: string) => {
    const challenge = drillChallenges[drillIndex];
    if (!challenge || drillChecking) return;

    const answer = (answerOverride ?? drillAnswer).trim();
    setDrillChecking(true);

    let correct = false;
    let feedbackGrade: SentenceFeedbackGrade = 'incorrect';
    let message = '';
    let tip: string | undefined;

    if (challenge.type === 'odd-one-out') {
      const selectedIndex = parseInt(answer, 10);
      correct = selectedIndex === (challenge as Extract<DrillChallenge, { type: 'odd-one-out' }>).correctIndex;
      feedbackGrade = correct ? 'correct' : 'incorrect';
      message = correct ? 'Correct! You know this one.' : `Not quite — the right meaning is: "${challenge.meaning}"`;
    } else if (challenge.type === 'recall') {
      // Fuzzy match: graduate based on how many key words in the meaning the user got
      const keyWords = challenge.meaning.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const userWords = answer.toLowerCase();
      const matched = keyWords.length ? keyWords.filter(kw => userWords.includes(kw)).length / keyWords.length : 1;
      if (answer.length <= 3) {
        feedbackGrade = 'incorrect';
        correct = false;
        message = `The meaning is: "${challenge.meaning}"`;
        tip = 'Tip: try to remember the core idea, not word-for-word.';
      } else if (keyWords.length === 0 || matched >= 0.6) {
        feedbackGrade = 'correct';
        correct = true;
        message = 'Great recall! You remembered the meaning.';
      } else if (matched >= 0.3) {
        feedbackGrade = 'mostly correct';
        correct = true;
        message = 'Close! You got the core idea.';
        tip = `The full meaning is: "${challenge.meaning}"`;
      } else if (matched >= 0.1 || answer.split(/\s+/).length >= 3) {
        feedbackGrade = 'mostly incorrect';
        correct = false;
        message = `Almost — the meaning is: "${challenge.meaning}"`;
        tip = 'Tip: focus on the key idea, not exact words.';
      } else {
        feedbackGrade = 'incorrect';
        correct = false;
        message = `The meaning is: "${challenge.meaning}"`;
        tip = 'Tip: try to remember the core idea, not word-for-word.';
      }
    } else {
      // use-it: call the AI to check their sentence
      if (answer.length < 5) {
        correct = false;
        message = 'Write a sentence to continue.';
      } else {
        let fb: SentenceFeedback | null = null;
        try {
          const res = await fetchWithTimeout(
            '/api/check-vocab-sentence',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ word: challenge.word, meaning: challenge.meaning, sentence: answer, ageGroup: profile?.age_group, writingExperienceScore: profile?.writing_experience_score ?? 0 }),
            },
            SENTENCE_FEEDBACK_TIMEOUT_MS,
          );
          if (res.ok) {
            fb = normalizeSentenceFeedback(await res.json());
          }
          if (!fb) {
            fb = buildQuickSentenceFeedback(challenge.word, challenge.meaning, answer);
          }
          feedbackGrade = fb.grade ?? (fb.correct ? 'correct' : 'incorrect');
          correct = fb.correct;
          message = fb.strengths || fb.improvements || (correct ? 'Good sentence!' : 'Try to use the word more clearly.');
          tip = fb.improvements && fb.grade !== 'incorrect' ? fb.improvements : undefined;
        } catch {
          fb = buildQuickSentenceFeedback(challenge.word, challenge.meaning, answer);
          feedbackGrade = fb.grade ?? (fb.correct ? 'correct' : 'incorrect');
          correct = fb.correct;
          message = fb.strengths || fb.improvements || (correct ? 'Good sentence!' : 'Try to use the word more clearly.');
          tip = fb.improvements && fb.grade !== 'incorrect' ? fb.improvements : undefined;
        }
      }
    }

    const result: DrillResult = { word: challenge.word, challengeType: challenge.type, correct, userAnswer: answer };
    const nextResults = [...drillResults, result];
    setDrillResults(nextResults);
    setDrillFeedback({ grade: feedbackGrade, correct, message, tip });
    setDrillChecking(false);

    // Auto-advance after delay
    const delay = challenge.type === 'odd-one-out' ? 1400 : 2200;
    setTimeout(async () => {
      if (drillIndex + 1 >= drillChallenges.length) {
        // ── Drill complete ──
        const correctCount = nextResults.filter(r => r.correct).length;
        const xp = Math.round(correctCount * 6);
        setDrillXP(xp);
        setDrillDone(true);

        // Award XP for the whole session
        if (profile && xp > 0) {
          void awardXP(profile.id, xp, `Word bank drill: ${correctCount}/${nextResults.length} correct`);
          void refreshProfile();
        }

        // Master only words answered correctly in this drill
        nextResults.filter(r => r.correct).forEach(r => {
          const match = words.find(w => w.word.toLowerCase() === r.word.toLowerCase());
          if (match && !match.mastered) void markWordMastered(match.id);
        });

        // Fetch AI review
        setDrillReviewLoading(true);
        try {
          const reviewPayload = nextResults.map(r => {
            const wordObj = words.find(w => w.word.toLowerCase() === r.word.toLowerCase());
            return { word: r.word, meaning: wordObj?.meaning ?? '', challengeType: r.challengeType, correct: r.correct, userAnswer: r.userAnswer };
          });
          const res = await fetch('/api/drill-review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ results: reviewPayload, ageGroup: profile?.age_group ?? '' }),
          });
          if (res.ok) {
            const data = await res.json() as { review: typeof drillReview };
            setDrillReview(data.review);
          }
        } catch {
          // no review — fallback handled in UI
        } finally {
          setDrillReviewLoading(false);
        }
      } else {
        setDrillIndex(prev => prev + 1);
        setDrillAnswer('');
        setDrillFeedback(null);
      }
    }, delay);
  }, [drillChallenges, drillIndex, drillAnswer, drillChecking, drillResults, drillReview, profile, words, markWordMastered, refreshProfile]);

  const generateTest = () => {
    const weekWords = getWeekWords(ageGroup);
    if (weekWords.length < 4) return;
    const shuffled = [...weekWords].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(10, shuffled.length));

    const qs: TestQuestion[] = selected.map(w => {
      const isWordToMeaning = Math.random() > 0.4;
      const question = isWordToMeaning
        ? `What does "${w.word}" mean?`
        : `Which word means: "${w.meaning}"?`;
      const correct = isWordToMeaning ? w.meaning : w.word;

      // Get 3 wrong options from the rest of the pool
      const wrongPool = vocabPool.filter(p => p.word !== w.word);
      const wrongs = wrongPool.sort(() => Math.random() - 0.5).slice(0, 3)
        .map(p => isWordToMeaning ? p.meaning : p.word);

      const allOptions = [correct, ...wrongs].sort(() => Math.random() - 0.5);
      const correctIndex = allOptions.indexOf(correct);

      return { wordItem: { word: w.word, meaning: w.meaning }, question, options: allOptions, correctIndex };
    });

    setTestQuestions(qs);
    setTestAnswers(new Array(qs.length).fill(null));
    setCurrentQ(0);
    setTimeLeft(180);
    setTestSubmitted(false);
    setTestXP(0);
    setTestScore(0);
    testXPAwarded.current = false;
    setTestOpen(true);
  };

  const redoTest = () => {
    // Keep testXPAwarded.current = true so submitTest won't award XP again
    const weekWords2 = getWeekWords(ageGroup);
    if (weekWords2.length < 4) return;
    const shuffled2 = [...weekWords2].sort(() => Math.random() - 0.5);
    const selected2 = shuffled2.slice(0, Math.min(10, shuffled2.length));
    const qs2: TestQuestion[] = selected2.map(w => {
      const isWordToMeaning = Math.random() > 0.4;
      const question = isWordToMeaning ? `What does "${w.word}" mean?` : `Which word means: "${w.meaning}"?`;
      const correct = isWordToMeaning ? w.meaning : w.word;
      const wrongPool = vocabPool.filter(p => p.word !== w.word);
      const wrongs = wrongPool.sort(() => Math.random() - 0.5).slice(0, 3).map(p => isWordToMeaning ? p.meaning : p.word);
      const allOptions = [correct, ...wrongs].sort(() => Math.random() - 0.5);
      return { wordItem: { word: w.word, meaning: w.meaning }, question, options: allOptions, correctIndex: allOptions.indexOf(correct) };
    });
    setTestQuestions(qs2);
    setTestAnswers(new Array(qs2.length).fill(null));
    setCurrentQ(0);
    setTimeLeft(180);
    setTestSubmitted(false);
    setTestXP(0);
    setTestScore(0);
    // testXPAwarded.current stays true — no extra XP on redo
  };

  // Timer
  useEffect(() => {
    if (!testOpen || testSubmitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-submit
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [testOpen, testSubmitted]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0 && testOpen && !testSubmitted) submitTest();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const selectAnswer = (optIndex: number) => {
    if (testSubmitted) return;
    setTestAnswers(prev => {
      const copy = [...prev];
      copy[currentQ] = optIndex;
      return copy;
    });
  };

  const submitTest = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTestSubmitted(true);
    const score = testQuestions.reduce((s, q, i) => s + (testAnswers[i] === q.correctIndex ? 1 : 0), 0);
    setTestScore(score);
    if (!testXPAwarded.current && profile) {
      const xp = XP_REWARDS.VOCAB_TEST_BASE + Math.round((score / testQuestions.length) * 40);
      await awardXP(profile.id, xp, `Weekly vocab test: ${score}/${testQuestions.length}`);
      await supabase.from('vocab_tests').insert({ user_id: profile.id, score, total_questions: testQuestions.length, xp_earned: xp });
      await refreshProfile();
      setTestXP(xp);
      testXPAwarded.current = true;
    }
  };

  const exitTest = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTestOpen(false);
  };

  const wordsByNormalized = useMemo(() => {
    const map = new Map<string, VocabWord>();
    words.forEach(word => {
      const key = word.word.toLowerCase();
      map.set(key, word);
    });
    return map;
  }, [words]);

  const filtered = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return words;
    return words.filter(w =>
      w.word.toLowerCase().includes(query) ||
      w.meaning.toLowerCase().includes(query),
    );
  }, [deferredSearch, words]);

  const visibleWords = useMemo(() => dedupeVocabWords(filtered), [filtered]);

  const mastered = useMemo(() => words.filter(w => w.mastered).length, [words]);
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  // Weekly goal: how many of this week's words are already in the user's bank
  const thisWeekWords = getWeekWords(ageGroup);
  const weekSavedCount = useMemo(
    () => thisWeekWords.filter(ww => wordsByNormalized.has(ww.word.toLowerCase())).length,
    [thisWeekWords, wordsByNormalized],
  );
  const weekGoalTotal = thisWeekWords.length;

  // ─── WORD BANK DRILL OVERLAY ───
  if (drillOpen) {
    const canDrill = words.length >= 1;

    if (drillDone) {
      const correctCount = drillResults.filter(r => r.correct).length;
      const pct = drillResults.length > 0 ? Math.round((correctCount / drillResults.length) * 100) : 0;
      return (
        <div className="animate-fade-in" style={{ background: 'var(--t-bg)', color: 'var(--t-tx)', minHeight: '100vh', padding: '2rem 1.5rem 4rem', overflowY: 'auto' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            {/* Score header */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, var(--t-acc-a), var(--t-acc-b))', border: '1px solid var(--t-acc-b)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Brain style={{ width: 32, height: 32, color: 'var(--t-acc)' }} />
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 900, color: 'var(--t-tx)', marginBottom: 4 }}>
                {pct >= 80 ? 'Excellent recall!' : pct >= 50 ? 'Good effort!' : 'Keep practising!'}
              </h1>
              <p style={{ fontSize: 44, fontWeight: 900, color: 'var(--t-acc)', lineHeight: 1, marginBottom: 4 }}>{correctCount}/{drillResults.length}</p>
              <p style={{ color: 'var(--t-tx3)', fontSize: 14, marginBottom: 16 }}>{pct}% accuracy</p>
              {drillXP > 0 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 14, padding: '9px 20px', color: 'var(--t-acc)', fontWeight: 700, fontSize: 14 }}>
                  <Zap style={{ width: 15, height: 15 }} /> +{drillXP} XP Earned
                </div>
              )}
            </div>

            {/* Per-challenge breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {drillResults.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: r.correct ? tone('var(--t-success)', 7) : tone('var(--t-danger)', 6), border: `1px solid ${r.correct ? tone('var(--t-success)', 20) : tone('var(--t-danger)', 20)}`, borderRadius: 14, padding: '11px 14px' }}>
                  {r.correct
                    ? <CheckCircle style={{ width: 15, height: 15, color: 'var(--t-success)', flexShrink: 0 }} />
                    : <XCircle style={{ width: 15, height: 15, color: 'var(--t-danger)', flexShrink: 0 }} />
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--t-tx)' }}>{r.word}
                      <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--t-tx3)', marginLeft: 8 }}>
                        {r.challengeType === 'recall' ? 'Recall' : r.challengeType === 'use-it' ? 'Use it' : 'Pick meaning'}
                      </span>
                    </p>
                    {!r.correct && r.userAnswer && (
                      <p style={{ fontSize: 11, color: 'var(--t-danger)', marginTop: 2 }}>Your answer: &ldquo;{r.userAnswer.slice(0, 80)}&rdquo;</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* AI Review */}
            {drillReviewLoading && (
              <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 20, padding: '20px 22px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Sparkles style={{ width: 18, height: 18, color: 'var(--t-acc)', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-tx)', marginBottom: 2 }}>AI is reviewing your session…</p>
                  <p style={{ fontSize: 12, color: 'var(--t-tx3)' }}>Analysing your answers to give you personalised feedback.</p>
                </div>
              </div>
            )}

            {drillReview && !drillReviewLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                {/* Summary */}
                <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 20, padding: '18px 20px' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--t-acc)', marginBottom: 8 }}>Session Review</p>
                  <p style={{ fontSize: 14, color: 'var(--t-tx2)', lineHeight: 1.65 }}>{drillReview.summary}</p>
                </div>

                {/* Word tags row */}
                {(drillReview.strong_words.length > 0 || drillReview.weak_words.length > 0) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {drillReview.strong_words.length > 0 && (
                      <div style={{ background: tone('var(--t-success)', 7), border: `1px solid ${tone('var(--t-success)', 20)}`, borderRadius: 16, padding: '14px 16px' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--t-success)', marginBottom: 8 }}>Solid</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {drillReview.strong_words.map(w => (
                            <span key={w} style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-success)', background: tone('var(--t-success)', 12), borderRadius: 8, padding: '3px 9px' }}>{w}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {drillReview.weak_words.length > 0 && (
                      <div style={{ background: tone('var(--t-warning)', 7), border: `1px solid ${tone('var(--t-warning)', 20)}`, borderRadius: 16, padding: '14px 16px' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--t-warning)', marginBottom: 8 }}>Review</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {drillReview.weak_words.map(w => (
                            <span key={w} style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-warning)', background: tone('var(--t-warning)', 12), borderRadius: 8, padding: '3px 9px' }}>{w}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Next steps */}
                {drillReview.next_steps && (
                  <div style={{ background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 16, padding: '14px 16px' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--t-acc)', marginBottom: 6 }}>What to do next</p>
                    <p style={{ fontSize: 13, color: 'var(--t-tx2)', lineHeight: 1.6 }}>{drillReview.next_steps}</p>
                  </div>
                )}

                {/* Encouragement */}
                {drillReview.encouragement && (
                  <p style={{ fontSize: 13, color: 'var(--t-tx3)', fontStyle: 'italic', textAlign: 'center', paddingTop: 4 }}>&ldquo;{drillReview.encouragement}&rdquo;</p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              {canDrill && (
                <button onClick={startDrill} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--t-btn)', color: 'var(--t-btn-color)', borderRadius: 14, padding: '11px 24px', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                  <RotateCcw style={{ width: 14, height: 14 }} /> Drill again
                </button>
              )}
              <button onClick={() => setDrillOpen(false)} style={{ background: 'var(--t-card)', color: 'var(--t-tx2)', borderRadius: 14, padding: '11px 24px', fontWeight: 600, fontSize: 13, border: '1px solid var(--t-brd)', cursor: 'pointer' }}>Back to Vocab</button>
            </div>
          </div>
        </div>
      );
    }

    const challenge = drillChallenges[drillIndex];
    if (!challenge) return null;
    const progress = drillIndex / drillChallenges.length;

    const challengeLabel: Record<DrillChallenge['type'], string> = {
      'recall': 'Recall the meaning',
      'use-it': 'Use it in a sentence',
      'odd-one-out': 'Pick the correct meaning',
    };
    const challengeHint: Record<DrillChallenge['type'], string> = {
      'recall': 'Type what this word means from memory — no peeking!',
      'use-it': 'Write a new sentence using this word correctly.',
      'odd-one-out': 'Select the definition that matches this word.',
    };
    const drillFeedbackGrade = drillFeedback ? (drillFeedback.grade ?? (drillFeedback.correct ? 'correct' : 'incorrect')) : 'incorrect';
    const drillFeedbackStyle = SENTENCE_FEEDBACK_STYLE[drillFeedbackGrade];

    return (
      <div className="animate-fade-in" style={{ background: 'var(--t-bg)', color: 'var(--t-tx)', minHeight: '100vh', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 620, width: '100%' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--t-acc-a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Brain style={{ width: 18, height: 18, color: 'var(--t-acc)' }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--t-tx)' }}>Word Bank Drill</p>
                <p style={{ fontSize: 11, color: 'var(--t-tx3)' }}>{drillIndex + 1} of {drillChallenges.length}</p>
              </div>
            </div>
            <button onClick={() => setDrillOpen(false)} style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--t-card)', border: '1px solid var(--t-brd)', color: 'var(--t-tx3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ height: 5, background: 'var(--t-xp-track)', borderRadius: 99, marginBottom: 28, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress * 100}%`, background: 'var(--t-acc)', borderRadius: 99, transition: 'width 0.4s ease' }} />
          </div>

          {/* Challenge card */}
          <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 28, padding: '2rem', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, var(--t-acc-a), transparent 70%)', pointerEvents: 'none' }} />

            <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--t-acc)', background: 'var(--t-acc-a)', borderRadius: 8, padding: '4px 10px', marginBottom: 16 }}>
              {challengeLabel[challenge.type]}
            </span>

            <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--t-tx)', marginBottom: 8 }}>{challenge.word}</h2>
            <p style={{ fontSize: 13, color: 'var(--t-tx3)', marginBottom: 24 }}>{challengeHint[challenge.type]}</p>

            {/* Input area based on challenge type */}
            {challenge.type === 'odd-one-out' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(challenge as Extract<DrillChallenge, { type: 'odd-one-out' }>).options.map((opt, oi) => {
                  const isSelected = drillAnswer === String(oi);
                  const isCorrect = oi === (challenge as Extract<DrillChallenge, { type: 'odd-one-out' }>).correctIndex;
                  const showResult = drillFeedback !== null;
                  let bg = isSelected ? 'var(--t-acc-a)' : 'var(--t-card2)';
                  let border = isSelected ? 'var(--t-acc)' : 'var(--t-brd)';
                  if (showResult) {
                    bg = isCorrect ? tone('var(--t-success)', 10) : isSelected ? tone('var(--t-danger)', 8) : 'var(--t-card2)';
                    border = isCorrect ? tone('var(--t-success)', 30) : isSelected ? tone('var(--t-danger)', 30) : 'var(--t-brd)';
                  }
                  return (
                    <button
                      key={oi}
                      disabled={!!drillFeedback}
                      onClick={() => {
                        if (drillFeedback) return;
                        setDrillAnswer(String(oi));
                        void submitDrillAnswer(String(oi));
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, background: bg, border: `1.5px solid ${border}`, borderRadius: 16, padding: '14px 18px', cursor: drillFeedback ? 'default' : 'pointer', transition: 'all 0.15s', textAlign: 'left' }}
                    >
                      <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, background: isSelected ? 'var(--t-acc)' : 'color-mix(in srgb, var(--t-brd) 50%, transparent)', color: isSelected ? 'var(--t-btn-color)' : 'var(--t-tx2)' }}>
                        {LABELS[oi]}
                      </div>
                      <span style={{ fontSize: 14, color: isSelected ? 'var(--t-tx)' : 'var(--t-tx2)', fontWeight: isSelected ? 600 : 400 }}>{opt}</span>
                      {showResult && isCorrect && <CheckCircle style={{ width: 16, height: 16, color: 'var(--t-success)', marginLeft: 'auto', flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            )}

            {(challenge.type === 'recall' || challenge.type === 'use-it') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea
                  value={drillAnswer}
                  onChange={e => setDrillAnswer(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && drillAnswer.trim() && !drillChecking && !drillFeedback) { e.preventDefault(); void submitDrillAnswer(); } }}
                  placeholder={challenge.type === 'recall' ? 'Type the meaning…' : `Write a sentence using "${challenge.word}"…`}
                  disabled={!!drillFeedback || drillChecking}
                  rows={challenge.type === 'use-it' ? 3 : 2}
                  autoFocus
                  style={{ background: 'var(--t-bg)', border: `1.5px solid ${drillFeedback ? tone(drillFeedbackStyle.accent, 35) : 'var(--t-brd)'}`, borderRadius: 14, padding: '12px 14px', fontSize: 14, color: 'var(--t-tx)', resize: 'none', outline: 'none', lineHeight: 1.55, transition: 'border-color 0.2s' }}
                />
                <button
                  onClick={() => void submitDrillAnswer()}
                  disabled={!drillAnswer.trim() || drillChecking || !!drillFeedback}
                  style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--t-btn)', color: 'var(--t-btn-color)', borderRadius: 14, padding: '11px 24px', fontWeight: 700, fontSize: 13, border: 'none', cursor: (!drillAnswer.trim() || drillChecking || !!drillFeedback) ? 'default' : 'pointer', opacity: (!drillAnswer.trim() || drillChecking || !!drillFeedback) ? 0.45 : 1, transition: 'opacity 0.2s' }}
                >
                  {drillChecking ? <><Sparkles style={{ width: 14, height: 14 }} /> Checking…</> : <>Check <CheckCircle style={{ width: 14, height: 14 }} /></>}
                </button>
              </div>
            )}
          </div>

          {/* Feedback */}
          {drillFeedback && (
            <div style={{ background: drillFeedbackStyle.background, border: `1px solid ${drillFeedbackStyle.border}`, borderRadius: 20, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {drillFeedbackGrade === 'incorrect'
                  ? <XCircle style={{ width: 18, height: 18, color: drillFeedbackStyle.accent, flexShrink: 0 }} />
                  : drillFeedbackGrade === 'mostly incorrect' || drillFeedbackGrade === 'mostly correct'
                    ? <Sparkles style={{ width: 18, height: 18, color: drillFeedbackStyle.accent, flexShrink: 0 }} />
                    : <CheckCircle style={{ width: 18, height: 18, color: drillFeedbackStyle.accent, flexShrink: 0 }} />
                }
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t-tx)' }}>{drillFeedback.message}</p>
                <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: drillFeedbackStyle.accent, background: tone(drillFeedbackStyle.accent, 10), border: `1px solid ${drillFeedbackStyle.border}`, borderRadius: 999, padding: '3px 8px' }}>
                  {drillFeedbackStyle.label}
                </span>
              </div>
              {drillFeedback.tip && <p style={{ fontSize: 12, color: 'var(--t-tx3)', paddingLeft: 26 }}>{drillFeedback.tip}</p>}
              <p style={{ fontSize: 11, color: drillFeedbackStyle.accent, paddingLeft: 26, fontWeight: 600, marginTop: 2 }}>
                {drillIndex + 1 < drillChallenges.length ? 'Next challenge loading…' : 'Wrapping up…'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── FRIDAY TEST OVERLAY ───
  if (testOpen && !isTestDay()) {
    return (
      <div style={{ background: 'var(--t-bg)', minHeight: '100vh', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Trophy style={{ width: 30, height: 30, color: 'var(--t-acc)' }} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--t-tx)', marginBottom: 12 }}>Tests open Friday to Sunday</h1>
          <p style={{ fontSize: 15, color: 'var(--t-tx3)', lineHeight: 1.65, marginBottom: 28 }}>
            The weekly vocab test is available every <strong style={{ color: 'var(--t-tx2)' }}>Friday, Saturday, and Sunday</strong>.<br />
            Come back then to put your words to the test and earn bonus XP.
          </p>
          <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 16, padding: '16px 20px', marginBottom: 28, display: 'flex', gap: 24, justifyContent: 'center' }}>
            {['Friday', 'Saturday', 'Sunday'].map(day => (
              <div key={day} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-acc)' }}>{day}</p>
                <p style={{ fontSize: 11, color: 'var(--t-tx3)', marginTop: 2 }}>Test available</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setTestOpen(false)}
            style={{ background: 'var(--t-btn)', color: 'var(--t-btn-color)', borderRadius: 14, padding: '12px 32px', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer' }}
          >
            Back to Vocab
          </button>
        </div>
      </div>
    );
  }

  if (testOpen) {
    const q = testQuestions[currentQ];
    const isLast = currentQ === testQuestions.length - 1;
    const isFirst = currentQ === 0;

    if (testSubmitted) {
      const score = testScore;
      const wrong = testQuestions.filter((tq, i) => testAnswers[i] !== tq.correctIndex);
      return (
        <div className="animate-fade-in" style={{ background: 'var(--t-bg)', color: 'var(--t-tx)', minHeight: '100vh', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: 640, width: '100%', textAlign: 'center' }}>
            {/* Trophy icon */}
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, var(--t-acc-a), var(--t-acc-b))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid var(--t-acc-b)' }}>
              <Trophy style={{ width: 32, height: 32, color: 'var(--t-acc)' }} />
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: 'var(--t-tx)', marginBottom: 4 }}>
              {score >= 8 ? 'Outstanding!' : score >= 5 ? 'Well Done!' : 'Keep Practising!'}
            </h1>
            <p style={{ fontSize: 48, fontWeight: 900, color: 'var(--t-acc)', marginBottom: 4 }}>{score}/{testQuestions.length}</p>
            <p style={{ color: 'var(--t-tx3)', fontSize: 14, marginBottom: 16 }}>Score: {Math.round((score / testQuestions.length) * 100)}%</p>

            {testXP > 0 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 14, padding: '10px 24px', color: 'var(--t-acc)', fontWeight: 700, fontSize: 15, marginBottom: 24 }}>
                <Zap style={{ width: 16, height: 16 }} /> +{testXP} XP Earned!
              </div>
            )}

            {/* Results */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', marginTop: 20 }}>
              {testQuestions.map((tq, i) => {
                const correct = testAnswers[i] === tq.correctIndex;
                return (
                  <div key={i} style={{
                    background: correct ? tone('var(--t-success)', 6) : tone('var(--t-danger)', 6),
                    border: `1px solid ${correct ? tone('var(--t-success)', 20) : tone('var(--t-danger)', 20)}`,
                    borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    {correct ? <CheckCircle style={{ width: 16, height: 16, color: 'var(--t-success)', flexShrink: 0, marginTop: 2 }} /> : <XCircle style={{ width: 16, height: 16, color: 'var(--t-danger)', flexShrink: 0, marginTop: 2 }} />}
                    <div>
                      <p style={{ fontWeight: 700, color: 'var(--t-tx)', fontSize: 14 }}>{tq.wordItem.word}</p>
                      <p style={{ color: 'var(--t-tx3)', fontSize: 12 }}>{tq.wordItem.meaning}</p>
                      {!correct && testAnswers[i] !== null && (
                        <p style={{ color: 'var(--t-danger)', fontSize: 12, marginTop: 4 }}>You answered: {tq.options[testAnswers[i]!]}</p>
                      )}
                      {!correct && testAnswers[i] === null && (
                        <p style={{ color: 'var(--t-warning)', fontSize: 12, marginTop: 4 }}>Not answered</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Improvement tips */}
            {wrong.length > 0 && (
              <div style={{ marginTop: 20, background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 20, padding: '16px 20px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Sparkles style={{ width: 15, height: 15, color: 'var(--t-acc)' }} />
                  <span style={{ color: 'var(--t-acc)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>How to improve</span>
                </div>
                <p style={{ color: 'var(--t-tx2)', fontSize: 13, lineHeight: 1.6 }}>
                  Focus on these words this week: <strong style={{ color: 'var(--t-tx)' }}>{wrong.map(w => w.wordItem.word).join(', ')}</strong>.
                  Try using each one in a sentence during your daily writing. The more you practise, the faster they stick.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
              <button onClick={redoTest} style={{ background: 'var(--t-btn)', color: 'var(--t-btn-color)', borderRadius: 14, padding: '11px 24px', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>Redo</button>
              <button onClick={exitTest} style={{ background: 'var(--t-card)', color: 'var(--t-tx2)', borderRadius: 14, padding: '11px 24px', fontWeight: 600, fontSize: 13, border: '1px solid var(--t-brd)', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      );
    }

    // Active test UI
    return (
      <div className="animate-fade-in" style={{ background: 'var(--t-bg)', color: 'var(--t-tx)', minHeight: '100vh', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 640, width: '100%' }}>
          {/* Header: timer + progress + exit */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: timeLeft <= 30 ? tone('var(--t-danger)', 10) : 'var(--t-acc-a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock style={{ width: 16, height: 16, color: timeLeft <= 30 ? 'var(--t-danger)' : 'var(--t-acc)' }} />
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: timeLeft <= 30 ? 'var(--t-danger)' : 'var(--t-tx)' }}>
                {mins}:{secs.toString().padStart(2, '0')}
              </span>
            </div>
            <p style={{ color: 'var(--t-tx3)', fontSize: 13, fontWeight: 600 }}>Question {currentQ + 1} of {testQuestions.length}</p>
            <button
              onClick={exitTest}
              title="Exit test (saves progress)"
              style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--t-card)', border: '1px solid var(--t-brd)', color: 'var(--t-tx3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
            {testQuestions.map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1, height: 5, borderRadius: 99,
                  background: i === currentQ ? 'var(--t-acc)' : testAnswers[i] !== null ? 'var(--t-acc)' : 'var(--t-xp-track)',
                  opacity: i === currentQ ? 1 : testAnswers[i] !== null ? 0.6 : 0.3,
                  transition: 'all 0.2s', cursor: 'pointer',
                }}
                onClick={() => setCurrentQ(i)}
              />
            ))}
          </div>

          {/* Question card */}
          <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 28, padding: '2rem', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
            {/* Ambient glow */}
            <div style={{ position: 'absolute', top: -60, right: -60, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, var(--t-acc-a), transparent 70%)', pointerEvents: 'none' }} />
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--t-acc)', marginBottom: 16, position: 'relative' }}>
              Weekly Vocab Test
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--t-tx)', lineHeight: 1.4, marginBottom: 24, position: 'relative' }}>
              {q.question}
            </h2>

            {/* Options A B C D */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
              {q.options.map((opt, oi) => {
                const isSelected = testAnswers[currentQ] === oi;
                return (
                  <button
                    key={oi}
                    onClick={() => selectAnswer(oi)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      background: isSelected ? 'var(--t-acc-a)' : 'var(--t-card2)',
                      border: `1.5px solid ${isSelected ? 'var(--t-acc)' : 'var(--t-brd)'}`,
                      borderRadius: 16, padding: '14px 18px', cursor: 'pointer',
                      transition: 'all 0.15s', textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800,
                      background: isSelected ? 'var(--t-acc)' : 'color-mix(in srgb, var(--t-brd) 60%, transparent)',
                      color: isSelected ? 'var(--t-btn-color)' : 'var(--t-tx2)',
                    }}>
                      {LABELS[oi]}
                    </div>
                    <span style={{ fontSize: 14, color: isSelected ? 'var(--t-tx)' : 'var(--t-tx2)', fontWeight: isSelected ? 600 : 400 }}>
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation: Previous / Next or Submit */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            {!isFirst ? (
              <button
                onClick={() => setCurrentQ(q => q - 1)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--t-card)', border: '1px solid var(--t-brd)',
                  color: 'var(--t-tx2)', borderRadius: 14, padding: '11px 20px',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <ChevronLeft style={{ width: 16, height: 16 }} /> Previous
              </button>
            ) : <div />}

            {isLast ? (
              <button
                onClick={submitTest}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--t-btn)', color: 'var(--t-btn-color)',
                  borderRadius: 14, padding: '11px 24px',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
                }}
              >
                Submit <CheckCircle style={{ width: 15, height: 15 }} />
              </button>
            ) : (
              <button
                onClick={() => setCurrentQ(q => q + 1)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)',
                  color: 'var(--t-acc)', borderRadius: 14, padding: '11px 20px',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Next <ChevronRight style={{ width: 16, height: 16 }} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── MAIN VOCAB PAGE ───
  return (
    <div className="min-h-screen animate-fade-in" style={{ background: 'var(--t-bg)', color: 'var(--t-tx)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 2rem 4rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

        {/* ══════════════════════════════════════
            PAGE HEADER
        ══════════════════════════════════════ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--t-acc-a), var(--t-acc-b))', border: '1px solid var(--t-acc-b)', boxShadow: '0 4px 20px var(--t-acc-a)', flexShrink: 0 }}>
            <GraduationCap style={{ width: 28, height: 28, color: 'var(--t-acc)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--t-tx)', lineHeight: 1.1 }}>
              Vocabulary
            </h1>
            <p style={{ color: 'var(--t-tx3)', fontSize: 14, marginTop: 2 }}>
              Learn new words, practise sentences, and build your word bank
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            {words.length >= 1 && (
              <button
                onClick={startDrill}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  background: 'var(--t-card)', color: 'var(--t-tx2)',
                  border: '1.5px solid var(--t-brd)',
                  borderRadius: 14, padding: '11px 20px', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                <Brain style={{ width: 17, height: 17 }} />
                Drill
              </button>
            )}
            <button
              onClick={isTestDay() ? generateTest : () => setTestOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: 'var(--t-btn)', color: 'var(--t-btn-color)',
                borderRadius: 14, padding: '11px 20px', fontSize: 14, fontWeight: 700,
                border: 'none', cursor: 'pointer', flexShrink: 0,
              }}
            >
              <Trophy style={{ width: 17, height: 17 }} />
              Weekly Test
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════
            STAT CARDS ROW
        ══════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {/* Words in Bank */}
          <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 20, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${tone('var(--t-mod-write)', 10)}, transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: tone('var(--t-mod-write)', 12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen style={{ width: 16, height: 16, color: 'var(--t-mod-write)' }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--t-tx3)' }}>Words in Bank</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--t-tx)', lineHeight: 1 }}>{words.length}</p>
          </div>

          {/* Mastered */}
          <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 20, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${tone('var(--t-success)', 10)}, transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: tone('var(--t-success)', 12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star style={{ width: 16, height: 16, color: 'var(--t-success)' }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--t-tx3)' }}>Mastered</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--t-tx)', lineHeight: 1 }}>{mastered}</p>
          </div>

          {/* Weekly Goal */}
          <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 20, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${tone('var(--t-mod-coach)', 10)}, transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: tone('var(--t-mod-coach)', 12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap style={{ width: 16, height: 16, color: 'var(--t-mod-coach)' }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--t-tx3)' }}>Weekly Goal</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 900, color: weekSavedCount >= weekGoalTotal ? 'var(--t-success)' : 'var(--t-tx)', lineHeight: 1 }}>
              {weekSavedCount}<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--t-tx3)' }}>/{weekGoalTotal}</span>
            </p>
            <p style={{ fontSize: 11, color: weekSavedCount >= weekGoalTotal ? 'var(--t-success)' : 'var(--t-tx3)', marginTop: 4 }}>
              {weekSavedCount >= weekGoalTotal ? 'All weekly words done!' : 'words this week'}
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════
            3 DAILY WORD CARDS
        ══════════════════════════════════════ */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Sparkles style={{ width: 16, height: 16, color: 'var(--t-acc)' }} />
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t-tx)' }}>Today&apos;s Words</h2>
            <span style={{ fontSize: 11, color: 'var(--t-tx3)', fontWeight: 600 }}>{dailyWords.length} words today</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {dailyWords.map((dw, i) => {
              const t = CARD_THEMES[i % CARD_THEMES.length];
              const typedSentence = (sentences[i] || '').trim();
              const storedWord = wordsByNormalized.get(dw.word.toLowerCase());
              const storedSentence = storedWord?.user_sentence?.trim() || '';
              const fb = normalizeSentenceFeedback(feedback[i] || storedWord?.sentence_feedback);
              const fbStyle = fb ? getSentenceFeedbackStyle(fb) : null;
              const fbGrade = fb ? getSentenceFeedbackGrade(fb) : 'incorrect';
              const hasFeedback = Boolean(fb);
              const needsSubmit = !saved.has(i) || typedSentence !== storedSentence || !hasFeedback;
              const isActiveCard = submitting === i;
              const isCardExpanded = expandedCard === i;
              return (
                <div key={dw.word} style={{
                  background: 'var(--t-card)',
                  border: '1px solid var(--t-brd)',
                  borderTop: `4px solid ${t.topBorder}`,
                  borderRadius: 20,
                  display: 'flex', flexDirection: 'column',
                  position: 'relative', overflow: 'hidden',
                  transition: 'box-shadow 0.2s',
                }}>
                  {/* Subtle radial glow per card */}
                  <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)`, pointerEvents: 'none' }} />

                  {/* Collapsed header — always visible, clickable */}
                  <button onClick={() => setExpandedCard(isCardExpanded ? null : i)} style={{ all: 'unset', cursor: 'pointer', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
                    {/* Card number badge + label */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--t-acc-a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t-acc)', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--t-acc)', opacity: 0.8 }}>Word of the day</p>
                      </div>
                      {isCardExpanded
                        ? <ChevronUp style={{ width: 15, height: 15, color: 'var(--t-tx3)', flexShrink: 0 }} />
                        : <ChevronDown style={{ width: 15, height: 15, color: 'var(--t-tx3)', flexShrink: 0 }} />}
                    </div>

                    {/* Word + meaning */}
                    <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--t-tx)', lineHeight: 1.1 }}>{dw.word}</h2>
                    <p style={{ fontSize: 14, color: 'var(--t-tx2)', lineHeight: 1.6 }}>{dw.meaning}</p>

                    {/* Example box */}
                    <div style={{ background: 'var(--t-bg)', border: '1px solid var(--t-brd)', borderRadius: 14, padding: '12px 14px' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--t-tx3)', marginBottom: 4 }}>Example</p>
                      <p style={{ fontSize: 13, color: 'var(--t-tx3)', fontStyle: 'italic', lineHeight: 1.5 }}>&ldquo;{dw.example}&rdquo;</p>
                    </div>
                  </button>

                  {/* Expanded section — sentence practice */}
                  {isCardExpanded && <div style={{ borderTop: '1px solid var(--t-brd)', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <textarea
                      value={sentences[i] || ''}
                      onChange={e => setSentences(prev => ({ ...prev, [i]: e.target.value }))}
                      placeholder={`Write a sentence using "${dw.word}"…`}
                      rows={2}
                      disabled={vocabBusy}
                      style={{ background: 'var(--t-bg)', border: '1px solid var(--t-brd)', borderRadius: 12, padding: '10px 12px', fontSize: 13, color: 'var(--t-tx)', resize: 'none', outline: 'none', lineHeight: 1.5, opacity: vocabBusy ? 0.7 : 1 }}
                    />
                    {fb && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: fbStyle?.background ?? 'var(--t-acc-a)', border: `1px solid ${fbStyle?.border ?? 'var(--t-brd-a)'}`, borderRadius: 16, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 20, height: 20, borderRadius: 6, background: fbStyle?.icon ?? tone('var(--t-acc)', 16), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {fbGrade === 'incorrect'
                              ? <XCircle style={{ width: 12, height: 12, color: fbStyle?.accent ?? 'var(--t-danger)' }} />
                              : fbGrade === 'mostly incorrect' || fbGrade === 'mostly correct'
                                ? <Sparkles style={{ width: 12, height: 12, color: fbStyle?.accent ?? 'var(--t-acc)' }} />
                                : <CheckCircle style={{ width: 12, height: 12, color: fbStyle?.accent ?? 'var(--t-success)' }} />
                            }
                          </div>
                          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: fbStyle?.accent ?? 'var(--t-acc)' }}>AI Feedback</p>
                          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: fbStyle?.accent ?? 'var(--t-acc)', background: tone(fbStyle?.accent ?? 'var(--t-acc)', 10), border: `1px solid ${fbStyle?.border ?? 'var(--t-brd-a)'}`, borderRadius: 999, padding: '3px 8px' }}>
                            {fbStyle?.label ?? 'Feedback'}
                          </span>
                        </div>
                        {checking === i && (
                          <p style={{ fontSize: 11, color: 'var(--t-tx3)', fontWeight: 600, paddingLeft: 2 }}>
                            Quick feedback is ready. AI is polishing it now...
                          </p>
                        )}
                        {fb.strengths && (
                          <div style={{ background: tone(fbStyle?.accent ?? 'var(--t-success)', 8), border: `1px solid ${tone(fbStyle?.accent ?? 'var(--t-success)', 20)}`, borderRadius: 12, padding: '10px 12px' }}>
                            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: fbStyle?.accent ?? 'var(--t-success)', marginBottom: 4 }}>What&apos;s good</p>
                            <p style={{ fontSize: 12, color: 'var(--t-tx2)', lineHeight: 1.5 }}>{fb.strengths}</p>
                          </div>
                        )}
                        {fb.improvements && (
                          <div style={{ background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 12, padding: '10px 12px' }}>
                            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t-acc)', marginBottom: 4 }}>Improve</p>
                            <p style={{ fontSize: 12, color: 'var(--t-tx2)', lineHeight: 1.5 }}>{fb.improvements}</p>
                          </div>
                        )}
                        {fb.suggestion && (
                          <p style={{ fontSize: 12, color: 'var(--t-tx3)', fontStyle: 'italic', paddingLeft: 4 }}>Try: &ldquo;{fb.suggestion}&rdquo;</p>
                        )}
                        {fb.summary && (
                          <p style={{ fontSize: 12, color: fbStyle?.accent ?? 'var(--t-tx3)', fontWeight: 600, paddingLeft: 4 }}>{fb.summary}</p>
                        )}
                      </div>
                    )}
                    {/* Single Submit button — disabled until sentence written */}
                    <button
                      onClick={() => submitWordSafe(i)}
                      disabled={vocabBusy || !typedSentence || !needsSubmit}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        borderRadius: 12, padding: '10px', fontSize: 12, fontWeight: 700, border: 'none',
                        cursor: (vocabBusy || !typedSentence || !needsSubmit) ? 'default' : 'pointer',
                        background: !needsSubmit ? tone('var(--t-success)', 12) : 'var(--t-btn)',
                        color: !needsSubmit ? 'var(--t-success)' : 'var(--t-btn-color)',
                        opacity: (!typedSentence || (vocabBusy && !isActiveCard)) ? 0.4 : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      {isActiveCard
                        ? <><Sparkles style={{ width: 13, height: 13 }} /> Saving...</>
                        : !needsSubmit
                          ? <><CheckCircle style={{ width: 14, height: 14 }} /> Submitted</>
                          : saved.has(i)
                            ? <><BookMarked style={{ width: 14, height: 14 }} /> Update</>
                            : <><BookMarked style={{ width: 14, height: 14 }} /> Submit</>
                      }
                    </button>
                  </div>}
                </div>
              );
            })}
          </div>

          {/* "Get more words" — shown after all base 3 words are submitted */}
          {[0, 1, 2].every(i => saved.has(i)) && bonusCount < DAILY_VOCAB_MAX_BONUS && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
              <button
                onClick={() => setBonusCount(prev => Math.min(prev + 1, DAILY_VOCAB_MAX_BONUS))}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'var(--t-acc-a)', border: '1.5px solid var(--t-brd-a)',
                  color: 'var(--t-acc)', borderRadius: 14, padding: '11px 24px',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                <Sparkles style={{ width: 16, height: 16 }} />
                Get more words
              </button>
            </div>
          )}
          {[0, 1, 2].every(i => saved.has(i)) && bonusCount >= DAILY_VOCAB_MAX_BONUS && (
            <p style={{ textAlign: 'center', marginTop: 8, color: 'var(--t-tx3)', fontSize: 13 }}>
              You have reached today&apos;s vocab limit of {DAILY_VOCAB_MAX_COUNT} words.
            </p>
          )}
        </div>

        {/* ══════════════════════════════════════
            WORD BANK
        ══════════════════════════════════════ */}
        <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 24, overflow: 'hidden' }}>
          {/* Word bank header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--t-brd)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--t-acc-a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen style={{ width: 16, height: 16, color: 'var(--t-acc)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t-tx)' }}>Word Bank</h2>
                <span style={{ fontSize: 12, color: 'var(--t-tx3)', fontWeight: 600, background: 'var(--t-card2)', borderRadius: 8, padding: '2px 8px' }}>{visibleWords.length}</span>
                <p style={{ color: 'var(--t-tx3)', fontSize: 13 }}>
                  Doing a Drill is how you master a word.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--t-bg)', border: '1px solid var(--t-brd)', borderRadius: 12, padding: '8px 14px' }}>
              <Search style={{ width: 14, height: 14, color: 'var(--t-tx3)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search words..."
                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--t-tx)', fontSize: 13, width: 140 }} />
            </div>
          </div>

          {loading ? (
            <div style={{ maxHeight: WORD_BANK_VISIBLE_ROWS * WORD_BANK_ROW_HEIGHT, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => <div key={i} style={{ background: 'var(--t-card2)', borderRadius: 16, height: 56 }} />)}
            </div>
          ) : visibleWords.length === 0 ? (
            <div style={{ maxHeight: WORD_BANK_VISIBLE_ROWS * WORD_BANK_ROW_HEIGHT, overflowY: 'auto', padding: '3rem 2rem', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--t-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <GraduationCap style={{ width: 24, height: 24, color: 'var(--t-tx3)' }} />
              </div>
              <p style={{ color: 'var(--t-tx)', fontWeight: 700, marginBottom: 4 }}>{search ? 'No words found' : 'Your word bank is empty'}</p>
              <p style={{ color: 'var(--t-tx3)', fontSize: 13 }}>{search ? 'Try a different search' : "Save today's words above to start building your bank"}</p>
            </div>
          ) : (
            <div style={{ maxHeight: WORD_BANK_VISIBLE_ROWS * WORD_BANK_ROW_HEIGHT, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {visibleWords.map((w, rowIdx) => {
                const isExpanded = expandedWord === w.id;
                const fb = normalizeSentenceFeedback(w.sentence_feedback);
                const fbStyle = fb ? getSentenceFeedbackStyle(fb) : null;
                const fbGrade = fb ? getSentenceFeedbackGrade(fb) : 'incorrect';
                const hasSentence = !!w.user_sentence;
                return (
                  <div key={w.id} style={{ borderBottom: rowIdx < visibleWords.length - 1 ? '1px solid color-mix(in srgb, var(--t-brd) 50%, transparent)' : 'none' }}>
                    {/* ── Summary row ── */}
                    <div
                      onClick={() => {
                        if (!hasSentence) return;
                        setExpandedWord(isExpanded ? null : w.id);
                      }}
                      style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 3fr auto', gap: 16, padding: '14px 24px', alignItems: 'center', cursor: hasSentence ? 'pointer' : 'default' }}
                    >
                      <span style={{ fontWeight: 700, color: 'var(--t-tx)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {w.mastered && <Star style={{ width: 13, height: 13, color: 'var(--t-acc)' }} />}{w.word}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--t-tx2)' }}>{w.meaning}</span>
                      <span style={{ fontSize: 12, color: 'var(--t-tx3)', fontStyle: 'italic' }}>{w.example_sentence}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                        {w.mastered
                          ? <CheckCircle style={{ width: 16, height: 16, color: 'var(--t-success)' }} />
                          : <span style={{ fontSize: 12, color: 'var(--t-tx3)' }}>{w.times_used}/{w.times_to_master}</span>
                        }
                        {hasSentence && (
                          isExpanded
                            ? <ChevronUp style={{ width: 14, height: 14, color: 'var(--t-tx3)', flexShrink: 0 }} />
                            : <ChevronDown style={{ width: 14, height: 14, color: 'var(--t-tx3)', flexShrink: 0 }} />
                        )}
                      </div>
                    </div>

                    {/* ── Expanded sentence + feedback panel ── */}
                    {isExpanded && hasSentence && (
                      <div style={{
                        margin: '0 16px 14px',
                        background: 'var(--t-bg)',
                        border: '1px solid var(--t-brd)',
                        borderRadius: 16,
                        padding: '16px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}>
                        {/* User's sentence */}
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--t-tx3)', marginBottom: 5 }}>
                            My Practice Sentence
                          </p>
                          <p style={{ fontSize: 14, color: 'var(--t-tx)', lineHeight: 1.6, fontStyle: 'italic' }}>
                            &ldquo;{w.user_sentence}&rdquo;
                          </p>
                        </div>

                        {/* AI feedback if present */}
                        {fb && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: fbStyle?.background ?? 'var(--t-acc-a)', border: `1px solid ${fbStyle?.border ?? 'var(--t-brd-a)'}`, borderRadius: 16, padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 20, height: 20, borderRadius: 6, background: fbStyle?.icon ?? tone('var(--t-acc)', 16), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {fbGrade === 'incorrect'
                                  ? <XCircle style={{ width: 12, height: 12, color: fbStyle?.accent ?? 'var(--t-danger)' }} />
                                  : fbGrade === 'mostly incorrect' || fbGrade === 'mostly correct'
                                    ? <Sparkles style={{ width: 12, height: 12, color: fbStyle?.accent ?? 'var(--t-acc)' }} />
                                    : <CheckCircle style={{ width: 12, height: 12, color: fbStyle?.accent ?? 'var(--t-success)' }} />
                                }
                              </div>
                              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: fbStyle?.accent ?? 'var(--t-acc)' }}>
                                AI Feedback
                              </p>
                              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: fbStyle?.accent ?? 'var(--t-acc)', background: tone(fbStyle?.accent ?? 'var(--t-acc)', 10), border: `1px solid ${fbStyle?.border ?? 'var(--t-brd-a)'}`, borderRadius: 999, padding: '3px 8px' }}>
                                {fbStyle?.label ?? 'Feedback'}
                              </span>
                            </div>
                            {fb.strengths && (
                              <div style={{ background: tone(fbStyle?.accent ?? 'var(--t-success)', 7), border: `1px solid ${tone(fbStyle?.accent ?? 'var(--t-success)', 18)}`, borderRadius: 10, padding: '9px 12px' }}>
                                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: fbStyle?.accent ?? 'var(--t-success)', marginBottom: 3 }}>What&apos;s good</p>
                                <p style={{ fontSize: 12, color: 'var(--t-tx2)', lineHeight: 1.5 }}>{fb.strengths}</p>
                              </div>
                            )}
                            {fb.improvements && (
                              <div style={{ background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 10, padding: '9px 12px' }}>
                                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t-acc)', marginBottom: 3 }}>To improve</p>
                                <p style={{ fontSize: 12, color: 'var(--t-tx2)', lineHeight: 1.5 }}>{fb.improvements}</p>
                              </div>
                            )}
                            {fb.suggestion && (
                              <p style={{ fontSize: 12, color: 'var(--t-tx3)', fontStyle: 'italic', paddingLeft: 4 }}>💡 Try: &ldquo;{fb.suggestion}&rdquo;</p>
                            )}
                            {fb.summary && (
                              <p style={{ fontSize: 12, color: fbStyle?.accent ?? 'var(--t-tx3)', fontWeight: 600, paddingLeft: 4 }}>{fb.summary}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
