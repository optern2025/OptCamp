import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

async function requireAdmin() {
  const h = await headers();
  const role = h.get("x-user-role");
  if (role !== "admin") throw new Error("Unauthorized");
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ cycleId: string }> }) {
  try {
    await requireAdmin();
    const { cycleId } = await params;
    const supabase = getSupabaseAdminClient();

    const [
      { count: totalApplications },
      { count: screeningRequired },
      { count: screeningPassed },
      { count: screeningFailed },
      { count: selectedCount },
      { count: enrolledCount },
      { count: certifiedCount },
      { data: participants },
      { data: submissions },
      { data: tasks },
      { data: rejectedApps },
    ] = await Promise.all([
      // Applied = all
      supabase.from("applications").select("id", { count: "exact", head: true }).eq("cycle_id", cycleId),
      
      // Screening = progressed into screening or beyond
      supabase.from("applications").select("id", { count: "exact", head: true }).eq("cycle_id", cycleId)
        .in("status", ["screening_required", "screening_passed", "screening_failed", "selected", "enrolled", "completed", "waitlisted"]),
      
      // Passed = cleared screening or progressed beyond
      supabase.from("applications").select("id", { count: "exact", head: true }).eq("cycle_id", cycleId)
        .in("status", ["screening_passed", "selected", "enrolled", "completed", "waitlisted"]),
      
      // Failed screening specifically
      supabase.from("applications").select("id", { count: "exact", head: true }).eq("cycle_id", cycleId)
        .eq("status", "screening_failed"),
        
      // Selected = selected or enrolled or completed
      supabase.from("applications").select("id", { count: "exact", head: true }).eq("cycle_id", cycleId)
        .in("status", ["selected", "enrolled", "completed"]),
        
      // Enrolled = from cohort_participants
      supabase.from("cohort_participants").select("id", { count: "exact", head: true }).eq("cycle_id", cycleId)
        .in("status", ["enrolled", "active", "completed"]),
        
      // Certified = explicitly issued
      supabase.from("certificates").select("id", { count: "exact", head: true }).eq("cycle_id", cycleId),
      
      // Metrics data
      supabase.from("cohort_participants").select("completion_percentage, status").eq("cycle_id", cycleId)
        .in("status", ["enrolled", "active", "completed"]),
      supabase.from("task_submissions").select("id, status, tasks!inner(sprints!inner(cycle_id))").eq("tasks.sprints.cycle_id", cycleId),
      supabase.from("tasks").select("id, sprints!inner(cycle_id)").eq("sprints.cycle_id", cycleId),
      supabase.from("applications").select("id", { count: "exact", head: true }).eq("cycle_id", cycleId).eq("status", "rejected"),
    ]);

    const avgCompletion = participants && participants.length > 0
      ? Math.round(participants.reduce((sum: number, p: any) => sum + (p.completion_percentage || 0), 0) / participants.length)
      : 0;

    const totalTasks = tasks?.length ?? 0;
    const approvedSubs = submissions?.filter((s: any) => s.status === "approved").length ?? 0;
    const pendingSubs = submissions?.filter((s: any) => s.status === "pending").length ?? 0;
    const rejectedSubs = submissions?.filter((s: any) => s.status === "rejected" || s.status === "needs_revision").length ?? 0;

    return NextResponse.json({
      // Funnel
      totalApplications: totalApplications ?? 0,
      screeningRequired: screeningRequired ?? 0,
      screeningPassed: screeningPassed ?? 0,
      screeningFailed: screeningFailed ?? 0,
      selected: selectedCount ?? 0,
      activeMembers: enrolledCount ?? 0,
      certified: certifiedCount ?? 0,
      rejected: (rejectedApps as any)?.count ?? 0,
      
      // Legacy
      screeningPassRate: totalApplications ? Math.round(((screeningPassed ?? 0) / totalApplications) * 100) : 0,
      
      // Secondary metrics
      avgCompletion,
      totalTasks,
      approvedSubmissions: approvedSubs,
      pendingReview: pendingSubs,
      rejectedSubmissions: rejectedSubs,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}
