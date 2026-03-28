// Universal AI provider adapter
// Switch providers with: AI_PROVIDER=openai | anthropic  (defaults to openai)
// Switch models with:    AI_FAST_MODEL / AI_SMART_MODEL  (optional overrides)
//
// Fast tier  → cheap / quick tasks (feedback, vocab, sentence check, progress)
// Smart tier → richer reasoning    (coach chat)

export type AIMessage = { role: 'user' | 'assistant'; content: string };

export interface ChatOptions {
  /** 'fast' = cheap model, 'smart' = capable model */
  tier: 'fast' | 'smart';
  /** Optional system / instruction prompt */
  system?: string;
  messages: AIMessage[];
  maxTokens?: number;
}

// Default model names per provider — override via env vars if needed
const DEFAULT_MODELS = {
  openai:    { fast: 'gpt-4o-mini',            smart: 'gpt-4o' },
  anthropic: { fast: 'claude-haiku-4-5-20251001', smart: 'claude-sonnet-4-6' },
};

function getModel(provider: string, tier: 'fast' | 'smart'): string {
  const envKey = tier === 'fast' ? 'AI_FAST_MODEL' : 'AI_SMART_MODEL';
  if (process.env[envKey]) return process.env[envKey]!;
  return DEFAULT_MODELS[provider as keyof typeof DEFAULT_MODELS]?.[tier]
    ?? DEFAULT_MODELS.openai[tier];
}

export async function chat({ tier, system, messages, maxTokens = 600 }: ChatOptions): Promise<string> {
  const provider = (process.env.AI_PROVIDER ?? 'openai').toLowerCase();
  const model    = getModel(provider, tier);

  // ── Anthropic ──────────────────────────────────────────────────
  if (provider === 'anthropic') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const res = await client.messages.create({
      model,
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages,
    });

    return res.content[0]?.type === 'text' ? res.content[0].text : '';
  }

  // ── OpenAI (default) ───────────────────────────────────────────
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const openaiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    ...(system ? [{ role: 'system' as const, content: system }] : []),
    ...messages,
  ];

  const res = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: openaiMessages,
  });

  return res.choices[0]?.message?.content ?? '';
}
