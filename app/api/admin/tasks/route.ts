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
  const { sprint_id, title, description, task_type, due_date, points, required_proof } = body;

  if (!sprint_id || !title || !description || !task_type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseServer
      .from('tasks')
      .insert({
        sprint_id,
        title,
        description,
        task_type,
        due_date,
        points,
        required_proof: required_proof || ['github']
      })
      .select(`
        *,
        sprints(cycle_id, title)
      `)
      .single();

    if (error) throw error;

    // Send notification to all enrolled participants in this cycle
    const cycle_id = data.sprints?.cycle_id;
    if (cycle_id) {
      const { data: participants } = await supabaseServer
        .from('cohort_participants')
        .select('user_id')
        .eq('cycle_id', cycle_id)
        .eq('status', 'enrolled');

      if (participants && participants.length > 0) {
        const notifications = participants.map((p: any) => ({
          user_id: p.user_id,
          type: 'new_task',
          title: `New Task Assigned`,
          message: `A new task "${title}" has been assigned in sprint "${data.sprints.title}".`
        }));
        await supabaseServer.from('notifications').insert(notifications);
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
