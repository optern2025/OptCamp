import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const reqHeaders = await headers();
  const role = reqHeaders.get("x-user-role");
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("platform_announcements")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ announcement: data });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const reqHeaders = await headers();
  const role = reqHeaders.get("x-user-role");
  if (role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.from("platform_announcements").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
