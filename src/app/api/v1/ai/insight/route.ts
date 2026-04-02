import { NextRequest } from "next/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = "mistral-small-latest";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: { message: "Invalid JSON" } }, { status: 400 });
  }

  const prompt = body?.prompt as string | undefined;
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return Response.json({ error: { message: "prompt is required" } }, { status: 400 });
  }

  const key = env.mistralApiKey;
  if (!key) {
    return Response.json({ error: { message: "MISTRAL_API_KEY not configured on server" } }, { status: 500 });
  }

  try {
    const res = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return Response.json({ error: { message: `Mistral error ${res.status}: ${err}` } }, { status: 502 });
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    return Response.json({ data: { text } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[ai/insight] error:", err);
    return Response.json({ error: { message } }, { status: 500 });
  }
}