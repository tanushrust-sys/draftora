import { NextResponse } from 'next/server';
import { chat } from '@/app/lib/ai-provider';
import { buildSupportContext, localSupportReply } from '@/app/lib/support-knowledge';

type Payload = {
  message?: string;
};

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

    const response = await chat({
      tier: 'nano',
      system,
      messages: [{ role: 'user', content: message }],
      maxTokens: 220,
    });

    const text = response.trim();
    if (!text) {
      return NextResponse.json({ reply: localSupportReply(message), source: 'local-fallback' });
    }

    return NextResponse.json({ reply: text, source: 'api' });
  } catch (error) {
    console.error('support-chat route error:', error);
    const fallback = localSupportReply(message);
    return NextResponse.json({ reply: fallback, source: 'local-fallback' });
  }
}
