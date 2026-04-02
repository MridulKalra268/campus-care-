"use client";
import { useState } from "react";
import Link from "next/link";

// ── Fake student pool ──────────────────────────────────────────────────────
const ALL_STUDENTS = [
  {
    id: 1, name: "Priya Nair", avatar: "PN", major: "Psychology", year: "2nd Year",
    tags: ["Listening", "Anxiety Support", "Study Buddy", "Yoga"],
    bio: "I love talking through problems and helping others feel heard. Yoga and journaling keep me grounded.",
    mood: "😊", online: true, matchScore: 94, location: "Hostel A",
    interests: ["mental health", "meditation", "reading"],
    openTo: ["peer support", "study groups", "casual chats"],
  },
  {
    id: 2, name: "Rahul Verma", avatar: "RV", major: "Computer Science", year: "3rd Year",
    tags: ["Study Buddy", "Coding", "Stress Management"],
    bio: "Final-year CS student who understands exam pressure. Happy to study together or just vent.",
    mood: "😌", online: true, matchScore: 88, location: "Library",
    interests: ["competitive programming", "chess", "lo-fi music"],
    openTo: ["study groups", "project partners", "peer support"],
  },
  {
    id: 3, name: "Sneha Kulkarni", avatar: "SK", major: "Economics", year: "4th Year",
    tags: ["Career Advice", "Wellbeing", "Listening"],
    bio: "Navigated placement season stress — here to share what worked. Open to coffee chats anytime.",
    mood: "🌟", online: false, matchScore: 82, location: "Main Block",
    interests: ["finance", "journaling", "podcasts"],
    openTo: ["mentorship", "peer support", "casual chats"],
  },
  {
    id: 4, name: "Aditya Bhatt", avatar: "AB", major: "Mechanical Engg", year: "2nd Year",
    tags: ["Study Buddy", "Sports", "Motivation"],
    bio: "Gym and sport help me manage stress. Looking for workout partners and positive energy.",
    mood: "💪", online: true, matchScore: 76, location: "Sports Complex",
    interests: ["football", "fitness", "mechanical design"],
    openTo: ["workout partners", "study groups", "sports"],
  },
  {
    id: 5, name: "Meera Iyer", avatar: "MI", major: "Biotechnology", year: "1st Year",
    tags: ["Homesickness", "Listening", "Arts & Crafts"],
    bio: "New to campus and adjusting. Looking for kind people to explore the city and share meals with.",
    mood: "🙂", online: false, matchScore: 71, location: "New Hostel",
    interests: ["painting", "cooking", "nature walks"],
    openTo: ["peer support", "casual chats", "exploring campus"],
  },
  {
    id: 6, name: "Kabir Singh", avatar: "KS", major: "Physics", year: "3rd Year",
    tags: ["Meditation", "Deep Talks", "Anxiety Support"],
    bio: "Introvert who loves deep conversations over chai. Mindfulness changed how I handle academic pressure.",
    mood: "🧘", online: true, matchScore: 68, location: "Research Wing",
    interests: ["quantum physics", "philosophy", "tea brewing"],
    openTo: ["peer support", "deep conversations", "study buddy"],
  },
  {
    id: 7, name: "Divya Menon", avatar: "DM", major: "Civil Engineering", year: "4th Year",
    tags: ["Leadership", "Motivation", "Career Advice"],
    bio: "Former student council president. I thrive on helping others find direction and confidence.",
    mood: "✨", online: false, matchScore: 65, location: "Admin Block",
    interests: ["urban planning", "debate", "travelling"],
    openTo: ["mentorship", "career guidance", "peer support"],
  },
  {
    id: 8, name: "Rohan Das", avatar: "RD", major: "Chemical Engineering", year: "2nd Year",
    tags: ["Music", "Study Buddy", "Stress Relief"],
    bio: "Music is my therapy. Playing guitar between study sessions keeps me balanced.",
    mood: "🎵", online: true, matchScore: 61, location: "Hostel C",
    interests: ["guitar", "organic chemistry", "hiking"],
    openTo: ["jam sessions", "study groups", "casual chats"],
  },
  {
    id: 9, name: "Tanvi Joshi", avatar: "TJ", major: "Mathematics", year: "1st Year",
    tags: ["Study Buddy", "Anxiety Support", "Listening"],
    bio: "Adjusting to the pace of college math. Looking for patient study partners and friends.",
    mood: "📖", online: false, matchScore: 58, location: "Maths Dept",
    interests: ["puzzles", "origami", "baking"],
    openTo: ["study groups", "peer support", "campus tours"],
  },
];

const FILTERS = ["All", "Online", "Peer Support", "Study Buddy", "Listening", "Anxiety Support", "Career Advice"];

// ── Mistral hook ───────────────────────────────────────────────────────────
async function getMistralCompatibility(student: typeof ALL_STUDENTS[0]): Promise<string> {
  const res = await fetch("/api/v1/ai/insight", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      prompt: `You are a peer-matching assistant for a university wellbeing app.
Student A: Arjun Sharma, 3rd year CS, struggles with exam anxiety and feeling overwhelmed.
Student B: ${student.name}, ${student.year} ${student.major}, interests: ${student.interests.join(", ")}, open to: ${student.openTo.join(", ")}. Bio: "${student.bio}"
Write 2 short sentences explaining why these two students would be a good peer match and what they could offer each other. Be specific and warm.`,
    }),
  });
  const json = await res.json() as { data?: { text?: string } };
  return json.data?.text ?? "These students share complementary strengths and could support each other through their university journey.";
}

// ── Card component ─────────────────────────────────────────────────────────
function StudentCard({ student, onConnect, onAIMatch }: {
  student: typeof ALL_STUDENTS[0];
  onConnect: (id: number) => void;
  onAIMatch: (student: typeof ALL_STUDENTS[0]) => void;
}) {
  const [connected, setConnected] = useState(false);

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5 bg-background/80 backdrop-blur hover:shadow-md transition-all duration-200 group">
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

      <div className="flex flex-wrap gap-1 mb-4">
        {student.tags.map(t => (
          <span key={t} className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
            {t}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm">{student.mood}</span>
        <span className="text-xs text-foreground/40 flex-1">📍 {student.location}</span>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => { setConnected(true); onConnect(student.id); }}
          disabled={connected}
          className={`flex-1 text-xs py-2 rounded-xl font-medium transition-colors ${connected ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 cursor-default" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
        >
          {connected ? "✓ Connected!" : "Connect"}
        </button>
        <button
          onClick={() => onAIMatch(student)}
          className="px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/[.04] transition-colors"
          title="AI compatibility analysis"
        >
          🤖
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function StudentMatchingPage() {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [connected, setConnected] = useState<number[]>([]);
  const [aiModal, setAiModal] = useState<{ student: typeof ALL_STUDENTS[0]; text: string; loading: boolean } | null>(null);

  const filtered = ALL_STUDENTS.filter(s => {
    const matchesFilter =
      filter === "All" ? true :
      filter === "Online" ? s.online :
      s.tags.some(t => t.toLowerCase().includes(filter.toLowerCase()));
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.major.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const handleAIMatch = async (student: typeof ALL_STUDENTS[0]) => {
    setAiModal({ student, text: "", loading: true });
    const text = await getMistralCompatibility(student);
    setAiModal({ student, text, loading: false });
  };

  const handleConnect = (id: number) => {
    setConnected(prev => [...prev, id]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950/10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard" className="text-sm text-foreground/50 hover:text-foreground transition-colors">← Dashboard</Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Student Matching</h1>
          <p className="mt-2 text-foreground/60">Find peers who understand what you're going through. AI-powered compatibility based on your wellbeing needs.</p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Students Available", value: ALL_STUDENTS.length },
            { label: "Online Now", value: ALL_STUDENTS.filter(s => s.online).length },
            { label: "Connected", value: connected.length },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-black/10 dark:border-white/10 p-4 bg-background/80 text-center">
              <p className="text-2xl font-bold text-blue-600">{s.value}</p>
              <p className="text-xs text-foreground/50 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f ? "bg-blue-600 text-white" : "border border-black/10 dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/[.04] text-foreground/70"}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-foreground/40">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-medium">No students match your search</p>
            <p className="text-sm mt-1">Try a different filter or search term</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(student => (
              <StudentCard
                key={student.id}
                student={student}
                onConnect={handleConnect}
                onAIMatch={handleAIMatch}
              />
            ))}
          </div>
        )}

        {/* AI Compatibility Modal */}
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
                  className="flex-1 py-2 text-sm rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/[.04] dark:hover:bg-white/[.04] transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => { handleConnect(aiModal.student.id); setAiModal(null); }}
                  className="flex-1 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                >
                  Connect with {aiModal.student.name.split(" ")[0]}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}