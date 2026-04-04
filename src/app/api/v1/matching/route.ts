import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET /api/v1/matching - get student matches
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceClient();
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const filter = url.searchParams.get('filter') || 'All';
  const search = url.searchParams.get('search') || '';

  try {
    // Get current user's profile for matching
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get all other student profiles (not the current user)
    let query = supabase
      .from('profiles')
      .select(`
        user_id,
        display_name,
        bio,
        interests,
        mood,
        major,
        year,
        university,
        tags,
        location,
        open_to,
        updated_at
      `)
      .neq('user_id', user.id)
      .not('display_name', 'is', null);

    const { data: profiles, error } = await query.limit(50);

    if (error) throw error;

    // Get connection statuses for the current user
    const { data: connections } = await supabase
      .from('peer_connections')
      .select('from_user_id, to_user_id, status')
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

    const connectedIds = new Set(
      (connections || [])
        .filter(c => c.status === 'accepted')
        .map(c => c.from_user_id === user.id ? c.to_user_id : c.from_user_id)
    );

    const pendingIds = new Set(
      (connections || [])
        .filter(c => c.status === 'pending' && c.from_user_id === user.id)
        .map(c => c.to_user_id)
    );

    // Compute match scores and enrich
    const students = (profiles || [])
      .map(p => ({
        id: p.user_id,
        name: p.display_name || 'Anonymous Student',
        avatar: (p.display_name || 'AS').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
        major: p.major || 'Unknown Major',
        year: p.year || '1st Year',
        tags: p.tags || [],
        bio: p.bio || 'Looking to connect with peers.',
        mood: p.mood || '😊',
        online: isRecentlyActive(p.updated_at),
        matchScore: computeMatchScore(currentProfile, p),
        location: p.location || 'Campus',
        interests: p.interests || [],
        openTo: p.open_to || [],
        connectionStatus: connectedIds.has(p.user_id)
          ? 'connected'
          : pendingIds.has(p.user_id)
          ? 'pending'
          : 'none',
      }))
      .filter(s => {
        // Apply filter
        if (filter === 'Online') return s.online;
        if (filter !== 'All') return s.tags.some((t: string) => t.toLowerCase().includes(filter.toLowerCase()));
        return true;
      })
      .filter(s => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.major.toLowerCase().includes(q) ||
          s.tags.some((t: string) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    return Response.json({
      data: {
        students,
        totalOnline: students.filter(s => s.online).length,
        total: students.length,
        connected: connectedIds.size,
      },
    });
  } catch (err) {
    console.error('Matching error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/v1/matching - send connection request
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceClient();
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { to_user_id: string };

  const { data, error } = await supabase
    .from('peer_connections')
    .upsert({
      from_user_id: user.id,
      to_user_id: body.to_user_id,
      status: 'accepted', // Auto-accept for simplicity (can add notification flow later)
    }, { onConflict: 'from_user_id,to_user_id' })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ data });
}

function isRecentlyActive(updatedAt: string): boolean {
  if (!updatedAt) return false;
  const diff = Date.now() - new Date(updatedAt).getTime();
  return diff < 30 * 60 * 1000; // 30 minutes
}

function computeMatchScore(
  current: { interests?: string[]; major?: string; year?: string; open_to?: string[]; tags?: string[] } | null,
  other: { interests?: unknown; major?: string; year?: string; open_to?: unknown; tags?: unknown }
): number {
  if (!current) return Math.floor(50 + Math.random() * 40);

  let score = 50;

  // Same major = +15
  if (current.major && other.major && current.major === other.major) score += 15;

  // Same year = +10
  if (current.year && other.year && current.year === other.year) score += 10;

  // Shared interests
  const currentInterests = current.interests || [];
  const otherInterests = Array.isArray(other.interests) ? other.interests as string[] : [];
  const sharedInterests = currentInterests.filter(i => otherInterests.includes(i));
  score += Math.min(sharedInterests.length * 5, 15);

  // Compatible open_to
  const currentOpenTo = current.open_to || [];
  const otherOpenTo = Array.isArray(other.open_to) ? other.open_to as string[] : [];
  const sharedOpenTo = currentOpenTo.filter(i => otherOpenTo.includes(i));
  score += Math.min(sharedOpenTo.length * 3, 10);

  // Add some randomness for variety
  score += Math.floor(Math.random() * 10);

  return Math.min(Math.max(score, 40), 98);
}
