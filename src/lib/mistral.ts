// Mistral AI integration - free tier via api.mistral.ai
// Free models: mistral-small-latest, open-mistral-7b, open-mixtral-8x7b
import { env } from './env';

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = 'mistral-small-latest'; // free tier model

const SYSTEM_PROMPT = `You are CampusCare, a warm and supportive wellbeing assistant for university students.
Your role:
- Listen empathetically and validate feelings
- Offer practical coping strategies and resources
- Keep responses concise (2-4 sentences unless more detail is needed)
- If a user expresses self-harm, suicidal thoughts, or imminent danger, ALWAYS encourage them to call emergency services (112 in India) or campus counseling immediately
- You are NOT a licensed therapist — clarify this gently if needed
- Be culturally sensitive and non-judgmental`;

async function mistralChat(messages: { role: string; content: string }[]) {
  const key = env.mistralApiKey;
  if (!key) throw new Error('MISTRAL_API_KEY not set');

  const res = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      messages,
      max_tokens: 512,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Mistral API error ${res.status}: ${err}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? '';
}

export async function chatOnce(userText: string): Promise<string> {
  try {
    const reply = await mistralChat([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userText },
    ]);
    return reply || "I'm here to support you. Could you tell me more about what you're experiencing?";
  } catch (err) {
    console.error('Mistral chatOnce error:', err);
    throw err;
  }
}

export async function classifyRisk(userText: string): Promise<{ score: number; labels: string[] }> {
  try {
    const prompt = `You are a mental health risk classifier. Analyze the text and return ONLY valid JSON.
JSON format: {"score": 0.0, "labels": []}
Score range: 0.0 (no risk) to 1.0 (critical/immediate danger).
Labels (pick relevant): anxiety, depression, self_harm, crisis, stress, loneliness, overwhelmed, other.
If explicit self-harm or suicidal intent: score >= 0.9, include "crisis" or "self_harm".

Text: "${userText.replace(/"/g, "'")}"
JSON:`;

    const result = await mistralChat([
      { role: 'user', content: prompt },
    ]);

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { score?: unknown; labels?: unknown };
      let score = Number(parsed.score);
      if (!Number.isFinite(score)) score = 0;
      const labels = Array.isArray(parsed.labels) ? parsed.labels.map(String) : [];
      return { score: Math.max(0, Math.min(1, score)), labels };
    }
  } catch (err) {
    console.error('Risk classification error:', err);
  }
  return { score: 0, labels: [] };
}