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

  // Admin ID is needed, we should ideally fetch the current admin from session.
  // For now, assuming the user is admin.
  const { data: sessionData } = await supabaseServer
    .from('sessions')
    .select('user_id')
    .eq('id', sessionToken)
    .single();

  if (!sessionData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin_id = sessionData.user_id;

  const body = await request.json();
  const { submission_id, status, score, admin_feedback } = body;

  if (!submission_id || !status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const { data: submission, error } = await supabaseServer
      .from('task_submissions')
      .update({
        status,
        score: score || 0,
        admin_feedback,
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin_id
      })
      .eq('id', submission_id)
      .select(`
        *,
        tasks(title),
        cohort_participants(id, user_id, cycle_id)
      `)
      .single();

    if (error) throw error;

    // Trigger Notification for the user
    let notifType = 'submission_update';
    let notifTitle = `Submission ${status}`;
    if (status === 'approved') {
        notifType = 'submission_approved';
    } else if (status === 'rejected') {
        notifType = 'submission_rejected';
    } else if (status === 'needs_revision') {
        notifType = 'needs_revision';
        notifTitle = 'Submission Needs Revision';
    }

    await supabaseServer.from('notifications').insert({
      user_id: submission.user_id,
      type: notifType,
      title: notifTitle,
      message: `Your submission for task "${submission.tasks?.title}" has been marked as ${status}.`
    });

    // Recalculate completion percentage if approved
    if (status === 'approved') {
        const participantId = submission.cohort_participant_id;
        
        // Count total tasks in the cycle
        // Wait, tasks belong to sprints, sprints belong to cycle.
        const { data: totalTasksResult } = await supabaseServer
            .from('tasks')
            .select(`id, sprints!inner(cycle_id)`)
            .eq('sprints.cycle_id', submission.cohort_participants.cycle_id);
            
        const totalTasks = totalTasksResult?.length || 0;

        // Count approved submissions for this participant
        const { count: approvedCount } = await supabaseServer
            .from('task_submissions')
            .select('id', { count: 'exact' })
            .eq('cohort_participant_id', participantId)
            .eq('status', 'approved');

        const completedCount = approvedCount || 0;
        
        const percentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

        await supabaseServer
            .from('cohort_participants')
            .update({ completion_percentage: percentage })
            .eq('id', participantId);
    }

    return NextResponse.json(submission);
  } catch (error: any) {
    console.error('Error reviewing submission:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
