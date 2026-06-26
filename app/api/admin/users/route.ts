import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    await requireAdminUser();
    const supabase = getSupabaseAdminClient();

    const { data: users, error } = await supabase
      .from("new_users")
      .select("id, email, full_name, mobile_number, user_type, role, created_at, admin_approval_status, disabled_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ users: users ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}
