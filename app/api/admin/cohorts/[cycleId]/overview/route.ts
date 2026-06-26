import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

async function requireAdmin() {
  const h = await headers();
  const role = h.get("x-user-role");
  if (role !== "admin") throw new Error("Unauthorized");
}

// GET — cohort overview data
export async function GET(req: NextRequest, { params }: { params: Promise<{ cycleId: string }> }) {
  try {
    let adminUserId = "unknown";
    try {
      const h = await headers();
      const role = h.get("x-user-role");
      adminUserId = h.get("x-user-id") || "unknown";
      if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    } catch (authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cycleId } = await params;
    console.log(`[Overview API] received cycleId: ${cycleId}, admin user id: ${adminUserId}`);

    const supabase = getSupabaseAdminClient();

    const [cycleRes, appsRes, partsRes, subsRes, sprintsRes, tasksRes] = await Promise.all([
      supabase.from("cycles").select("id, title, cohort_type, status, cohort_start_at, cohort_end_at, application_start_at, application_end_at, screening_start_at, screening_end_at, domains(name)").eq("id", cycleId).single(),
      supabase.from("applications").select("id, full_name, email, status, submitted_at").eq("cycle_id", cycleId).order("submitted_at", { ascending: false }),
      supabase.from("cohort_participants").select("id, status, completion_percentage, new_users:user_id(full_name)").eq("cycle_id", cycleId),
      supabase.from("task_submissions").select(`id, status, score, submitted_at, tasks!inner(title, sprints!inner(cycle_id)), new_users:user_id(full_name)`).eq("tasks.sprints.cycle_id", cycleId).order("submitted_at", { ascending: false }).limit(8),
      supabase.from("sprints").select("id, title, start_date, end_date, status").eq("cycle_id", cycleId).order("start_date"),
      supabase.from("tasks").select("id, sprints!inner(cycle_id)").eq("sprints.cycle_id", cycleId),
    ]);

    if (cycleRes.error) console.error(`[Overview API] cycle lookup error:`, cycleRes.error);
    if (appsRes.error) console.error(`[Overview API] applications error:`, appsRes.error);
    if (partsRes.error) console.error(`[Overview API] participants error:`, partsRes.error);
    if (subsRes.error) console.error(`[Overview API] submissions error:`, subsRes.error);
    if (sprintsRes.error) console.error(`[Overview API] sprints error:`, sprintsRes.error);

    const cycle = cycleRes.data || {};
    const applications = appsRes.data || [];
    const participants = partsRes.data || [];
    const recentSubmissions = subsRes.data || [];
    const sprints = sprintsRes.data || [];

    console.log(`[Overview API] cycle lookup result: ${!!cycleRes.data}, apps count: ${applications.length}, participants count: ${participants.length}, submissions count: ${recentSubmissions.length}`);

    const totalApps = applications.length;
    const selected = participants.filter((p: any) => ["selected", "enrolled", "completed"].includes(p.status)).length;
    const enrolled = participants.filter((p: any) => ["enrolled", "completed"].includes(p.status)).length;
    const avgCompletion = enrolled > 0
      ? Math.round(participants.filter((p: any) => ["enrolled", "completed"].includes(p.status)).reduce((sum: number, p: any) => sum + (p.completion_percentage || 0), 0) / enrolled)
      : 0;
    const sprintCount = sprints.length;
    const taskCount = tasksRes.data?.length ?? 0;
    const submittedCount = recentSubmissions.length;
    const approvedCount = recentSubmissions.filter((s: any) => s.status === "approved").length;

    return NextResponse.json({
      cycle,
      metrics: { totalApps, selected, enrolled, avgCompletion, sprintCount, taskCount, submittedCount, approvedCount },
      recentApplications: applications.slice(0, 5),
      recentSubmissions,
      sprints,
    });
  } catch (e: any) {
    console.error(`[Overview API] Fatal error:`, e.message);
    return NextResponse.json({
      error: e.message || "Internal Server Error",
      cycle: {},
      metrics: { totalApps: 0, selected: 0, enrolled: 0, avgCompletion: 0 },
      recentApplications: [],
      recentSubmissions: [],
      sprints: []
    }, { status: 500 });
  }
}
