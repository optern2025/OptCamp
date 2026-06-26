import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

async function requireAdmin() {
  const h = await headers();
  const role = h.get("x-user-role");
  if (role !== "admin") throw new Error("Unauthorized");
}

// PATCH /api/admin/cohorts/[cycleId]/sprints/[sprintId]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ cycleId: string; sprintId: string }> }) {
  try {
    await requireAdmin();
    const { cycleId, sprintId } = await params;
    const body = await req.json();

    const supabase = getSupabaseAdminClient();

    // Verify sprint belongs to this cohort
    const { data: sprint } = await supabase
      .from("sprints")
      .select("id")
      .eq("id", sprintId)
      .eq("cycle_id", cycleId)
      .single();

    if (!sprint) return NextResponse.json({ error: "Sprint not found" }, { status: 404 });

    const { data, error } = await supabase
      .from("sprints")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", sprintId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ sprint: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}

// DELETE /api/admin/cohorts/[cycleId]/sprints/[sprintId]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ cycleId: string; sprintId: string }> }) {
  try {
    await requireAdmin();
    const { cycleId, sprintId } = await params;
    const supabase = getSupabaseAdminClient();

    const { data: sprint } = await supabase
      .from("sprints")
      .select("id")
      .eq("id", sprintId)
      .eq("cycle_id", cycleId)
      .single();

    if (!sprint) return NextResponse.json({ error: "Sprint not found" }, { status: 404 });

    const { error } = await supabase.from("sprints").delete().eq("id", sprintId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}
