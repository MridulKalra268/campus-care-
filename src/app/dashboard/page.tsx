"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { supabase } from "@/lib/supabaseClient";

type WeeklyMood = { day: string; score: number };
type Session = { id: string; date: string; topic: string; duration: string; risk: string };
type Goal = { id: string; text: string; done: boolean };
type DashboardData = {
  profile: {
    display_name: string;
    student_id: string;
    major: string;
    year: string;
    university: string;
    streak: number;
    wellbeing_score: number;
    mood: string;
  };
  weeklyMood: WeeklyMood[];
  wellbeingScore: number;
  sessions: Session[];
  goals: Goal[];
  stats: {
    totalSessions: number;
    avgMood: string;
    completedGoals: number;
    totalGoals: number;
  };
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, session, profile: authProfile, loading: authLoading, signOut } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [moodInput, setMoodInput] = useState<number | null>(null);
  const [moodLogging, setMoodLogging] = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [authLoading, user, router]);

  const fetchDashboard = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/dashboard', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { data?: DashboardData; error?: string };
      if (json.error) throw new Error(json.error);
      setData(json.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (session?.access_token) {
      fetchDashboard();
    }
  }, [fetchDashboard, session?.access_token]);

  const toggleGoal = async (goal: Goal) => {
    if (!session?.access_token || !data) return;

    // Optimistic update
    setData(prev => prev ? {
      ...prev,
      goals: prev.goals.map(g => g.id === goal.id ? { ...g, done: !g.done } : g),
      stats: {
        ...prev.stats,
        completedGoals: prev.stats.completedGoals + (goal.done ? -1 : 1),
      },
    } : prev);

    await fetch(`/api/v1/goals/${goal.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ done: !goal.done }),
    });
  };

  const logMood = async (score: number) => {
    if (!session?.access_token) return;
    setMoodLogging(true);
    try {
      await fetch('/api/v1/mood', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ score }),
      });
      setMoodInput(score);
      setShowMoodPicker(false);
      await fetchDashboard(); // refresh
    } finally {
      setMoodLogging(false);
    }
  };

  const generateInsight = async () => {
    if (!data || insightLoading) return;
    setInsightLoading(true);
    setInsight('');
    try {
      const res = await fetch('/api/v1/ai/insight', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt: `Student: ${data.profile?.display_name || 'Student'}, ${data.profile?.year || ''} ${data.profile?.major || ''} at ${data.profile?.university || 'university'}.
Wellbeing score: ${data.wellbeingScore}/100. Mood this week (Mon-Sun): ${data.weeklyMood.map(m => m.score).join(', ')}.
Recent chat topics: ${data.sessions.slice(0, 3).map(s => s.topic).join('; ')}.
Goals completed: ${data.stats.completedGoals}/${data.stats.totalGoals}.
Give a warm, personalized 2-3 sentence wellbeing insight and one specific actionable tip. Be encouraging and concise.`,
        }),
      });
      const json = await res.json() as { data?: { text?: string } };
      setInsight(json.data?.text || 'Keep up the great work on your wellbeing journey!');
    } catch {
      setInsight('Unable to generate insight right now. You\'re doing great—keep going!');
    } finally {
      setInsightLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (authLoading || (loading && !data)) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">⚠️ {error}</p>
          <button onClick={fetchDashboard} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { profile, weeklyMood, wellbeingScore, sessions, goals, stats } = data;
  const displayName = profile?.display_name || authProfile?.display_name || 'Student';
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const avgMood = parseFloat(stats.avgMood);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950/10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Welcome back, {displayName.split(' ')[0]} 👋
              </h1>
              <p className="text-sm text-foreground/60">
                {profile?.student_id && `${profile.student_id} · `}
                {profile?.major || 'Student'} · {profile?.university || 'University'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Mood log button */}
            <div className="relative">
              <button
                onClick={() => setShowMoodPicker(v => !v)}
                className="rounded-xl border border-black/10 dark:border-white/10 px-4 py-2 text-sm bg-background/80 flex items-center gap-2 hover:bg-black/[.04] transition-colors"
              >
                <span>{profile?.mood || '😊'}</span>
                <span className="font-medium">Log mood</span>
              </button>
              {showMoodPicker && (
                <div className="absolute right-0 top-full mt-2 z-20 bg-background rounded-2xl border border-black/10 dark:border-white/10 shadow-xl p-4 w-64">
                  <p className="text-sm font-medium mb-3">How are you feeling today?</p>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <button
                        key={n}
                        onClick={() => logMood(n)}
                        disabled={moodLogging}
                        className={`rounded-lg py-2 text-sm font-bold transition-colors ${
                          n <= 3 ? 'bg-red-100 dark:bg-red-950/40 text-red-600 hover:bg-red-200'
                          : n <= 6 ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 hover:bg-amber-200'
                          : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-200'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-foreground/50 text-center">1 = very bad · 10 = excellent</p>
                </div>
              )}
            </div>
            <div className="rounded-xl border border-black/10 dark:border-white/10 px-4 py-2 text-sm bg-background/80 flex items-center gap-2">
              <span>🔥</span>
              <span className="font-semibold">{profile?.streak || 0} day streak</span>
            </div>
            <Link
              href="/chat"
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium transition-colors"
            >
              Open Chat
            </Link>
            <button
              onClick={handleSignOut}
              className="rounded-xl border border-black/10 dark:border-white/10 px-3 py-2 text-sm hover:bg-black/[.04] transition-colors text-foreground/60"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Wellbeing Score', value: `${wellbeingScore}`, unit: '/100', color: 'text-blue-600' },
            { label: 'Avg Mood', value: avgMood.toFixed(1), unit: '/10', color: avgMood >= 7 ? 'text-emerald-600' : avgMood >= 5 ? 'text-amber-600' : 'text-red-500' },
            { label: 'Chat Sessions', value: `${stats.totalSessions}`, unit: 'total', color: 'text-indigo-600' },
            { label: 'Goals Done', value: `${stats.completedGoals}`, unit: `/${stats.totalGoals}`, color: 'text-amber-600' },
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
                {weeklyMood.map((m) => (
                  <div key={m.day} className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full bg-black/10 dark:bg-white/10 rounded-t-md overflow-hidden" style={{ height: '80px' }}>
                      <div
                        className={`w-full rounded-t-md transition-all duration-700 ${
                          m.score >= 7 ? 'bg-gradient-to-t from-emerald-500 to-emerald-400'
                          : m.score >= 5 ? 'bg-gradient-to-t from-amber-400 to-amber-300'
                          : m.score > 0 ? 'bg-gradient-to-t from-red-400 to-red-300'
                          : 'bg-black/5 dark:bg-white/5'
                        }`}
                        style={{ height: `${m.score > 0 ? (m.score / 10) * 80 : 0}px`, marginTop: `${80 - (m.score > 0 ? (m.score / 10) * 80 : 0)}px` }}
                      />
                    </div>
                    <span className="text-xs text-foreground/50">{m.day}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-foreground/40 text-center">
                Click "Log mood" to record today's wellbeing score
              </p>
            </div>

            {/* Recent sessions */}
            <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 bg-background/80 backdrop-blur">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">Recent Chat Sessions</h2>
                <Link href="/chat" className="text-xs text-blue-600 hover:underline">New session →</Link>
              </div>
              {sessions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-4xl mb-2">💬</p>
                  <p className="text-sm text-foreground/60">No sessions yet.</p>
                  <Link href="/chat" className="mt-2 inline-block text-sm text-blue-600 hover:underline">Start your first chat →</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((s) => (
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
              )}
            </div>

            {/* AI Insight */}
            <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 p-6 bg-blue-50/50 dark:bg-blue-950/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🤖</span>
                  <h2 className="font-semibold text-lg">AI Wellbeing Insight</h2>
                  <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Mistral</span>
                </div>
                <button
                  onClick={generateInsight}
                  disabled={insightLoading}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {insightLoading ? 'Generating…' : insight ? 'Refresh' : 'Generate Insight'}
                </button>
              </div>
              {!insight && !insightLoading && (
                <p className="text-sm text-foreground/60 italic">
                  Click "Generate Insight" for a personalized AI analysis of your week.
                </p>
              )}
              {insightLoading && (
                <div className="space-y-2">
                  {[80, 60, 40].map(w => (
                    <div key={w} className="h-3 bg-blue-200 dark:bg-blue-800 rounded animate-pulse" style={{ width: `${w}%` }} />
                  ))}
                </div>
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
              {goals.length === 0 ? (
                <p className="text-sm text-foreground/60">No goals this week yet.</p>
              ) : (
                <div className="space-y-3">
                  {goals.map((g) => (
                    <label key={g.id} className="flex items-center gap-3 cursor-pointer group">
                      <div
                        onClick={() => toggleGoal(g)}
                        className={`size-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${
                          g.done
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-black/20 dark:border-white/20 group-hover:border-blue-400'
                        }`}
                      >
                        {g.done && (
                          <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm ${g.done ? 'line-through text-foreground/40' : 'text-foreground/80'}`}>
                        {g.text}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <div className="mt-4 bg-black/5 dark:bg-white/5 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: stats.totalGoals > 0 ? `${(stats.completedGoals / stats.totalGoals) * 100}%` : '0%' }}
                />
              </div>
              <p className="mt-1 text-xs text-foreground/50">{stats.completedGoals} of {stats.totalGoals} complete</p>
            </div>

            {/* Profile card */}
            <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 bg-background/80 backdrop-blur">
              <h2 className="font-semibold text-lg mb-4">Your Profile</h2>
              <div className="space-y-2 text-sm">
                <InfoRow label="Name" value={displayName} />
                <InfoRow label="Major" value={profile?.major || '—'} />
                <InfoRow label="Year" value={profile?.year || '—'} />
                <InfoRow label="University" value={profile?.university || '—'} />
              </div>
              <Link
                href="/profile"
                className="mt-4 block text-center text-xs text-blue-600 hover:underline"
              >
                Edit profile →
              </Link>
            </div>

            {/* Quick actions */}
            <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 bg-background/80 backdrop-blur">
              <h2 className="font-semibold text-lg mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Chat Now', href: '/chat', emoji: '💬' },
                  { label: 'Find Peers', href: '/student_matching', emoji: '🤝' },
                  { label: 'Media Hub', href: '/media', emoji: '🎥' },
                  { label: 'Voice', href: '/voice', emoji: '🎤' },
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

function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, string> = {
    low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[risk] ?? map.low}`}>
      {risk}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-foreground/50">{label}</span>
      <span className="font-medium truncate max-w-[60%] text-right">{value}</span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-950 dark:to-blue-950/20">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-black/10 dark:bg-white/10 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
            <div className="h-4 w-32 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-black/[.04] dark:bg-white/[.04] animate-pulse" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 rounded-2xl bg-black/[.04] dark:bg-white/[.04] animate-pulse" />
            <div className="h-64 rounded-2xl bg-black/[.04] dark:bg-white/[.04] animate-pulse" />
          </div>
          <div className="space-y-6">
            <div className="h-48 rounded-2xl bg-black/[.04] dark:bg-white/[.04] animate-pulse" />
            <div className="h-36 rounded-2xl bg-black/[.04] dark:bg-white/[.04] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
