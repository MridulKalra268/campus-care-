'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

type Profile = {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  interests: string[];
  mood: string | null;
  avatar_url: string | null;
  major: string | null;
  year: string | null;
  university: string | null;
  student_id: string | null;
  tags: string[];
  location: string | null;
  open_to: string[];
  wellbeing_score: number | null;
  streak: number | null;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata: Record<string, string>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile | null;
  };

  const ensureUserPublic = async (user: User) => {
    const { data } = await supabase
      .from('users_public')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!data) {
      await supabase.from('users_public').insert({
        id: user.id,
        email: user.email,
        role: 'student',
        language: 'en',
      });
    }
  };

  const ensureProfile = async (user: User) => {
    const existing = await fetchProfile(user.id);
    if (!existing) {
      const meta = user.user_metadata || {};
      await supabase.from('profiles').insert({
        user_id: user.id,
        display_name: meta.display_name || meta.full_name || user.email?.split('@')[0] || 'Student',
        bio: meta.bio || null,
        interests: [],
        mood: '😊',
        major: meta.major || null,
        year: meta.year || '1st Year',
        university: meta.university || null,
        student_id: meta.student_id || null,
        tags: [],
        location: null,
        open_to: ['peer support', 'study groups', 'casual chats'],
        wellbeing_score: 70,
        streak: 0,
      });
      return await fetchProfile(user.id);
    }
    return existing;
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await ensureUserPublic(session.user);
        const p = await ensureProfile(session.user);
        setProfile(p);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await ensureUserPublic(session.user);
        const p = await ensureProfile(session.user);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata: Record<string, string>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, ...data } : prev);
    }
    return { error: error as Error | null };
  };

  const refreshProfile = async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    setProfile(p);
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      signUp, signIn, signOut, updateProfile, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}