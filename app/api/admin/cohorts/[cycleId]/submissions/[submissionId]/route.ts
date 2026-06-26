import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

async function requireAdmin() {
  const h = await headers();
  const role = h.get("x-user-role");
  if (role !== "admin") throw new Error("Unauthorized");
}

// PATCH — review a submission (approve, reject, needs_revision)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ cycleId: string; submissionId: string }> }) {
  try {
    await requireAdmin();
    const h = await headers();
    const adminId = h.get("x-user-id");
    const { submissionId } = await params;
    const body = await req.json();
    const { status, score, admin_feedback } = body;

    if (!["approved", "rejected", "needs_revision"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("task_submissions")
      .update({
        status,
        score: status === "approved" ? (score ?? 0) : 0,
        admin_feedback,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
      })
      .eq("id", submissionId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ submission: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}
