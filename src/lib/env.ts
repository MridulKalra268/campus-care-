export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  mistralApiKey: process.env.MISTRAL_API_KEY || '',
  emailSmtpUrl: process.env.EMAIL_SMTP_URL || '',
  emailFrom: process.env.EMAIL_FROM || 'no-reply@campuscare.local',
};