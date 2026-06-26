import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

const supabase = getSupabaseAdminClient();

export async function GET(request: Request, { params }: { params: Promise<{ cycleId: string }> }) {
  const { cycleId } = await params;
  const reqHeaders = await headers();
  const userId = reqHeaders.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Validate enrollment
    const { data: participant } = await supabase
      .from('cohort_participants')
      .select('id, status, completion_percentage, enrolled_at, certificate_issued')
      .eq('user_id', userId)
      .eq('cycle_id', cycleId)
      .limit(1)
      .maybeSingle();

    const { data: application } = await supabase
      .from('applications')
      .select('id, status')
      .eq('user_id', userId)
      .eq('cycle_id', cycleId)
      .limit(1)
      .maybeSingle();

    const hasAccess = participant?.status === 'enrolled' || participant?.status === 'completed' || participant?.status === 'selected' || application?.status === 'selected';

    if (!hasAccess) {
      return NextResponse.json({ error: 'Not enrolled in this cohort' }, { status: 403 });
    }

    // 2. Cycle + domain info
    const { data: cycle } = await supabase
      .from('cycles')
      .select('id, title, slug, cohort_type, cohort_start_at, cohort_end_at, domains(name, slug)')
      .eq('id', cycleId)
      .single();

    // 3. Sprints + tasks + my submissions
    const { data: sprints } = await supabase
      .from('sprints')
      .select(`
        id, title, description, start_date, end_date,
        tasks(
          id, title, description, task_type, due_date, points, required_proof,
          task_submissions(id, status, score, submitted_at, reviewed_at, admin_feedback)
        )
      `)
      .eq('cycle_id', cycleId)
      .order('start_date', { ascending: true });

    // Filter submissions to only this user's
    const sprintsWithMySubmissions = (sprints ?? []).map((sprint: any) => ({
      ...sprint,
      tasks: (sprint.tasks ?? []).map((task: any) => ({
        ...task,
        my_submission: (task.task_submissions ?? []).find((s: any) => s.user_id === userId) ?? null,
        task_submissions: undefined, // strip all submissions for privacy
      })),
    }));

    // 4. Leaderboard (top 10)
    const { data: allParticipants } = await supabase
      .from('cohort_participants')
      .select('id, user_id, completion_percentage, users:new_users(full_name)')
      .eq('cycle_id', cycleId)
      .in('status', ['enrolled', 'completed']);

    const { data: allApprovedSubs } = await supabase
      .from('task_submissions')
      .select('user_id, score, tasks!inner(sprints!inner(cycle_id))')
      .eq('status', 'approved')
      .eq('tasks.sprints.cycle_id', cycleId);

    const taskPointsMap: Record<string, number> = {};
    (allApprovedSubs ?? []).forEach((s: any) => {
      taskPointsMap[s.user_id] = (taskPointsMap[s.user_id] ?? 0) + (s.score ?? 0);
    });

    const leaderboard = (allParticipants ?? [])
      .map((p: any) => ({
        user_id: p.user_id,
        full_name: Array.isArray(p.users) ? p.users[0]?.full_name : (p.users as any)?.full_name,
        task_points: taskPointsMap[p.user_id] ?? 0,
        completion_percentage: p.completion_percentage ?? 0,
        is_me: p.user_id === userId,
      }))
      .sort((a: any, b: any) => b.task_points - a.task_points)
      .slice(0, 10)
      .map((p: any, i: number) => ({ ...p, rank: i + 1 }));

    const myRank = leaderboard.find((p: any) => p.is_me)?.rank ?? null;

    // 5. Announcements
    const { data: announcements } = await supabase
      .from('platform_announcements')
      .select('id, title, body, pinned, created_at, type, author:new_users(full_name)')
      .or(`cycle_id.eq.${cycleId},type.eq.platform`)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20);

    // 6. Next due task
    const now = new Date();
    let nextTaskDue: any = null;
    for (const sprint of (sprintsWithMySubmissions ?? [])) {
      for (const task of (sprint.tasks ?? [])) {
        if (task.due_date && new Date(task.due_date) > now && !task.my_submission) {
          if (!nextTaskDue || new Date(task.due_date) < new Date(nextTaskDue.due_date)) {
            nextTaskDue = { id: task.id, title: task.title, due_date: task.due_date, sprint_title: sprint.title };
          }
        }
      }
    }

    // 7. Participant count
    const { count: participantCount } = await supabase
      .from('cohort_participants')
      .select('id', { count: 'exact' })
      .eq('cycle_id', cycleId)
      .in('status', ['enrolled', 'completed']);

    return NextResponse.json({
      cycle,
      participant: {
        ...participant,
        my_rank: myRank,
      },
      sprints: sprintsWithMySubmissions,
      leaderboard,
      announcements,
      next_task_due: nextTaskDue,
      participant_count: participantCount ?? 0,
    });
  } catch (error: any) {
    console.error('Cohort hub error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
