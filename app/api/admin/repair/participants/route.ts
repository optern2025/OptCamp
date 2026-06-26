import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

/**
 * POST /api/admin/repair/participants
 * 
 * One-time (and safe-to-run-repeatedly) repair utility.
 * Scans all applications with status "selected" or "enrolled"
 * and ensures a corresponding cohort_participants row exists.
 * 
 * This repairs data created before the lifecycle sync was stable.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdminUser();
    const supabase = getSupabaseAdminClient();

    // 1. Fetch all selected/enrolled applications
    const { data: apps, error: appsErr } = await supabase
      .from("applications")
      .select("id, user_id, cycle_id, status")
      .in("status", ["selected", "enrolled"]);

    if (appsErr) throw appsErr;
    if (!apps || apps.length === 0) {
      return NextResponse.json({ message: "No applications to repair", repaired: 0, skipped: 0 });
    }

    // 2. Fetch all existing cohort_participants
    const { data: existingParts } = await supabase
      .from("cohort_participants")
      .select("user_id, cycle_id");

    // Build a Set for fast lookup
    const existingSet = new Set(
      (existingParts || []).map((p) => `${p.user_id}:${p.cycle_id}`)
    );

    // 3. Find missing
    const toInsert = apps
      .filter((app) => !existingSet.has(`${app.user_id}:${app.cycle_id}`))
      .map((app) => ({
        user_id: app.user_id,
        cycle_id: app.cycle_id,
        application_id: app.id,
        status: app.status,
        enrolled_at: app.status === "enrolled" ? new Date().toISOString() : null,
      }));

    const skipped = apps.length - toInsert.length;

    if (toInsert.length === 0) {
      return NextResponse.json({ message: "All participants already exist. No repair needed.", repaired: 0, skipped });
    }

    // 4. Insert missing participants
    const { error: insertErr } = await supabase
      .from("cohort_participants")
      .insert(toInsert);

    if (insertErr) throw insertErr;

    return NextResponse.json({
      message: `Repair complete. Created ${toInsert.length} missing participant records.`,
      repaired: toInsert.length,
      skipped,
      details: toInsert,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === "Unauthorized." ? 401 : 500 });
  }
}
