import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const supabase = getSupabaseAdminClient();

    const { data: cycle, error } = await supabase
      .from("cycles")
      .select("*, domains(name)")
      .eq("id", id)
      .single();

    if (error || !cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    return NextResponse.json({ cycle });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const supabase = getSupabaseAdminClient();
    const body = await req.json();

    const allowedFields = [
      "title", "slug", "domain_id", "cohort_type", "status", "seats",
      "description", "requirements", "outcomes",
      "application_start_at", "application_end_at",
      "screening_start_at", "screening_end_at",
      "cohort_start_at", "cohort_end_at",
    ];

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field];
    }

    // Sanitize UUID fields: never let empty string reach PostgreSQL
    if ("domain_id" in updates && !updates.domain_id) {
      updates.domain_id = null;
    }

    // Validation intra-phase only
    const tApplicationStart = updates.application_start_at ? new Date(updates.application_start_at).getTime() : 0;
    const tApplicationEnd = updates.application_end_at ? new Date(updates.application_end_at).getTime() : 0;
    const tScreeningStart = updates.screening_start_at ? new Date(updates.screening_start_at).getTime() : 0;
    const tScreeningEnd = updates.screening_end_at ? new Date(updates.screening_end_at).getTime() : 0;
    const tCohortStart = updates.cohort_start_at ? new Date(updates.cohort_start_at).getTime() : 0;
    const tCohortEnd = updates.cohort_end_at ? new Date(updates.cohort_end_at).getTime() : 0;

    if (tApplicationStart && tApplicationEnd && tApplicationStart >= tApplicationEnd) {
      return NextResponse.json({ error: "Application end time must be after application start time." }, { status: 400 });
    }
    if (tScreeningStart && tScreeningEnd && tScreeningStart >= tScreeningEnd) {
      return NextResponse.json({ error: "Screening end time must be after screening start time." }, { status: 400 });
    }
    if (tCohortStart && tCohortEnd && tCohortStart >= tCohortEnd) {
      return NextResponse.json({ error: "Cohort end time must be after cohort start time." }, { status: 400 });
    }

    console.log("[DEBUG: Cycle Date Update]");
    console.log("Input Body:", JSON.stringify(body, null, 2));
    console.log("Converted UTC Updates:", JSON.stringify({
      application_start_at: updates.application_start_at,
      application_end_at: updates.application_end_at,
      screening_start_at: updates.screening_start_at,
      screening_end_at: updates.screening_end_at,
      cohort_start_at: updates.cohort_start_at,
      cohort_end_at: updates.cohort_end_at
    }, null, 2));

    const { data: cycle, error } = await supabase
      .from("cycles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Cache invalidation
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/");
    revalidatePath("/cohorts");
    revalidatePath("/cohorts/[slug]", "page");
    revalidatePath("/dashboard", "layout");

    return NextResponse.json({ cycle });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const supabase = getSupabaseAdminClient();

    const { error } = await supabase.from("cycles").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}
