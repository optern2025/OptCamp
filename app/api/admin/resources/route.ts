import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  const reqHeaders = await headers();
  const role = reqHeaders.get("x-user-role");
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const supabase = getSupabaseAdminClient();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const type = searchParams.get("type");
  const domainId = searchParams.get("domain_id");
  const cycleId = searchParams.get("cycle_id");

  let query = supabase
    .from("resources")
    .select("*, domains(name), cycles(title), sprints(title), tasks(title)")
    .order("created_at", { ascending: false });

  if (type) query = query.eq("resource_type", type);
  if (domainId) query = query.eq("domain_id", domainId);
  if (cycleId) query = query.or(`cycle_id.eq.${cycleId},cycle_id.is.null`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let filtered = data;
  if (search) {
    const s = search.toLowerCase();
    filtered = data.filter((r: any) =>
      r.title.toLowerCase().includes(s) ||
      r.description?.toLowerCase().includes(s)
    );
  }

  return NextResponse.json({ resources: filtered });
}

export async function POST(request: Request) {
  const reqHeaders = await headers();
  const role = reqHeaders.get("x-user-role");
  const userId = reqHeaders.get("x-user-id");
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await request.json();
  const { title, description, resource_type, url, domain_id, cycle_id, sprint_id, task_id } = body;

  if (!title || !url || !resource_type) {
    return NextResponse.json({ error: "Title, URL and type are required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("resources")
    .insert({ title, description, resource_type, url, domain_id, cycle_id, sprint_id, task_id, created_by: userId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ resource: data });
}

export async function DELETE(request: Request) {
  const reqHeaders = await headers();
  const role = reqHeaders.get("x-user-role");
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
