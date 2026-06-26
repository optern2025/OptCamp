import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const reqHeaders = await headers();
  const role = reqHeaders.get("x-user-role");

  if (role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { user_id, cycle_id } = await request.json();
    if (!user_id || !cycle_id) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    // Check if certificate already exists
    const { data: existing } = await supabase
      .from("certificates")
      .select("id")
      .eq("user_id", user_id)
      .eq("cycle_id", cycle_id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Certificate already issued" }, { status: 400 });
    }

    // Generate unique number
    const certNumber = `OC-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const { data, error } = await supabase
      .from("certificates")
      .insert({
        user_id,
        cycle_id,
        certificate_number: certNumber,
        issue_date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Update participant status to completed
    await supabase
      .from("cohort_participants")
      .update({ status: 'completed', certificate_issued: true })
      .eq("user_id", user_id)
      .eq("cycle_id", cycle_id);

    return NextResponse.json({ success: true, certificate: data });
  } catch (error: any) {
    console.error("Certificate generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
