import { type NextRequest, NextResponse } from "next/server";
import {
  buildDefaultQualifierTemplate,
  normalizeAssessmentQuestions,
} from "@/lib/assessment";
import { getAuthenticatedClerkUser } from "@/lib/clerkServer";
import { getProfileByClerkUserId } from "@/lib/dashboard";
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

function resolveQualifierQuestions(
  row: QualifierTemplateRow | null,
  cohort: CohortRecord,
): { durationSeconds: number; questions: AssessmentQuestion[] } {
  if (row) {
    const questions = normalizeAssessmentQuestions(row.questions);

    if (questions.length > 0) {
      return {
        durationSeconds: Math.max(300, row.duration_seconds),
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
    durationSeconds: fallback.duration_seconds,
    questions: fallback.questions,
  };
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedClerkUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();
    const cohortId = request.nextUrl.searchParams.get("cohortId")?.trim();

    if (!cohortId) {
      return NextResponse.json(
        { error: "A cohortId query parameter is required." },
        { status: 400 },
      );
    }

    const profile = await getProfileByClerkUserId(supabase, authUser.userId);

    if (!profile) {
      return NextResponse.json(
        { error: "Unable to load your profile." },
        { status: 500 },
      );
    }

    const { data: activeCohortLink, error: activeCohortError } = await supabase
      .from("user_cohorts")
      .select("status, cohorts (id, slug, type, is_active)")
      .eq("user_id", profile.id)
      .eq("cohort_id", cohortId)
      .maybeSingle();

    if (activeCohortError) {
      return NextResponse.json(
        { error: "Unable to load your active cohort." },
        { status: 500 },
      );
    }

    const rawCohort = activeCohortLink?.cohorts as
      | CohortRecord
      | CohortRecord[]
      | null
      | undefined;
    const cohort = Array.isArray(rawCohort)
      ? (rawCohort[0] ?? null)
      : (rawCohort ?? null);
    const status =
      (activeCohortLink?.status as UserCohortStatus | null) ?? null;

    if (!cohort) {
      return NextResponse.json(
        { error: "No application exists for this cohort yet." },
        { status: 409 },
      );
    }

    if (status === "enrolled" || status === "completed") {
      return NextResponse.json(
        { error: "Qualifier already passed for this cohort." },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("user_cohorts")
      .update({
        status: "qualifier_in_progress",
        qualifier_started_at: now,
      })
      .eq("user_id", profile.id)
      .eq("cohort_id", cohortId);

    if (updateError) {
      return NextResponse.json(
        { error: "Unable to initialize the qualifier attempt." },
        { status: 500 },
      );
    }

    const { data: qualifierTemplateRow, error: qualifierTemplateError } =
      await supabase
        .from("cohort_qualifier_templates")
        .select("id, cohort_id, duration_seconds, questions, updated_at")
        .eq("cohort_id", cohort.id)
        .maybeSingle();

    if (qualifierTemplateError) {
      return NextResponse.json(
        { error: "Unable to load the qualifier template." },
        { status: 500 },
      );
    }

    const qualifier = resolveQualifierQuestions(
      (qualifierTemplateRow as QualifierTemplateRow | null) ?? null,
      cohort,
    );

    return NextResponse.json({
      cohortId: cohort.id,
      examId: `QLF-${cohort.slug.toUpperCase()}`,
      subject: `${cohort.type} Qualifier`,
      cohortType: cohort.type,
      durationSeconds: qualifier.durationSeconds,
      questions: qualifier.questions,
      cohortActive: cohort.is_active,
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
