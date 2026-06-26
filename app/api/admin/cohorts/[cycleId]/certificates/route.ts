import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

async function requireAdmin() {
  const h = await headers();
  const role = h.get("x-user-role");
  if (role !== "admin") throw new Error("Unauthorized");
}

// GET — list certificates + eligible members for this cohort
export async function GET(req: NextRequest, { params }: { params: Promise<{ cycleId: string }> }) {
  try {
    await requireAdmin();
    const { cycleId } = await params;
    const supabase = getSupabaseAdminClient();

    const [{ data: certificates }, { data: eligible }] = await Promise.all([
      supabase
        .from("certificates")
        .select("id, certificate_number, issue_date, new_users:user_id(full_name, email)")
        .eq("cycle_id", cycleId)
        .order("issue_date", { ascending: false }),
      supabase
        .from("cohort_participants")
        .select("id, completion_percentage, certificate_issued, new_users:user_id(id, full_name, email)")
        .eq("cycle_id", cycleId)
        .in("status", ["completed", "enrolled"])
    ]);

    return NextResponse.json({ certificates: certificates ?? [], eligible: eligible ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}

// POST — issue certificate
export async function POST(req: NextRequest, { params }: { params: Promise<{ cycleId: string }> }) {
  try {
    await requireAdmin();
    const { cycleId } = await params;
    const { userId, participantId } = await req.json();
    const supabase = getSupabaseAdminClient();

    const certNumber = `OC-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const { count } = await supabase
      .from("certificates")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("cycle_id", cycleId);

    if (count && count > 0) {
      return NextResponse.json({ error: "Certificate already issued for this user in this cohort." }, { status: 400 });
    }

    const { data: cert, error } = await supabase
      .from("certificates")
      .insert({ user_id: userId, cycle_id: cycleId, certificate_number: certNumber })
      .select()
      .single();

    if (error) throw error;

    // Mark participant as certificate issued
    await supabase
      .from("cohort_participants")
      .update({ certificate_issued: true })
      .eq("id", participantId);

    return NextResponse.json({ certificate: cert });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}

// DELETE — revoke certificate
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ cycleId: string }> }) {
  try {
    await requireAdmin();
    const { cycleId } = await params;
    const { certId, participantId } = await req.json();
    const supabase = getSupabaseAdminClient();

    const { error } = await supabase
      .from("certificates")
      .delete()
      .eq("id", certId)
      .eq("cycle_id", cycleId);

    if (error) throw error;

    if (participantId) {
      await supabase
        .from("cohort_participants")
        .update({ certificate_issued: false })
        .eq("id", participantId);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}
