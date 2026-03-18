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

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select(
        "id, email, name, university, stack, github, availability, intent, created_at, updated_at",
      )
      .eq("clerk_user_id", authUser.userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Unable to load your profile." },
        { status: 500 },
      );
    }

    const [
      { data: cohorts, error: cohortsError },
      { data: userCohorts, error: userCohortsError },
    ] = await Promise.all([
      supabase
        .from("cohorts")
        .select(
          "id, slug, type, apply_window, sprint_window, apply_by, qualifier_test_url, is_active, created_at",
        )
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("user_cohorts")
        .select(
          "status, applied_at, cohorts (id, slug, type, apply_window, sprint_window, apply_by, qualifier_test_url, is_active, created_at)",
        )
        .eq("user_id", profile.id)
        .eq("status", "active")
        .order("applied_at", { ascending: false }),
    ]);

    if (cohortsError || userCohortsError) {
      return NextResponse.json(
        { error: "Unable to load cohorts." },
        { status: 500 },
      );
    }

    const pursuingCohorts = (userCohorts ?? [])
      .map((entry) => entry.cohorts)
      .filter((cohort): cohort is NonNullable<typeof cohort> => Boolean(cohort));

    return NextResponse.json({
      user: {
        ...profile,
        email: authUser.email,
      },
      pursuingCohorts,
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
