'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { FetchTimeoutError, fetchWithTimeout } from '@/app/lib/fetch-with-timeout';
import {
  deleteStoredCoachConversation,
  deleteStoredCoachConversationTitle,
  mergeStoredCoachConversations,
  readStoredCoachConversations,
  readStoredCoachConversationTitles,
  setStoredCoachConversationTitle,
  type StoredCoachConversation,
} from '@/app/lib/coach-conversation-storage';
import { withPromiseTimeout } from '@/app/lib/promise-with-timeout';
import { supabase } from '@/app/lib/supabase';
import { getExperienceIncreaseForAction, persistWritingExperienceScore, readWritingExperienceOverride } from '@/app/lib/writing-experience';
import { incrementProfileOverride } from '@/app/lib/profile-overrides';
import {
  Bot, Send, Brain, Sparkles, RotateCcw,
  Plus, MessageSquare, Clock, Target, PenLine, BookOpen,
  Flame, Zap, Trophy, Star, type LucideIcon,
  Hash, Mail, FileText, Feather, ChevronRight, Pencil, Trash2,
} from 'lucide-react';

type Message      = { role: 'user' | 'assistant'; content: string };
type Conversation = StoredCoachConversation;
type GoalData = {
  writings:      { id: string; title: string; word_count: number; status: string; created_at: string; category: string }[];
  vocabTotal:    number;
  vocabMastered: number;
};

/* ─── Trainer config with individual accent colours ─── */
const TRAINERS = [
  { value: 'general',            label: 'Most Active',        icon: Zap,          color: '#f0c846', bg: 'rgba(240,200,70,0.14)',  emoji: '⚡' },
  { value: 'creative',           label: 'Creative Writing',   icon: Sparkles,     color: '#b090ff', bg: 'rgba(176,144,255,0.14)', emoji: '✨' },
  { value: 'Persuasive / Essay', label: 'Persuasive',         icon: Target,       color: '#ff8844', bg: 'rgba(255,136,68,0.14)',  emoji: '📢' },
  { value: 'Blog',               label: 'Blog Entry',         icon: Hash,         color: '#4dd4a8', bg: 'rgba(77,212,168,0.14)',  emoji: '📝' },
  { value: 'Feature Article',    label: 'Feature Article',    icon: FileText,     color: '#6a9fff', bg: 'rgba(106,159,255,0.14)', emoji: '📰' },
  { value: 'Diary',              label: 'Diary Entry',        icon: Feather,      color: '#ff80a8', bg: 'rgba(255,128,168,0.14)', emoji: '📖' },
  { value: 'Email',              label: 'Email Writing',      icon: Mail,         color: '#4dd4a8', bg: 'rgba(77,212,168,0.14)',  emoji: '✉️' },
  { value: 'goal',               label: 'My Goal',            icon: Trophy,       color: '#f0c846', bg: 'rgba(240,200,70,0.14)',  emoji: '🎯' },
] as const;

const COACH_REPLY_TIMEOUT_MS = 20000;
const COACH_SAVE_TIMEOUT_MS = 20000;
const COACH_PROFILE_REFRESH_TIMEOUT_MS = 5000;

const STARTER_QUESTIONS: Record<string, string[]> = {
  general:              ['Help me write a strong thesis statement', 'How do I make my writing more descriptive?', 'Give me ideas for a creative story', 'What makes a great opening line?', 'How can I improve my vocabulary usage?', 'Help me structure my ideas better'],
  creative:             ['Give me a vivid story idea', 'How do I write better characters?', 'What makes a great plot twist?', 'Help me write a powerful opening scene', 'How do I show emotion in writing?', 'Give me a creative writing prompt'],
  'Persuasive / Essay': ['Help me write a strong thesis', 'How do I structure a persuasive essay?', 'Give me counterargument techniques', 'How do I write a compelling conclusion?', 'What rhetorical devices should I use?', 'Review my argument structure'],
  Blog:                 ['Give me blog post ideas', 'How do I write a catchy headline?', 'What makes blog writing engaging?', 'Help me find my blog voice', 'How do I hook readers in?', 'How long should my blog posts be?'],
  'Feature Article':    ['What makes a great article lead?', 'How do I structure a feature article?', 'Help me write a compelling headline', 'What is the inverted pyramid structure?', 'How do I interview sources effectively?', 'How do I maintain objectivity?'],
  Diary:                ['Help me start a diary entry', 'How do I write more honestly in my diary?', 'What should I write about today?', 'How do I capture my emotions in writing?', 'Give me diary writing prompts', 'How do I make diary entries meaningful?'],
  Email:                ['Help me write a professional email', 'How do I write a clear subject line?', 'How do I politely decline something?', 'Help me write a follow-up email', 'How do I sound confident but not arrogant?', 'Help me apologise professionally'],
  goal:                 [],
};

function formatCoachResponse(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function getTrainer(value: string) {
  return TRAINERS.find(t => t.value === value) ?? TRAINERS[0];
}

function getConversationPreview(conversation: Conversation) {
  return conversation.messages.find((message) => message.role === 'user')?.content.slice(0, 42) || 'New conversation';
}

/* ──────────────────────────────────────────────────────────────────────────
   GOAL DASHBOARD
   ────────────────────────────────────────────────────────────────────────── */
function GoalDashboard({
  profile, goalData, onAsk, compact = false,
}: {
  profile: { custom_daily_goal?: string; streak: number; xp: number; level: number };
  goalData: GoalData | null;
  onAsk: (q: string) => void;
  compact?: boolean;
}) {
  const goal = profile.custom_daily_goal || 'No goal set yet';
  const STARTERS = [
    `How close am I to achieving: "${goal.slice(0, 40)}${goal.length > 40 ? '…' : ''}"?`,
    'Give me a personalised roadmap to reach my goal',
    'What should I work on most this week?',
    'Analyse my recent writings and tell me what to improve',
    'How can I use vocabulary practice to reach my goal?',
    'Give me a writing exercise tailored to my goal',
  ];

  return (
    <div style={{ padding: compact ? '18px 16px 24px' : '28px 28px 40px', maxWidth: 820, margin: '0 auto' }}>
      {/* ── Goal hero ── */}
      <div style={{
        borderRadius: 28,
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--t-acc) 18%, var(--t-card)), var(--t-card) 70%)',
        border: '1px solid var(--t-brd-a)',
        padding: '28px 28px',
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, color-mix(in srgb, var(--t-acc) 22%, transparent), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 18, background: 'var(--t-acc-b)', border: '1px solid var(--t-brd-a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 24 }}>
            🎯
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--t-acc)', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 6 }}>My Writing Goal</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--t-tx)', lineHeight: 1.35 }}>{goal}</p>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(auto-fit, minmax(140px, 1fr))' : 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { emoji: '✍️', label: 'Drafts',         value: goalData?.writings.length ?? '—', color: 'var(--t-mod-write)' },
          { emoji: '📚', label: 'Word Wins',      value: goalData?.vocabMastered ?? '—',  color: 'var(--t-mod-vocab)' },
          { emoji: '🔥', label: 'Hot Streak',     value: profile.streak,                   color: 'var(--t-warning)' },
          { emoji: '⚡', label: 'XP Stash',       value: profile.xp >= 1000 ? `${(profile.xp / 1000).toFixed(1)}k` : profile.xp, color: 'var(--t-mod-rewards)' },
        ].map(({ emoji, label, value, color }) => (
          <div key={label} style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 18, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -12, right: -12, fontSize: 40, opacity: 0.08, pointerEvents: 'none' }}>{emoji}</div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--t-tx3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{label}</p>
            <p style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Recent writings ── */}
      {goalData && goalData.writings.length > 0 && (
        <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 20, padding: '18px 20px', marginBottom: 20 }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--t-tx3)', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 14 }}>Fresh Drafts</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {goalData.writings.slice(0, 5).map(w => (
              <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 14, background: 'var(--t-bg)', border: '1px solid var(--t-brd)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 11, background: 'color-mix(in srgb, var(--t-mod-write) 14%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <PenLine style={{ width: 15, height: 15, color: 'var(--t-mod-write)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--t-tx3)', marginTop: 1 }}>{w.category} · {w.word_count} words</p>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
                  background: w.status === 'reviewed' ? 'color-mix(in srgb, var(--t-success) 12%, transparent)' : 'var(--t-acc-a)',
                  color: w.status === 'reviewed' ? 'var(--t-success)' : 'var(--t-acc)',
                  border: `1px solid ${w.status === 'reviewed' ? 'color-mix(in srgb, var(--t-success) 22%, transparent)' : 'var(--t-brd-a)'}`,
                  flexShrink: 0,
                }}>
                  {w.status === 'reviewed' ? '✓ Reviewed' : 'Submitted'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Ask starters ── */}
      <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--t-tx3)', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 12 }}>Ask your goal coach</p>
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 10 }}>
        {STARTERS.map(q => (
          <button
            key={q}
            onClick={() => onAsk(q)}
            style={{
              textAlign: 'left', padding: '14px 16px', borderRadius: 18, fontSize: 14,
              background: 'var(--t-card)', border: '1px solid var(--t-brd)', color: 'var(--t-tx2)',
              cursor: 'pointer', lineHeight: 1.5,
              display: 'flex', alignItems: 'flex-start', gap: 10,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--t-brd-a)'; e.currentTarget.style.background = 'var(--t-acc-a)'; e.currentTarget.style.color = 'var(--t-tx)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--t-brd)'; e.currentTarget.style.background = 'var(--t-card)'; e.currentTarget.style.color = 'var(--t-tx2)'; }}
          >
            <ChevronRight style={{ width: 15, height: 15, color: 'var(--t-acc)', flexShrink: 0, marginTop: 1 }} />
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────────────────────────────────── */
export default function CoachPage() {
  const { profile, session, refreshProfile } = useAuth();

  const [messages, setMessages]           = useState<Message[]>([]);
  const [input, setInput]                 = useState('');
  const [mode, setMode]                   = useState<'thinking' | 'creative'>('thinking');
  const [trainerType, setTrainerType]     = useState('general');
  const [loading, setLoading]             = useState(false);
  const [queuedMessages, setQueuedMessages] = useState<string[]>([]);
  const [coachError, setCoachError]       = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationTitles, setConversationTitles] = useState<Record<string, string>>({});
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [goalData, setGoalData]           = useState<GoalData | null>(null);
  const [isCompactLayout, setIsCompactLayout] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const deletedConversationIdsRef = useRef<Set<string>>(new Set());

  const trainer = getTrainer(trainerType);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (trainerType !== 'goal' || !profile) return;
    (async () => {
      const [wRes, vRes] = await Promise.all([
        supabase.from('writings').select('id, title, word_count, status, created_at, category').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('vocab_words').select('id, mastered').eq('user_id', profile.id),
      ]);
      setGoalData({
        writings:      (wRes.data ?? []) as GoalData['writings'],
        vocabTotal:    vRes.data?.length ?? 0,
        vocabMastered: vRes.data?.filter(v => v.mastered).length ?? 0,
      });
    })();
  }, [trainerType, profile]);

  const loadConversations = useCallback(async () => {
    if (!profile) return;
    const stored = readStoredCoachConversations(profile.id);
    const storedTitles = readStoredCoachConversationTitles(profile.id);
    setConversationTitles(storedTitles);

    try {
      const { data, error } = await supabase
        .from('coach_conversations')
        .select('id, mode, trainer_type, messages, updated_at')
        .eq('user_id', profile.id)
        .order('updated_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      const merged = mergeStoredCoachConversations(profile.id, (data ?? []) as Conversation[]);
      const visibleConversations = merged.filter(
        (conversation) => !deletedConversationIdsRef.current.has(conversation.id),
      );
      setConversations(visibleConversations);
    } catch (error) {
      console.warn('loadConversations warning:', error);
      const visibleStored = stored.filter(
        (conversation) => !deletedConversationIdsRef.current.has(conversation.id),
      );
      setConversations(visibleStored);
    }
  }, [profile]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      setIsCompactLayout(window.innerWidth < 1100);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!profile || conversations.length === 0) return;

    const syncTimer = window.setTimeout(() => {
      const payload = conversations
        .filter((conversation) => !deletedConversationIdsRef.current.has(conversation.id))
        .map((conversation) => ({
          id: conversation.id,
          user_id: profile.id,
          mode: conversation.mode,
          trainer_type: conversation.trainer_type,
          messages: conversation.messages,
          updated_at: conversation.updated_at,
        }));

      void (async () => {
        const { error } = await supabase
          .from('coach_conversations')
          .upsert(payload, { onConflict: 'id' });

        if (error) {
          console.error('coach conversations autosync error:', error);
        }
      })();
    }, 600);

    return () => window.clearTimeout(syncTimer);
  }, [conversations, profile]);

  const saveConversation = useCallback(async (
    msgs: Message[],
    convId: string | null,
    conversationMode: 'thinking' | 'creative' = mode,
    conversationTrainerType: string = trainerType,
  ) => {
    if (!profile || msgs.length === 0) return convId;

    const id = convId ?? crypto.randomUUID();
    const updatedAt = new Date().toISOString();
    const snapshot: Conversation = {
      id,
      mode: conversationMode,
      trainer_type: conversationTrainerType,
      messages: msgs,
      updated_at: updatedAt,
    };

    const merged = mergeStoredCoachConversations(profile.id, [snapshot]);
    setConversations(merged);

    void withPromiseTimeout(
      supabase.from('coach_conversations').upsert({
        id,
        user_id: profile.id,
        mode: conversationMode,
        trainer_type: conversationTrainerType,
        messages: msgs,
        updated_at: updatedAt,
      }, {
        onConflict: 'id',
      }),
      COACH_SAVE_TIMEOUT_MS,
      'Saving coach conversation took too long.',
    ).catch((error) => {
      console.error('saveConversation error:', error);
    });

    return id;
  }, [profile, mode, trainerType]);

  const loadSession = useCallback((conv: Conversation) => {
    setMessages(conv.messages as Message[]);
    setActiveId(conv.id);
    setMode(conv.mode as 'thinking' | 'creative');
    setTrainerType(conv.trainer_type);
    setQueuedMessages([]);
    setCoachError('');
  }, []);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || !profile) return;

    if (loading) {
      setQueuedMessages(prev => [...prev, msg]);
      setInput('');
      return;
    }

    const updated: Message[] = [...messages, { role: 'user', content: msg }];
    const conversationId = activeId ?? crypto.randomUUID();
    setMessages(updated);
    if (!activeId) setActiveId(conversationId);
    setInput('');
    setCoachError('');
    setLoading(true);
    void saveConversation(updated, conversationId, mode, trainerType);
    try {
      let accessToken = session?.access_token ?? null;
      if (!accessToken) {
        const { data } = await supabase.auth.getSession();
        accessToken = data.session?.access_token ?? null;
      }
      const [latestRes, reviewedRes] = await Promise.all([
        supabase
          .from('writings')
          .select('id, title, category, prompt, word_count, content, feedback, strengths, improvements, status, created_at')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('writings')
          .select('id, title, category, prompt, word_count, content, feedback, strengths, improvements, status, created_at')
          .eq('user_id', profile.id)
          .eq('status', 'reviewed')
          .order('created_at', { ascending: false })
          .limit(8),
      ]);
      const clientContext = {
        latestWriting: latestRes.data?.[0] ?? null,
        reviewed: reviewedRes.data ?? [],
      };
      const res = await fetchWithTimeout('/api/ai-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          messages: updated, mode, trainerType, userId: profile.id,
          accessToken,
          clientContext,
          userContext: {
            username: profile.username,
            level: profile.level,
            xp: profile.xp,
            streak: profile.streak,
            customGoal: profile.custom_daily_goal,
            ageGroup: profile.age_group,
            writingExperienceScore: profile.writing_experience_score ?? 0,
          },
        }),
      }, COACH_REPLY_TIMEOUT_MS);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || typeof data.response !== 'string') {
        throw new Error(data?.error || 'Failed to get coach response.');
      }
      const withReply: Message[] = [...updated, { role: 'assistant', content: formatCoachResponse(data.response) }];
      setMessages(withReply);
      void saveConversation(withReply, conversationId, mode, trainerType);
      void persistWritingExperienceScore(
        profile.id,
        (readWritingExperienceOverride(profile.id) ?? profile.writing_experience_score ?? 0) + getExperienceIncreaseForAction('coach'),
      ).catch(() => {});
      incrementProfileOverride(profile.id, 'coach_messages_used', 1);

      // Increment coach_messages_used counter
      void withPromiseTimeout(
        supabase.from('profiles')
          .update({ coach_messages_used: (profile.coach_messages_used ?? 0) + 1 })
          .eq('id', profile.id),
        COACH_PROFILE_REFRESH_TIMEOUT_MS,
        'Updating coach usage took too long.',
      ).catch(() => {});

      void withPromiseTimeout(
        refreshProfile(),
        COACH_PROFILE_REFRESH_TIMEOUT_MS,
        'Refreshing coach usage took too long.',
      ).catch(() => {});
    } catch (error) {
      const fallbackMessage = error instanceof FetchTimeoutError
        ? 'I took too long to answer, but your message is still saved. Send the next message and I will keep going.'
        : "I hit a snag answering that, but your message is still saved. Try the next message and I'll keep helping.";
      const withFallback: Message[] = [...updated, { role: 'assistant', content: fallbackMessage }];
      setMessages(withFallback);
      setCoachError(
        error instanceof FetchTimeoutError
          ? 'Coach took too long to reply, so you can keep sending while it catches up.'
          : 'Coach ran into an error, but your chat was still saved.',
      );
      void saveConversation(withFallback, conversationId, mode, trainerType);
      setLoading(false);
      return;
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having a moment — please try again!" }]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (loading || queuedMessages.length === 0) return;
    const [nextQueued, ...remainingQueued] = queuedMessages;
    setQueuedMessages(remainingQueued);
    void send(nextQueued);
  }, [loading, queuedMessages]);

  const startNewChat = () => {
    setMessages([]);
    setActiveId(null);
    setMode('thinking');
    setTrainerType('general');
    setQueuedMessages([]);
    setCoachError('');
    inputRef.current?.focus();
  };

  const renameConversation = useCallback((conversation: Conversation) => {
    if (!profile) return;
    const defaultTitle = getConversationPreview(conversation);
    const currentTitle = conversationTitles[conversation.id] ?? defaultTitle;
    const nextTitleRaw = window.prompt('Rename this chat', currentTitle);
    if (nextTitleRaw === null) return;

    const nextTitle = nextTitleRaw.trim();
    if (!nextTitle) return;

    const updatedTitles = setStoredCoachConversationTitle(profile.id, conversation.id, nextTitle);
    setConversationTitles(updatedTitles);
  }, [conversationTitles, profile]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!profile) return;
    const confirmed = window.confirm('Delete this chat permanently?');
    if (!confirmed) return;

    deletedConversationIdsRef.current.add(conversationId);
    const nextConversations = deleteStoredCoachConversation(profile.id, conversationId);
    const nextTitles = deleteStoredCoachConversationTitle(profile.id, conversationId);
    setConversations(nextConversations);
    setConversationTitles(nextTitles);

    if (activeId === conversationId) {
      if (nextConversations.length > 0) {
        loadSession(nextConversations[0]);
      } else {
        startNewChat();
      }
    }

    const { error } = await supabase
      .from('coach_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', profile.id);

    if (error) {
      console.error('deleteConversation error:', error);
      deletedConversationIdsRef.current.delete(conversationId);
      void loadConversations();
    }
  }, [activeId, loadConversations, loadSession, profile]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  if (!profile) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--t-bg)',
        color: 'var(--t-tx3)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 18px',
          borderRadius: 16,
          background: 'var(--t-card)',
          border: '1px solid var(--t-brd)',
          boxShadow: '0 18px 50px rgba(0,0,0,0.18)',
        }}>
          <div style={{ width: 18, height: 18, borderRadius: 999, background: 'var(--t-acc)', animation: 'pulse 1.4s infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Loading your coach...</span>
        </div>
      </div>
    );
  }

  const starters    = STARTER_QUESTIONS[trainerType] ?? STARTER_QUESTIONS.general;
  const TrainerIcon = trainer.icon as LucideIcon;

  /* ────────────────────────────────────── RENDER ────────────────────────── */
  return (
    <>
    <div style={{
      display: 'grid',
      gridTemplateColumns: isCompactLayout ? '1fr' : '200px minmax(0, 1fr)',
      height: isCompactLayout ? 'auto' : 'min(760px, calc(100dvh - 150px))',
      maxHeight: isCompactLayout ? undefined : 'min(760px, calc(100dvh - 150px))',
      minHeight: isCompactLayout ? '72vh' : 560,
      background: 'linear-gradient(180deg, color-mix(in srgb, var(--t-bg) 88%, #04122f 12%), var(--t-bg))',
      overflow: 'hidden',
      borderRadius: 24,
      border: '1px solid color-mix(in srgb, var(--t-brd) 82%, #1a3a79 18%)',
      boxShadow: '0 24px 58px rgba(0, 0, 0, 0.28)',
    }}>

      {/* ══════════════════════════════════════════
          LEFT SIDEBAR — conversations
          ══════════════════════════════════════════ */}
      <div style={{
        width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column',
        maxHeight: isCompactLayout ? 320 : undefined,
        background: 'linear-gradient(170deg, color-mix(in srgb, var(--t-card) 92%, #031030 8%), var(--t-card))',
        borderRight: isCompactLayout ? 'none' : '1px solid var(--t-brd)',
        borderBottom: isCompactLayout ? '1px solid var(--t-brd)' : 'none',
        borderRadius: isCompactLayout ? '24px 24px 0 0' : '24px 0 0 24px',
      }}>
        {/* Sidebar header */}
        <div style={{ padding: '12px 12px 10px', borderBottom: '1px solid var(--t-brd)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--t-acc-a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot style={{ width: 15, height: 15, color: 'var(--t-acc)' }} />
            </div>
            <div>
              <p style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--t-tx)', lineHeight: 1 }}>AI Coach</p>
              <p style={{ fontSize: 10, color: 'var(--t-tx3)', marginTop: 1 }}>{conversations.length} session{conversations.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <button
            onClick={startNewChat}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              background: 'var(--t-btn)', color: 'var(--t-btn-color)',
              borderRadius: 12, padding: '9px 12px', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer',
              boxShadow: '0 6px 16px color-mix(in srgb, var(--t-acc) 26%, transparent)',
            }}
          >
            <Plus style={{ width: 14, height: 14 }} /> New Chat
          </button>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 6px' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: '40px 12px', textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--t-bg)', border: '1px solid var(--t-brd)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <MessageSquare style={{ width: 20, height: 20, color: 'var(--t-tx3)', opacity: 0.5 }} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--t-tx3)', lineHeight: 1.6 }}>Start your first coaching session above</p>
            </div>
          ) : (
            conversations.map(conv => {
              const isActive = conv.id === activeId;
              const t = getTrainer(conv.trainer_type);
              const TIcon = t.icon as LucideIcon;
              const preview = getConversationPreview(conv);
              const title = conversationTitles[conv.id] ?? preview;
              return (
                <div
                  key={conv.id}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '6px 7px', borderRadius: 11, marginBottom: 2,
                    background: isActive ? t.bg : 'transparent',
                    border: isActive ? `1px solid ${t.color}28` : '1px solid transparent',
                    transition: 'all 0.12s',
                  }}
                >
                  <button
                    onClick={() => loadSession(conv)}
                    style={{
                      width: '100%', textAlign: 'left', display: 'block',
                      background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                    }}
                    onMouseEnter={e => {
                      const row = e.currentTarget.parentElement;
                      if (!isActive && row) row.style.background = 'var(--t-bg)';
                    }}
                    onMouseLeave={e => {
                      const row = e.currentTarget.parentElement;
                      if (!isActive && row) row.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <div style={{ width: 18, height: 18, borderRadius: 6, background: `${t.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <TIcon style={{ width: 10, height: 10, color: t.color }} />
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: isActive ? t.color : 'var(--t-tx3)', textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.label}
                      </span>
                      <span style={{ fontSize: 9, color: 'var(--t-tx3)', flexShrink: 0 }}>{timeAgo(conv.updated_at)}</span>
                    </div>
                    <p style={{ fontSize: 11, color: isActive ? 'var(--t-tx)' : 'var(--t-tx2)', fontWeight: isActive ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {title}
                    </p>
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 6 }}>
                    <button
                      onClick={() => renameConversation(conv)}
                      title="Rename chat"
                      style={{
                        width: 22, height: 22, borderRadius: 7, border: '1px solid var(--t-brd)',
                        background: 'var(--t-card)', color: 'var(--t-tx3)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      }}
                    >
                      <Pencil style={{ width: 11, height: 11 }} />
                    </button>
                    <button
                      onClick={() => void deleteConversation(conv.id)}
                      title="Delete chat"
                      style={{
                        width: 22, height: 22, borderRadius: 7, border: '1px solid color-mix(in srgb, var(--t-danger, #f87171) 45%, var(--t-brd))',
                        background: 'var(--t-card)', color: 'var(--t-danger, #f87171)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      }}
                    >
                      <Trash2 style={{ width: 11, height: 11 }} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          RIGHT PANEL — chat area
          ══════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, borderRadius: isCompactLayout ? '0 0 24px 24px' : '0 24px 24px 0', overflow: 'hidden', background: 'var(--t-bg)' }}>

        {/* ── Top header bar ── */}
        <div style={{
          flexShrink: 0,
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--t-card) 84%, #061536 16%), var(--t-card))',
          borderBottom: '1px solid var(--t-brd)',
          padding: isCompactLayout ? '9px 10px' : '9px 14px',
          display: 'flex',
          flexDirection: isCompactLayout ? 'column' : 'row',
          alignItems: isCompactLayout ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}>
          {/* Left: trainer identity */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 0,
            padding: '6px 8px',
            borderRadius: 12,
            background: 'color-mix(in srgb, var(--t-card) 88%, #10264f 12%)',
            border: '1px solid color-mix(in srgb, var(--t-brd) 80%, #214a88 20%)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: trainer.bg, border: `1px solid ${trainer.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15,
            }}>
              {trainer.emoji}
            </div>
            <div>
              <h1 style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--t-tx)', lineHeight: 1.1 }}>{trainer.label} Coach</h1>
              <p style={{ fontSize: 10, color: 'var(--t-tx3)', marginTop: 1 }}>
                {mode === 'thinking' ? '🧠 Deep thinking mode' : '✨ Creative mode'} · Your personal AI mentor
              </p>
            </div>
          </div>

          {/* Right: controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            width: isCompactLayout ? '100%' : 'auto',
            marginLeft: isCompactLayout ? 0 : 'auto',
          }}>
            {/* Mode toggle */}
            <div style={{
              display: 'flex',
              background: 'color-mix(in srgb, var(--t-bg) 88%, #071a3a 12%)',
              border: '1px solid color-mix(in srgb, var(--t-brd) 78%, #214a88 22%)',
              borderRadius: 12,
              padding: 2,
              gap: 2,
            }}>
              <button
                onClick={() => setMode('thinking')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 9px', borderRadius: 9, fontSize: 10.5, fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: mode === 'thinking' ? 'linear-gradient(135deg, color-mix(in srgb, var(--t-acc) 74%, #fff 26%), var(--t-acc))' : 'transparent',
                  color: mode === 'thinking' ? 'var(--t-btn-color)' : 'var(--t-tx3)',
                  transition: 'all 0.15s',
                }}
              >
                <Brain style={{ width: 11, height: 11 }} /> Thinking
              </button>
              <button
                onClick={() => setMode('creative')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 9px', borderRadius: 9, fontSize: 10.5, fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: mode === 'creative' ? 'linear-gradient(135deg, color-mix(in srgb, var(--t-mod-coach) 84%, #fff 16%), var(--t-mod-coach))' : 'transparent',
                  color: mode === 'creative' ? '#fff' : 'var(--t-tx3)',
                  transition: 'all 0.15s',
                }}
              >
                <Sparkles style={{ width: 11, height: 11 }} /> Creative
              </button>
            </div>

            {/* Trainer topic selector */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minWidth: isCompactLayout ? 0 : 220,
              background: 'color-mix(in srgb, var(--t-bg) 88%, #071a3a 12%)',
              border: `1px solid color-mix(in srgb, ${trainer.color} 28%, var(--t-brd) 72%)`,
              borderRadius: 12,
              padding: '4px 9px',
              boxShadow: `0 8px 16px color-mix(in srgb, ${trainer.color} 12%, transparent)`,
            }}>
              <TrainerIcon style={{ width: 13, height: 13, color: trainer.color, flexShrink: 0 }} />
              <select
                value={trainerType}
                onChange={e => { setTrainerType(e.target.value); setMessages([]); setActiveId(null); setQueuedMessages([]); setCoachError(''); }}
                title="Change coach topic"
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--t-tx)',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {TRAINERS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {messages.length > 0 && (
              <button
                onClick={startNewChat}
                title="New chat"
                style={{ width: 34, height: 34, borderRadius: 11, background: 'var(--t-bg)', border: '1px solid var(--t-brd)', color: 'var(--t-tx3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
              >
                <RotateCcw style={{ width: 13, height: 13 }} />
              </button>
            )}
          </div>
        </div>

        {/* ── Messages / welcome / goal dashboard ── */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: 'linear-gradient(180deg, color-mix(in srgb, var(--t-bg) 90%, #030f2d 10%), var(--t-bg))' }}>
          {messages.length === 0 ? (
            trainerType === 'goal' ? (
              <GoalDashboard
                profile={profile as Parameters<typeof GoalDashboard>[0]['profile']}
                goalData={goalData}
                onAsk={send}
                compact={isCompactLayout}
              />
            ) : (
              /* Welcome screen */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: isCompactLayout ? '26px 16px' : '38px 28px', textAlign: 'center' }}>
                {/* Animated trainer orb */}
                <div style={{ position: 'relative', marginBottom: 28 }}>
                  <div style={{
                    width: 88, height: 88, borderRadius: 28,
                    background: `radial-gradient(135deg, ${trainer.bg}, color-mix(in srgb, ${trainer.color} 8%, var(--t-card)))`,
                    border: `2px solid ${trainer.color}35`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 0 40px ${trainer.color}20, 0 8px 32px rgba(0,0,0,0.18)`,
                    fontSize: 36,
                  }}>
                    {trainer.emoji}
                  </div>
                  {/* Pulse ring */}
                  <div style={{
                    position: 'absolute', inset: -8, borderRadius: 36,
                    border: `1.5px solid ${trainer.color}22`,
                    animation: 'pulse 2.4s ease-in-out infinite',
                    pointerEvents: 'none',
                  }} />
                </div>

                <h2 style={{ fontSize: 28, fontWeight: 900, color: 'var(--t-tx)', marginBottom: 8, letterSpacing: '-0.02em' }}>
                  {trainer.label} Coach
                </h2>
                <p style={{ fontSize: 14.5, color: 'var(--t-tx3)', maxWidth: 560, lineHeight: 1.6, marginBottom: 6 }}>
                  {mode === 'thinking'
                    ? 'Deep thinking mode — structured, detailed, step-by-step guidance.'
                    : 'Creative mode — imaginative, free-flowing ideas and inspiration.'}
                </p>
                <p style={{ fontSize: 13, color: 'var(--t-tx3)', marginBottom: 24, opacity: 0.95 }}>
                  Hi <span style={{ color: trainer.color, fontWeight: 800 }}>{profile.username}</span> — what would you like to work on?
                </p>

                {/* Starter cards */}
                <div style={{ display: 'grid', gridTemplateColumns: isCompactLayout ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 10, width: '100%', maxWidth: 940 }}>
                  {starters.map((q, qi) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      style={{
                        textAlign: 'left', padding: '16px 18px',
                        borderRadius: 16, fontSize: 14, fontWeight: 500,
                        background: 'color-mix(in srgb, var(--t-card) 90%, #051839 10%)',
                        border: '1px solid color-mix(in srgb, var(--t-brd) 78%, #21529a 22%)',
                        color: 'var(--t-tx2)',
                        cursor: 'pointer', lineHeight: 1.5,
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        transition: 'all 0.15s',
                        boxShadow: '0 10px 22px rgba(0,0,0,0.16)',
                        animationDelay: `${qi * 60}ms`,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = `${trainer.color}50`;
                        e.currentTarget.style.background = trainer.bg;
                        e.currentTarget.style.color = 'var(--t-tx)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--t-brd)';
                        e.currentTarget.style.background = 'var(--t-card)';
                        e.currentTarget.style.color = 'var(--t-tx2)';
                      }}
                    >
                      <div style={{ width: 22, height: 22, borderRadius: 8, background: `${trainer.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <TrainerIcon style={{ width: 12, height: 12, color: trainer.color }} />
                      </div>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )
          ) : (
            /* Chat messages */
            <div style={{ padding: isCompactLayout ? '14px 12px' : '18px 22px', maxWidth: '100%', margin: '0 auto', width: '100%' }}>
              {/* Goal reminder strip */}
              {trainerType === 'goal' && profile?.custom_daily_goal && (
                <div style={{ background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 14, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>🎯</span>
                  <p style={{ fontSize: 13, color: 'var(--t-acc)', fontWeight: 700 }}>Goal: {profile.custom_daily_goal}</p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 10, alignItems: 'flex-end' }}>
                    {/* Coach avatar */}
                    {msg.role === 'assistant' && (
                      <div style={{
                        width: 34, height: 34, borderRadius: 12, flexShrink: 0,
                        background: trainer.bg, border: `1px solid ${trainer.color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16,
                      }}>
                        {trainer.emoji}
                      </div>
                    )}

                    {/* Bubble */}
                    <div
                      style={{
                        maxWidth: isCompactLayout ? '92%' : '84%', fontSize: 14.5, lineHeight: 1.72, whiteSpace: 'pre-wrap',
                        padding: '12px 14px',
                        ...(msg.role === 'user' ? {
                          background: 'color-mix(in srgb, var(--t-btn) 90%, #2d7fd6 10%)',
                          color: 'var(--t-btn-color)',
                          borderRadius: '18px 18px 6px 18px',
                          fontWeight: 500,
                          boxShadow: '0 10px 24px color-mix(in srgb, var(--t-acc) 22%, transparent)',
                        } : {
                          background: 'color-mix(in srgb, var(--t-card) 94%, #071838 6%)',
                          border: '1px solid color-mix(in srgb, var(--t-brd) 72%, #21529a 28%)',
                          color: 'var(--t-tx)',
                          borderRadius: '18px 18px 18px 6px',
                          boxShadow: '0 8px 20px rgba(0,0,0,0.14)',
                        }),
                      }}
                    >
                      {msg.content}
                    </div>

                    {/* User avatar initial */}
                    {msg.role === 'user' && (
                      <div style={{
                        width: 34, height: 34, borderRadius: 12, flexShrink: 0,
                        background: 'var(--t-btn)', border: '1px solid var(--t-brd-a)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 900, color: 'var(--t-btn-color)',
                      } as React.CSSProperties}>
                        {profile.username[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}

                <div ref={bottomRef} />
              </div>
            </div>
          )}
        </div>

        {/* ── Input bar ── */}
        <div style={{
          flexShrink: 0,
          background: 'color-mix(in srgb, var(--t-card) 86%, #051737 14%)',
          borderTop: '1px solid var(--t-brd)',
          padding: isCompactLayout ? '8px 10px 10px' : '10px 14px 10px',
        }}>
          <div style={{ maxWidth: '100%', margin: '0 auto', width: '100%' }}>
            {(loading || queuedMessages.length > 0 || coachError) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {loading && (
                  <div style={{ padding: '7px 11px', borderRadius: 999, background: trainer.bg, border: `1px solid ${trainer.color}30`, color: trainer.color, fontSize: 11, fontWeight: 700 }}>
                    Coach is replying...
                  </div>
                )}
                {queuedMessages.length > 0 && (
                  <div style={{ padding: '7px 11px', borderRadius: 999, background: 'var(--t-bg)', border: '1px solid var(--t-brd)', color: 'var(--t-tx2)', fontSize: 11, fontWeight: 700 }}>
                    {queuedMessages.length} message{queuedMessages.length === 1 ? '' : 's'} queued
                  </div>
                )}
                {coachError && (
                  <div style={{ padding: '7px 11px', borderRadius: 999, background: 'color-mix(in srgb, var(--t-danger, #ff6b6b) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--t-danger, #ff6b6b) 24%, transparent)', color: 'var(--t-danger, #ff6b6b)', fontSize: 11, fontWeight: 700 }}>
                    {coachError}
                  </div>
                )}
              </div>
            )}
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 10,
              background: 'color-mix(in srgb, var(--t-bg) 90%, #061739 10%)', border: `1.5px solid color-mix(in srgb, var(--t-brd) 72%, #22559f 28%)`,
              borderRadius: 22, padding: isCompactLayout ? '12px 12px' : '13px 16px',
              transition: 'border-color 0.15s',
              boxShadow: '0 14px 28px rgba(0,0,0,0.18)',
            }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = `${trainer.color}50`)}
              onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--t-brd)')}
            >
              {/* Trainer mini badge */}
              <div style={{ width: 30, height: 30, borderRadius: 10, background: trainer.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>
                {trainer.emoji}
              </div>

              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={trainerType === 'goal' ? 'Ask about your goal progress…' : `Ask your ${trainer.label.toLowerCase()} coach…`}
                rows={1}
                style={{
                  flex: 1, background: 'transparent', resize: 'none', outline: 'none',
                  fontSize: 14.5, color: 'var(--t-tx)', lineHeight: 1.55,
                  border: 'none', maxHeight: 96, overflowY: 'auto',
                  fontFamily: 'inherit',
                }}
                onInput={e => {
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 96) + 'px';
                }}
              />

              <button
                onClick={() => send()}
                disabled={!input.trim()}
                style={{
                  width: 38, height: 38, borderRadius: 13, flexShrink: 0,
                  background: input.trim() ? 'var(--t-btn)' : 'var(--t-card2)',
                  border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                  boxShadow: input.trim() ? '0 4px 14px color-mix(in srgb, var(--t-acc) 22%, transparent)' : 'none',
                }}
              >
                <Send style={{ width: 15, height: 15, color: input.trim() ? 'var(--t-btn-color)' : 'var(--t-tx3)' }} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap', textAlign: 'center' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: trainer.color }} />
              <p style={{ fontSize: 11, color: 'var(--t-tx3)' }}>
                {trainer.label} · {mode === 'thinking' ? 'Thinking' : 'Creative'} Mode · Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
