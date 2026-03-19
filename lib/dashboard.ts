import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeAssessmentQuestions } from "@/lib/assessment";
import type {
  Cohort,
  CohortMembership,
  CohortStage,
  CohortStageProgress,
  DashboardPayload,
  QualifierAttempt,
  UserCohortStageAttempt,
  UserCohortStatus,
  UserProfile,
} from "@/lib/types";

interface AuthenticatedUserIdentity {
  userId: string;
  email: string;
  name: string;
}

interface DbProfileRow {
  id: string;
  email: string;
  name: string;
  university: string;
  stack: string;
  github: string | null;
  availability: boolean;
  intent: string;
  created_at: string;
  updated_at: string;
}

interface DbUserCohortRow {
  cohort_id: string;
  status: UserCohortStatus;
  applied_at: string;
  qualifier_score: number | null;
  qualifier_feedback: string | null;
  qualifier_started_at: string | null;
  qualifier_submitted_at: string | null;
  qualified_at: string | null;
  enrolled_at: string | null;
  completed_at: string | null;
}

interface DbQualifierAttemptRow {
  id: string;
  cohort_id: string;
  exam_id: string;
  subject: string;
  score: number;
  feedback: string;
  passed: boolean;
  started_at: string | null;
  submitted_at: string;
}

interface DbStageRow {
  id: string;
  cohort_id: string;
  stage_number: number;
  title: string;
  description: string;
  duration_minutes: number;
  questions: unknown;
  created_at: string;
}

interface DbStageAttemptRow {
  id: string;
  stage_id: string;
  cohort_id: string;
  score: number;
  feedback: string;
  passed: boolean;
  submitted_at: string;
}

function fallbackNameFromEmail(email: string): string {
  const [localPart] = email.split("@");
  return localPart || "Candidate";
}

function buildUserProfile(
  profile: DbProfileRow | null,
  authUser: AuthenticatedUserIdentity,
): UserProfile {
  const now = new Date().toISOString();

  return {
    id: profile?.id ?? authUser.userId,
    email: authUser.email,
    name:
      profile?.name || authUser.name || fallbackNameFromEmail(authUser.email),
    university: profile?.university ?? "",
    stack: profile?.stack ?? "",
    github: profile?.github ?? null,
    availability: profile?.availability ?? false,
    intent: profile?.intent ?? "",
    created_at: profile?.created_at ?? now,
    updated_at: profile?.updated_at ?? now,
  };
}

function buildStageProgress(
  stages: CohortStage[],
  attemptsByStageId: Map<string, UserCohortStageAttempt>,
  membershipStatus: UserCohortStatus,
): CohortStageProgress[] {
  const hasQualifierAccess =
    membershipStatus === "enrolled" || membershipStatus === "completed";
  let previousPassed = hasQualifierAccess;

  return stages.map((stage) => {
    const attempt = attemptsByStageId.get(stage.id) ?? null;
    const passed = attempt?.passed ?? false;
    const unlocked = previousPassed;

    const progress: CohortStageProgress = {
      ...stage,
      status: passed ? "passed" : unlocked ? "unlocked" : "locked",
      attempt,
    };

    previousPassed = previousPassed && passed;
    return progress;
  });
}

export async function getProfileByClerkUserId(
  supabase: SupabaseClient,
  clerkUserId: string,
): Promise<DbProfileRow | null> {
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, email, name, university, stack, github, availability, intent, created_at, updated_at",
    )
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load your profile.");
  }

  return (data as DbProfileRow | null) ?? null;
}

export async function loadDashboardData(
  supabase: SupabaseClient,
  authUser: AuthenticatedUserIdentity,
): Promise<DashboardPayload> {
  const profile = await getProfileByClerkUserId(supabase, authUser.userId);
  const user = buildUserProfile(profile, authUser);

  const { data: cohortsData, error: cohortsError } = await supabase
    .from("cohorts")
    .select(
      "id, slug, type, apply_window, sprint_window, apply_by, qualifier_test_url, is_active, created_at",
    )
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: true });

  if (cohortsError) {
    throw new Error("Unable to load cohorts.");
  }

  const cohorts = (cohortsData ?? []) as Cohort[];
  if (!profile) {
    return {
      user,
      memberships: [],
      cohorts,
      summary: {
        appliedCount: 0,
        enrolledCount: 0,
        completedCount: 0,
        completedStageCount: 0,
      },
    };
  }

  const [
    { data: membershipRows, error: membershipsError },
    { data: qualifierRows, error: qualifierError },
    { data: stageRows, error: stageError },
    { data: stageAttemptRows, error: stageAttemptError },
  ] = await Promise.all([
    supabase
      .from("user_cohorts")
      .select(
        "cohort_id, status, applied_at, qualifier_score, qualifier_feedback, qualifier_started_at, qualifier_submitted_at, qualified_at, enrolled_at, completed_at",
      )
      .eq("user_id", profile.id)
      .order("applied_at", { ascending: false }),
    supabase
      .from("qualifier_attempts")
      .select(
        "id, cohort_id, exam_id, subject, score, feedback, passed, started_at, submitted_at",
      )
      .eq("user_id", profile.id)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("cohort_stages")
      .select(
        "id, cohort_id, stage_number, title, description, duration_minutes, questions, created_at",
      )
      .order("stage_number", { ascending: true }),
    supabase
      .from("user_cohort_stage_attempts")
      .select("id, stage_id, cohort_id, score, feedback, passed, submitted_at")
      .eq("user_id", profile.id)
      .order("submitted_at", { ascending: false }),
  ]);

  if (membershipsError || qualifierError || stageError || stageAttemptError) {
    throw new Error("Unable to load your dashboard progress.");
  }

  const cohortById = new Map(cohorts.map((cohort) => [cohort.id, cohort]));
  const latestQualifierByCohort = new Map<string, QualifierAttempt>();

  for (const row of (qualifierRows ?? []) as DbQualifierAttemptRow[]) {
    if (!latestQualifierByCohort.has(row.cohort_id)) {
      latestQualifierByCohort.set(row.cohort_id, row);
    }
  }

  const stagesByCohort = new Map<string, CohortStage[]>();
  for (const row of (stageRows ?? []) as DbStageRow[]) {
    const current = stagesByCohort.get(row.cohort_id) ?? [];
    current.push({
      id: row.id,
      cohort_id: row.cohort_id,
      stage_number: row.stage_number,
      title: row.title,
      description: row.description,
      duration_minutes: row.duration_minutes,
      questions: normalizeAssessmentQuestions(row.questions),
      created_at: row.created_at,
    });
    stagesByCohort.set(row.cohort_id, current);
  }

  const attemptsByCohort = new Map<
    string,
    Map<string, UserCohortStageAttempt>
  >();
  for (const row of (stageAttemptRows ?? []) as DbStageAttemptRow[]) {
    const current = attemptsByCohort.get(row.cohort_id) ?? new Map();
    if (!current.has(row.stage_id)) {
      current.set(row.stage_id, row);
    }
    attemptsByCohort.set(row.cohort_id, current);
  }

  const memberships = ((membershipRows ?? []) as DbUserCohortRow[])
    .map((row) => {
      const cohort = cohortById.get(row.cohort_id);
      if (!cohort) {
        return null;
      }

      const stages = buildStageProgress(
        stagesByCohort.get(row.cohort_id) ?? [],
        attemptsByCohort.get(row.cohort_id) ?? new Map(),
        row.status,
      );

      const membership: CohortMembership = {
        cohort,
        status: row.status,
        applied_at: row.applied_at,
        qualifier_score: row.qualifier_score,
        qualifier_feedback: row.qualifier_feedback,
        qualifier_started_at: row.qualifier_started_at,
        qualifier_submitted_at: row.qualifier_submitted_at,
        qualified_at: row.qualified_at,
        enrolled_at: row.enrolled_at,
        completed_at: row.completed_at,
        latest_qualifier_attempt:
          latestQualifierByCohort.get(row.cohort_id) ?? null,
        stages,
      };

      return membership;
    })
    .filter((item): item is CohortMembership => Boolean(item));

  return {
    user,
    memberships,
    cohorts,
    summary: {
      appliedCount: memberships.length,
      enrolledCount: memberships.filter(
        (membership) =>
          membership.status === "enrolled" || membership.status === "completed",
      ).length,
      completedCount: memberships.filter(
        (membership) => membership.status === "completed",
      ).length,
      completedStageCount: memberships.reduce(
        (count, membership) =>
          count +
          membership.stages.filter((stage) => stage.status === "passed").length,
        0,
      ),
    },
  };
}
