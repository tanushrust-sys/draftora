// Universal AI provider adapter
// Switch providers with: AI_PROVIDER=openai | anthropic  (defaults to openai)
// OpenAI routing defaults:
// - nano/fast -> gpt-5.4-nano (vocab + low-cost high-volume tasks)
// - smart     -> gpt-5.4-mini (feedback/coach/reports)
// Anthropic defaults to Haiku 4.5 across tiers for cost control; override via AI_*_MODEL.
//
// Fast tier  → cheap / quick tasks (vocab, sentence check, progress)
// Smart tier → higher-quality writing tasks (feedback, coach, reports)

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
  openai:    { nano: 'gpt-5.4-nano', fast: 'gpt-5.4-nano', smart: 'gpt-5.4-mini' },
  anthropic: { nano: 'claude-haiku-4-5-20251001', fast: 'claude-haiku-4-5-20251001', smart: 'claude-haiku-4-5-20251001' },
};

function getModel(provider: string, tier: 'nano' | 'fast' | 'smart'): string {
  const envKey = tier === 'nano' ? 'AI_NANO_MODEL' : tier === 'fast' ? 'AI_FAST_MODEL' : 'AI_SMART_MODEL';
  if (process.env[envKey]) return process.env[envKey]!;
  return DEFAULT_MODELS[provider as keyof typeof DEFAULT_MODELS]?.[tier]
    ?? DEFAULT_MODELS.openai[tier];
}

function isModelResolutionError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('model') &&
    (
      msg.includes('not found') ||
      msg.includes('does not exist') ||
      msg.includes('unsupported') ||
      msg.includes('not available') ||
      msg.includes('access') ||
      msg.includes('permission')
    )
  );
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

  const fallbackCandidates = [
    process.env.AI_FALLBACK_MODEL,
    'gpt-5-mini',
    'gpt-4.1-mini',
  ].filter((m): m is string => Boolean(m && m.trim()));

  const modelsToTry = [model, ...fallbackCandidates.filter((m) => m !== model)];

  let res: Awaited<ReturnType<typeof client.chat.completions.create>> | null = null;
  let lastError: unknown = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const candidate = modelsToTry[i];
    try {
      res = await client.chat.completions.create({
        model: candidate,
        max_tokens: maxTokens,
        messages: openaiMessages,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      });
      break;
    } catch (err) {
      lastError = err;
      const canFallback = i < modelsToTry.length - 1 && isModelResolutionError(err);
      if (!canFallback) throw err;
      console.warn(`AI model fallback: "${candidate}" failed, trying next candidate.`);
    }
  }

  if (!res) {
    throw lastError instanceof Error ? lastError : new Error('AI request failed for all candidate models.');
  }

  return res.choices[0]?.message?.content ?? '';
}
