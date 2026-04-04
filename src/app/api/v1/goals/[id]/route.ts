import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getUser(token: string) {
  const supabase = getServiceClient();
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

// PATCH /api/v1/goals/:id - toggle goal
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUser(token);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { done: boolean };
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('goals')
    .update({ done: body.done })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ data });
}
