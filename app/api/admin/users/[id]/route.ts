import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const supabase = getSupabaseAdminClient();

    const { data: user, error } = await supabase
      .from("new_users")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const [{ data: applications }, { data: screeningHistory }, { data: cohortParticipation }, { data: eligibility }] = await Promise.all([
      supabase.from("applications").select("id, status, submitted_at, cycles(title)").eq("user_id", id).order("submitted_at", { ascending: false }),
      supabase.from("screening_attempts").select("id, score, passed, difficulty_level, submitted_at, status, domains(name)").eq("user_id", id).order("submitted_at", { ascending: false }),
      supabase.from("cohort_participants").select("id, status, cycles(title)").eq("user_id", id),
      supabase.from("domain_eligibility").select("*, domains(name)").eq("user_id", id),
    ]);

    return NextResponse.json({
      user,
      applications: applications ?? [],
      screeningHistory: screeningHistory ?? [],
      cohortParticipation: cohortParticipation ?? [],
      eligibility: eligibility ?? [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdminUser();
    const { id } = await params;
    const supabase = getSupabaseAdminClient();
    const body = await req.json();
    const { action } = body;

    // Prevent self-modification
    if (id === admin.id) {
      return NextResponse.json({ error: "Cannot modify your own account via admin panel." }, { status: 400 });
    }

    const allowedActions = ["promote_admin", "remove_admin", "disable", "enable", "approve_admin", "reject_admin", "soft_delete"];
    if (!allowedActions.includes(action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    if (action === "soft_delete") {
      const { error } = await supabase.rpc("soft_delete_user", { target_user_id: id });
      if (error) throw error;
      return NextResponse.json({ message: "User soft deleted successfully." });
    }

    const updates: Record<string, any> = {};
    if (action === "promote_admin") {
      updates.role = "admin";
      updates.admin_approval_status = "approved";
      updates.approved_by = admin.id;
      updates.approved_at = new Date().toISOString();
    }
    if (action === "remove_admin") {
      updates.role = "user";
      updates.admin_approval_status = "not_required";
    }
    if (action === "disable") updates.disabled_at = new Date().toISOString();
    if (action === "enable") updates.disabled_at = null;
    if (action === "approve_admin") {
      updates.admin_approval_status = "approved";
      updates.approved_by = admin.id;
      updates.approved_at = new Date().toISOString();
    }
    if (action === "reject_admin") {
      updates.admin_approval_status = "rejected";
    }

    const { data: user, error } = await supabase
      .from("new_users")
      .update(updates)
      .eq("id", id)
      .select("id, email, full_name, role, admin_approval_status, disabled_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}
