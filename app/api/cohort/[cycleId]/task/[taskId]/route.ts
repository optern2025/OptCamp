import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

const supabase = getSupabaseAdminClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cycleId: string; taskId: string }> }
) {
  const { cycleId, taskId } = await params;

  const reqHeaders = await headers();
  const userId = reqHeaders.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Verify user membership in cohort
    const { data: participant } = await supabase
      .from('cohort_participants')
      .select('status')
      .eq('user_id', userId)
      .eq('cycle_id', cycleId)
      .maybeSingle();

    const { data: application } = await supabase
      .from('applications')
      .select('status')
      .eq('user_id', userId)
      .eq('cycle_id', cycleId)
      .maybeSingle();

    const validParticipantStatuses = ['selected', 'enrolled', 'active', 'completed'];
    const validApplicationStatuses = ['selected', 'enrolled'];

    const isParticipant = participant && validParticipantStatuses.includes(participant.status);
    const isAppSelected = application && validApplicationStatuses.includes(application.status);

    if (!isParticipant && !isAppSelected) {
      return NextResponse.json({ error: 'Unauthorized: Not a member of this cohort' }, { status: 403 });
    }

    // Get task with sprint title
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*, sprints(id, title, cycle_id)')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify task belongs to this cycle
    const sprintCycleId = Array.isArray(task.sprints)
      ? (task.sprints[0] as any)?.cycle_id
      : (task.sprints as any)?.cycle_id;

    if (sprintCycleId !== cycleId) {
      return NextResponse.json({ error: 'Task does not belong to this cohort' }, { status: 403 });
    }

    const sprintTitle = Array.isArray(task.sprints)
      ? (task.sprints[0] as any)?.title
      : (task.sprints as any)?.title;

    // Get my submission
    const { data: submission } = await supabase
      .from('task_submissions')
      .select('id, status, score, admin_feedback, submitted_at, reviewed_at, github_link, deployment_link, document_url, video_url, explanation')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .maybeSingle();

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        task_type: task.task_type,
        due_date: task.due_date,
        points: task.points,
        required_proof: task.required_proof,
        sprint_title: sprintTitle,
      },
      submission: submission ?? null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
