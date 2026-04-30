// src/app/api/v1/video-chat/route.ts
import { NextRequest } from 'next/server';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = 'mistral-small-latest';

// In-memory session store (resets on serverless cold start — fine for prototyping)
// For persistence, swap this with a Supabase table or Redis
const sessions = new Map<string, { role: string; content: string }[]>();

const SYSTEM_PROMPT = `You are CampusCare, a compassionate AI mental health companion for Indian university students.
You are currently in a VIDEO CHAT session where the student can see themselves and hear you speak.

Keep responses SHORT (2-4 sentences max) because they will be read aloud via speech synthesis.
Be warm, empathetic, and non-clinical. If there are signs of crisis, gently encourage professional help.
Mention iCall (9152987821) or Telemanas (14416) if the student seems in distress.`;

async function callMistral(messages: { role: string; content: string }[]) {
  const key = env.mistralApiKey;
  if (!key) throw new Error('MISTRAL_API_KEY not configured');

  const res = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 200,
      temperature: 0.75,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Mistral error ${res.status}: ${err}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

// POST /api/v1/video-chat
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const sessionId = body.sessionId as string | undefined;
  const userMessage = body.message as string | undefined;

  if (!sessionId || typeof sessionId !== 'string') {
    return Response.json({ error: 'sessionId is required' }, { status: 400 });
  }
  if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
    return Response.json({ error: 'message is required' }, { status: 400 });
  }

  // Get or create conversation history for this session
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  const history = sessions.get(sessionId)!;

  // Append user message
  history.push({ role: 'user', content: userMessage.trim() });

  // Keep only last 10 exchanges (20 messages) to stay within token limits
  const trimmed = history.slice(-20);

  try {
    const reply = await callMistral(trimmed);

    // Append assistant reply to history
    history.push({ role: 'assistant', content: reply });
    sessions.set(sessionId, history.slice(-20));

    return Response.json({ data: { reply, sessionId } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[video-chat] error:', err);
    return Response.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/v1/video-chat — clear session
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  if (sessionId) sessions.delete(sessionId);
  return Response.json({ data: { cleared: true } });
}