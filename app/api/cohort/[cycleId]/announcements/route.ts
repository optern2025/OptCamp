import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

const supabase = getSupabaseAdminClient();

export async function GET(request: Request, { params }: { params: Promise<{ cycleId: string }> }) {
  const { cycleId } = await params;
  const { data: announcements, error } = await supabase
    .from('cohort_announcements')
    .select('id, title, body, pinned, created_at, author:new_users(full_name)')
    .eq('cycle_id', cycleId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(announcements);
}

export async function POST(request: Request, { params }: { params: Promise<{ cycleId: string }> }) {
  const { cycleId } = await params;
  const reqHeaders = await headers();
  const userId = reqHeaders.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { title, body: announcementBody, pinned } = body;

  if (!title || !announcementBody) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('cohort_announcements')
      .insert({ cycle_id: cycleId, author_id: userId, title, body: announcementBody, pinned: pinned ?? false })
      .select()
      .single();

    if (error) throw error;

    // Notify all enrolled participants
    const { data: participants } = await supabase
      .from('cohort_participants')
      .select('user_id')
      .eq('cycle_id', cycleId)
      .eq('status', 'enrolled');

    if (participants?.length) {
      await supabase.from('notifications').insert(
        participants.map((p: any) => ({
          user_id: p.user_id,
          type: 'announcement',
          title: `📢 ${title}`,
          message: announcementBody.substring(0, 120) + (announcementBody.length > 120 ? '...' : ''),
        }))
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
