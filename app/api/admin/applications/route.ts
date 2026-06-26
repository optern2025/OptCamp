import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser();
    const supabase = getSupabaseAdminClient();
    const { searchParams } = new URL(req.url);

    const cycle_id = searchParams.get("cycle_id");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = supabase
      .from("applications")
      .select("*, cycles(title, cohort_type, domains(name)), ai_screening_packets(generation_status)")
      .order("submitted_at", { ascending: false });

    if (cycle_id) query = query.eq("cycle_id", cycle_id);
    if (status) query = query.eq("status", status);
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: rawApplications, error } = await query;
    if (error) throw error;

    // Flatten packet_status for easy client consumption
    const applications = (rawApplications ?? []).map(app => {
      const packets = Array.isArray(app.ai_screening_packets) ? app.ai_screening_packets : (app.ai_screening_packets ? [app.ai_screening_packets] : []);
      const latestPacket = packets.find((p: any) => p.generation_status === "generated") || packets[0] || null;
      const { ai_screening_packets, ...rest } = app;
      return {
        ...rest,
        packet_status: latestPacket?.generation_status ?? null,
      };
    });

    return NextResponse.json({ applications });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}
