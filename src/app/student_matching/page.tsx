"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";

type Student = {
  id: string;
  name: string;
  avatar: string;
  major: string;
  year: string;
  tags: string[];
  bio: string;
  mood: string;
  online: boolean;
  matchScore: number;
  location: string;
  interests: string[];
  openTo: string[];
  connectionStatus: 'none' | 'pending' | 'connected';
};

type MatchingData = {
  students: Student[];
  totalOnline: number;
  total: number;
  connected: number;
};

const FILTERS = ['All', 'Online', 'Peer Support', 'Study Buddy', 'Listening', 'Anxiety Support', 'Career Advice'];

export default function StudentMatchingPage() {
  const router = useRouter();
  const { user, session, profile, loading: authLoading } = useAuth();
  const [data, setData] = useState<MatchingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [aiModal, setAiModal] = useState<{ student: Student; text: string; loading: boolean } | null>(null);
  const [connecting, setConnecting] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth');
  }, [authLoading, user, router]);

  const fetchStudents = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter !== 'All') params.set('filter', filter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/v1/matching?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { data?: MatchingData; error?: string };
      if (json.error) throw new Error(json.error);
      setData(json.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, filter, search]);

  useEffect(() => {
    if (session?.access_token) {
      const t = setTimeout(fetchStudents, search ? 400 : 0);
      return () => clearTimeout(t);
    }
  }, [fetchStudents, session?.access_token, filter, search]);

  const handleConnect = async (student: Student) => {
    if (!session?.access_token) return;
    setConnecting(prev => new Set([...prev, student.id]));

    try {
      await fetch('/api/v1/matching', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ to_user_id: student.id }),
      });

      // Update local state
      setData(prev => prev ? {
        ...prev,
        students: prev.students.map(s =>
          s.id === student.id ? { ...s, connectionStatus: 'connected' } : s
        ),
        connected: prev.connected + 1,
      } : prev);
    } finally {
      setConnecting(prev => {
        const next = new Set(prev);
        next.delete(student.id);
        return next;
      });
    }
  };

  const handleAIMatch = async (student: Student) => {
    setAiModal({ student, text: '', loading: true });
    try {
      const res = await fetch('/api/v1/ai/insight', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are a peer-matching assistant for a university wellbeing app.
Student A: ${profile?.display_name || 'A student'}, ${profile?.year || ''} ${profile?.major || ''}.
Student B: ${student.name}, ${student.year} ${student.major}, interests: ${student.interests.join(', ')}, open to: ${student.openTo.join(', ')}. Bio: "${student.bio}"
Write 2 short sentences explaining why these two students would be a good peer match and what they could offer each other. Be specific and warm.`,
        }),
      });
      const json = await res.json() as { data?: { text?: string } };
      setAiModal(prev => prev ? { ...prev, text: json.data?.text || 'Great potential match!', loading: false } : null);
    } catch {
      setAiModal(prev => prev ? { ...prev, text: 'These students share complementary strengths and could support each other well.', loading: false } : null);
    }
  };

  if (authLoading) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950/10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard" className="text-sm text-foreground/50 hover:text-foreground transition-colors">← Dashboard</Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Student Matching</h1>
          <p className="mt-2 text-foreground/60">
            Find peers who understand what you're going through. Connect, share, and grow together.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Students Available', value: data?.total ?? '—' },
            { label: 'Online Now', value: data?.totalOnline ?? '—' },
            { label: 'Connected', value: data?.connected ?? 0 },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-black/10 dark:border-white/10 p-4 bg-background/80 text-center">
              <p className="text-2xl font-bold text-blue-600">{s.value}</p>
              <p className="text-xs text-foreground/50 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by name, major, or interest…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 rounded-xl border border-black/10 dark:border-white/10 px-4 py-2.5 text-sm bg-background/80 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
          />
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'border border-black/10 dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/[.04] text-foreground/70'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 text-red-700 dark:text-red-400 p-4 text-sm">
            ⚠️ {error}
            <button onClick={fetchStudents} className="ml-2 underline">Retry</button>
          </div>
        )}

        {/* Not logged in notice */}
        {!user && !authLoading && (
          <div className="text-center py-16">
            <p className="text-lg font-semibold mb-2">Sign in to find peers</p>
            <Link href="/auth" className="text-blue-600 hover:underline">Go to login →</Link>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-black/[.04] dark:bg-white/[.04] animate-pulse" />
            ))}
          </div>
        ) : data?.students.length === 0 ? (
          <EmptyState
            filter={filter}
            search={search}
            isOwn={!data || data.total === 0}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(data?.students || []).map(student => (
              <StudentCard
                key={student.id}
                student={student}
                connecting={connecting.has(student.id)}
                onConnect={handleConnect}
                onAIMatch={handleAIMatch}
              />
            ))}
          </div>
        )}

        {/* AI Modal */}
        {aiModal && (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setAiModal(null)}
          >
            <div
              className="bg-background rounded-2xl border border-black/10 dark:border-white/10 p-6 max-w-md w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  {aiModal.student.avatar}
                </div>
                <div>
                  <p className="font-semibold">{aiModal.student.name}</p>
                  <p className="text-xs text-foreground/50">{aiModal.student.year} · {aiModal.student.major}</p>
                </div>
                <span className="ml-auto text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Mistral AI</span>
              </div>

              <h3 className="font-semibold mb-2">🤖 AI Compatibility Analysis</h3>
              {aiModal.loading ? (
                <div className="space-y-2">
                  {[90, 70, 50].map(w => (
                    <div key={w} className="h-3 bg-black/10 dark:bg-white/10 rounded animate-pulse" style={{ width: `${w}%` }} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-foreground/80 leading-relaxed">{aiModal.text}</p>
              )}

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setAiModal(null)}
                  className="flex-1 py-2 text-sm rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/[.04] transition-colors"
                >
                  Close
                </button>
                {aiModal.student.connectionStatus === 'none' && (
                  <button
                    onClick={() => { handleConnect(aiModal.student); setAiModal(null); }}
                    className="flex-1 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                  >
                    Connect with {aiModal.student.name.split(' ')[0]}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StudentCard({
  student, connecting, onConnect, onAIMatch,
}: {
  student: Student;
  connecting: boolean;
  onConnect: (s: Student) => void;
  onAIMatch: (s: Student) => void;
}) {
  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5 bg-background/80 backdrop-blur hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="size-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
              {student.avatar}
            </div>
            {student.online && (
              <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-emerald-500 border-2 border-background rounded-full" />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm">{student.name}</p>
            <p className="text-xs text-foreground/50">{student.year} · {student.major}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-bold text-blue-600">{student.matchScore}%</span>
          <span className="text-xs text-foreground/40">match</span>
        </div>
      </div>

      {/* Match bar */}
      <div className="bg-black/5 dark:bg-white/5 rounded-full h-1.5 mb-3">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700"
          style={{ width: `${student.matchScore}%` }}
        />
      </div>

      <p className="text-xs text-foreground/60 leading-relaxed mb-3 line-clamp-2">{student.bio}</p>

      <div className="flex flex-wrap gap-1 mb-3">
        {student.tags.slice(0, 3).map(t => (
          <span key={t} className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
            {t}
          </span>
        ))}
        {student.tags.length > 3 && (
          <span className="text-xs text-foreground/40">+{student.tags.length - 3}</span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">{student.mood}</span>
        <span className="text-xs text-foreground/40 flex-1">📍 {student.location}</span>
      </div>

      <div className="flex gap-2">
        <ConnectButton
          status={student.connectionStatus}
          connecting={connecting}
          onConnect={() => onConnect(student)}
        />
        <button
          onClick={() => onAIMatch(student)}
          className="px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/[.04] transition-colors"
          title="AI compatibility analysis"
        >
          🤖
        </button>
      </div>
    </div>
  );
}

function ConnectButton({
  status, connecting, onConnect,
}: {
  status: Student['connectionStatus'];
  connecting: boolean;
  onConnect: () => void;
}) {
  if (status === 'connected') {
    return (
      <div className="flex-1 text-xs py-2 rounded-xl font-medium text-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
        ✓ Connected
      </div>
    );
  }
  if (status === 'pending') {
    return (
      <div className="flex-1 text-xs py-2 rounded-xl font-medium text-center bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
        ⏳ Pending
      </div>
    );
  }
  return (
    <button
      onClick={onConnect}
      disabled={connecting}
      className="flex-1 text-xs py-2 rounded-xl font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
    >
      {connecting ? 'Connecting…' : 'Connect'}
    </button>
  );
}

function EmptyState({ filter, search, isOwn }: { filter: string; search: string; isOwn: boolean }) {
  if (isOwn) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">👥</p>
        <p className="font-semibold text-lg mb-2">You're the first one here!</p>
        <p className="text-sm text-foreground/60 mb-4">
          Invite classmates to join CampusCare and start building peer connections.
        </p>
        <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">← Back to dashboard</Link>
      </div>
    );
  }
  return (
    <div className="text-center py-16 text-foreground/40">
      <p className="text-4xl mb-3">🔍</p>
      <p className="font-medium">No students match your search</p>
      <p className="text-sm mt-1">
        {search ? `No results for "${search}"` : `No students with filter "${filter}"`}
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-950 dark:to-blue-950/20">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <div className="h-8 w-64 rounded bg-black/10 animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-black/[.04] animate-pulse" />)}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <div key={i} className="h-64 rounded-2xl bg-black/[.04] animate-pulse" />)}
        </div>
      </div>
    </div>
  );
}
