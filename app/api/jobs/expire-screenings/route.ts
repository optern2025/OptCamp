import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

// OptCamp background job: Mark expired screening attempts
export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const now = new Date().toISOString();

    // Expire attempts where expires_at < now AND status is 'in_progress'
    const { data, error } = await supabase
      .from("screening_attempts")
      .update({ status: "expired" })
      .eq("status", "in_progress")
      .lt("expires_at", now)
      .select("id");

    if (error) {
      console.error("[job:expire-screenings] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      expired_count: data?.length || 0,
      timestamp: now,
    });
  } catch (error: any) {
    console.error("[job:expire-screenings] Exception:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
