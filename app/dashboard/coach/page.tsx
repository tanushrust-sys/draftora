'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/app/lib/supabase';
import {
  Bot, Send, Brain, Sparkles, RotateCcw, ChevronDown,
  Plus, MessageSquare, Clock, Target, PenLine, BookOpen,
  Flame, Zap, Trophy, ChevronRight, Star, type LucideIcon,
} from 'lucide-react';

type Message      = { role: 'user' | 'assistant'; content: string };
type Conversation = { id: string; mode: string; trainer_type: string; messages: Message[]; updated_at: string };

type GoalData = {
  writings:      { id: string; title: string; word_count: number; status: string; created_at: string; category: string }[];
  vocabTotal:    number;
  vocabMastered: number;
};

const TRAINER_TYPES = [
  { value: 'general',            label: 'Most Active',         icon: '⚡' },
  { value: 'creative',           label: 'Creative Writing',    icon: '✨' },
  { value: 'Persuasive / Essay', label: 'Persuasive Writing',  icon: '📢' },
  { value: 'Blog',               label: 'Blog Entry',          icon: '📝' },
  { value: 'Feature Article',    label: 'Feature Article',     icon: '📰' },
  { value: 'Diary',              label: 'Diary Entry',         icon: '📖' },
  { value: 'Email',              label: 'Email Writing',       icon: '✉️' },
  { value: 'goal',               label: 'My Goal',             icon: '🎯' },
];

const TRAINER_ICONS: Record<string, LucideIcon> = {
  general: Zap,
  creative: Sparkles,
  'Persuasive / Essay': Target,
  Blog: PenLine,
  'Feature Article': BookOpen,
  Diary: BookOpen,
  Email: Send,
  goal: Trophy,
};

function getTrainerIcon(trainerType?: string): LucideIcon {
  return TRAINER_ICONS[trainerType ?? ''] ?? MessageSquare;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function GoalDashboard({
  profile, goalData, onAsk,
}: {
  profile: { custom_daily_goal?: string; age_group?: string; streak: number; xp: number; level: number };
  goalData: GoalData | null;
  onAsk: (q: string) => void;
}) {
  const goal = profile.custom_daily_goal || 'No goal set yet';

  const GOAL_STARTERS = [
    `How close am I to achieving: "${goal.slice(0, 40)}${goal.length > 40 ? '...' : ''}"?`,
    'Give me a personalised roadmap to reach my goal',
    'What should I work on most this week?',
    'Analyse my recent writings and tell me what to improve',
    'How can I use vocabulary practice to reach my goal?',
    'Give me a writing exercise tailored to my goal',
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      {/* Goal banner */}
      <div style={{
        borderRadius: 22,
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--t-acc) 20%, var(--t-card)), var(--t-card))',
        border: '1px solid var(--t-brd-a)',
        padding: '22px 24px',
        marginBottom: 16,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 80, opacity: 0.08, pointerEvents: 'none' }}>🎯</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Target style={{ width: 22, height: 22, color: 'var(--t-acc)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-acc)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>My Writing Goal</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--t-tx)', lineHeight: 1.3 }}>{goal}</p>
            {profile.age_group && profile.age_group !== 'skipped' && (
              <p style={{ fontSize: 12, color: 'var(--t-tx3)', marginTop: 4 }}>Age group: {profile.age_group} years</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { icon: <PenLine style={{ width: 16, height: 16 }} />, label: 'Writings', value: goalData?.writings.length ?? '...', color: 'var(--t-mod-write)' },
          { icon: <BookOpen style={{ width: 16, height: 16 }} />, label: 'Vocab mastered', value: goalData?.vocabMastered ?? '...', color: 'var(--t-mod-vocab)' },
          { icon: <Flame style={{ width: 16, height: 16 }} />, label: 'Day streak', value: profile.streak, color: 'var(--t-warning)' },
          { icon: <Zap style={{ width: 16, height: 16 }} />, label: 'Total XP', value: profile.xp >= 1000 ? `${(profile.xp / 1000).toFixed(1)}k` : profile.xp, color: 'var(--t-mod-rewards)' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color }}>
              {icon}
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t-tx3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
            </div>
            <p style={{ fontSize: 24, fontWeight: 900, color, lineHeight: 1 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Recent writings */}
      {goalData && goalData.writings.length > 0 && (
        <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 18, padding: '16px 20px', marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-tx3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Recent Writings</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {goalData.writings.slice(0, 5).map(w => (
              <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--t-acc-a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <PenLine style={{ width: 14, height: 14, color: 'var(--t-acc)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--t-tx3)' }}>{w.category} · {w.word_count} words</p>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                  background: w.status === 'reviewed' ? 'color-mix(in srgb, var(--t-success) 12%, transparent)' : 'var(--t-acc-a)',
                  color: w.status === 'reviewed' ? 'var(--t-success)' : 'var(--t-acc)',
                  border: `1px solid ${w.status === 'reviewed' ? 'color-mix(in srgb, var(--t-success) 22%, transparent)' : 'var(--t-brd-a)'}`,
                }}>
                  {w.status === 'reviewed' ? 'Reviewed ✓' : 'Submitted'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ask buttons */}
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-tx3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Ask your goal coach</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {GOAL_STARTERS.map(q => (
          <button
            key={q}
            onClick={() => onAsk(q)}
            style={{
              textAlign: 'left', padding: '14px 16px', borderRadius: 16, fontSize: 14,
              background: 'var(--t-card)', border: '1px solid var(--t-brd)', color: 'var(--t-tx2)',
              cursor: 'pointer', lineHeight: 1.4,
              display: 'flex', alignItems: 'center', gap: 10,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--t-brd-a)'; e.currentTarget.style.color = 'var(--t-tx)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--t-brd)'; e.currentTarget.style.color = 'var(--t-tx2)'; }}
          >
            <ChevronRight style={{ width: 14, height: 14, color: 'var(--t-acc)', flexShrink: 0 }} />
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

const STARTER_QUESTIONS: Record<string, string[]> = {
  general:              ['Help me write a strong thesis statement', 'How do I make my writing more descriptive?', 'Give me ideas for a creative story', 'What makes a great opening line?', 'How can I improve my vocabulary usage?', 'Help me structure my ideas better'],
  creative:             ['Give me a vivid story idea', 'How do I write better characters?', 'What makes a great plot twist?', 'Help me write a powerful opening scene', 'How do I show emotion in writing?', 'Give me a creative writing prompt'],
  'Persuasive / Essay': ['Help me write a strong thesis', 'How do I structure a persuasive essay?', 'Give me counterargument techniques', 'How do I write a compelling conclusion?', 'What rhetorical devices should I use?', 'Review my argument structure'],
  Blog:                 ['Give me blog post ideas', 'How do I write a catchy headline?', 'What makes blog writing engaging?', 'Help me find my blog voice', 'How do I hook readers in?', 'How long should my blog posts be?'],
  'Feature Article':    ['What makes a great article lead?', 'How do I research and structure an article?', 'Help me write a compelling headline', 'How do I interview sources effectively?', 'What is the inverted pyramid structure?', 'How do I maintain objectivity?'],
  Diary:                ['Help me start a diary entry', 'How do I write more honestly in my diary?', 'What should I write about today?', 'How do I capture my emotions in writing?', 'Give me diary writing prompts', 'How do I make my diary entries meaningful?'],
  Email:                ['Help me write a professional email', 'How do I write a clear subject line?', 'How do I politely decline something?', 'Help me write a follow-up email', 'How do I sound confident but not arrogant?', 'Help me apologise professionally'],
  goal:                 [],
};

export default function CoachPage() {
  const { profile } = useAuth();

  const [messages, setMessages]           = useState<Message[]>([]);
  const [input, setInput]                 = useState('');
  const [mode, setMode]                   = useState<'thinking' | 'creative'>('thinking');
  const [trainerType, setTrainerType]     = useState('general');
  const [loading, setLoading]             = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [goalData, setGoalData]           = useState<GoalData | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Load goal data when goal trainer is selected
  useEffect(() => {
    if (trainerType !== 'goal' || !profile) return;
    (async () => {
      const [wRes, vRes] = await Promise.all([
        supabase.from('writings')
          .select('id, title, word_count, status, created_at, category')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.from('vocab_words')
          .select('id, mastered')
          .eq('user_id', profile.id),
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
    const { data } = await supabase
      .from('coach_conversations')
      .select('id, mode, trainer_type, messages, updated_at')
      .eq('user_id', profile.id)
      .order('updated_at', { ascending: false })
      .limit(30);
    setConversations((data ?? []) as Conversation[]);
  }, [profile]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const saveConversation = useCallback(async (msgs: Message[], convId: string | null) => {
    if (!profile || msgs.length < 2) return convId;
    if (convId) {
      await supabase.from('coach_conversations')
        .update({ messages: msgs, updated_at: new Date().toISOString() })
        .eq('id', convId);
      await loadConversations();
      return convId;
    } else {
      const { data } = await supabase.from('coach_conversations')
        .insert({ user_id: profile.id, mode, trainer_type: trainerType, messages: msgs })
        .select('id').single();
      await loadConversations();
      return data?.id ?? null;
    }
  }, [profile, mode, trainerType, loadConversations]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const updated: Message[] = [...messages, { role: 'user', content: msg }];
    setMessages(updated);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated, mode, trainerType,
          userId: profile?.id,
          userContext: {
            username:   profile?.username,
            level:      profile?.level,
            xp:         profile?.xp,
            streak:     profile?.streak,
            customGoal: profile?.custom_daily_goal,
            ageGroup:   (profile as { age_group?: string })?.age_group,
          },
        }),
      });
      const data = await res.json();
      const withReply: Message[] = [...updated, { role: 'assistant', content: data.response }];
      setMessages(withReply);
      const newId = await saveConversation(withReply, activeId);
      if (newId && !activeId) setActiveId(newId as string);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having a moment - please try again!" }]);
    }
    setLoading(false);
  };

  const startNewChat = () => {
    setMessages([]);
    setActiveId(null);
    setMode('thinking');
    setTrainerType('general');
    inputRef.current?.focus();
  };

  const loadSession = (conv: Conversation) => {
    setMessages(conv.messages as Message[]);
    setActiveId(conv.id);
    setMode(conv.mode as 'thinking' | 'creative');
    setTrainerType(conv.trainer_type);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const getSessionPreview = (conv: Conversation) => {
    const firstUser = conv.messages.find(m => m.role === 'user');
    return firstUser?.content.slice(0, 45) || 'New conversation';
  };

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-bg)' }}>
        <div style={{ width: 40, height: 40, borderRadius: 16, background: 'var(--t-btn)', animation: 'pulse 1.5s infinite' }} />
      </div>
    );
  }

  const currentTrainer = TRAINER_TYPES.find(t => t.value === trainerType);
  const CurrentTrainerIcon = getTrainerIcon(currentTrainer?.value);
  const starters = STARTER_QUESTIONS[trainerType] ?? STARTER_QUESTIONS.general;

  return (
    <div className="flex" style={{ height: 'calc(100vh - 120px)', background: 'var(--t-bg)', overflow: 'hidden', borderRadius: 16 }}>

      {/* ══ LEFT — Previous Chats ══ */}
      <div className="flex-shrink-0 flex flex-col" style={{ width: 240, background: 'var(--t-card)', borderRight: '1px solid var(--t-brd)' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--t-brd)' }}>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <MessageSquare style={{ width: 14, height: 14, color: 'var(--t-acc)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-tx)' }}>Chats</span>
              {conversations.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t-tx3)', background: 'var(--t-bg)', borderRadius: 99, padding: '1px 6px', border: '1px solid var(--t-brd)' }}>
                  {conversations.length}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2"
            style={{ background: 'var(--t-btn)', color: 'var(--t-btn-color)', borderRadius: 12, padding: '8px 12px', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}
          >
            <Plus style={{ width: 12, height: 12 }} /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: '6px' }}>
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-3">
              <Clock style={{ width: 24, height: 24, color: 'var(--t-tx3)', marginBottom: 8, opacity: 0.4 }} />
              <p style={{ fontSize: 11, color: 'var(--t-tx3)', lineHeight: 1.5 }}>Past conversations appear here</p>
            </div>
          ) : (
            conversations.map(conv => {
              const isActive = conv.id === activeId;
              const trainer  = TRAINER_TYPES.find(t => t.value === conv.trainer_type);
              const TrainerIcon = getTrainerIcon(trainer?.value ?? conv.trainer_type);
              return (
                <button
                  key={conv.id}
                  onClick={() => loadSession(conv)}
                  className="w-full text-left"
                  style={{
                    display: 'block', padding: '9px 10px', borderRadius: 12, marginBottom: 2,
                    background: isActive ? 'var(--t-acc-a)' : 'transparent',
                    border: isActive ? '1px solid var(--t-brd-a)' : '1px solid transparent',
                    cursor: 'pointer',
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <TrainerIcon style={{ width: 12, height: 12, color: isActive ? 'var(--t-acc)' : 'var(--t-tx3)' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? 'var(--t-acc)' : 'var(--t-tx3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {trainer?.label ?? conv.trainer_type}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--t-tx3)', marginLeft: 'auto' }}>{timeAgo(conv.updated_at)}</span>
                  </div>
                  <p style={{ fontSize: 12, color: isActive ? 'var(--t-tx)' : 'var(--t-tx2)', fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {getSessionPreview(conv)}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ══ RIGHT — Chat ══ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="flex-shrink-0" style={{ background: 'var(--t-card)', borderBottom: '1px solid var(--t-brd)', padding: '12px 18px' }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot style={{ width: 18, height: 18, color: 'var(--t-acc)' }} />
              </div>
              <div>
                <h1 style={{ fontSize: 15, fontWeight: 800, color: 'var(--t-tx)', lineHeight: 1 }}>My Coach</h1>
                <p style={{ fontSize: 11, color: 'var(--t-tx3)', marginTop: 2 }}>Your personal AI writing mentor</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Mode toggle */}
              <div className="flex p-1" style={{ background: 'var(--t-bg)', border: '1px solid var(--t-brd)', borderRadius: 14 }}>
                <button onClick={() => setMode('thinking')} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-all duration-200" style={{ borderRadius: 10, background: mode === 'thinking' ? 'var(--t-btn)' : 'transparent', color: mode === 'thinking' ? 'var(--t-btn-color)' : 'var(--t-tx3)' }}>
                  <Brain style={{ width: 12, height: 12 }} /> Thinking
                </button>
                <button onClick={() => setMode('creative')} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-all duration-200" style={{ borderRadius: 10, background: mode === 'creative' ? 'linear-gradient(135deg, color-mix(in srgb, var(--t-mod-coach) 78%, white 22%), var(--t-mod-coach))' : 'transparent', color: mode === 'creative' ? '#fff' : 'var(--t-tx3)' }}>
                  <Sparkles style={{ width: 12, height: 12 }} /> Creative
                </button>
              </div>

              {/* Trainer selector */}
              <div className="relative flex items-center" style={{ background: 'var(--t-bg)', border: '1px solid var(--t-brd)', borderRadius: 12, padding: '6px 10px' }}>
                <CurrentTrainerIcon style={{ width: 14, height: 14, color: 'var(--t-acc)', marginRight: 6 }} />
                <select
                  value={trainerType}
                  onChange={e => setTrainerType(e.target.value)}
                  className="text-xs bg-transparent outline-none cursor-pointer appearance-none pr-4"
                  style={{ color: 'var(--t-tx2)', fontWeight: 600 }}
                >
                  {TRAINER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2 pointer-events-none" style={{ width: 10, height: 10, color: 'var(--t-tx3)' }} />
              </div>

              {messages.length > 0 && (
                <button onClick={startNewChat} title="New chat" className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--t-bg)', border: '1px solid var(--t-brd)', color: 'var(--t-tx3)', cursor: 'pointer' }}>
                  <RotateCcw style={{ width: 13, height: 13 }} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Messages / Goal dashboard */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            trainerType === 'goal' ? (
              <GoalDashboard
                profile={profile as Parameters<typeof GoalDashboard>[0]['profile']}
                goalData={goalData}
                onAsk={send}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center px-6">
                <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--t-acc-a)', border: '1px solid var(--t-acc-b)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <CurrentTrainerIcon style={{ width: 28, height: 28, color: 'var(--t-acc)' }} />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t-tx)', marginBottom: 6 }}>
                  {currentTrainer?.label} Coach
                </h2>
                <p style={{ fontSize: 15, color: 'var(--t-tx3)', maxWidth: 400, marginBottom: 4 }}>
                  {mode === 'thinking' ? 'Thinking Mode - deep, detailed, step-by-step guidance.' : 'Creative Mode - imaginative, free-flowing ideas and suggestions.'}
                </p>
                <p style={{ fontSize: 13, color: 'var(--t-tx3)', marginBottom: 28 }}>
                  Hi <span style={{ color: 'var(--t-acc)', fontWeight: 700 }}>{profile?.username}</span> — what would you like to work on?
                </p>
                <div className="grid grid-cols-2 gap-3 w-full" style={{ maxWidth: 640 }}>
                  {starters.map(q => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="text-left transition-all duration-200"
                      style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: 16, padding: '14px 18px', fontSize: 15, color: 'var(--t-tx2)', cursor: 'pointer', lineHeight: 1.4 }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--t-brd-a)'; e.currentTarget.style.color = 'var(--t-tx)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--t-brd)'; e.currentTarget.style.color = 'var(--t-tx2)'; }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )
          ) : (
            <div style={{ padding: '20px 24px' }}>
              {/* Goal reminder strip when in goal mode */}
              {trainerType === 'goal' && profile?.custom_daily_goal && (
                <div style={{ background: 'var(--t-acc-a)', border: '1px solid var(--t-brd-a)', borderRadius: 14, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Target style={{ width: 14, height: 14, color: 'var(--t-acc)', flexShrink: 0 }} />
                  <p style={{ fontSize: 13, color: 'var(--t-acc)', fontWeight: 600 }}>Goal: {profile.custom_daily_goal}</p>
                </div>
              )}

              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div style={{ width: 32, height: 32, borderRadius: 11, background: 'var(--t-acc-a)', border: '1px solid var(--t-acc-b)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0, marginTop: 2 }}>
                        <Bot style={{ width: 15, height: 15, color: 'var(--t-acc)' }} />
                      </div>
                    )}
                    <div
                      className="max-w-[78%] leading-relaxed whitespace-pre-wrap"
                      style={{
                        fontSize: 16,
                        padding: '14px 18px',
                        ...(msg.role === 'user'
                          ? { background: 'var(--t-btn)', color: 'var(--t-btn-color)', fontWeight: 500, borderRadius: '22px 22px 6px 22px' }
                          : { background: 'var(--t-card)', border: '1px solid var(--t-brd)', color: 'var(--t-tx2)', borderRadius: '22px 22px 22px 6px' }
                        ),
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div style={{ width: 32, height: 32, borderRadius: 11, background: 'var(--t-acc-a)', border: '1px solid var(--t-acc-b)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 }}>
                      <Bot style={{ width: 15, height: 15, color: 'var(--t-acc)' }} />
                    </div>
                    <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-brd)', borderRadius: '22px 22px 22px 6px', padding: '14px 20px', display: 'flex', gap: 6, alignItems: 'center' }}>
                      {[0, 150, 300].map(d => (
                        <div key={d} className="rounded-full animate-bounce" style={{ width: 7, height: 7, background: 'var(--t-acc)', animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0" style={{ background: 'var(--t-card)', borderTop: '1px solid var(--t-brd)', padding: '12px 18px' }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div className="flex items-end gap-3" style={{ background: 'var(--t-bg)', border: '1px solid var(--t-brd)', borderRadius: 18, padding: '10px 14px' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={trainerType === 'goal' ? 'Ask about your goal progress...' : 'Ask your coach anything...'}
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none leading-relaxed max-h-32"
                style={{ fontSize: 16, color: 'var(--t-tx)' }}
                onInput={e => {
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = 'auto';
                  el.style.height = el.scrollHeight + 'px';
                }}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 flex items-center justify-center transition-all disabled:opacity-40"
                style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--t-btn)', border: 'none', cursor: 'pointer' }}
              >
                <Send style={{ width: 14, height: 14, color: 'var(--t-btn-color)' }} />
              </button>
            </div>
            <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--t-tx3)' }}>
              {currentTrainer?.label} | {mode === 'thinking' ? 'Thinking' : 'Creative'} Mode | Enter to send
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
