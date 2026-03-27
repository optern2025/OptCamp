import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface UpdateSprintSubmissionBody {
  submissionId?: string;
  score?: number | null;
  evaluatorNotes?: string | null;
}

export async function PUT(request: Request) {
  try {
    await requireAdminUser();

    const body = (await request.json()) as UpdateSprintSubmissionBody;
    const submissionId =
      typeof body.submissionId === "string" ? body.submissionId.trim() : "";

    if (!submissionId) {
      return NextResponse.json(
        { error: "A submissionId is required." },
        { status: 400 },
      );
    }

    const scoreValue =
      typeof body.score === "number" && Number.isFinite(body.score)
        ? Math.max(0, Math.min(100, Math.round(body.score)))
        : null;

    const { error } = await getSupabaseAdminClient()
      .from("sprint_day_submissions")
      .update({
        score: scoreValue,
        evaluator_notes:
          typeof body.evaluatorNotes === "string"
            ? body.evaluatorNotes.trim()
            : null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    if (error) {
      return NextResponse.json(
        { error: "Unable to update sprint submission review." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized." ? 401 : 403 },
    );
  }
}
