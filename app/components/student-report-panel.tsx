'use client';

import { useState, useCallback } from 'react';
import type { DailyStats, Profile, Writing, VocabWord } from '@/app/types/database';
import { BookOpen, FileText, Sparkles } from 'lucide-react';

type ReportProfile = Pick<
  Profile,
  | 'id'
  | 'username'
  | 'title'
  | 'level'
  | 'xp'
  | 'streak'
  | 'longest_streak'
  | 'age_group'
  | 'student_id'
  | 'account_type'
  | 'daily_word_goal'
  | 'daily_vocab_goal'
  | 'custom_daily_goal'
  | 'writing_experience_score'
>;

export type StudentReportData = {
  profile: ReportProfile;
  stats: DailyStats | null;
  writings: Array<Pick<Writing, 'id' | 'title' | 'category' | 'status' | 'word_count' | 'xp_earned' | 'is_favorite' | 'created_at' | 'updated_at' | 'content' | 'prompt' | 'feedback' | 'strengths' | 'improvements'>>;
  vocab: Array<Pick<VocabWord, 'id' | 'word' | 'meaning' | 'mastered' | 'times_used' | 'times_to_master' | 'created_at'>>;
  weekStats: Array<{
    date: string;
    words_written?: number;
    vocab_words_learned?: number;
    writings_completed?: number;
    xp_earned?: number;
    custom_goal_completed?: boolean;
  }>;
  aiFeedback?: {
    snapshot: string;
    feedback?: string[];
    improvements?: string[];
    improvementSummary: string;
    reportVersion?: number;
    goingWell?: string[];
    improveNext?: string[];
  };
  aiFeedbackStale?: boolean;
  summary: {
    totalWritings: number;
    totalWords: number;
    vocabCount: number;
    masteredCount: number;
    weekWords: number;
    weekVocab: number;
    monthWords?: number;
    daysActiveThisWeek?: number;
    daysActiveThisMonth?: number;
    categoryCount?: Record<string, number>;
    avgLast5?: number;
    avgPrev5?: number;
  };
};

type StudentReportPanelProps = {
  report: StudentReportData | null;
  accent: string;
  mode: 'dark' | 'light';
  emptyTitle: string;
  emptyCopy: string;
  authToken?: string;
  studentId?: string;
};

function formatShortDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function normalizeBullet(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function looksLikeStatsBullet(value: string) {
  return /\b(\d+|xp|streak|goal|vocab|level|day|days|category|categories|mastery|submitted|reviewed|score|avg|average|count)\b/i.test(value);
}

function mergeBullets(primary: string[], fallback: string[], limit = 6) {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const item of [...primary, ...fallback]) {
    const cleaned = item.trim();
    if (!cleaned) continue;
    if (looksLikeStatsBullet(cleaned)) continue;
    const key = normalizeBullet(cleaned);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(cleaned);
    if (merged.length >= limit) break;
  }

  return merged;
}

function buildFallbackGoingWell(report: StudentReportData) {
  const { writings, summary, profile } = report;
  const contentSamples = writings.map((w) => w.content?.trim()).filter((text): text is string => Boolean(text));
  const bullets: string[] = [];

  // Craft observations based on detected writing patterns
  if (contentSamples.some((text) => /[“””].+[“””]/.test(text) || /\b(said|asked|replied|whispered|shouted|murmured|called|answered)\b/i.test(text))) {
    bullets.push('Dialogue appears in the writing, which shows an instinct for making scenes feel direct and alive rather than just described.');
  }
  if (contentSamples.some((text) => /\n\s*\n/.test(text))) {
    bullets.push('The writing is structured into clear paragraphs, which makes ideas easier to follow and shows developing organisational awareness.');
  }
  if (contentSamples.some((text) => /\b(i felt|i think|i wondered|i noticed|i realized|i remembered|i knew|it made me feel|it seemed)\b/i.test(text))) {
    bullets.push('Reflective phrases appear in the writing — the student goes beyond describing events to explaining how things felt or why they mattered.');
  }
  if (contentSamples.some((text) => /\b(bright|dark|cold|warm|soft|sharp|quiet|loud|glow|shadow|wind|light|rain|sea|fire|sky|smell|sound|taste|texture|color|colour)\b/i.test(text))) {
    bullets.push('Sensory and descriptive language is present, helping the reader picture the scene rather than just follow the plot.');
  }
  if (summary.totalWritings >= 3) {
    bullets.push(`${profile.username} has built a portfolio of ${summary.totalWritings} pieces, showing consistent effort and a willingness to keep returning to the page.`);
  }
  if (summary.avgLast5 && summary.avgLast5 >= 150) {
    bullets.push(`Recent pieces average ${summary.avgLast5} words, which shows the student is developing the habit of pushing past a first idea and expanding their writing.`);
  }
  if (summary.masteredCount >= 3) {
    bullets.push(`${summary.masteredCount} vocabulary words have been mastered, which suggests the student is actively working on building a richer word bank.`);
  }

  if (bullets.length === 0) {
    bullets.push('The student is beginning to build their writing portfolio — early pieces give a baseline to work from and improve upon.');
  }

  return bullets.slice(0, 6);
}

function buildFallbackImprovements(report: StudentReportData) {
  const writings = report.writings.slice(0, 8);
  const contentSamples = writings.map((w) => w.content?.trim()).filter((text): text is string => Boolean(text));
  const bullets: string[] = [];

  if (contentSamples.some((text) => text.length > 220 && !/\n\s*\n/.test(text))) {
    bullets.push('Break longer pieces into clearer paragraphs so the reader can follow the flow more easily.');
  }
  if (!contentSamples.some((text) => /[“””].+[“””]/.test(text) || /\b(said|asked|replied|whispered|shouted|murmured|called|answered)\b/i.test(text))) {
    bullets.push('Add dialogue or direct speech where it fits — it makes scenes and characters feel more alive.');
  }
  if (!contentSamples.some((text) => /\b(i felt|i think|i wondered|i noticed|i realized|i remembered|i knew|it made me feel|it seemed)\b/i.test(text))) {
    bullets.push('Add a sentence or two that explains why the moment matters, not just what happened.');
  }
  if (!contentSamples.some((text) => /\b(bright|dark|cold|warm|soft|sharp|quiet|loud|glow|shadow|wind|light|rain|sea|fire|sky|smell|sound|taste|texture|color|colour)\b/i.test(text))) {
    bullets.push('Include more concrete sensory details — what the character sees, hears, or feels — so the scene feels vivid.');
  }
  // Always include these regardless of content
  bullets.push('Try starting a piece with action or dialogue rather than a description, to pull the reader in immediately.');
  bullets.push('Vary sentence length — mix short punchy sentences with longer ones to control the pace and rhythm.');

  return bullets;
}

function BulletCard({
  title,
  icon,
  color,
  items,
  emptyMessage,
  mode,
}: {
  title: string;
  icon: string;
  color: string;
  items: string[];
  emptyMessage?: string;
  mode: 'dark' | 'light';
}) {
  const isLight = mode === 'light';
  const background = isLight
    ? `linear-gradient(180deg, color-mix(in srgb, ${color} 7%, white) 0%, rgba(255,255,255,0.96) 100%)`
    : `linear-gradient(180deg, color-mix(in srgb, ${color} 10%, #0a0f1e) 0%, rgba(12, 18, 32, 0.94) 100%)`;
  const border = isLight ? `1px solid color-mix(in srgb, ${color} 18%, rgba(15, 23, 42, 0.08))` : `1px solid color-mix(in srgb, ${color} 24%, rgba(125, 211, 252, 0.14))`;
  const text = isLight ? '#0f172a' : '#f8fafc';
  const text2 = isLight ? '#475569' : '#dbe8f5';

  return (
    <div
      style={{
        borderRadius: 20,
        padding: 18,
        background,
        border,
        boxShadow: isLight ? '0 16px 40px rgba(15,23,42,0.05)' : '0 20px 54px rgba(0,0,0,0.20)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, white))`,
            boxShadow: `0 10px 20px color-mix(in srgb, ${color} 22%, transparent)`,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 900 }}>{icon}</span>
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color }}>
          {title}
        </div>
      </div>

      {items.length > 0 ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((item, index) => (
            <div key={`${index}-${item}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 6 }} />
              <span style={{ fontSize: 13.5, lineHeight: 1.7, color: text }}>{item}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13.5, lineHeight: 1.7, color: text2 }}>
          {emptyMessage ?? `No detailed ${title.toLowerCase()} available yet.`}
        </div>
      )}
    </div>
  );
}


function EmptyState({ title, copy, accent, mode }: { title: string; copy: string; accent: string; mode: 'dark' | 'light' }) {
  const card = mode === 'light' ? 'rgba(255,255,255,0.92)' : 'rgba(12, 18, 32, 0.9)';
  const border = mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'rgba(125, 211, 252, 0.14)';
  const text = mode === 'light' ? '#0f172a' : '#f8fafc';
  const text2 = mode === 'light' ? '#475569' : '#dbe8f5';
  return (
    <div style={{ borderRadius: 24, padding: 24, background: card, border: `1px solid ${border}`, boxShadow: mode === 'light' ? '0 16px 40px rgba(15,23,42,0.06)' : '0 24px 70px rgba(0,0,0,0.26)', backdropFilter: 'blur(14px)' }}>
      <div style={{ width: 52, height: 52, borderRadius: 18, background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 60%, white))`, display: 'grid', placeItems: 'center', color: '#fff', marginBottom: 16 }}>
        <Sparkles style={{ width: 22, height: 22 }} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', color: text }}>{title}</div>
      <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.7, color: text2, maxWidth: 680 }}>{copy}</div>
    </div>
  );
}


export function StudentReportPanel({ report, accent, mode, emptyTitle, emptyCopy, authToken, studentId }: StudentReportPanelProps) {
  const [compact, setCompact] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (aiSummary || summaryLoading || !authToken || !studentId) return;
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/student-report/summary?studentId=${encodeURIComponent(studentId)}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (data.summary) setAiSummary(data.summary);
    } finally {
      setSummaryLoading(false);
    }
  }, [aiSummary, summaryLoading, authToken, studentId]);

  const handleToggleCompact = useCallback(() => {
    setCompact((v) => {
      if (!v) fetchSummary();
      return !v;
    });
  }, [fetchSummary]);

  const isLight = mode === 'light';
  const card = isLight ? 'rgba(255,255,255,0.9)' : 'rgba(12, 18, 32, 0.9)';
  const card2 = isLight ? 'rgba(247,250,255,0.9)' : 'rgba(16, 23, 42, 0.84)';
  const border = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(125, 211, 252, 0.14)';
  const text = isLight ? '#0f172a' : '#f8fafc';
  const text2 = isLight ? '#475569' : '#dbe8f5';
  const text3 = isLight ? '#64748b' : '#93a9c4';

  if (!report) return <EmptyState title={emptyTitle} copy={emptyCopy} accent={accent} mode={mode} />;

  const { profile, writings, vocab, summary, aiFeedback, aiFeedbackStale } = report;

  const feedbackItems = mergeBullets(
    aiFeedback?.feedback ?? aiFeedback?.goingWell ?? [],
    buildFallbackGoingWell(report),
  );
  const improvementItems = mergeBullets(
    aiFeedback?.improvements ?? aiFeedback?.improveNext ?? [],
    buildFallbackImprovements(report),
  );
  const hasAiFeedback = Boolean(aiFeedback && (aiFeedback.snapshot || feedbackItems.length > 0 || improvementItems.length > 0));

  const masteryPct = summary.vocabCount > 0 ? Math.round((summary.masteredCount / summary.vocabCount) * 100) : 0;
  const avgLast5 = summary.avgLast5 ?? 0;

  // Category list sorted by count
  const categories = Object.entries(summary.categoryCount ?? {}).sort((a, b) => b[1] - a[1]);
  const maxCatCount = categories[0]?.[1] ?? 1;

  const submittedCount = writings.filter((w) => w.status === 'submitted' || w.status === 'reviewed').length;

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* ── HEADER CARD ── */}
      <div
        style={{
          borderRadius: 28,
          padding: 22,
          background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 12%, ${card}) 0%, ${card} 100%)`,
          border: `1px solid color-mix(in srgb, ${accent} 16%, ${border})`,
          boxShadow: isLight ? '0 18px 50px rgba(15,23,42,0.06)' : '0 26px 80px rgba(0,0,0,0.28)',
          backdropFilter: 'blur(14px)',
        }}
      >
        {/* Name + badges row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ width: 52, height: 52, borderRadius: 18, background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 60%, white))`, display: 'grid', placeItems: 'center', color: '#fff', boxShadow: `0 12px 26px color-mix(in srgb, ${accent} 22%, transparent)` }}>
                <FileText style={{ width: 22, height: 22 }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: accent }}>Student report</div>
                <h3 style={{ margin: '6px 0 0', fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', lineHeight: 0.98, fontWeight: 950, letterSpacing: '-0.05em', color: text }}>
                  {profile.username}
                </h3>
              </div>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 13.5, lineHeight: 1.6, color: text2 }}>
              {profile.title} · Age group {profile.age_group || 'n/a'} · Code {profile.student_id || 'not set'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
            {[
              { label: `Lv ${profile.level}` },
              { label: `${profile.streak}d streak` },
              { label: `Best ${profile.longest_streak}d` },
            ].map((b) => (
              <div key={b.label} style={{ padding: '6px 11px', borderRadius: 999, background: `color-mix(in srgb, ${accent} 10%, transparent)`, border: `1px solid ${border}`, color: text2, fontSize: 12, fontWeight: 700 }}>
                {b.label}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── AI REPORT CARD ── */}
      <div
        style={{
          borderRadius: 28,
          padding: 22,
          background: card,
          border: `1px solid ${border}`,
          boxShadow: isLight ? '0 16px 42px rgba(15,23,42,0.05)' : '0 24px 70px rgba(0,0,0,0.24)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: accent }}>
            <BookOpen style={{ width: 16, height: 16 }} />
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>AI written report</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {aiFeedbackStale && (
              <div style={{ fontSize: 11, color: text3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                Refreshing…
              </div>
            )}
            <button
              type="button"
              onClick={handleToggleCompact}
              style={{
                border: 'none',
                background: 'transparent',
                color: text3,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {compact ? 'Show full report ↓' : 'Show improvement note ↓'}
            </button>
          </div>
        </div>

        {compact ? (
          /* Improvement note (summary route or cached improvementSummary) */
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.9, color: text2 }}>
            {summaryLoading
              ? 'Generating improvement notes…'
              : aiSummary || aiFeedback?.improvementSummary || (aiFeedbackStale ? 'AI insights are being generated — check back in a moment.' : 'No summary available.')}
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {/* Snapshot */}
            <div
              style={{
                borderRadius: 20,
                padding: '18px 20px',
                background: isLight
                  ? `linear-gradient(135deg, color-mix(in srgb, ${accent} 8%, white) 0%, rgba(255,255,255,0.98) 100%)`
                  : `linear-gradient(135deg, color-mix(in srgb, ${accent} 12%, #0a0f1e) 0%, rgba(12, 18, 32, 0.96) 100%)`,
                border: `1px solid color-mix(in srgb, ${accent} 18%, ${border})`,
                boxShadow: isLight ? '0 18px 50px rgba(15,23,42,0.05)' : '0 24px 64px rgba(0,0,0,0.22)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: accent }}>📋 Overall snapshot</div>
                <div style={{ fontSize: 11, color: text3, fontWeight: 700 }}>About 100 words</div>
              </div>
              <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.85, color: text2 }}>
                {aiFeedback?.snapshot || (() => {
                  const samples = writings.slice(0, 5);
                  const contentSamples = samples.map((w) => w.content?.trim()).filter((t): t is string => Boolean(t) && t.length > 40);
                  const hasDialogue = contentSamples.some((t) => /["""].+["""]/.test(t) || /\b(said|asked|replied|whispered|shouted|murmured)\b/i.test(t));
                  const hasReflection = contentSamples.some((t) => /\b(i felt|i think|i wondered|i noticed|i realized|it made me|it seemed)\b/i.test(t));
                  const hasSensory = contentSamples.some((t) => /\b(bright|dark|cold|warm|soft|sharp|quiet|loud|glow|shadow|smell|taste|sound|colour|color)\b/i.test(t));
                  const hasParagraphs = contentSamples.some((t) => /\n\s*\n/.test(t));
                  const dominantCategory = Object.entries(summary.categoryCount ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0];
                  const avgLen = summary.avgLast5 ?? 0;

                  const craftNotes: string[] = [];
                  if (hasDialogue) craftNotes.push('uses dialogue to bring scenes to life');
                  if (hasReflection) craftNotes.push('moves between action and reflection');
                  if (hasSensory) craftNotes.push('reaches for sensory and descriptive language');
                  if (hasParagraphs) craftNotes.push('structures ideas across clear paragraphs');

                  const craftClause = craftNotes.length > 0
                    ? ` The writing ${craftNotes.slice(0, 2).join(' and ')}.`
                    : '';
                  const lengthNote = avgLen >= 200
                    ? ` Pieces are substantive, averaging ${avgLen} words, which shows a willingness to develop ideas beyond a first draft.`
                    : avgLen > 0
                      ? ` Pieces currently average ${avgLen} words — there is room to push ideas further in future drafts.`
                      : '';
                  const categoryNote = dominantCategory ? ` Most of the work has been in ${dominantCategory.toLowerCase()}.` : '';

                  return `${profile.username} has written ${summary.totalWritings} piece${summary.totalWritings !== 1 ? 's' : ''} across their portfolio.${categoryNote}${craftClause}${lengthNote}`;
                })()}
              </p>
            </div>

            {/* What's going well + Improvements */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              <BulletCard
                title="What's going well"
                icon="💬"
                color="#4dd4a8"
                items={feedbackItems}
                emptyMessage="No details on what's going well yet."
                mode={mode}
              />
              <BulletCard
                title="Improvements"
                icon="↗"
                color="#f59e0b"
                items={improvementItems}
                emptyMessage="No improvement notes available yet."
                mode={mode}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM ROW: writings + vocab + activity ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>

        {/* Writings */}
        <div style={{ borderRadius: 26, padding: 20, background: card, border: `1px solid ${border}`, boxShadow: isLight ? '0 16px 42px rgba(15,23,42,0.05)' : '0 24px 70px rgba(0,0,0,0.24)', backdropFilter: 'blur(14px)', display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent }}>Writings</div>
              <div style={{ marginTop: 6, fontSize: 20, fontWeight: 950, color: text }}>
                {summary.totalWritings} pieces
              </div>
              <div style={{ marginTop: 3, fontSize: 12, color: text3 }}>{submittedCount} submitted or reviewed</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: text3, fontWeight: 700 }}>avg length</div>
              <div style={{ fontSize: 18, fontWeight: 950, color: text, letterSpacing: '-0.04em' }}>
                {avgLast5 > 0 ? `${avgLast5}w` : '—'}
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          {categories.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: text3, marginBottom: 8 }}>By category</div>
              <div style={{ display: 'grid', gap: 7 }}>
                {categories.slice(0, 5).map(([cat, count]) => (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: text2, fontWeight: 600 }}>{cat}</span>
                      <span style={{ fontSize: 12, color: text3 }}>{count}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 999, background: isLight ? 'rgba(15,23,42,0.07)' : 'rgba(255,255,255,0.07)' }}>
                      <div style={{ height: '100%', width: `${Math.round((count / maxCatCount) * 100)}%`, borderRadius: 999, background: accent }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent writing entries */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: text3, marginBottom: 8 }}>Recent</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {writings.length === 0 ? (
                <div style={{ borderRadius: 14, padding: 14, background: card2, border: `1px solid ${border}`, color: text2, fontSize: 13 }}>No writings yet.</div>
              ) : (
                writings.slice(0, 5).map((w) => (
                  <div key={w.id} style={{ borderRadius: 14, padding: '10px 13px', background: card2, border: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.title}</div>
                      <div style={{ fontSize: 11.5, color: text3, marginTop: 2 }}>{w.category} · {formatShortDate(w.created_at)}</div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: text2 }}>{w.word_count.toLocaleString()}w</div>
                      <div style={{ fontSize: 11, color: w.status === 'reviewed' ? '#4dd4a8' : w.status === 'submitted' ? accent : text3, fontWeight: 700, textTransform: 'capitalize', marginTop: 2 }}>
                        {w.status.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Vocab */}
        <div style={{ borderRadius: 26, padding: 20, background: card, border: `1px solid ${border}`, boxShadow: isLight ? '0 16px 42px rgba(15,23,42,0.05)' : '0 24px 70px rgba(0,0,0,0.24)', backdropFilter: 'blur(14px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent }}>Vocabulary</div>
                <div style={{ marginTop: 6, fontSize: 18, fontWeight: 950, color: text }}>
                  {summary.masteredCount}<span style={{ fontSize: 13, fontWeight: 700, color: text3 }}>/{summary.vocabCount} mastered</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: text3, fontWeight: 700 }}>mastery rate</div>
                <div style={{ fontSize: 18, fontWeight: 950, color: masteryPct >= 60 ? '#4dd4a8' : masteryPct >= 30 ? accent : '#f87171', letterSpacing: '-0.04em' }}>{masteryPct}%</div>
              </div>
            </div>

            {/* Mastery progress bar */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ height: 7, borderRadius: 999, background: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)' }}>
                <div style={{ height: '100%', width: `${masteryPct}%`, borderRadius: 999, background: masteryPct >= 60 ? '#4dd4a8' : accent, transition: 'width 0.4s ease' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {vocab.length === 0 ? (
                <div style={{ borderRadius: 14, padding: 14, background: card2, border: `1px solid ${border}`, color: text2, fontSize: 13 }}>No vocab saved yet.</div>
              ) : (
                vocab.slice(0, 6).map((w) => (
                  <div key={w.id} style={{ borderRadius: 14, padding: '10px 13px', background: card2, border: `1px solid ${border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 850, color: text }}>{w.word}</span>
                      <span style={{ fontSize: 11.5, color: w.mastered ? '#4dd4a8' : text3, fontWeight: 800, flexShrink: 0 }}>
                        {w.mastered ? '✓ Mastered' : `${w.times_used}/${w.times_to_master}`}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, color: text2, lineHeight: 1.55 }}>{w.meaning}</div>
                    {!w.mastered && (
                      <div style={{ marginTop: 6, height: 3, borderRadius: 999, background: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)' }}>
                        <div style={{ height: '100%', width: `${Math.round((w.times_used / w.times_to_master) * 100)}%`, borderRadius: 999, background: accent }} />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

      </div>
    </div>
  );
}
