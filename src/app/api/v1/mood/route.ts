import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// POST /api/v1/mood - log today's mood
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceClient();
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { score: number; note?: string };
  if (!body.score || body.score < 1 || body.score > 10) {
    return Response.json({ error: 'score must be 1-10' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('mood_logs')
    .insert({
      user_id: user.id,
      score: body.score,
      note: body.note || null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  // Update wellbeing score on profile (rolling average)
  const { data: recent } = await supabase
    .from('mood_logs')
    .select('score')
    .eq('user_id', user.id)
    .order('logged_at', { ascending: false })
    .limit(14);

  if (recent && recent.length > 0) {
    const avg = recent.reduce((a: number, b: { score: number }) => a + b.score, 0) / recent.length;
    await supabase
      .from('profiles')
      .update({ wellbeing_score: Math.round(avg * 10) })
      .eq('user_id', user.id);
  }

  return Response.json({ data });
}
