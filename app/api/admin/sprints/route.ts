import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
const supabaseServer = getSupabaseAdminClient();

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('optcamp_session')?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { cycle_id, title, description, start_date, end_date } = body;

  if (!cycle_id || !title || !start_date || !end_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseServer
      .from('sprints')
      .insert({
        cycle_id,
        title,
        description,
        start_date,
        end_date
      })
      .select()
      .single();

    if (error) throw error;

    // Send notification to all enrolled participants in this cycle
    const { data: participants } = await supabaseServer
      .from('cohort_participants')
      .select('user_id')
      .eq('cycle_id', cycle_id)
      .eq('status', 'enrolled');

    if (participants && participants.length > 0) {
      const notifications = participants.map((p: any) => ({
        user_id: p.user_id,
        type: 'new_sprint',
        title: `New Sprint: ${title}`,
        message: `A new sprint "${title}" has been added to your cohort.`
      }));
      await supabaseServer.from('notifications').insert(notifications);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating sprint:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
