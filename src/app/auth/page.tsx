'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';

type Mode = 'login' | 'signup';

const UNIVERSITIES = [
  'IIT Raipur', 'IIT Bombay', 'IIT Delhi', 'IIT Madras',
  'NIT Raipur', 'AIIMS Raipur', 'VIT University',
  'Delhi University', 'Mumbai University', 'Other',
];

const MAJORS = [
  'Computer Science', 'Electrical Engineering', 'Mechanical Engineering',
  'Chemical Engineering', 'Civil Engineering', 'Mathematics',
  'Physics', 'Chemistry', 'Biology', 'Biotechnology',
  'Psychology', 'Economics', 'Management', 'Other',
];

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate'];

export default function AuthPage() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: '',
    password: '',
    display_name: '',
    university: '',
    major: '',
    year: '1st Year',
    student_id: '',
  });

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(form.email, form.password);
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        router.push('/dashboard');
      }
    } else {
      if (!form.display_name.trim()) {
        setError('Please enter your name.');
        setLoading(false);
        return;
      }
      const { error } = await signUp(form.email, form.password, {
        display_name: form.display_name,
        university: form.university,
        major: form.major,
        year: form.year,
        student_id: form.student_id,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setSuccess('Account created! Check your email to confirm, then log in.');
        setMode('login');
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-100/30 dark:from-slate-950 dark:via-blue-950/30 dark:to-indigo-950/20 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="size-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">C</div>
            <span className="text-2xl font-bold tracking-tight">CampusCare</span>
          </Link>
          <p className="text-foreground/60 text-sm">
            {mode === 'login' ? 'Welcome back — your wellbeing matters.' : 'Join thousands of students finding support.'}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-background/90 backdrop-blur shadow-xl p-8">
          {/* Tab switcher */}
          <div className="flex rounded-xl bg-black/[.04] dark:bg-white/[.04] p-1 mb-6 gap-1">
            {(['login', 'signup'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
                  mode === m
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-foreground/60 hover:text-foreground'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 text-red-700 dark:text-red-400 p-3 text-sm">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 p-3 text-sm">
              ✅ {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <Field label="Full Name" required>
                  <input
                    type="text"
                    placeholder="Arjun Sharma"
                    value={form.display_name}
                    onChange={e => update('display_name', e.target.value)}
                    required
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="University">
                    <select value={form.university} onChange={e => update('university', e.target.value)}>
                      <option value="">Select…</option>
                      {UNIVERSITIES.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </Field>
                  <Field label="Year">
                    <select value={form.year} onChange={e => update('year', e.target.value)}>
                      {YEARS.map(y => <option key={y}>{y}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Major / Department">
                  <select value={form.major} onChange={e => update('major', e.target.value)}>
                    <option value="">Select…</option>
                    {MAJORS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Student ID (optional)">
                  <input
                    type="text"
                    placeholder="CS21B047"
                    value={form.student_id}
                    onChange={e => update('student_id', e.target.value)}
                  />
                </Field>
              </>
            )}

            <Field label="Email" required>
              <input
                type="email"
                placeholder="you@university.ac.in"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                required
              />
            </Field>

            <Field label="Password" required>
              <input
                type="password"
                placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                value={form.password}
                onChange={e => update('password', e.target.value)}
                required
                minLength={6}
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {mode === 'login' && (
            <p className="mt-4 text-center text-xs text-foreground/50">
              Demo: use any email & password (sign up first)
            </p>
          )}
        </div>

        <p className="text-center mt-6 text-sm text-foreground/50">
          <Link href="/" className="hover:text-foreground transition-colors">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
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
