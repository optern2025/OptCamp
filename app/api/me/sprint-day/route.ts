import { type NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClerkUser } from "@/lib/clerkServer";
import { getProfileByClerkUserId, loadDashboardData } from "@/lib/dashboard";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface SprintDaySubmissionBody {
  cohortId?: string;
  sprintDayId?: string;
  githubUrl?: string;
}

function resolveSprintDay(
  payload: Awaited<ReturnType<typeof loadDashboardData>>,
  cohortId: string,
  sprintDayId: string,
) {
  const membership = payload.memberships.find(
    (item) => item.cohort.id === cohortId,
  );

  if (!membership) {
    return { membership: null, sprintDay: null };
  }

  const sprintDay =
    membership.sprint_days.find((item) => item.id === sprintDayId) ?? null;
  const lastDayNumber = membership.sprint_days.reduce(
    (max, item) => Math.max(max, item.day_number),
    0,
  );

  return {
    membership,
    sprintDay,
    isFinalSprintDay:
      sprintDay !== null && sprintDay.day_number === lastDayNumber,
  };
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedClerkUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const cohortId = request.nextUrl.searchParams.get("cohortId")?.trim();
    const sprintDayId = request.nextUrl.searchParams.get("sprintDayId")?.trim();

    if (!cohortId || !sprintDayId) {
      return NextResponse.json(
        { error: "cohortId and sprintDayId are required." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const payload = await loadDashboardData(supabase, authUser);
    const { membership, sprintDay, isFinalSprintDay } = resolveSprintDay(
      payload,
      cohortId,
      sprintDayId,
    );

    if (!membership || !sprintDay) {
      return NextResponse.json(
        { error: "Requested sprint day was not found." },
        { status: 404 },
      );
    }

    if (sprintDay.status === "locked") {
      return NextResponse.json(
        {
          error: sprintDay.access_message ?? "This sprint day is still locked.",
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      cohort: membership.cohort,
      membershipStatus: membership.status,
      sprintDay,
      isFinalSprintDay,
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

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedClerkUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as SprintDaySubmissionBody;
    const cohortId =
      typeof body.cohortId === "string" ? body.cohortId.trim() : "";
    const sprintDayId =
      typeof body.sprintDayId === "string" ? body.sprintDayId.trim() : "";
    const githubUrl =
      typeof body.githubUrl === "string" ? body.githubUrl.trim() : "";

    if (!cohortId || !sprintDayId) {
      return NextResponse.json(
        { error: "cohortId and sprintDayId are required." },
        { status: 400 },
      );
    }

    if (!githubUrl) {
      return NextResponse.json(
        { error: "A GitHub project link is required." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const payload = await loadDashboardData(supabase, authUser);
    const { membership, sprintDay } = resolveSprintDay(
      payload,
      cohortId,
      sprintDayId,
    );

    if (!membership || !sprintDay) {
      return NextResponse.json(
        { error: "Requested sprint day was not found." },
        { status: 404 },
      );
    }

    if (sprintDay.status === "locked") {
      return NextResponse.json(
        {
          error: sprintDay.access_message ?? "This sprint day is still locked.",
        },
        { status: 403 },
      );
    }

    if (sprintDay.submission) {
      return NextResponse.json(
        { error: "This sprint day has already been submitted." },
        { status: 409 },
      );
    }

    const profile = await getProfileByClerkUserId(supabase, authUser.userId);

    if (!profile) {
      return NextResponse.json(
        { error: "Unable to resolve your profile." },
        { status: 500 },
      );
    }

    const submittedAt = new Date().toISOString();
    const { error: submissionError } = await supabase
      .from("sprint_day_submissions")
      .insert({
        user_id: profile.id,
        cohort_id: cohortId,
        sprint_day_id: sprintDayId,
        github_url: githubUrl,
        submitted_at: submittedAt,
      });

    if (submissionError) {
      return NextResponse.json(
        { error: "Unable to save your sprint submission." },
        { status: 500 },
      );
    }

    const lastDayNumber = membership.sprint_days.reduce(
      (max, item) => Math.max(max, item.day_number),
      0,
    );

    if (sprintDay.day_number === lastDayNumber) {
      const { error: completionError } = await supabase
        .from("user_cohorts")
        .update({
          status: "completed",
          completed_at: submittedAt,
        })
        .eq("user_id", profile.id)
        .eq("cohort_id", cohortId)
        .neq("status", "completed");

      if (completionError) {
        return NextResponse.json(
          { error: "Unable to mark the sprint as completed." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      status: "submitted",
      submittedAt,
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
