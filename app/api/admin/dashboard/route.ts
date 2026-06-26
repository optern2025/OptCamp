import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    await requireAdminUser();
    const supabase = getSupabaseAdminClient();

    const [
      { count: totalUsers },
      { count: totalApplications },
      { count: pendingApplications },
      { count: screeningReviewsNeeded },
      { count: tasksAwaitingReview },
      { count: activeCyclesCount },
      { count: enrolledMembers },
      { count: certificatesIssued },
      { data: activeCohortsData },
      { data: recentApplications },
      { data: recentActivity },
    ] = await Promise.all([
      supabase.from("new_users").select("*", { count: "exact", head: true }),
      supabase.from("applications").select("*", { count: "exact", head: true }),
      supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("screening_attempts").select("*", { count: "exact", head: true }).eq("status", "submitted"),
      supabase.from("task_submissions").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("cycles").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("cohort_participants").select("*", { count: "exact", head: true }).in("status", ["enrolled", "active", "completed"]),
      supabase.from("certificates").select("*", { count: "exact", head: true }),
      supabase
        .from("cycles")
        .select("id, title, status, seats, cohort_type, domains(name), cohort_participants(id, status, completion_percentage)")
        .eq("status", "active"),
      supabase
        .from("applications")
        .select("id, full_name, email, status, submitted_at, screening_score, cycles(title)")
        .order("submitted_at", { ascending: false })
        .limit(10),
      supabase
        .from("audit_logs")
        .select("id, event_type, action_details, created_at, target_user:new_users!target_user_id(full_name), admin:new_users!admin_id(full_name)")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    // Format Active Cohorts & Calculate Capacity
    let cohortsNearCapacity = 0;

    const activeCohorts = (activeCohortsData || []).map(cohort => {
      const participants = cohort.cohort_participants || [];
      const activeMembers = participants.filter((p: any) => ["enrolled", "active", "completed"].includes(p.status)).length;
      
      let overallProgress = 0;
      if (activeMembers > 0) {
        const totalPct = participants.reduce((acc: number, p: any) => acc + (p.completion_percentage || 0), 0);
        overallProgress = Math.round(totalPct / activeMembers);
      }

      const seats = cohort.seats || 0;
      if (seats > 0 && activeMembers >= seats * 0.8) {
        cohortsNearCapacity++;
      }

      return {
        id: cohort.id,
        title: cohort.title,
        track: Array.isArray(cohort.domains) ? cohort.domains[0]?.name : (cohort.domains as any)?.name || cohort.cohort_type,
        activeMembers,
        seats,
        progress: overallProgress,
        status: cohort.status
      };
    });

    return NextResponse.json({
      metrics: {
        totalUsers: totalUsers ?? 0,
        totalApplications: totalApplications ?? 0,
        activeCohorts: activeCyclesCount ?? 0,
        enrolledMembers: enrolledMembers ?? 0,
        certificatesIssued: certificatesIssued ?? 0,
      },
      actionRequired: {
        pendingApplications: pendingApplications ?? 0,
        screeningReviewsNeeded: screeningReviewsNeeded ?? 0,
        tasksAwaitingReview: tasksAwaitingReview ?? 0,
        cohortsNearCapacity,
      },
      activeCohorts,
      recentApplications: recentApplications ?? [],
      recentActivity: recentActivity ?? []
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}
