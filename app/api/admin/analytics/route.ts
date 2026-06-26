import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    await requireAdminUser();
    const supabase = getSupabaseAdminClient();

    const [
      { count: totalUsers },
      { count: applicationsCount },
      { count: pendingApplications },
      { count: approvedApplications },
      { count: rejectedApplications },
      { count: screeningRequired },
      { count: screeningPassed },
      { count: screeningFailed },
      { count: selectedCount },
      { count: enrolledCount },
      { count: cyclesCount },
      { count: activeCyclesCount },
      { count: domainsCount },
      { count: screeningAttemptsCount },
      { count: certificatesCount },
      { count: taskSubmissionsCount },
      { count: approvedSubmissionsCount },
      { count: auditLogsCount },
    ] = await Promise.all([
      supabase.from("new_users").select("*", { count: "exact", head: true }),
      supabase.from("applications").select("*", { count: "exact", head: true }),
      supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "rejected"),
      supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "screening_required"),
      supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "screening_passed"),
      supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "screening_failed"),
      supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "selected"),
      supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "enrolled"),
      supabase.from("cycles").select("*", { count: "exact", head: true }),
      supabase.from("cycles").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("domains").select("*", { count: "exact", head: true }),
      supabase.from("screening_attempts").select("*", { count: "exact", head: true }),
      supabase.from("certificates").select("*", { count: "exact", head: true }),
      supabase.from("sprint_submissions").select("*", { count: "exact", head: true }),
      supabase.from("sprint_submissions").select("*", { count: "exact", head: true }).eq("status", "approved"),
      (async () => {
        const { count, error } = await supabase.from("audit_logs").select("*", { count: "exact", head: true });
        if (error) return { count: 0 };
        return { count };
      })(),
    ]);

    // calculate pass rate
    let passRate = 0;
    if (screeningAttemptsCount && screeningAttemptsCount > 0) {
      passRate = Math.round(((screeningPassed || 0) / screeningAttemptsCount) * 100);
    }

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers ?? 0,
        applicationsCount: applicationsCount ?? 0,
        pendingApplications: pendingApplications ?? 0,
        approvedApplications: approvedApplications ?? 0,
        rejectedApplications: rejectedApplications ?? 0,
        screeningRequired: screeningRequired ?? 0,
        screeningPassed: screeningPassed ?? 0,
        screeningFailed: screeningFailed ?? 0,
        selectedCount: selectedCount ?? 0,
        enrolledCount: enrolledCount ?? 0,
        cyclesCount: cyclesCount ?? 0,
        activeCyclesCount: activeCyclesCount ?? 0,
        domainsCount: domainsCount ?? 0,
        screeningAttemptsCount: screeningAttemptsCount ?? 0,
        passRate,
        certificatesCount: certificatesCount ?? 0,
        taskSubmissionsCount: taskSubmissionsCount ?? 0,
        approvedSubmissionsCount: approvedSubmissionsCount ?? 0,
        auditLogsCount: auditLogsCount ?? 0,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}
