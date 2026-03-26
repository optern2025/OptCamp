import { type NextRequest, NextResponse } from "next/server";
import {
  buildDefaultQualifierTemplate,
  normalizeAssessmentQuestions,
} from "@/lib/assessment";
import { getAuthenticatedClerkUser } from "@/lib/clerkServer";
import { getProfileByClerkUserId } from "@/lib/dashboard";
import {
  getQualifierTiming,
  QUALIFIER_DURATION_SECONDS,
} from "@/lib/qualifierTiming";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { AssessmentQuestion, UserCohortStatus } from "@/lib/types";

interface CohortRecord {
  id: string;
  slug: string;
  type: string;
  is_active: boolean;
}

interface QualifierTemplateRow {
  id: string;
  cohort_id: string;
  duration_seconds: number;
  questions: unknown;
  updated_at: string;
}

interface MembershipRecord {
  status: UserCohortStatus;
  applied_at: string;
  qualifier_started_at: string | null;
  qualifier_submitted_at: string | null;
  cohorts: CohortRecord | CohortRecord[] | null;
}

interface ProctorRequestContext {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  profileId: string;
  membership: MembershipRecord;
  cohort: CohortRecord;
}

function resolveQualifierQuestions(
  row: QualifierTemplateRow | null,
  cohort: CohortRecord,
): { durationSeconds: number; questions: AssessmentQuestion[] } {
  if (row) {
    const questions = normalizeAssessmentQuestions(row.questions);

    if (questions.length > 0) {
      return {
        durationSeconds: QUALIFIER_DURATION_SECONDS,
        questions,
      };
    }
  }

  const fallback = buildDefaultQualifierTemplate(
    cohort.id,
    cohort.slug,
    cohort.type,
  );

  return {
    durationSeconds: QUALIFIER_DURATION_SECONDS,
    questions: fallback.questions,
  };
}

function getCohortFromMembership(
  membership: MembershipRecord | null,
): CohortRecord | null {
  const rawCohort = membership?.cohorts;
  return Array.isArray(rawCohort)
    ? (rawCohort[0] ?? null)
    : (rawCohort ?? null);
}

async function resolveContext(
  cohortId: string,
): Promise<ProctorRequestContext | NextResponse> {
  const authUser = await getAuthenticatedClerkUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const profile = await getProfileByClerkUserId(supabase, authUser.userId);

  if (!profile) {
    return NextResponse.json(
      { error: "Unable to load your profile." },
      { status: 500 },
    );
  }

  const { data: activeCohortLink, error: activeCohortError } = await supabase
    .from("user_cohorts")
    .select(
      "status, applied_at, qualifier_started_at, qualifier_submitted_at, cohorts (id, slug, type, is_active)",
    )
    .eq("user_id", profile.id)
    .eq("cohort_id", cohortId)
    .maybeSingle();

  if (activeCohortError) {
    return NextResponse.json(
      { error: "Unable to load your active cohort." },
      { status: 500 },
    );
  }

  const membership = (activeCohortLink as MembershipRecord | null) ?? null;
  const cohort = getCohortFromMembership(membership);

  if (!membership || !cohort) {
    return NextResponse.json(
      { error: "No application exists for this cohort yet." },
      { status: 409 },
    );
  }

  return {
    supabase,
    profileId: profile.id,
    membership,
    cohort,
  };
}

async function finalizeExpiredQualifier(
  context: ProctorRequestContext,
  feedback: string,
) {
  const now = new Date().toISOString();

  await context.supabase
    .from("user_cohorts")
    .update({
      status: "qualifier_failed",
      qualifier_feedback: feedback,
      qualifier_submitted_at: now,
    })
    .eq("user_id", context.profileId)
    .eq("cohort_id", context.cohort.id)
    .is("qualifier_submitted_at", null);
}

async function buildExamPayload(
  context: ProctorRequestContext,
  startedAt: string | null,
) {
  const { data: qualifierTemplateRow, error: qualifierTemplateError } =
    await context.supabase
      .from("cohort_qualifier_templates")
      .select("id, cohort_id, duration_seconds, questions, updated_at")
      .eq("cohort_id", context.cohort.id)
      .maybeSingle();

  if (qualifierTemplateError) {
    return NextResponse.json(
      { error: "Unable to load the qualifier template." },
      { status: 500 },
    );
  }

  const qualifier = resolveQualifierQuestions(
    (qualifierTemplateRow as QualifierTemplateRow | null) ?? null,
    context.cohort,
  );

  const timing = getQualifierTiming({
    appliedAt: context.membership.applied_at,
    startedAt,
    submittedAt: context.membership.qualifier_submitted_at,
  });

  return NextResponse.json({
    cohortId: context.cohort.id,
    examId: `QLF-${context.cohort.slug.toUpperCase()}`,
    subject: `${context.cohort.type} Qualifier`,
    cohortType: context.cohort.type,
    durationSeconds: qualifier.durationSeconds,
    questions: qualifier.questions,
    cohortActive: context.cohort.is_active,
    startedAt,
    remainingSeconds: timing.canResume
      ? timing.remainingAttemptSeconds
      : qualifier.durationSeconds,
    availabilityEndsAt: timing.availabilityEndsAt,
    attemptEndsAt: timing.attemptEndsAt,
    hasStarted: timing.hasStarted,
  });
}

export async function GET(request: NextRequest) {
  try {
    const cohortId = request.nextUrl.searchParams.get("cohortId")?.trim();

    if (!cohortId) {
      return NextResponse.json(
        { error: "A cohortId query parameter is required." },
        { status: 400 },
      );
    }

    const context = await resolveContext(cohortId);
    if (context instanceof NextResponse) {
      return context;
    }

    const currentStatus = context.membership.status;
    if (currentStatus === "enrolled" || currentStatus === "completed") {
      return NextResponse.json(
        { error: "Qualifier already completed for this cohort." },
        { status: 409 },
      );
    }

    if (context.membership.qualifier_submitted_at) {
      return NextResponse.json(
        { error: "Qualifier attempt already submitted for this cohort." },
        { status: 409 },
      );
    }

    const timing = getQualifierTiming({
      appliedAt: context.membership.applied_at,
      startedAt: context.membership.qualifier_started_at,
      submittedAt: context.membership.qualifier_submitted_at,
    });

    if (timing.attemptExpired) {
      await finalizeExpiredQualifier(
        context,
        "Your qualifier attempt expired after the 3-hour time limit.",
      );
      return NextResponse.json(
        { error: "Your 3-hour qualifier window has ended." },
        { status: 409 },
      );
    }

    if (timing.availabilityExpired) {
      await finalizeExpiredQualifier(
        context,
        "Your qualifier access expired 48 hours after signup.",
      );
      return NextResponse.json(
        {
          error:
            "Your qualifier was only available for 48 hours after signup, and that window has ended.",
        },
        { status: 409 },
      );
    }

    return buildExamPayload(context, context.membership.qualifier_started_at);
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
    const body = (await request.json()) as { cohortId?: string };
    const cohortId =
      typeof body.cohortId === "string" ? body.cohortId.trim() : "";

    if (!cohortId) {
      return NextResponse.json(
        { error: "A cohortId is required to start the qualifier." },
        { status: 400 },
      );
    }

    const context = await resolveContext(cohortId);
    if (context instanceof NextResponse) {
      return context;
    }

    const currentStatus = context.membership.status;
    if (currentStatus === "enrolled" || currentStatus === "completed") {
      return NextResponse.json(
        { error: "Qualifier already completed for this cohort." },
        { status: 409 },
      );
    }

    if (context.membership.qualifier_submitted_at) {
      return NextResponse.json(
        { error: "Qualifier attempt already submitted for this cohort." },
        { status: 409 },
      );
    }

    const timing = getQualifierTiming({
      appliedAt: context.membership.applied_at,
      startedAt: context.membership.qualifier_started_at,
      submittedAt: context.membership.qualifier_submitted_at,
    });

    if (timing.attemptExpired) {
      await finalizeExpiredQualifier(
        context,
        "Your qualifier attempt expired after the 3-hour time limit.",
      );
      return NextResponse.json(
        { error: "Your 3-hour qualifier window has ended." },
        { status: 409 },
      );
    }

    if (timing.availabilityExpired) {
      await finalizeExpiredQualifier(
        context,
        "Your qualifier access expired 48 hours after signup.",
      );
      return NextResponse.json(
        {
          error:
            "Your qualifier was only available for 48 hours after signup, and that window has ended.",
        },
        { status: 409 },
      );
    }

    const startedAt =
      context.membership.qualifier_started_at ?? new Date().toISOString();

    if (!context.membership.qualifier_started_at) {
      const { error: updateError } = await context.supabase
        .from("user_cohorts")
        .update({
          status: "qualifier_in_progress",
          qualifier_started_at: startedAt,
        })
        .eq("user_id", context.profileId)
        .eq("cohort_id", context.cohort.id)
        .is("qualifier_started_at", null)
        .is("qualifier_submitted_at", null);

      if (updateError) {
        return NextResponse.json(
          { error: "Unable to initialize the qualifier attempt." },
          { status: 500 },
        );
      }
    }

    return buildExamPayload(context, startedAt);
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
