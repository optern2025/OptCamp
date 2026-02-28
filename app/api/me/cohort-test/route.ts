import { NextResponse } from "next/server";
import { getAuthenticatedClerkUser } from "@/lib/clerkServer";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const authUser = await getAuthenticatedClerkUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();

    const [
      { data: profile, error: profileError },
      { data: cohorts, error: cohortsError },
    ] = await Promise.all([
      supabase
        .from("users")
        .select(
          "id, email, name, university, stack, github, availability, intent, email_verified, cohort_id, qualifier_email_sent_at, qualifier_email_message_id, created_at, updated_at",
        )
        .eq("clerk_user_id", authUser.userId)
        .single(),
      supabase
        .from("cohorts")
        .select(
          "id, slug, type, apply_window, sprint_window, apply_by, qualifier_test_url, is_active, created_at",
        )
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: true }),
    ]);

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Unable to load your profile." },
        { status: 500 },
      );
    }

    if (cohortsError) {
      return NextResponse.json(
        { error: "Unable to load cohorts." },
        { status: 500 },
      );
    }

    const assignedCohort =
      (cohorts ?? []).find((cohort) => cohort.id === profile.cohort_id) ?? null;

    return NextResponse.json({
      user: {
        ...profile,
        email: authUser.email,
        email_verified: authUser.isEmailVerified,
      },
      assignedCohort,
      cohorts: cohorts ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected server error.",
      },
      { status: 500 },
    );
  }
}
