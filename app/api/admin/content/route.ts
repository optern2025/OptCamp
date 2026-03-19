import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import {
  buildDefaultQualifierTemplate,
  normalizeAssessmentQuestions,
} from "@/lib/assessment";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type {
  AdminContentPayload,
  AssessmentQuestion,
  Cohort,
  CohortStage,
  QualifierTemplate,
} from "@/lib/types";

interface QualifierTemplateRow {
  id: string;
  cohort_id: string;
  duration_seconds: number;
  questions: unknown;
  updated_at: string;
}

interface StageRow {
  id: string;
  cohort_id: string;
  stage_number: number;
  title: string;
  description: string;
  duration_minutes: number;
  questions: unknown;
  created_at: string;
}

interface SaveContentBody {
  cohortId?: string;
  qualifier?: {
    id?: string;
    duration_seconds?: number;
    questions?: AssessmentQuestion[];
  };
  stages?: Array<{
    id?: string;
    title?: string;
    description?: string;
    duration_minutes?: number;
    questions?: AssessmentQuestion[];
  }>;
}

function sanitizeQuestions(raw: unknown): AssessmentQuestion[] {
  return normalizeAssessmentQuestions(raw);
}

function buildStage(row: StageRow): CohortStage {
  return {
    id: row.id,
    cohort_id: row.cohort_id,
    stage_number: row.stage_number,
    title: row.title,
    description: row.description,
    duration_minutes: row.duration_minutes,
    questions: sanitizeQuestions(row.questions),
    created_at: row.created_at,
  };
}

function buildQualifier(
  row: QualifierTemplateRow | null,
  cohort: Cohort,
): QualifierTemplate {
  if (!row) {
    return buildDefaultQualifierTemplate(cohort.id, cohort.slug, cohort.type);
  }

  return {
    id: row.id,
    cohort_id: row.cohort_id,
    duration_seconds: row.duration_seconds,
    questions: sanitizeQuestions(row.questions),
    updated_at: row.updated_at,
  };
}

async function loadAdminContent(): Promise<AdminContentPayload> {
  const supabase = getSupabaseAdminClient();
  const [
    { data: cohortsData, error: cohortsError },
    { data: qualifierRows, error: qualifierError },
    { data: stageRows, error: stageError },
  ] = await Promise.all([
    supabase
      .from("cohorts")
      .select(
        "id, slug, type, apply_window, sprint_window, apply_by, qualifier_test_url, is_active, created_at",
      )
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("cohort_qualifier_templates")
      .select("id, cohort_id, duration_seconds, questions, updated_at"),
    supabase
      .from("cohort_stages")
      .select(
        "id, cohort_id, stage_number, title, description, duration_minutes, questions, created_at",
      )
      .order("cohort_id", { ascending: true })
      .order("stage_number", { ascending: true }),
  ]);

  if (cohortsError || qualifierError || stageError) {
    throw new Error("Unable to load admin content.");
  }

  const cohorts = (cohortsData ?? []) as Cohort[];
  const qualifierByCohort = new Map<string, QualifierTemplateRow>();
  for (const row of (qualifierRows ?? []) as QualifierTemplateRow[]) {
    qualifierByCohort.set(row.cohort_id, row);
  }

  const stagesByCohort = new Map<string, CohortStage[]>();
  for (const row of (stageRows ?? []) as StageRow[]) {
    const current = stagesByCohort.get(row.cohort_id) ?? [];
    current.push(buildStage(row));
    stagesByCohort.set(row.cohort_id, current);
  }

  const contentByCohort = Object.fromEntries(
    cohorts.map((cohort) => [
      cohort.id,
      {
        qualifier: buildQualifier(
          qualifierByCohort.get(cohort.id) ?? null,
          cohort,
        ),
        stages: stagesByCohort.get(cohort.id) ?? [],
      },
    ]),
  );

  return {
    cohorts,
    contentByCohort,
  };
}

export async function GET() {
  try {
    await requireAdminUser();
    const payload = await loadAdminContent();
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized." ? 401 : 403 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdminUser();

    const body = (await request.json()) as SaveContentBody;
    const cohortId =
      typeof body.cohortId === "string" ? body.cohortId.trim() : "";

    if (!cohortId) {
      return NextResponse.json(
        { error: "A cohortId is required." },
        { status: 400 },
      );
    }

    const qualifierQuestions = sanitizeQuestions(body.qualifier?.questions);
    const stages = Array.isArray(body.stages) ? body.stages : [];
    const supabase = getSupabaseAdminClient();

    const { data: existingStageRows, error: existingStageError } =
      await supabase
        .from("cohort_stages")
        .select("id")
        .eq("cohort_id", cohortId);

    if (existingStageError) {
      return NextResponse.json(
        { error: "Unable to inspect existing cohort stages." },
        { status: 500 },
      );
    }

    const qualifierPayload = {
      cohort_id: cohortId,
      duration_seconds: Math.max(
        300,
        Number(body.qualifier?.duration_seconds) || 15 * 60,
      ),
      questions: qualifierQuestions,
    };

    const { error: qualifierError } = await supabase
      .from("cohort_qualifier_templates")
      .upsert(
        body.qualifier?.id
          ? {
              id: body.qualifier.id,
              ...qualifierPayload,
            }
          : qualifierPayload,
        { onConflict: "cohort_id" },
      );

    if (qualifierError) {
      return NextResponse.json(
        { error: "Unable to save qualifier content." },
        { status: 500 },
      );
    }

    const nextStageIds = stages
      .map((stage) => (typeof stage.id === "string" ? stage.id.trim() : ""))
      .filter((id) => id.length > 0);
    const existingStageIds = (
      (existingStageRows ?? []) as Array<{ id: string }>
    ).map((row) => row.id);
    const stageIdsToDelete = existingStageIds.filter(
      (id) => !nextStageIds.includes(id),
    );

    if (stageIdsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("cohort_stages")
        .delete()
        .in("id", stageIdsToDelete);

      if (deleteError) {
        return NextResponse.json(
          { error: "Unable to remove deleted stages." },
          { status: 500 },
        );
      }
    }

    for (const [index, stage] of stages.entries()) {
      const payload = {
        cohort_id: cohortId,
        stage_number: index + 1,
        title:
          typeof stage.title === "string" && stage.title.trim().length > 0
            ? stage.title.trim()
            : `Stage ${index + 1}`,
        description:
          typeof stage.description === "string" ? stage.description.trim() : "",
        duration_minutes: Math.max(5, Number(stage.duration_minutes) || 45),
        questions: sanitizeQuestions(stage.questions),
      };

      const { error: stageSaveError } = await supabase
        .from("cohort_stages")
        .upsert(
          stage.id
            ? {
                id: stage.id,
                ...payload,
              }
            : payload,
          { onConflict: "id" },
        );

      if (stageSaveError) {
        return NextResponse.json(
          { error: `Unable to save stage ${index + 1}.` },
          { status: 500 },
        );
      }
    }

    const payload = await loadAdminContent();
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized." ? 401 : 403 },
    );
  }
}
