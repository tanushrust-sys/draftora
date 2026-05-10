'use client';

import { useMemo, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { localSupportReply } from '@/app/lib/support-knowledge';
import styles from '@/app/components/marketing-chat-widget.module.css';

type ChatMessage = {
  role: 'assistant' | 'user';
  text: string;
};

export default function MarketingChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'Hi — I’m Draftora Assistant. I’m loaded with app knowledge across the full platform. Ask anything.',
    },
  ]);

  const hasMessages = useMemo(() => messages.length > 0, [messages.length]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || pending) return;

    const userMessage: ChatMessage = { role: 'user', text: trimmed };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setPending(true);

    try {
      const response = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!response.ok) {
        throw new Error('Support chat request failed');
      }

      const payload = (await response.json()) as { reply?: string };
      const replyText = payload.reply?.trim() || localSupportReply(trimmed);
      const replyMessage: ChatMessage = { role: 'assistant', text: replyText };
      setMessages((current) => [...current, replyMessage]);
    } catch (error) {
      console.error('support widget fallback:', error);
      const fallbackMessage: ChatMessage = { role: 'assistant', text: localSupportReply(trimmed) };
      setMessages((current) => [...current, fallbackMessage]);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.launcher}
        aria-label={open ? 'Close Draftora support chat' : 'Open Draftora support chat'}
        onClick={() => setOpen((current) => !current)}
      >
        <img src="/logo.svg" alt="" className={styles.launcherLogo} />
      </button>

      {open && (
        <section className={styles.panel} aria-label="Draftora support chat">
          <header className={styles.panelHeader}>
            <div className={styles.panelTitleWrap}>
              <MessageCircle size={16} />
              <span>Draftora Support</span>
            </div>
            <button type="button" className={styles.closeBtn} onClick={() => setOpen(false)} aria-label="Close support chat">
              <X size={16} />
            </button>
          </header>

          <div className={styles.feed}>
            {hasMessages &&
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`${styles.bubble} ${message.role === 'assistant' ? styles.assistantBubble : styles.userBubble}`}
                >
                  {message.text}
                </div>
              ))}
            {pending && <div className={`${styles.bubble} ${styles.assistantBubble}`}>Thinking...</div>}
          </div>

          <div className={styles.inputRow}>
            <input
              value={input}
              disabled={pending}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleSend();
                }
              }}
              className={styles.input}
              placeholder="Message..."
              aria-label="Type a message"
            />
            <button type="button" className={styles.sendBtn} onClick={handleSend} aria-label="Send message" disabled={pending}>
              <Send size={14} />
            </button>
          </div>
        </section>
      )}
    </>
  );
}
