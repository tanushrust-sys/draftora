'use client';

// COACH TAB — personal AI writing mentor
// Knows the user's level, goals, and writing history
// Two modes: Thinking (deep/analytical) and Creative (imaginative/free-flowing)
// Trainer type lets the user focus on a specific writing style

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { Bot, Send, Brain, Sparkles, RotateCcw, ChevronDown } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string };

// Trainer types per spec — user picks what kind of help they need
const TRAINER_TYPES = [
  { value: 'general',            label: 'Most Active Trainer'   },
  { value: 'Persuasive / Essay', label: 'Persuasive / Essay'    },
  { value: 'Blog',               label: 'Blog Trainer'          },
  { value: 'Email',              label: 'Email Trainer'         },
  { value: 'Feature Article',    label: 'Feature Article Trainer'},
];

// Quick-start questions shown when the chat is empty
const STARTER_QUESTIONS = [
  'Help me write a strong thesis statement',
  'How do I make my writing more descriptive?',
  'Give me ideas for a creative story',
  'How can I improve my vocabulary usage?',
  'Help me structure a persuasive essay',
  'What makes a great opening line?',
];

export default function CoachPage() {
  const { profile } = useAuth();

  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState('');
  const [mode, setMode]             = useState<'thinking' | 'creative'>('thinking');
  const [trainerType, setTrainerType] = useState('general');
  const [loading, setLoading]       = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send a message to the AI coach
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
          messages: updated,
          mode,
          trainerType,
          userId: profile?.id,
          userContext: {
            username:    profile?.username,
            level:       profile?.level,
            xp:          profile?.xp,
            streak:      profile?.streak,
            customGoal:  profile?.custom_daily_goal,
          },
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having a moment — please try again!"
      }]);
    }
    setLoading(false);
  };

  // Enter to send, Shift+Enter for newline
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: 'var(--t-bg)' }}
    >

      {/* ── HEADER: title, mode toggle, trainer selector ── */}
      <div
        className="flex-shrink-0"
        style={{
          background: 'var(--t-card)',
          borderBottom: '1px solid var(--t-brd)',
          borderRadius: 0,
          padding: '16px 20px',
        }}
      >
        <div className="flex items-center justify-between max-w-4xl mx-auto">

          {/* Page title */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center"
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: 'var(--t-acc-a)',
              }}
            >
              <Bot style={{ width: 22, height: 22, color: 'var(--t-acc)' }} />
            </div>
            <div>
              <h1
                className="text-lg font-bold flex items-center gap-2"
                style={{ color: 'var(--t-tx)' }}
              >
                My Coach
              </h1>
              <p
                className="text-xs mt-0.5"
                style={{ color: 'var(--t-tx3)' }}
              >
                Your personal AI writing mentor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">

            {/* ── MODE TOGGLE: Thinking vs Creative ── */}
            {/* Thinking = deep analytical answers; Creative = imaginative ideas */}
            <div
              className="flex p-1"
              style={{
                background: 'var(--t-card2)',
                border: '1px solid var(--t-brd)',
                borderRadius: 16,
              }}
            >
              <button
                onClick={() => setMode('thinking')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold transition-all duration-200"
                style={{
                  borderRadius: 12,
                  background: mode === 'thinking' ? 'var(--t-btn)' : 'transparent',
                  color: mode === 'thinking' ? 'var(--t-btn-color)' : 'var(--t-tx3)',
                }}
              >
                <Brain style={{ width: 14, height: 14 }} /> Thinking
              </button>
              <button
                onClick={() => setMode('creative')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold transition-all duration-200"
                style={{
                  borderRadius: 12,
                  background: mode === 'creative' ? 'linear-gradient(135deg, #7c3aed, #a78bfa)' : 'transparent',
                  color: mode === 'creative' ? '#fff' : 'var(--t-tx3)',
                }}
              >
                <Sparkles style={{ width: 14, height: 14 }} /> Creative
              </button>
            </div>

            {/* ── TRAINER TYPE SELECTOR ── */}
            {/* User picks the writing style they want help with */}
            <div
              className="relative flex items-center"
              style={{
                background: 'var(--t-card2)',
                border: '1px solid var(--t-brd)',
                borderRadius: 14,
                padding: '8px 12px',
              }}
            >
              <select
                value={trainerType}
                onChange={e => setTrainerType(e.target.value)}
                className="text-xs bg-transparent outline-none cursor-pointer appearance-none pr-5"
                style={{ color: 'var(--t-tx2)' }}
              >
                {TRAINER_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-2.5 pointer-events-none"
                style={{ width: 12, height: 12, color: 'var(--t-tx3)' }}
              />
            </div>

            {/* Clear chat button — only shown when there are messages */}
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                title="Clear chat"
                className="flex items-center justify-center transition-all duration-200"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  color: 'var(--t-tx3)',
                  background: 'transparent',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--t-card2)';
                  e.currentTarget.style.color = 'var(--t-tx)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--t-tx3)';
                }}
              >
                <RotateCcw style={{ width: 16, height: 16 }} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── MESSAGES AREA ── */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '24px' }}>
        <div className="max-w-4xl mx-auto space-y-4">

          {messages.length === 0 ? (
            /* ── EMPTY STATE: greeting + quick-start questions ── */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              {/* Coach avatar */}
              <div
                className="flex items-center justify-center mb-6"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 24,
                  background: 'var(--t-acc-a)',
                  border: '1px solid var(--t-acc-b)',
                }}
              >
                <Bot style={{ width: 36, height: 36, color: 'var(--t-acc)' }} />
              </div>

              {/* Greeting per spec: "How can I assist you today?" */}
              <h2
                className="text-xl font-bold mb-2"
                style={{ color: 'var(--t-tx)' }}
              >
                How can I assist you today, {profile?.username || 'Writer'}?
              </h2>
              <p
                className="text-sm mb-2 max-w-md"
                style={{ color: 'var(--t-tx3)' }}
              >
                {mode === 'thinking'
                  ? 'Thinking Mode — I\'ll give you deep, detailed, step-by-step guidance.'
                  : 'Creative Mode — I\'ll give you imaginative, free-flowing ideas and suggestions.'
                }
              </p>
              <p
                className="text-xs mb-8"
                style={{ color: 'var(--t-tx3)' }}
              >
                Trainer: <span style={{ color: 'var(--t-acc)', fontWeight: 600 }}>
                  {TRAINER_TYPES.find(t => t.value === trainerType)?.label}
                </span>
              </p>

              {/* Quick-start question chips */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
                {STARTER_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="text-left text-sm transition-all duration-200"
                    style={{
                      background: 'var(--t-card)',
                      border: '1px solid var(--t-brd)',
                      borderRadius: 20,
                      padding: '14px 18px',
                      color: 'var(--t-tx2)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--t-brd-a)';
                      e.currentTarget.style.color = 'var(--t-tx)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--t-brd)';
                      e.currentTarget.style.color = 'var(--t-tx2)';
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

          ) : (
            /* ── CHAT MESSAGES ── */
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                {/* Coach avatar for assistant messages */}
                {msg.role === 'assistant' && (
                  <div
                    className="flex items-center justify-center mr-3 flex-shrink-0 mt-1"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      background: 'var(--t-acc-a)',
                      border: '1px solid var(--t-acc-b)',
                    }}
                  >
                    <Bot style={{ width: 16, height: 16, color: 'var(--t-acc)' }} />
                  </div>
                )}

                <div
                  className="max-w-[75%] text-sm leading-relaxed whitespace-pre-wrap"
                  style={{
                    padding: '14px 18px',
                    ...(msg.role === 'user'
                      ? {
                          background: 'var(--t-btn)',
                          color: 'var(--t-btn-color)',
                          fontWeight: 500,
                          borderRadius: '24px 24px 6px 24px',
                        }
                      : {
                          background: 'var(--t-card)',
                          border: '1px solid var(--t-brd)',
                          color: 'var(--t-tx2)',
                          borderRadius: '24px 24px 24px 6px',
                        }
                    ),
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}

          {/* Typing indicator — three bouncing dots */}
          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div
                className="flex items-center justify-center mr-3 flex-shrink-0"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  background: 'var(--t-acc-a)',
                  border: '1px solid var(--t-acc-b)',
                }}
              >
                <Bot style={{ width: 16, height: 16, color: 'var(--t-acc)' }} />
              </div>
              <div
                className="flex gap-1.5 items-center"
                style={{
                  background: 'var(--t-card)',
                  border: '1px solid var(--t-brd)',
                  borderRadius: '24px 24px 24px 6px',
                  padding: '14px 20px',
                }}
              >
                {[0, 150, 300].map(d => (
                  <div
                    key={d}
                    className="rounded-full animate-bounce"
                    style={{
                      width: 8,
                      height: 8,
                      background: 'var(--t-acc)',
                      animationDelay: `${d}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── INPUT BAR ── */}
      <div
        className="flex-shrink-0"
        style={{
          background: 'var(--t-card)',
          borderTop: '1px solid var(--t-brd)',
          padding: '16px',
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div
            className="flex items-end gap-3 transition-all duration-200"
            style={{
              background: 'var(--t-card2)',
              border: '1px solid var(--t-brd)',
              borderRadius: 20,
              padding: '12px 16px',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--t-brd-a)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--t-brd)';
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask your coach anything..."
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed max-h-32"
              style={{
                color: 'var(--t-tx)',
              }}
              onInput={e => {
                const el = e.target as HTMLTextAreaElement;
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 flex items-center justify-center transition-all duration-200 disabled:opacity-40"
              style={{
                width: 38,
                height: 38,
                borderRadius: 16,
                background: 'var(--t-btn)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              <Send style={{ width: 15, height: 15, color: 'var(--t-btn-color)' }} />
            </button>
          </div>

          {/* Mode reminder below input */}
          <p
            className="text-xs mt-2.5 text-center"
            style={{ color: 'var(--t-tx3)' }}
          >
            {mode === 'thinking'
              ? 'Thinking Mode — deep, step-by-step guidance'
              : 'Creative Mode — imaginative, free-flowing ideas'
            } · Enter to send
          </p>
        </div>
      </div>

    </div>
  );
}
