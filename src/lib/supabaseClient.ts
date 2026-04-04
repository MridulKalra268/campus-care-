import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users_public: {
        Row: {
          id: string;
          institution_id: string | null;
          role: 'student' | 'counselor' | 'admin' | 'institution_admin';
          email: string | null;
          language: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users_public']['Row'], 'created_at'> & { created_at?: string };
        Update: Partial<Database['public']['Tables']['users_public']['Row']>;
      };
      profiles: {
        Row: {
          user_id: string;
          display_name: string | null;
          bio: string | null;
          interests: string[];
          preferences: Record<string, unknown>;
          mood: string | null;
          avatar_url: string | null;
          visibility: string;
          updated_at: string;
          major?: string | null;
          year?: string | null;
          university?: string | null;
          student_id?: string | null;
          tags?: string[];
          location?: string | null;
          open_to?: string[];
          wellbeing_score?: number | null;
          streak?: number | null;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'updated_at'> & { updated_at?: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          counselor_id: string | null;
          privacy_mode: 'standard' | 'private';
          started_at: string;
          ended_at: string | null;
          topic?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender: 'student' | 'bot' | 'counselor';
          content: string | null;
          language: string | null;
          modality: 'text' | 'voice';
          created_at: string;
        };
      };
      mood_logs: {
        Row: {
          id: string;
          user_id: string;
          score: number;
          note: string | null;
          logged_at: string;
        };
        Insert: {
          user_id: string;
          score: number;
          note?: string | null;
          logged_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          text: string;
          done: boolean;
          week_start: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          text: string;
          done?: boolean;
          week_start?: string;
        };
        Update: Partial<Database['public']['Tables']['goals']['Row']>;
      };
      peer_connections: {
        Row: {
          id: string;
          from_user_id: string;
          to_user_id: string;
          status: 'pending' | 'accepted' | 'declined';
          created_at: string;
        };
        Insert: {
          from_user_id: string;
          to_user_id: string;
          status?: 'pending' | 'accepted' | 'declined';
        };
      };
    };
  };
};