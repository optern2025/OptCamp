import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

async function requireAdmin() {
  const h = await headers();
  const role = h.get("x-user-role");
  if (role !== "admin") throw new Error("Unauthorized");
}

// GET /api/admin/cohorts/[cycleId]/sprints — list sprints for this cohort
export async function GET(req: NextRequest, { params }: { params: Promise<{ cycleId: string }> }) {
  try {
    await requireAdmin();
    const { cycleId } = await params;
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("sprints")
      .select("id, title, description, start_date, end_date, status, created_at, tasks(id)")
      .eq("cycle_id", cycleId)
      .order("start_date", { ascending: true });

    if (error) throw error;

    const sprints = (data ?? []).map((s: any) => ({
      ...s,
      task_count: Array.isArray(s.tasks) ? s.tasks.length : 0,
      tasks: undefined,
    }));

    return NextResponse.json({ sprints });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}

// POST /api/admin/cohorts/[cycleId]/sprints — create sprint
export async function POST(req: NextRequest, { params }: { params: Promise<{ cycleId: string }> }) {
  try {
    await requireAdmin();
    const { cycleId } = await params;
    const body = await req.json();
    const { title, description, start_date, end_date, status } = body;

    if (!title || !start_date || !end_date) {
      return NextResponse.json({ error: "Title, start date and end date are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("sprints")
      .insert({ cycle_id: cycleId, title, description, start_date, end_date, status: status || "upcoming" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ sprint: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}
