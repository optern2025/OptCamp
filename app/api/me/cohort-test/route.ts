import { NextResponse } from "next/server";
import { getAuthenticatedClerkUser } from "@/lib/clerkServer";
import { loadDashboardData } from "@/lib/dashboard";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const authUser = await getAuthenticatedClerkUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await loadDashboardData(getSupabaseAdminClient(), authUser);

    return NextResponse.json({
      user: payload.user,
      pursuingCohorts: payload.memberships.map(
        (membership) => membership.cohort,
      ),
      cohorts: payload.cohorts,
      memberships: payload.memberships,
      summary: payload.summary,
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
