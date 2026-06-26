import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  const reqHeaders = await headers();
  const role = reqHeaders.get("x-user-role");
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const supabase = getSupabaseAdminClient();
  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get("cycle_id");

  let query = supabase
    .from("platform_announcements")
    .select("*")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (cycleId) query = query.eq("cycle_id", cycleId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ announcements: data });
}

export async function POST(request: Request) {
  const reqHeaders = await headers();
  const role = reqHeaders.get("x-user-role");
  const userId = reqHeaders.get("x-user-id");
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await request.json();
  const { title, body: annBody, type, cycle_id, sprint_id, pinned, scheduled_for } = body;

  if (!title || !annBody) return NextResponse.json({ error: "Title and body are required" }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("platform_announcements")
    .insert({ title, body: annBody, type: type || "platform", cycle_id, sprint_id, pinned: !!pinned, scheduled_for, created_by: userId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If it's a cohort announcement, also insert into cohort_announcements for backwards compat
  if (cycle_id) {
    await supabase.from("cohort_announcements").insert({
      title, body: annBody, cycle_id, pinned: !!pinned
    });
  }

  return NextResponse.json({ announcement: data });
}
