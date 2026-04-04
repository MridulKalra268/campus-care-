'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';

const MAJORS = [
  'Computer Science', 'Electrical Engineering', 'Mechanical Engineering',
  'Chemical Engineering', 'Civil Engineering', 'Mathematics',
  'Physics', 'Chemistry', 'Biology', 'Biotechnology',
  'Psychology', 'Economics', 'Management', 'Other',
];

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate'];

const MOODS = ['😊', '😌', '😐', '😔', '😰', '🤩', '😴', '🧘', '💪', '🌟'];

const TAG_OPTIONS = [
  'Listening', 'Study Buddy', 'Wellbeing', 'Anxiety Support',
  'Career Advice', 'Meditation', 'Coding', 'Stress Management',
  'Music', 'Sports', 'Homesickness', 'Arts & Crafts',
  'Deep Talks', 'Leadership', 'Motivation',
];

const OPEN_TO_OPTIONS = [
  'peer support', 'study groups', 'casual chats',
  'mentorship', 'career guidance', 'workout partners',
  'sports', 'deep conversations', 'exploring campus',
  'project partners', 'jam sessions',
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, updateProfile } = useAuth();
  const [form, setForm] = useState({
    display_name: '',
    bio: '',
    major: '',
    year: '',
    university: '',
    student_id: '',
    mood: '😊',
    location: '',
    tags: [] as string[],
    open_to: [] as string[],
    interests: [] as string[],
    interestInput: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (profile) {
      setForm(prev => ({
        ...prev,
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        major: profile.major || '',
        year: profile.year || '',
        university: profile.university || '',
        student_id: profile.student_id || '',
        mood: profile.mood || '😊',
        location: profile.location || '',
        tags: profile.tags || [],
        open_to: profile.open_to || [],
        interests: profile.interests || [],
      }));
    }
  }, [profile]);

  const toggleItem = (field: 'tags' | 'open_to', value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value],
    }));
  };

  const addInterest = () => {
    const val = form.interestInput.trim().toLowerCase();
    if (val && !form.interests.includes(val)) {
      setForm(prev => ({ ...prev, interests: [...prev.interests, val], interestInput: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error } = await updateProfile({
      display_name: form.display_name,
      bio: form.bio,
      major: form.major,
      year: form.year,
      university: form.university,
      student_id: form.student_id,
      mood: form.mood,
      location: form.location,
      tags: form.tags,
      open_to: form.open_to,
      interests: form.interests,
    });
    setSaving(false);
    if (error) setError(error.message);
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-950 dark:to-blue-950/20">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-foreground/50 hover:text-foreground transition-colors">← Dashboard</Link>
        </div>
        <h1 className="text-3xl font-bold mb-2">Edit Profile</h1>
        <p className="text-foreground/60 text-sm mb-8">
          Keep your profile updated — it helps with peer matching and personalized wellbeing insights.
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-400">
            ⚠️ {error}
          </div>
        )}
        {saved && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm text-emerald-700 dark:text-emerald-400">
            ✅ Profile saved successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <Section title="Basic Information">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full Name" required>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
                  required
                  placeholder="Your full name"
                />
              </Field>
              <Field label="Student ID">
                <input
                  type="text"
                  value={form.student_id}
                  onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}
                  placeholder="CS21B047"
                />
              </Field>
            </div>
            <Field label="University">
              <input
                type="text"
                value={form.university}
                onChange={e => setForm(p => ({ ...p, university: e.target.value }))}
                placeholder="IIT Raipur"
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Major / Department">
                <select value={form.major} onChange={e => setForm(p => ({ ...p, major: e.target.value }))}>
                  <option value="">Select…</option>
                  {MAJORS.map(m => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Year">
                <select value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))}>
                  <option value="">Select…</option>
                  {YEARS.map(y => <option key={y}>{y}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          {/* About */}
          <Section title="About You">
            <Field label="Bio (shown to peers)">
              <textarea
                value={form.bio}
                onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                rows={3}
                placeholder="Tell peers a bit about yourself, your interests, and how you can support each other…"
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 resize-none"
              />
            </Field>
            <Field label="Current Location on Campus">
              <input
                type="text"
                value={form.location}
                onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                placeholder="Hostel A, Library, Sports Complex…"
              />
            </Field>
          </Section>

          {/* Mood */}
          <Section title="Current Mood">
            <div className="flex flex-wrap gap-3">
              {MOODS.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, mood: m }))}
                  className={`text-2xl p-2 rounded-xl border-2 transition-colors ${
                    form.mood === m
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-black/10 dark:border-white/10 hover:border-blue-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </Section>

          {/* Tags */}
          <Section title="Support Tags" subtitle="What kind of peer support can you offer?">
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleItem('tags', t)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    form.tags.includes(t)
                      ? 'bg-blue-600 text-white'
                      : 'border border-black/10 dark:border-white/10 hover:bg-black/[.04] text-foreground/70'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Section>

          {/* Open to */}
          <Section title="Open To" subtitle="What kind of connections are you looking for?">
            <div className="flex flex-wrap gap-2">
              {OPEN_TO_OPTIONS.map(o => (
                <button
                  key={o}
                  type="button"
                  onClick={() => toggleItem('open_to', o)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    form.open_to.includes(o)
                      ? 'bg-indigo-600 text-white'
                      : 'border border-black/10 dark:border-white/10 hover:bg-black/[.04] text-foreground/70'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </Section>

          {/* Interests */}
          <Section title="Interests" subtitle="Add your hobbies and interests (for better matching)">
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={form.interestInput}
                onChange={e => setForm(p => ({ ...p, interestInput: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                placeholder="e.g. chess, guitar, hiking…"
                className="flex-1 rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              />
              <button
                type="button"
                onClick={addInterest}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.interests.map(i => (
                <span key={i} className="flex items-center gap-1 px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 text-sm">
                  {i}
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, interests: p.interests.filter(x => x !== i) }))}
                    className="text-foreground/40 hover:text-red-500 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </Section>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 bg-background/80 backdrop-blur space-y-4">
      <div>
        <h2 className="font-semibold text-base">{title}</h2>
        {subtitle && <p className="text-xs text-foreground/50 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground/70 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="[&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-black/10 [&_input]:dark:border-white/10 [&_input]:bg-transparent [&_input]:px-3 [&_input]:py-2.5 [&_input]:text-sm [&_input]:focus:outline-none [&_input]:focus:ring-2 [&_input]:focus:ring-blue-600/30 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-black/10 [&_select]:dark:border-white/10 [&_select]:bg-background [&_select]:px-3 [&_select]:py-2.5 [&_select]:text-sm [&_select]:focus:outline-none [&_select]:focus:ring-2 [&_select]:focus:ring-blue-600/30">
        {children}
      </div>
    </div>
  );
}
