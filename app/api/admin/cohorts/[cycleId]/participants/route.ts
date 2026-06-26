import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
const supabaseServer = getSupabaseAdminClient();

export async function GET(request: Request, { params }: { params: Promise<{ cycleId: string }> }) {
  const { cycleId } = await params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('optcamp_session')?.value;
  if (!sessionToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data: participants, error } = await supabaseServer
      .from('cohort_participants')
      .select(`*, users:new_users(id, full_name, email), applications:applications(id, status)`)
      .eq('cycle_id', cycleId);
    if (error) throw error;
    return NextResponse.json(participants);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Admin selects a candidate → immediately enrolled (selected = enrolled)
export async function POST(request: Request, { params }: { params: Promise<{ cycleId: string }> }) {
  const { cycleId } = await params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('optcamp_session')?.value;
  if (!sessionToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { user_id, application_id } = body;

  try {
    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Mark application as selected
    await supabaseServer
      .from('applications')
      .update({ status: 'selected' })
      .eq('id', application_id);

    // Immediately enroll (selected = enrolled per product decision)
    const now = new Date().toISOString();
    const { data, error } = await supabaseServer
      .from('cohort_participants')
      .upsert({
        user_id,
        cycle_id: cycleId,
        application_id,
        status: 'enrolled',
        enrolled_at: now,
      }, { onConflict: 'user_id,cycle_id' })
      .select()
      .single();

    if (error) throw error;

    // Send enrollment notification
    const { data: cycle } = await supabaseServer
      .from('cycles')
      .select('title')
      .eq('id', cycleId)
      .single();

    await supabaseServer.from('notifications').insert({
      user_id,
      type: 'cohort_enrolled',
      title: '🎉 You\'ve been enrolled!',
      message: `Congratulations! You are now enrolled in ${cycle?.title ?? 'the cohort'}. Access your cohort dashboard to get started.`,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error enrolling participant:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Admin updates status (completed, dropped, etc.)
export async function PATCH(request: Request, { params }: { params: Promise<{ cycleId: string }> }) {
  const { cycleId } = await params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('optcamp_session')?.value;
  if (!sessionToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { participant_id, status } = body;

  const VALID_TRANSITIONS: Record<string, string[]> = {
    enrolled: ['completed', 'dropped'],
    completed: [],
    dropped: [],
  };

  try {
    const { data: current } = await supabaseServer
      .from('cohort_participants')
      .select('status, user_id')
      .eq('id', participant_id)
      .single();

    if (!current) return NextResponse.json({ error: 'Participant not found' }, { status: 404 });

    const allowed = VALID_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: `Cannot transition from ${current.status} to ${status}` }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('cohort_participants')
      .update({ status })
      .eq('id', participant_id)
      .select()
      .single();

    if (error) throw error;

    await supabaseServer.from('notifications').insert({
      user_id: current.user_id,
      type: 'cohort_status_update',
      title: `Cohort Status: ${status}`,
      message: `Your cohort status has been updated to ${status}.`,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
