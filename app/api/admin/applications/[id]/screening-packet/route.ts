import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: applicationId } = await params;
    const supabase = getSupabaseAdminClient();

    const { data: packet, error } = await supabase
      .from("ai_screening_packets")
      .select("*")
      .eq("application_id", applicationId)
      .single();

    if (error || !packet) {
      return NextResponse.json({ error: "Screening packet not found." }, { status: 404 });
    }

    return NextResponse.json({ packet });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
