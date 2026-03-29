import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("cohorts")
      .select(
        "id, slug, type, apply_window, qualifier_window, sprint_window, apply_by, results_on, application_open_date, application_close_date, qualifier_open_date, qualifier_close_date, sprint_start_date, sprint_end_date, results_announcement_date, schedule_timezone, is_active, qualifier_test_url, created_at",
      )
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to load cohorts." },
        { status: 500 },
      );
    }

    return NextResponse.json({ cohorts: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected server error.",
      },
      { status: 500 },
    );
  }
}
