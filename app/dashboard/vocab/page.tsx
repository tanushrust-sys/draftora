'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/app/lib/supabase';
import { awardXP, XP_REWARDS } from '@/app/lib/xp';
import { getWeekWords, getVocabPool, VOCAB_FALLBACK } from '@/app/lib/vocab-utils';
import type { VocabWord } from '@/app/types/database';
import {
  GraduationCap, BookOpen, Trophy, Star, Search, PenLine,
  CheckCircle, XCircle, Sparkles, BookMarked, Zap,
  X, ChevronLeft, ChevronRight, Clock,
} from 'lucide-react';

// ─── Daily word selection (3 per day, deterministic, age-aware) ───
function getDailyWords(pool: { word: string; meaning: string; example: string }[]) {
  const today = new Date();
  const dayNum = Math.floor(today.getTime() / 86400000);
  const len = pool.length;
  return [
    pool[dayNum % len],
    pool[(dayNum + Math.floor(len / 3)) % len],
    pool[(dayNum + Math.floor(2 * len / 3)) % len],
  ];
}


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

export default function VocabPage() {
  const { profile, refreshProfile } = useAuth();
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState<number | null>(null);

  // Sentence practice (always visible)
  const [sentences, setSentences] = useState<Record<number, string>>({});
  const [checking, setChecking] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<number, { correct: boolean; strengths: string; improvements: string; summary: string; suggestion: string }>>({});

  const ageGroup   = (profile as { age_group?: string })?.age_group;
  const vocabPool  = getVocabPool(ageGroup) || VOCAB_FALLBACK;
  const dailyWords = getDailyWords(vocabPool);

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

  const loadWords = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase.from('vocab_words').select('*').eq('user_id', profile.id).order('created_at', { ascending: false });
    setWords(data || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadWords(); }, [loadWords]);

  useEffect(() => {
    if (!words.length) return;
    const alreadySaved = new Set<number>();
    dailyWords.forEach((dw, i) => {
      if (words.some(w => w.word.toLowerCase() === dw.word.toLowerCase())) alreadySaved.add(i);
    });
    setSaved(alreadySaved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words]);

  const submitWord = async (i: number) => {
    const dw = dailyWords[i];
    const sentence = sentences[i]?.trim();
    if (!profile || !sentence) return;
    setSubmitting(i);

    // Save to bank if not already saved
    if (!saved.has(i)) {
      await supabase.from('vocab_words').insert({
        user_id: profile.id, word: dw.word, meaning: dw.meaning,
        example_sentence: dw.example, times_used: 0, times_to_master: 3, mastered: false,
      });
      setSaved(prev => new Set(prev).add(i));
      await awardXP(profile.id, XP_REWARDS.VOCAB_SENTENCE, `Vocab sentence: ${dw.word}`);
      await loadWords();
    }

    // Check sentence in the background for feedback
    setChecking(i);
    try {
      const res = await fetch('/api/check-vocab-sentence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: dw.word, meaning: dw.meaning, sentence }),
      });
      const data = await res.json();
      setFeedback(prev => ({ ...prev, [i]: data }));
    } catch {
      setFeedback(prev => ({ ...prev, [i]: { correct: false, strengths: '', improvements: 'Could not check — try again.', summary: '', suggestion: '' } }));
    }
    setChecking(null);
    setSubmitting(null);
  };

  // ─── FRIDAY TEST LOGIC ───
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

  const filtered = words.filter(w => w.word.toLowerCase().includes(search.toLowerCase()) || w.meaning.toLowerCase().includes(search.toLowerCase()));
  const mastered = words.filter(w => w.mastered).length;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  // Weekly goal: how many of this week's words are already in the user's bank
  const thisWeekWords = getWeekWords(ageGroup);
  const weekSavedCount = thisWeekWords.filter(ww =>
    words.some(uw => uw.word.toLowerCase() === ww.word.toLowerCase())
  ).length;
  const weekGoalTotal = thisWeekWords.length;

  // ─── FRIDAY TEST OVERLAY ───
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
      <div className="max-w-5xl mx-auto" style={{ padding: '2rem 2rem 4rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

        {/* ══════════════════════════════════════
            PAGE HEADER
        ══════════════════════════════════════ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--t-acc-a), var(--t-acc-b))', border: '1px solid var(--t-acc-b)', boxShadow: '0 4px 20px var(--t-acc-a)', flexShrink: 0 }}>
            <GraduationCap style={{ width: 28, height: 28, color: 'var(--t-acc)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--t-tx)', lineHeight: 1.1 }}>
              Vocabulary
            </h1>
            <p style={{ color: 'var(--t-tx3)', fontSize: 14, marginTop: 2 }}>
              Learn new words, practise sentences, and build your word bank
            </p>
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
            <span style={{ fontSize: 11, color: 'var(--t-tx3)', fontWeight: 600 }}>3 new words every day</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {dailyWords.map((dw, i) => {
              const t = CARD_THEMES[i];
              return (
                <div key={dw.word} style={{
                  background: 'var(--t-card)',
                  border: '1px solid var(--t-brd)',
                  borderTop: `4px solid ${t.topBorder}`,
                  borderRadius: 20, padding: '1.5rem',
                  display: 'flex', flexDirection: 'column', gap: 14,
                  position: 'relative', overflow: 'hidden',
                  transition: 'box-shadow 0.2s',
                }}>
                  {/* Subtle radial glow per card */}
                  <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)`, pointerEvents: 'none' }} />

                  {/* Card number badge + label */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--t-acc-a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t-acc)', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--t-acc)', opacity: 0.8 }}>Word of the day</p>
                  </div>

                  {/* Word + meaning */}
                  <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--t-tx)', lineHeight: 1.1, position: 'relative' }}>{dw.word}</h2>
                  <p style={{ fontSize: 14, color: 'var(--t-tx2)', lineHeight: 1.6 }}>{dw.meaning}</p>

                  {/* Example box */}
                  <div style={{ background: 'var(--t-bg)', border: '1px solid var(--t-brd)', borderRadius: 14, padding: '12px 14px' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--t-tx3)', marginBottom: 4 }}>Example</p>
                    <p style={{ fontSize: 13, color: 'var(--t-tx3)', fontStyle: 'italic', lineHeight: 1.5 }}>&ldquo;{dw.example}&rdquo;</p>
                  </div>

                  {/* Sentence practice — always visible */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <textarea
                      value={sentences[i] || ''}
                      onChange={e => setSentences(prev => ({ ...prev, [i]: e.target.value }))}
                      placeholder={`Write a sentence using "${dw.word}"…`}
                      rows={2}
                      disabled={saved.has(i)}
                      style={{ background: 'var(--t-bg)', border: '1px solid var(--t-brd)', borderRadius: 12, padding: '10px 12px', fontSize: 13, color: 'var(--t-tx)', resize: 'none', outline: 'none', lineHeight: 1.5, opacity: saved.has(i) ? 0.6 : 1 }}
                    />
                    {feedback[i] && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {feedback[i].strengths && (
                          <div style={{ background: tone('var(--t-success)', 8), border: `1px solid ${tone('var(--t-success)', 20)}`, borderRadius: 12, padding: '10px 12px' }}>
                            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t-success)', marginBottom: 4 }}>What&apos;s good</p>
                            <p style={{ fontSize: 12, color: 'var(--t-tx2)', lineHeight: 1.5 }}>{feedback[i].strengths}</p>
                          </div>
                        )}
                        {feedback[i].improvements && (
                          <div style={{ background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 12, padding: '10px 12px' }}>
                            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t-acc)', marginBottom: 4 }}>Improve</p>
                            <p style={{ fontSize: 12, color: 'var(--t-tx2)', lineHeight: 1.5 }}>{feedback[i].improvements}</p>
                          </div>
                        )}
                        {feedback[i].suggestion && (
                          <p style={{ fontSize: 12, color: 'var(--t-tx3)', fontStyle: 'italic', paddingLeft: 4 }}>Try: &ldquo;{feedback[i].suggestion}&rdquo;</p>
                        )}
                        {feedback[i].summary && (
                          <p style={{ fontSize: 12, color: 'var(--t-tx3)', fontWeight: 600, paddingLeft: 4 }}>{feedback[i].summary}</p>
                        )}
                      </div>
                    )}
                    {/* Single Submit button — disabled until sentence written */}
                    <button
                      onClick={() => submitWord(i)}
                      disabled={saved.has(i) || submitting === i || checking === i || !sentences[i]?.trim()}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        borderRadius: 12, padding: '10px', fontSize: 12, fontWeight: 700, border: 'none',
                        cursor: (saved.has(i) || !sentences[i]?.trim()) ? 'default' : 'pointer',
                        background: saved.has(i) ? tone('var(--t-success)', 12) : 'var(--t-btn)',
                        color: saved.has(i) ? 'var(--t-success)' : 'var(--t-btn-color)',
                        opacity: (!saved.has(i) && !sentences[i]?.trim()) ? 0.4 : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      {saved.has(i)
                        ? <><CheckCircle style={{ width: 14, height: 14 }} /> Submitted</>
                        : submitting === i || checking === i
                          ? <><Sparkles style={{ width: 13, height: 13 }} /> Saving…</>
                          : <><BookMarked style={{ width: 14, height: 14 }} /> Submit</>
                      }
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t-tx)' }}>Word Bank</h2>
              <span style={{ fontSize: 12, color: 'var(--t-tx3)', fontWeight: 600, background: 'var(--t-card2)', borderRadius: 8, padding: '2px 8px' }}>{words.length}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--t-bg)', border: '1px solid var(--t-brd)', borderRadius: 12, padding: '8px 14px' }}>
              <Search style={{ width: 14, height: 14, color: 'var(--t-tx3)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search words..."
                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--t-tx)', fontSize: 13, width: 140 }} />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => <div key={i} style={{ background: 'var(--t-card2)', borderRadius: 16, height: 56 }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--t-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <GraduationCap style={{ width: 24, height: 24, color: 'var(--t-tx3)' }} />
              </div>
              <p style={{ color: 'var(--t-tx)', fontWeight: 700, marginBottom: 4 }}>{search ? 'No words found' : 'Your word bank is empty'}</p>
              <p style={{ color: 'var(--t-tx3)', fontSize: 13 }}>{search ? 'Try a different search' : 'Save today\'s words above to start building your bank'}</p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 3fr 1fr', gap: 16, padding: '12px 24px', borderBottom: '1px solid var(--t-brd)' }}>
                {['Word', 'Meaning', 'Example', 'Mastery'].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--t-tx3)', textAlign: h === 'Mastery' ? 'right' : 'left' }}>{h}</span>
                ))}
              </div>
              {/* Table rows */}
              {filtered.map(w => (
                <div key={w.id} style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 3fr 1fr', gap: 16, padding: '14px 24px', borderBottom: '1px solid color-mix(in srgb, var(--t-brd) 50%, transparent)', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--t-tx)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {w.mastered && <Star style={{ width: 13, height: 13, color: 'var(--t-acc)' }} />}{w.word}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--t-tx2)' }}>{w.meaning}</span>
                  <span style={{ fontSize: 12, color: 'var(--t-tx3)', fontStyle: 'italic' }}>{w.example_sentence}</span>
                  <span style={{ textAlign: 'right' }}>
                    {w.mastered ? <CheckCircle style={{ width: 16, height: 16, color: 'var(--t-success)' }} /> : <span style={{ fontSize: 12, color: 'var(--t-tx3)' }}>{w.times_used}/{w.times_to_master}</span>}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ══════════════════════════════════════
            FRIDAY TEST SECTION
        ══════════════════════════════════════ */}
        <div id="quiz-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Trophy style={{ width: 18, height: 18, color: 'var(--t-acc)' }} />
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t-tx)' }}>Weekly Vocab Test</h2>
          </div>

          <div style={{
            background: isTestDay()
              ? 'linear-gradient(145deg, var(--t-acc-a), var(--t-card))'
              : 'var(--t-card)',
            border: `1px solid ${isTestDay() ? 'var(--t-brd-a)' : 'var(--t-brd)'}`,
            borderRadius: 24, padding: '2.5rem 2rem', textAlign: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Ambient glow for Friday */}
            {isTestDay() && (
              <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, var(--t-acc-a), transparent 70%)', pointerEvents: 'none' }} />
            )}

            <div style={{ width: 52, height: 52, borderRadius: 16, background: isTestDay() ? 'linear-gradient(135deg, var(--t-acc-a), var(--t-acc-b))' : 'var(--t-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', border: isTestDay() ? '1px solid var(--t-acc-b)' : '1px solid var(--t-brd)', position: 'relative' }}>
              {isTestDay() ? <Trophy style={{ width: 24, height: 24, color: 'var(--t-acc)' }} /> : <Clock style={{ width: 24, height: 24, color: 'var(--t-tx3)' }} />}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t-tx)', marginBottom: 6, position: 'relative' }}>
              {isTestDay() ? 'Test Your Vocabulary' : 'Test Available Fri – Sun'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--t-tx2)', marginBottom: 6, position: 'relative' }}>
              {isTestDay()
                ? '10 questions · 3 minute timer · Multiple choice A/B/C/D'
                : 'Available every Friday, Saturday, and Sunday. Learn Mon\u2013Thu first!'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--t-tx3)', marginBottom: 18, position: 'relative' }}>
              {isTestDay()
                ? `Tests this week's ${getWeekWords(ageGroup).length} words from Monday to Thursday`
                : 'Keep saving daily words \u2014 they\'ll appear in your Friday quiz!'}
            </p>
            <button
              onClick={generateTest}
              disabled={!isTestDay()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: isTestDay() ? 'var(--t-btn)' : 'var(--t-card2)',
                color: isTestDay() ? 'var(--t-btn-color)' : 'var(--t-tx3)',
                borderRadius: 14, padding: '11px 24px', fontSize: 13, fontWeight: 700,
                border: isTestDay() ? 'none' : '1px solid var(--t-brd)',
                cursor: isTestDay() ? 'pointer' : 'not-allowed',
                opacity: isTestDay() ? 1 : 0.5,
                position: 'relative',
              }}
            >
              <Zap style={{ width: 15, height: 15 }} />
              {isTestDay() ? 'Start Test' : 'Available Fri – Sun'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
