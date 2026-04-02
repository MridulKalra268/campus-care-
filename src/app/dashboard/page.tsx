"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

// ── Fake data ──────────────────────────────────────────────────────────────
const STUDENT = {
  name: "Arjun Sharma",
  id: "CS21B047",
  major: "Computer Science",
  year: "3rd Year",
  university: "IIT Raipur",
  avatar: "AS",
  email: "arjun.sharma@iitraipur.ac.in",
  streak: 7,
  wellbeingScore: 74,
};

const WEEKLY_MOOD = [
  { day: "Mon", score: 6 },
  { day: "Tue", score: 7 },
  { day: "Wed", score: 5 },
  { day: "Thu", score: 8 },
  { day: "Fri", score: 7 },
  { day: "Sat", score: 9 },
  { day: "Sun", score: 8 },
];

const SESSIONS = [
  { id: 1, date: "Jun 28, 2025", topic: "Exam anxiety & study tips", duration: "12 min", risk: "low" },
  { id: 2, date: "Jun 25, 2025", topic: "Feeling overwhelmed with assignments", duration: "18 min", risk: "medium" },
  { id: 3, date: "Jun 22, 2025", topic: "Sleep trouble & stress", duration: "9 min", risk: "low" },
  { id: 4, date: "Jun 18, 2025", topic: "Homesickness and loneliness", duration: "22 min", risk: "low" },
  { id: 5, date: "Jun 14, 2025", topic: "Career confusion and pressure", duration: "15 min", risk: "medium" },
];

const RESOURCES = [
  { title: "Campus Counseling Center", type: "Service", link: "#", icon: "🏥" },
  { title: "Peer Support Network", type: "Community", link: "#", icon: "🤝" },
  { title: "Mindfulness Workshop – July 5", type: "Event", link: "#", icon: "🧘" },
  { title: "Study Skills Bootcamp", type: "Event", link: "#", icon: "📚" },
];

const GOALS = [
  { id: 1, text: "Meditate for 10 min daily", done: true },
  { id: 2, text: "Attend counseling session this week", done: false },
  { id: 3, text: "Sleep before midnight 5/7 days", done: true },
  { id: 4, text: "Exercise 3x this week", done: false },
];

// ── Mistral hook ───────────────────────────────────────────────────────────
function useMistralInsight(prompt: string) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = async () => {
    setLoading(true);
    setError(null);
    setText("");
    try {
      const res = await fetch("/api/v1/ai/insight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const json = await res.json() as { data?: { text?: string }; error?: { message?: string } };
      if (!res.ok) throw new Error(json?.error?.message ?? "API error");
      setText(json.data?.text ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load insight");
    } finally {
      setLoading(false);
    }
  };

  return { text, loading, error, refresh: fetch_ };
}

// ── Sub-components ─────────────────────────────────────────────────────────
function MoodBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 7 ? "bg-emerald-500" : score >= 5 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-20 flex flex-col-reverse overflow-hidden">
        <div className={`${color} rounded-full transition-all duration-700`} style={{ height: `${pct}%` }} />
      </div>
      <span className="text-xs text-foreground/50 font-mono">{score}</span>
    </div>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, string> = {
    low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[risk] ?? map.low}`}>
      {risk}
    </span>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [goals, setGoals] = useState(GOALS);
  const [showInsight, setShowInsight] = useState(false);

  const insightPrompt = `Student profile: ${STUDENT.name}, ${STUDENT.year} ${STUDENT.major} at ${STUDENT.university}. 
Wellbeing score this week: ${STUDENT.wellbeingScore}/100. Mood trend: ${WEEKLY_MOOD.map(m => m.score).join(", ")} (Mon-Sun). 
Recent chat topics: ${SESSIONS.slice(0, 3).map(s => s.topic).join("; ")}. 
Goals completed: ${goals.filter(g => g.done).length}/${goals.length}.
Give a warm, personalized 3-sentence wellbeing insight and one actionable tip for this student. Be concise and encouraging.`;

  const { text: insight, loading: insightLoading, error: insightError, refresh: loadInsight } = useMistralInsight(insightPrompt);

  useEffect(() => {
    if (showInsight && !insight && !insightLoading) {
      loadInsight();
    }
  }, [showInsight]);

  const toggleGoal = (id: number) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, done: !g.done } : g));
  };

  const avgMood = (WEEKLY_MOOD.reduce((a, b) => a + b.score, 0) / WEEKLY_MOOD.length).toFixed(1);
  const completedGoals = goals.filter(g => g.done).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950/10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">

        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
              {STUDENT.avatar}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Welcome back, {STUDENT.name.split(" ")[0]} 👋
              </h1>
              <p className="text-sm text-foreground/60">{STUDENT.id} · {STUDENT.major} · {STUDENT.university}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-black/10 dark:border-white/10 px-4 py-2 text-sm bg-background/80 flex items-center gap-2">
              <span>🔥</span>
              <span className="font-semibold">{STUDENT.streak} day streak</span>
            </div>
            <Link
              href="/chat"
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium transition-colors"
            >
              Open Chat
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Wellbeing Score", value: `${STUDENT.wellbeingScore}`, unit: "/100", color: "text-blue-600" },
            { label: "Avg Mood", value: avgMood, unit: "/10", color: "text-emerald-600" },
            { label: "Chat Sessions", value: `${SESSIONS.length}`, unit: "total", color: "text-indigo-600" },
            { label: "Goals Done", value: `${completedGoals}`, unit: `/${goals.length}`, color: "text-amber-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-black/10 dark:border-white/10 p-5 bg-background/80 backdrop-blur">
              <p className="text-xs text-foreground/50 font-medium uppercase tracking-wider">{s.label}</p>
              <p className={`mt-1 text-3xl font-bold ${s.color}`}>
                {s.value}<span className="text-sm font-normal text-foreground/40 ml-1">{s.unit}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Mood chart */}
            <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 bg-background/80 backdrop-blur">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">Weekly Mood</h2>
                <span className="text-xs text-foreground/50">This week</span>
              </div>
              <div className="flex items-end gap-2 h-28">
                {WEEKLY_MOOD.map((m) => (
                  <div key={m.day} className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full bg-black/10 dark:bg-white/10 rounded-t-md overflow-hidden" style={{ height: "80px" }}>
                      <div
                        className={`w-full rounded-t-md transition-all duration-700 ${m.score >= 7 ? "bg-gradient-to-t from-emerald-500 to-emerald-400" : m.score >= 5 ? "bg-gradient-to-t from-amber-400 to-amber-300" : "bg-gradient-to-t from-red-400 to-red-300"}`}
                        style={{ height: `${(m.score / 10) * 80}px`, marginTop: `${80 - (m.score / 10) * 80}px` }}
                      />
                    </div>
                    <span className="text-xs text-foreground/50">{m.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent sessions */}
            <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 bg-background/80 backdrop-blur">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">Recent Chat Sessions</h2>
                <Link href="/chat" className="text-xs text-blue-600 hover:underline">New session →</Link>
              </div>
              <div className="space-y-3">
                {SESSIONS.map((s) => (
                  <div key={s.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-black/[.03] dark:hover:bg-white/[.03] transition-colors">
                    <div className="size-9 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm shrink-0">
                      💬
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.topic}</p>
                      <p className="text-xs text-foreground/50">{s.date} · {s.duration}</p>
                    </div>
                    <RiskBadge risk={s.risk} />
                  </div>
                ))}
              </div>
            </div>

            {/* AI Insight panel */}
            <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 p-6 bg-blue-50/50 dark:bg-blue-950/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🤖</span>
                  <h2 className="font-semibold text-lg">AI Wellbeing Insight</h2>
                  <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Mistral</span>
                </div>
                <button
                  onClick={() => { setShowInsight(true); loadInsight(); }}
                  disabled={insightLoading}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {insightLoading ? "Generating…" : insight ? "Refresh" : "Generate Insight"}
                </button>
              </div>

              {!showInsight && !insight && (
                <p className="text-sm text-foreground/60 italic">
                  Click "Generate Insight" to get a personalized AI wellbeing analysis based on your week.
                </p>
              )}
              {insightLoading && (
                <div className="space-y-2">
                  {[80, 60, 40].map(w => (
                    <div key={w} className="h-3 bg-blue-200 dark:bg-blue-800 rounded animate-pulse" style={{ width: `${w}%` }} />
                  ))}
                </div>
              )}
              {insightError && (
                <p className="text-sm text-red-500">⚠️ {insightError}</p>
              )}
              {insight && !insightLoading && (
                <p className="text-sm text-foreground/80 leading-relaxed">{insight}</p>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">

            {/* Goals */}
            <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 bg-background/80 backdrop-blur">
              <h2 className="font-semibold text-lg mb-4">Weekly Goals</h2>
              <div className="space-y-3">
                {goals.map((g) => (
                  <label key={g.id} className="flex items-center gap-3 cursor-pointer group">
                    <div
                      onClick={() => toggleGoal(g.id)}
                      className={`size-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${g.done ? "bg-blue-600 border-blue-600" : "border-black/20 dark:border-white/20 group-hover:border-blue-400"}`}
                    >
                      {g.done && <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className={`text-sm ${g.done ? "line-through text-foreground/40" : "text-foreground/80"}`}>
                      {g.text}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-4 bg-black/5 dark:bg-white/5 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(completedGoals / goals.length) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-foreground/50">{completedGoals} of {goals.length} complete</p>
            </div>

            {/* Resources */}
            <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 bg-background/80 backdrop-blur">
              <h2 className="font-semibold text-lg mb-4">Campus Resources</h2>
              <div className="space-y-3">
                {RESOURCES.map((r) => (
                  <a
                    key={r.title}
                    href={r.link}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-black/[.03] dark:hover:bg-white/[.03] transition-colors group"
                  >
                    <span className="text-xl shrink-0">{r.icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium group-hover:text-blue-600 transition-colors truncate">{r.title}</p>
                      <p className="text-xs text-foreground/50">{r.type}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 bg-background/80 backdrop-blur">
              <h2 className="font-semibold text-lg mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Chat Now", href: "/chat", emoji: "💬" },
                  { label: "Find Peers", href: "/student_matching", emoji: "🤝" },
                  { label: "Media Hub", href: "/media", emoji: "🎥" },
                  { label: "Voice", href: "/voice", emoji: "🎤" },
                ].map((a) => (
                  <Link
                    key={a.label}
                    href={a.href}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl border border-black/10 dark:border-white/10 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-center"
                  >
                    <span className="text-xl">{a.emoji}</span>
                    <span className="text-xs font-medium">{a.label}</span>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}