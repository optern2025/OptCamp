import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
const supabaseServer = getSupabaseAdminClient();

export async function POST(request: Request) {
  const reqHeaders = await headers();
  const user_id = reqHeaders.get('x-user-id');

  if (!user_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { task_id, github_link, deployment_link, document_url, video_url, explanation, custom_proof } = body;

  if (!task_id) {
    return NextResponse.json({ error: 'task_id is required' }, { status: 400 });
  }

  try {
    // Get task and sprint
    const { data: taskData } = await supabaseServer
      .from('tasks')
      .select('sprints(cycle_id), required_proof')
      .eq('id', task_id)
      .single();

    if (!taskData || !taskData.sprints) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const cycle_id = Array.isArray(taskData.sprints) ? taskData.sprints[0]?.cycle_id : (taskData.sprints as any)?.cycle_id;

    // Check authorization
    const { data: participantData } = await supabaseServer
      .from('cohort_participants')
      .select('id, status')
      .eq('user_id', user_id)
      .eq('cycle_id', cycle_id)
      .maybeSingle();

    const { data: appData } = await supabaseServer
      .from('applications')
      .select('status')
      .eq('user_id', user_id)
      .eq('cycle_id', cycle_id)
      .maybeSingle();

    const validPStatuses = ['selected', 'enrolled', 'active', 'completed'];
    const validAStatuses = ['selected', 'enrolled'];

    const isParticipant = participantData && validPStatuses.includes(participantData.status);
    const isApp = appData && validAStatuses.includes(appData.status);

    if (!isParticipant && !isApp) {
      return NextResponse.json({ error: 'Forbidden: You are not a member of this cohort' }, { status: 403 });
    }

    // Proof validation
    const requiredProofs = Array.isArray(taskData.required_proof) ? taskData.required_proof : [];
    if (requiredProofs.includes('github') && !github_link) return NextResponse.json({ error: 'GitHub link is required' }, { status: 400 });
    if (requiredProofs.includes('deployment') && !deployment_link) return NextResponse.json({ error: 'Deployment link is required' }, { status: 400 });
    if (requiredProofs.includes('document') && !document_url) return NextResponse.json({ error: 'Document URL is required' }, { status: 400 });
    if (requiredProofs.includes('video') && !video_url) return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
    if (requiredProofs.includes('custom') && !custom_proof) return NextResponse.json({ error: 'Custom proof is required' }, { status: 400 });

    // Fetch existing submission
    const { data: existingSub } = await supabaseServer
      .from('task_submissions')
      .select('id, status')
      .eq('user_id', user_id)
      .eq('task_id', task_id)
      .maybeSingle();

    if (existingSub && existingSub.status !== 'needs_revision' && existingSub.status !== 'rejected') {
      // Allow overriding 'pending' in some workflows, but block if approved.
      if (existingSub.status === 'approved') {
         return NextResponse.json({ error: 'Cannot resubmit an approved task' }, { status: 400 });
      }
    }

    // Upsert submission
    const { data, error } = await supabaseServer
      .from('task_submissions')
      .upsert({
        task_id,
        user_id,
        cohort_participant_id: participantData?.id || null,
        github_link,
        deployment_link,
        document_url,
        video_url,
        explanation,
        custom_proof,
        status: 'pending',
        submitted_at: new Date().toISOString()
      }, { onConflict: 'user_id,task_id' })
      .select()
      .single();

    if (error) throw error;

    // Update last activity if participant exists
    if (participantData) {
      await supabaseServer
          .from('cohort_participants')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('id', participantData.id);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error submitting task:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
