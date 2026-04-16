// Universal AI provider adapter
// Switch providers with: AI_PROVIDER=openai | anthropic  (defaults to openai)
// OpenAI stays on gpt-4o-mini because it is the cheapest good OpenAI chat model.
// Anthropic defaults to Haiku 4.5 across tiers for cost control; override via AI_*_MODEL.
//
// Fast tier  → cheap / quick tasks (feedback, vocab, sentence check, progress)
// Smart tier → richer reasoning    (coach chat)

export type AIMessage = { role: 'user' | 'assistant'; content: string };

export interface ChatOptions {
  /** 'nano' = cheapest (vocab), 'fast' = standard (feedback), 'smart' = best (coach) */
  tier: 'nano' | 'fast' | 'smart';
  /** Optional system / instruction prompt */
  system?: string;
  messages: AIMessage[];
  maxTokens?: number;
  /** Force JSON output (OpenAI json_object mode / Anthropic reminder) */
  jsonMode?: boolean;
}

// Default model names per provider — override via env vars if needed
const DEFAULT_MODELS = {
  openai:    { nano: 'gpt-4o-mini', fast: 'gpt-4o-mini', smart: 'gpt-4o-mini' },
  anthropic: { nano: 'claude-haiku-4-5-20251001', fast: 'claude-haiku-4-5-20251001', smart: 'claude-haiku-4-5-20251001' },
};

function getModel(provider: string, tier: 'nano' | 'fast' | 'smart'): string {
  const envKey = tier === 'nano' ? 'AI_NANO_MODEL' : tier === 'fast' ? 'AI_FAST_MODEL' : 'AI_SMART_MODEL';
  if (process.env[envKey]) return process.env[envKey]!;
  return DEFAULT_MODELS[provider as keyof typeof DEFAULT_MODELS]?.[tier]
    ?? DEFAULT_MODELS.openai[tier];
}

/**
 * Strips markdown code fences that AI models sometimes add despite instructions.
 * Handles ```json ... ```, ``` ... ```, and bare JSON.
 */
export function extractJSON(raw: string): string {
  const trimmed = raw.trim();
  // Match ```json ... ``` or ``` ... ```
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
  if (fenced) return fenced[1].trim();
  // Single backtick wrappers
  const ticked = trimmed.match(/^`([\s\S]*)`$/);
  if (ticked) return ticked[1].trim();
  return trimmed;
}

export async function chat({ tier, system, messages, maxTokens = 500, jsonMode = false }: ChatOptions): Promise<string> {
  const provider = (process.env.AI_PROVIDER ?? 'openai').toLowerCase();
  const model    = getModel(provider, tier);

  // ── Anthropic ──────────────────────────────────────────────────
  if (provider === 'anthropic') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      throw new Error('Missing ANTHROPIC_API_KEY in environment.');
    }
    const client = new Anthropic({ apiKey: anthropicKey });

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
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error('Missing OPENAI_API_KEY in environment.');
  }
  const client = new OpenAI({ apiKey: openaiKey });

  const openaiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    ...(system ? [{ role: 'system' as const, content: system }] : []),
    ...messages,
  ];

  const res = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: openaiMessages,
    ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
  });

  return res.choices[0]?.message?.content ?? '';
}
