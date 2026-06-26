import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();

    // Fetch applications with joined cycle info
    const { data: applications, error } = await supabase
      .from("applications")
      .select("*, cycles(title, slug, cohort_type, application_start_at, application_end_at, screening_start_at, screening_end_at, cohort_start_at, cohort_end_at)")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("Fetch applications error:", error);
      return NextResponse.json(
        { error: "Failed to fetch applications." },
        { status: 500 }
      );
    }

    return NextResponse.json({ applications: applications ?? [] });
  } catch (error) {
    console.error("GET /api/applications/my error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
