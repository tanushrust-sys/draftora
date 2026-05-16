import { NextResponse } from 'next/server';
import { chat } from '@/app/lib/ai-provider';
import { buildSupportContext, localSupportReply } from '@/app/lib/support-knowledge';

type Payload = {
  message?: string;
};

const SUPPORT_CHAT_TIMEOUT_MS = 6500;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('support_chat_timeout')), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

export async function POST(request: Request) {
  let message = '';
  try {
    const body = (await request.json()) as Payload;
    message = body?.message?.trim() ?? '';

    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    const scopedContext = buildSupportContext(message);

    const system = `You are Draftora Assistant for customer support.
Only answer using the provided Draftora context.
If the answer is not in context, say that clearly and offer nearest relevant guidance.
Keep answers concise, specific, and product-focused.

Draftora context:
${scopedContext}`;

    const fallbackReply = localSupportReply(message);

    // Fast path for known support intents: keep response instant and deterministic.
    if (message.length <= 220) {
      return NextResponse.json({ reply: fallbackReply, source: 'local-fast' });
    }

    const response = await withTimeout(
      chat({
        tier: 'nano',
        system,
        messages: [{ role: 'user', content: message }],
        maxTokens: 220,
      }),
      SUPPORT_CHAT_TIMEOUT_MS,
    );

    const text = response.trim();
    if (!text) {
      return NextResponse.json({ reply: fallbackReply, source: 'local-fallback' });
    }

    return NextResponse.json({ reply: text, source: 'api' });
  } catch (error) {
    console.error('support-chat route error:', error);
    const fallback = localSupportReply(message);
    return NextResponse.json({ reply: fallback, source: 'local-fallback' });
  }
}
