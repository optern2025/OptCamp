import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("cycles")
      .select(
        "id, title, slug, cohort_type, status, application_start_at, application_end_at, screening_start_at, screening_end_at, cohort_start_at, cohort_end_at, created_at",
      )
      .eq("status", "active")
      .lte("application_start_at", now)
      .gte("application_end_at", now)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Cycles fetch error:", error);
      return NextResponse.json(
        { error: "Failed to load cycles." },
        { status: 500 },
      );
    }

    return NextResponse.json({ cycles: data ?? [] });
  } catch (error) {
    console.error("Cycles endpoint error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected server error.",
      },
      { status: 500 },
    );
  }
}
