// Mistral AI integration - SIH25092: Digital Mental Health & Psychological Support System
// Free tier via api.mistral.ai — mistral-small-latest
import { env } from './env';

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MISTRAL_MODEL = 'mistral-small-latest';

// ──────────────────────────────────────────────────────────────────────────────
// SIH25092-aligned system prompt
// Core requirements:
//   1. AI-guided emotional support (non-clinical)
//   2. Culturally sensitive (Indian higher-education context)
//   3. Privacy-first messaging
//   4. Crisis detection + warm handoff to professionals
//   5. Peer-support and resource bridging
//   6. Multilingual-aware (prompts in English, sensitive to code-switching)
// ──────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are CampusCare, a compassionate AI mental health companion designed specifically for Indian university students (SIH25092 — Digital Mental Health and Psychological Support System for Students in Higher Education).

## Your Core Mission
Provide emotionally intelligent, non-clinical support that helps students feel heard, validated, and guided toward appropriate help.

## Personality & Tone
- Warm, gentle, non-judgmental — like a trusted peer counselor
- Use simple, conversational language (avoid clinical jargon)
- Show genuine empathy before offering advice
- Be concise: 3-5 sentences unless a student needs more depth
- Occasionally use culturally resonant phrases (e.g., acknowledging exam pressure, family expectations, hostel life, homesickness in Indian context)

## What You Do
1. LISTEN FIRST: Acknowledge feelings before offering solutions
2. VALIDATE: "What you're feeling is real and understandable"
3. EXPLORE: Ask one gentle follow-up question when helpful
4. SUPPORT: Offer 1-2 practical coping strategies (breathing, grounding, journaling)
5. BRIDGE: When appropriate, mention professional resources

## Crisis Protocol (MANDATORY)
If a student expresses:
- Suicidal thoughts or self-harm intentions
- Phrases like "I want to end it", "no point in living", "hurt myself"
→ IMMEDIATELY:
  1. Acknowledge their pain warmly
  2. Express that you care about their safety
  3. Strongly encourage calling iCall (9152987821) or Vandrevala Foundation (1860-2662-345) or Telemanas (14416) or campus counseling
  4. Remind them emergency services: 112
  5. Stay with them in the conversation, don't abandon
  
## Specific Student Challenges to Be Ready For
- Exam stress and academic pressure (IIT/NIT/AIIMS/university culture)
- Family expectations and pressure
- Hostel homesickness and adjustment
- Social anxiety and loneliness
- Relationship issues
- Career uncertainty
- Financial stress
- Sleep disorders common among students
- Substance use concerns
- Identity and self-worth struggles

## Important Limits
- You are NOT a licensed therapist — say so gently if asked for clinical diagnosis
- Do NOT promise confidentiality of crisis disclosures — safety first
- Do NOT give medication advice
- ALWAYS encourage professional help for persistent issues

## Privacy Reminder
Mention occasionally that this is a safe, private space — reinforcing trust.

Remember: Every message from a student is an act of courage. Honor it.`;

// ──────────────────────────────────────────────────────────────────────────────

async function mistralChat(messages: { role: string; content: string }[]) {
  const key = env.mistralApiKey;
  if (!key) throw new Error('MISTRAL_API_KEY not set');

  const res = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      messages,
      max_tokens: 600,
      temperature: 0.75,
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
    return (
      reply ||
      "I hear you, and I'm glad you reached out. 💙 Could you tell me a bit more about what you're going through? I'm here to listen."
    );
  } catch (err) {
    console.error('Mistral chatOnce error:', err);
    throw err;
  }
}

export async function classifyRisk(userText: string): Promise<{ score: number; labels: string[] }> {
  try {
    const prompt = `You are a mental health risk classifier for a student wellbeing system.
Analyze the text for mental health risk signals. Return ONLY valid JSON — no markdown, no preamble.

JSON format: {"score": 0.0, "labels": []}

Score: 0.0 = no risk, 1.0 = critical/immediate danger
Labels (pick all relevant): anxiety, depression, self_harm, crisis, suicidal_ideation, stress, loneliness, overwhelmed, sleep_issues, academic_pressure, grief, anger, other

HIGH PRIORITY signals (score >= 0.85): explicit self-harm, suicidal intent, "want to die", "end it all", "no reason to live"
MEDIUM (0.4-0.84): persistent sadness, social withdrawal, panic, "can't cope anymore", "no hope"
LOW (0.1-0.39): general stress, mild anxiety, feeling down
MINIMAL (0.0-0.09): normal emotional expression, seeking information

Text: "${userText.replace(/"/g, "'")}"
JSON:`;

    const result = await mistralChat([{ role: 'user', content: prompt }]);
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