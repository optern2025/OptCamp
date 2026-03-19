import { type NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClerkUser } from "@/lib/clerkServer";
import { loadDashboardData } from "@/lib/dashboard";
import {
  buildFallbackGrade,
  type GradeResult,
  gradeWithGemini,
  type SubmissionAnswer,
} from "@/lib/grading";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface StageSubmissionBody {
  cohortId?: string;
  stageId?: string;
  answers?: SubmissionAnswer[];
}

function resolveStage(
  payload: Awaited<ReturnType<typeof loadDashboardData>>,
  cohortId: string,
  stageId: string,
) {
  const membership = payload.memberships.find(
    (item) => item.cohort.id === cohortId,
  );

  if (!membership) {
    return { membership: null, stage: null };
  }

  const stage = membership.stages.find((item) => item.id === stageId) ?? null;
  return { membership, stage };
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedClerkUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const cohortId = request.nextUrl.searchParams.get("cohortId")?.trim();
    const stageId = request.nextUrl.searchParams.get("stageId")?.trim();

    if (!cohortId || !stageId) {
      return NextResponse.json(
        { error: "cohortId and stageId are required." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const payload = await loadDashboardData(supabase, authUser);
    const { membership, stage } = resolveStage(payload, cohortId, stageId);

    if (!membership || !stage) {
      return NextResponse.json(
        { error: "Requested stage was not found." },
        { status: 404 },
      );
    }

    if (stage.status === "locked") {
      return NextResponse.json(
        { error: "This stage is still locked." },
        { status: 403 },
      );
    }

    return NextResponse.json({
      cohort: membership.cohort,
      membershipStatus: membership.status,
      stage,
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

    const body = (await request.json()) as StageSubmissionBody;
    const cohortId =
      typeof body.cohortId === "string" ? body.cohortId.trim() : "";
    const stageId = typeof body.stageId === "string" ? body.stageId.trim() : "";
    const answers = Array.isArray(body.answers) ? body.answers : [];

    if (!cohortId || !stageId) {
      return NextResponse.json(
        { error: "cohortId and stageId are required." },
        { status: 400 },
      );
    }

    if (answers.length === 0) {
      return NextResponse.json(
        { error: "At least one answer is required." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const payload = await loadDashboardData(supabase, authUser);
    const { membership, stage } = resolveStage(payload, cohortId, stageId);

    if (!membership || !stage) {
      return NextResponse.json(
        { error: "Requested stage was not found." },
        { status: 404 },
      );
    }

    if (stage.status === "locked") {
      return NextResponse.json(
        { error: "This stage is still locked." },
        { status: 403 },
      );
    }

    const normalizedAnswers = answers.map((answer) => ({
      questionId:
        typeof answer.questionId === "string" ||
        typeof answer.questionId === "number"
          ? answer.questionId
          : 0,
      question: typeof answer.question === "string" ? answer.question : "",
      answer: typeof answer.answer === "string" ? answer.answer : "",
      questionType:
        typeof answer.questionType === "string"
          ? answer.questionType
          : undefined,
      guidance:
        typeof answer.guidance === "string" ? answer.guidance : undefined,
      rubric: typeof answer.rubric === "string" ? answer.rubric : undefined,
      correctOptionIds: Array.isArray(answer.correctOptionIds)
        ? answer.correctOptionIds.filter(
            (value): value is string => typeof value === "string",
          )
        : undefined,
    }));

    const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
    let grade: GradeResult;

    if (geminiApiKey) {
      try {
        grade = await gradeWithGemini(geminiApiKey, {
          subject: `${membership.cohort.type} - ${stage.title}`,
          cohortType: membership.cohort.type,
          answers: normalizedAnswers,
        });
      } catch {
        grade = buildFallbackGrade(normalizedAnswers);
      }
    } else {
      grade = buildFallbackGrade(normalizedAnswers);
    }

    const submittedAt = new Date().toISOString();

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", authUser.userId)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Unable to resolve your profile." },
        { status: 500 },
      );
    }

    const { error: attemptError } = await supabase
      .from("user_cohort_stage_attempts")
      .upsert(
        {
          user_id: profile.id,
          cohort_id: cohortId,
          stage_id: stageId,
          answers: normalizedAnswers,
          score: grade.score,
          feedback: grade.feedback,
          passed: grade.passed,
          submitted_at: submittedAt,
        },
        { onConflict: "user_id,stage_id" },
      );

    if (attemptError) {
      return NextResponse.json(
        { error: "Unable to save your stage submission." },
        { status: 500 },
      );
    }

    const stageNumbers = membership.stages.map((item) => item.stage_number);
    const finalStageNumber =
      stageNumbers.length > 0 ? Math.max(...stageNumbers) : null;

    if (
      grade.passed &&
      finalStageNumber !== null &&
      stage.stage_number === finalStageNumber
    ) {
      const { error: completeError } = await supabase
        .from("user_cohorts")
        .update({
          status: "completed",
          completed_at: submittedAt,
        })
        .eq("user_id", profile.id)
        .eq("cohort_id", cohortId);

      if (completeError) {
        return NextResponse.json(
          { error: "Unable to mark the cohort as completed." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(grade);
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
