import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import {
  buildDefaultQualifierTemplate,
  normalizeAssessmentQuestions,
} from "@/lib/assessment";
import { buildDefaultSprintDays } from "@/lib/sprintDays";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type {
  AdminContentPayload,
  AssessmentQuestion,
  Cohort,
  QualifierTemplate,
  SprintDayTask,
} from "@/lib/types";

interface QualifierTemplateRow {
  id: string;
  cohort_id: string;
  duration_seconds: number;
  questions: unknown;
  updated_at: string;
}

interface SprintDayTaskRow {
  id: string;
  cohort_id: string;
  day_number: number;
  title: string;
  description: string;
  brief: string;
  created_at: string;
  updated_at: string;
}

interface SaveContentBody {
  cohortId?: string;
  qualifier?: {
    id?: string;
    duration_seconds?: number;
    questions?: AssessmentQuestion[];
  };
  sprintDays?: Array<{
    id?: string;
    day_number?: number;
    title?: string;
    description?: string;
    brief?: string;
  }>;
}

function sanitizeQuestions(raw: unknown): AssessmentQuestion[] {
  return normalizeAssessmentQuestions(raw);
}

function buildSprintDay(row: SprintDayTaskRow): SprintDayTask {
  return {
    id: row.id,
    cohort_id: row.cohort_id,
    day_number: row.day_number,
    title: row.title,
    description: row.description,
    brief: row.brief,
    created_at: row.created_at,
    updated_at: row.updated_at,
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
    { data: sprintDayRows, error: sprintDayError },
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
      .from("sprint_day_tasks")
      .select(
        "id, cohort_id, day_number, title, description, brief, created_at, updated_at",
      )
      .order("cohort_id", { ascending: true })
      .order("day_number", { ascending: true }),
  ]);

  if (cohortsError || qualifierError || sprintDayError) {
    throw new Error("Unable to load admin content.");
  }

  const cohorts = (cohortsData ?? []) as Cohort[];
  const qualifierByCohort = new Map<string, QualifierTemplateRow>();
  for (const row of (qualifierRows ?? []) as QualifierTemplateRow[]) {
    qualifierByCohort.set(row.cohort_id, row);
  }

  const sprintDaysByCohort = new Map<string, SprintDayTask[]>();
  for (const row of (sprintDayRows ?? []) as SprintDayTaskRow[]) {
    const current = sprintDaysByCohort.get(row.cohort_id) ?? [];
    current.push(buildSprintDay(row));
    sprintDaysByCohort.set(row.cohort_id, current);
  }

  const contentByCohort = Object.fromEntries(
    cohorts.map((cohort) => [
      cohort.id,
      {
        qualifier: buildQualifier(
          qualifierByCohort.get(cohort.id) ?? null,
          cohort,
        ),
        sprintDays:
          sprintDaysByCohort.get(cohort.id) ??
          buildDefaultSprintDays(cohort.id),
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
    const sprintDays = Array.isArray(body.sprintDays) ? body.sprintDays : [];
    const supabase = getSupabaseAdminClient();

    const { data: existingSprintDayRows, error: existingSprintDayError } =
      await supabase
        .from("sprint_day_tasks")
        .select("id")
        .eq("cohort_id", cohortId);

    if (existingSprintDayError) {
      return NextResponse.json(
        { error: "Unable to inspect existing sprint day tasks." },
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

    const nextSprintDayIds = sprintDays
      .map((sprintDay) =>
        typeof sprintDay.id === "string" ? sprintDay.id.trim() : "",
      )
      .filter((id) => id.length > 0);
    const existingSprintDayIds = (
      (existingSprintDayRows ?? []) as Array<{ id: string }>
    ).map((row) => row.id);
    const sprintDayIdsToDelete = existingSprintDayIds.filter(
      (id) => !nextSprintDayIds.includes(id),
    );

    if (sprintDayIdsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("sprint_day_tasks")
        .delete()
        .in("id", sprintDayIdsToDelete);

      if (deleteError) {
        return NextResponse.json(
          { error: "Unable to remove deleted sprint day tasks." },
          { status: 500 },
        );
      }
    }

    for (const [index, sprintDay] of sprintDays.entries()) {
      const payload = {
        cohort_id: cohortId,
        day_number: index + 1,
        title:
          typeof sprintDay.title === "string" &&
          sprintDay.title.trim().length > 0
            ? sprintDay.title.trim()
            : `Day ${index + 1}`,
        description:
          typeof sprintDay.description === "string"
            ? sprintDay.description.trim()
            : "",
        brief:
          typeof sprintDay.brief === "string" ? sprintDay.brief.trim() : "",
      };

      const { error: sprintDaySaveError } = await supabase
        .from("sprint_day_tasks")
        .upsert(
          sprintDay.id
            ? {
                id: sprintDay.id,
                ...payload,
              }
            : payload,
          { onConflict: "id" },
        );

      if (sprintDaySaveError) {
        return NextResponse.json(
          { error: `Unable to save sprint day ${index + 1}.` },
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
