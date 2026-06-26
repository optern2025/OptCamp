import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
const supabaseServer = getSupabaseAdminClient();

export async function GET(request: Request, { params }: { params: Promise<{ cycleId: string }> }) {
  const { cycleId } = await params;

  try {
    // 1. Get all enrolled and completed participants
    const { data: participants, error } = await supabaseServer
      .from('cohort_participants')
      .select(`
        id,
        user_id,
        status,
        users:new_users(full_name, email)
      `)
      .eq('cycle_id', cycleId)
      .in('status', ['enrolled', 'completed']);

    if (error) throw error;
    if (!participants || participants.length === 0) return NextResponse.json([]);

    // 2. Fetch screening scores
    // Find highest screening score for this cycle per user
    const userIds = participants.map(p => p.user_id);
    const { data: screenings } = await supabaseServer
      .from('screening_attempts')
      .select('user_id, score')
      .eq('cycle_id', cycleId)
      .in('user_id', userIds)
      .order('score', { ascending: false });

    // Map highest screening score per user
    const screeningMap: Record<string, number> = {};
    if (screenings) {
        screenings.forEach(s => {
            if (!screeningMap[s.user_id] || s.score > screeningMap[s.user_id]) {
                screeningMap[s.user_id] = s.score;
            }
        });
    }

    // 3. Fetch task points
    const { data: submissions } = await supabaseServer
      .from('task_submissions')
      .select('user_id, score')
      .eq('status', 'approved')
      .in('user_id', userIds);

    // Sum task points per user
    const taskPointsMap: Record<string, number> = {};
    if (submissions) {
        submissions.forEach(sub => {
            taskPointsMap[sub.user_id] = (taskPointsMap[sub.user_id] || 0) + (sub.score || 0);
        });
    }

    // 4. Calculate Final Leaderboard Score
    // Formula: (Task Points * 0.8) + (Screening Score * 0.2)
    const leaderboard = participants.map(p => {
        const taskPoints = taskPointsMap[p.user_id] || 0;
        const screeningScore = screeningMap[p.user_id] || 0;
        const finalScore = (taskPoints * 0.8) + (screeningScore * 0.2);

        return {
            participant_id: p.id,
            user_id: p.user_id,
            full_name: Array.isArray(p.users) ? p.users[0]?.full_name : (p.users as any)?.full_name,
            task_points: taskPoints,
            screening_score: screeningScore,
            total_score: Number(finalScore.toFixed(2)),
            status: p.status
        };
    });

    // 5. Sort descending
    leaderboard.sort((a, b) => b.total_score - a.total_score);

    return NextResponse.json(leaderboard);
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
