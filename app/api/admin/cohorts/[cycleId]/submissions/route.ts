import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

async function requireAdmin() {
  const h = await headers();
  const role = h.get("x-user-role");
  if (role !== "admin") throw new Error("Unauthorized");
}

// GET — list submissions for this cohort
export async function GET(req: NextRequest, { params }: { params: Promise<{ cycleId: string }> }) {
  try {
    await requireAdmin();
    const { cycleId } = await params;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const supabase = getSupabaseAdminClient();

    let query = supabase
      .from("task_submissions")
      .select(`
        id, status, score, admin_feedback, submitted_at, reviewed_at,
        github_link, deployment_link, document_url, video_url, explanation,
        tasks!inner(id, title, points, sprints!inner(id, title, cycle_id)),
        new_users:user_id(id, full_name, email)
      `)
      .eq("tasks.sprints.cycle_id", cycleId)
      .order("submitted_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ submissions: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}
