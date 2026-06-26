import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: applicationId } = await params;
    const supabase = getSupabaseAdminClient();

    // Check if user has started an attempt
    const { data: attempt } = await supabase
      .from("screening_attempts")
      .select("id")
      .eq("application_id", applicationId)
      .single();

    if (attempt) {
      return NextResponse.json({ error: "Cannot regenerate: User has already started the screening attempt." }, { status: 400 });
    }

    // Delete existing packet
    await supabase.from("ai_screening_packets").delete().eq("application_id", applicationId);

    // Ensure status is pulled back from screening_required if we are regenerating
    const { data: app } = await supabase.from("applications").select("status").eq("id", applicationId).single();
    if (app && app.status === "screening_required") {
        await supabase.from("applications").update({ status: "review" }).eq("id", applicationId);
    }

    return NextResponse.json({ success: true, message: "Existing packet deleted. You can now generate a new one." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
