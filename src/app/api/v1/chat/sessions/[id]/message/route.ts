import { NextRequest } from 'next/server';
import { chatOnce, classifyRisk } from '@/lib/mistral';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: { message: 'Invalid JSON body' } }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  const content = body?.content as string | undefined;
  const privacyMode = (body?.privacyMode as 'private' | 'standard' | undefined) ?? 'standard';
  const language = (body?.language as string | undefined) ?? 'en';

  if (!content || typeof content !== 'string' || !content.trim()) {
    return new Response(
      JSON.stringify({ error: { message: 'content is required and must be a non-empty string' } }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  try {
    // Generate reply and risk score in parallel
    const [reply, risk] = await Promise.all([
      chatOnce(content),
      classifyRisk(content),
    ]);

    return new Response(
      JSON.stringify({ data: { sessionId: id, reply, language, privacyMode, risk } }),
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[chat/message] error:', err);
    return new Response(
      JSON.stringify({ error: { message } }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}