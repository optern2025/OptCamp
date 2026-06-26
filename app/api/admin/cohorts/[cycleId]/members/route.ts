import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

async function requireAdmin() {
  const h = await headers();
  const role = h.get("x-user-role");
  if (role !== "admin") throw new Error("Unauthorized");
}

// GET — list members of this cohort
export async function GET(req: NextRequest, { params }: { params: Promise<{ cycleId: string }> }) {
  try {
    await requireAdmin();
    const { cycleId } = await params;
    const supabase = getSupabaseAdminClient();

    // 0. Auto-repair missing participants from applications
    const { data: missingApps } = await supabase
      .from("applications")
      .select("id, user_id, status")
      .eq("cycle_id", cycleId)
      .in("status", ["selected", "enrolled"]);

    if (missingApps && missingApps.length > 0) {
      // Check which ones are actually missing from cohort_participants
      const { data: existingParts } = await supabase
        .from("cohort_participants")
        .select("user_id")
        .eq("cycle_id", cycleId);

      const existingUserIds = new Set(existingParts?.map((p) => p.user_id) || []);
      const toInsert = missingApps
        .filter((app) => !existingUserIds.has(app.user_id))
        .map((app) => ({
          user_id: app.user_id,
          cycle_id: cycleId,
          application_id: app.id,
          status: app.status,
          enrolled_at: app.status === "enrolled" ? new Date().toISOString() : null,
        }));

      if (toInsert.length > 0) {
        await supabase.from("cohort_participants").insert(toInsert);
      }
    }

    // 1. Fetch cohort_participants
    const { data: participants, error: pErr } = await supabase
      .from("cohort_participants")
      .select("*")
      .eq("cycle_id", cycleId)
      .in("status", ["selected", "enrolled", "active", "completed"])
      .order("enrolled_at", { ascending: false });

    if (pErr) throw pErr;
    if (!participants || participants.length === 0) {
      return NextResponse.json({ members: [] });
    }

    // 2. Extract user_ids
    const userIds = participants.map((p) => p.user_id).filter(Boolean);
    if (userIds.length === 0) return NextResponse.json({ members: participants });

    // 3. Fetch users manually
    const { data: usersData } = await supabase
      .from("new_users")
      .select("id, full_name, email, mobile_number, college, graduation_year")
      .in("id", userIds);

    // 4. Fetch applications manually
    const { data: appsData } = await supabase
      .from("applications")
      .select("user_id, status")
      .eq("cycle_id", cycleId)
      .in("user_id", userIds);

    // 5. Fetch screening_attempts manually
    const { data: screeningData } = await supabase
      .from("screening_attempts")
      .select("user_id, status")
      .in("user_id", userIds);

    // 6. Fetch task_submissions
    const { data: submissionsData } = await supabase
      .from("task_submissions")
      .select("user_id, status")
      .in("user_id", userIds);

    // 7. Fetch certificates
    const { data: certsData } = await supabase
      .from("certificates")
      .select("user_id, id")
      .in("user_id", userIds);

    // 8. Merge data
    const members = participants.map((p) => {
      const user = usersData?.find((u) => u.id === p.user_id) || {
        id: p.user_id,
        full_name: "Deleted User",
        email: "deleted@example.com",
      };
      const app = appsData?.find((a) => a.user_id === p.user_id);
      const attempt = screeningData?.find((a) => a.user_id === p.user_id);
      const userSubs = submissionsData?.filter((s) => s.user_id === p.user_id) || [];
      const hasCert = !!certsData?.find((c) => c.user_id === p.user_id);

      return {
        ...p,
        new_users: user,
        application_status: app?.status || null,
        screening_status: attempt?.status || null,
        submissions_count: userSubs.length,
        approved_submissions_count: userSubs.filter((s) => s.status === "approved").length,
        has_certificate: hasCert,
      };
    });

    return NextResponse.json({ members });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}

// PATCH — update member status (mark_completed, remove)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ cycleId: string }> }) {
  try {
    await requireAdmin();
    const { cycleId } = await params;
    const { participantId, status } = await req.json();

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("cohort_participants")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", participantId)
      .eq("cycle_id", cycleId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ participant: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}
