import { NextResponse } from "next/server";
import { getAuthenticatedClerkUser } from "@/lib/clerkServer";
import { getProfileByClerkUserId } from "@/lib/dashboard";
import {
  buildFallbackGrade,
  type GradeResult,
  gradeWithGemini,
  type SubmissionAnswer,
} from "@/lib/grading";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { UserCohortStatus } from "@/lib/types";

interface GradeRequestBody {
  cohortId?: string;
  examId?: string;
  subject?: string;
  cohortType?: string;
  answers?: SubmissionAnswer[];
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedClerkUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as GradeRequestBody;
    const answers = Array.isArray(body.answers) ? body.answers : [];
    const cohortId =
      typeof body.cohortId === "string" ? body.cohortId.trim() : "";

    if (!cohortId) {
      return NextResponse.json(
        { error: "A cohortId is required for grading." },
        { status: 400 },
      );
    }

    if (answers.length === 0) {
      return NextResponse.json(
        { error: "At least one answer is required for grading." },
        { status: 400 },
      );
    }

    const normalizedAnswers = answers.map((item) => ({
      questionId: Number(item.questionId) || 0,
      question: typeof item.question === "string" ? item.question : "",
      answer: typeof item.answer === "string" ? item.answer : "",
    }));

    const subject =
      typeof body.subject === "string" ? body.subject : "Qualifier";
    const cohortType =
      typeof body.cohortType === "string" ? body.cohortType : "General";

    const supabase = getSupabaseAdminClient();
    const profile = await getProfileByClerkUserId(supabase, authUser.userId);

    if (!profile) {
      return NextResponse.json(
        { error: "Unable to load your profile." },
        { status: 500 },
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("user_cohorts")
      .select("status, qualifier_started_at")
      .eq("user_id", profile.id)
      .eq("cohort_id", cohortId)
      .maybeSingle();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "No qualifying cohort application was found." },
        { status: 409 },
      );
    }

    const currentStatus = membership.status as UserCohortStatus;
    if (currentStatus === "enrolled" || currentStatus === "completed") {
      return NextResponse.json(
        { error: "Qualifier already completed for this cohort." },
        { status: 409 },
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
    let grade: GradeResult;

    if (geminiApiKey) {
      try {
        grade = await gradeWithGemini(geminiApiKey, {
          subject,
          cohortType,
          answers: normalizedAnswers,
        });
      } catch {
        grade = buildFallbackGrade(normalizedAnswers);
      }
    } else {
      grade = buildFallbackGrade(normalizedAnswers);
    }

    const submittedAt = new Date().toISOString();
    const startedAt =
      typeof membership.qualifier_started_at === "string"
        ? membership.qualifier_started_at
        : submittedAt;

    const { error: insertAttemptError } = await supabase
      .from("qualifier_attempts")
      .insert({
        user_id: profile.id,
        cohort_id: cohortId,
        exam_id:
          typeof body.examId === "string" && body.examId.trim().length > 0
            ? body.examId.trim()
            : `QLF-${cohortId}`,
        subject,
        cohort_type: cohortType,
        answers: normalizedAnswers,
        score: grade.score,
        feedback: grade.feedback,
        passed: grade.passed,
        started_at: startedAt,
        submitted_at: submittedAt,
      });

    if (insertAttemptError) {
      return NextResponse.json(
        { error: "Unable to save the qualifier attempt." },
        { status: 500 },
      );
    }

    const { error: updateMembershipError } = await supabase
      .from("user_cohorts")
      .update({
        status: grade.passed ? "enrolled" : "qualifier_failed",
        qualifier_score: grade.score,
        qualifier_feedback: grade.feedback,
        qualifier_submitted_at: submittedAt,
        qualified_at: grade.passed ? submittedAt : null,
        enrolled_at: grade.passed ? submittedAt : null,
      })
      .eq("user_id", profile.id)
      .eq("cohort_id", cohortId);

    if (updateMembershipError) {
      return NextResponse.json(
        { error: "Unable to update your cohort progress." },
        { status: 500 },
      );
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
