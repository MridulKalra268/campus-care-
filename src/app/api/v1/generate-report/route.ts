// src/app/api/v1/generate-report/route.ts
import { NextRequest } from 'next/server';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

type EmotionEntry = { emotion: string; confidence: number; timestamp: number };
type Message = { role: 'user' | 'ai'; text: string; ts: string };

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    messages: Message[];
    emotionTimeline: EmotionEntry[];
    durationSec: number;
  };

  const { messages, emotionTimeline, durationSec } = body;
  if (!messages?.length) return Response.json({ error: 'messages required' }, { status: 400 });

  const key = env.mistralApiKey;
  if (!key) return Response.json({ error: 'MISTRAL_API_KEY not set' }, { status: 500 });

  // Summarise emotion timeline into plain text for the prompt
  const emotionSummary = buildEmotionSummary(emotionTimeline, durationSec);
  const transcript = messages
    .map(m => `${m.role === 'user' ? 'Student' : 'AI'}: ${m.text}`)
    .join('\n');

  const prompt = `You are a compassionate mental health session analyst. Analyse this AI video chat session and return ONLY valid JSON.

TRANSCRIPT:
${transcript}

DETECTED FACIAL EMOTIONS (${durationSec}s session):
${emotionSummary}

Return this exact JSON (no markdown, no extra text):
{
  "summary": "2-3 sentence warm summary of the session",
  "topics": ["topic1", "topic2", "topic3"],
  "emotionInsight": "2 sentences interpreting the facial emotion pattern",
  "wellbeingNote": "one warm, actionable suggestion",
  "dominantEmotion": "single word: the most frequent emotion",
  "riskFlag": false
}

If the student expressed distress or self-harm, set riskFlag to true.`;

  try {
    const res = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0.4,
      }),
    });

    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const report = JSON.parse(jsonMatch[0]);
    return Response.json({ data: { report, emotionTimeline } });
  } catch (err) {
    console.error('[generate-report]', err);
    return Response.json({ error: 'Report generation failed' }, { status: 500 });
  }
}

function buildEmotionSummary(timeline: EmotionEntry[], totalSec: number): string {
  if (!timeline.length) return 'No facial emotion data captured.';
  const counts: Record<string, number> = {};
  timeline.forEach(e => { counts[e.emotion] = (counts[e.emotion] ?? 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const pct = (n: number) => ((n / timeline.length) * 100).toFixed(0) + '%';
  return sorted.map(([em, n]) => `${em}: ${pct(n)}`).join(', ') + ` over ${totalSec}s`;
}