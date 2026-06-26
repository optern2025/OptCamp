import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("optcamp_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const supabase = getSupabaseAdminClient();
    const { data: session } = await supabase
      .from("sessions")
      .select("user_id")
      .eq("id", sessionToken)
      .single();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    // This endpoint is deprecated in favour of the dashboard page (server-rendered).
    return NextResponse.json({ message: "Use /dashboard for cohort data." }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 },
    );
  }
}
