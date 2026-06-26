import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

async function requireAdmin() {
  const h = await headers();
  const role = h.get("x-user-role");
  if (role !== "admin") throw new Error("Unauthorized");
}

// PATCH — update task
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ cycleId: string; taskId: string }> }) {
  try {
    await requireAdmin();
    const { taskId } = await params;
    const body = await req.json();
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("tasks")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", taskId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ task: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}

// DELETE — delete task
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ cycleId: string; taskId: string }> }) {
  try {
    await requireAdmin();
    const { taskId } = await params;
    const supabase = getSupabaseAdminClient();

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}
