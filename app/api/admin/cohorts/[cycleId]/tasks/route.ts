import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

async function requireAdmin() {
  const h = await headers();
  const role = h.get("x-user-role");
  if (role !== "admin") throw new Error("Unauthorized");
}

// GET — list tasks for this cohort (optionally filter by sprint_id)
export async function GET(req: NextRequest, { params }: { params: Promise<{ cycleId: string }> }) {
  try {
    await requireAdmin();
    const { cycleId } = await params;
    const { searchParams } = new URL(req.url);
    const sprintId = searchParams.get("sprint_id");

    const supabase = getSupabaseAdminClient();

    let query = supabase
      .from("tasks")
      .select("id, title, description, task_type, due_date, points, required_proof, sprint_id, created_at, sprints!inner(cycle_id, title)")
      .eq("sprints.cycle_id", cycleId)
      .order("created_at", { ascending: true });

    if (sprintId) query = query.eq("sprint_id", sprintId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ tasks: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}

// POST — create task
export async function POST(req: NextRequest, { params }: { params: Promise<{ cycleId: string }> }) {
  try {
    await requireAdmin();
    const { cycleId } = await params;
    const body = await req.json();
    const { sprint_id, title, description, task_type, due_date, points, required_proof } = body;

    if (!sprint_id || !title || !description) {
      return NextResponse.json({ error: "sprint_id, title, and description are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    // Verify sprint belongs to this cohort
    const { data: sprint } = await supabase
      .from("sprints")
      .select("id")
      .eq("id", sprint_id)
      .eq("cycle_id", cycleId)
      .single();

    if (!sprint) return NextResponse.json({ error: "Sprint not found in this cohort" }, { status: 404 });

    const { data, error } = await supabase
      .from("tasks")
      .insert({ sprint_id, title, description, task_type: task_type || "assignment", due_date, points: points || 10, required_proof: required_proof || ["github"] })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ task: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}
