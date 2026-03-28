import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSprintDayProgress } from "@/lib/sprintDays";
import type {
  Cohort,
  CohortMembership,
  DashboardPayload,
  QualifierAttempt,
  SprintDaySubmission,
  SprintDayTask,
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

interface DbSprintDayTaskRow {
  id: string;
  cohort_id: string;
  day_number: number;
  title: string;
  description: string;
  brief: string;
  created_at: string;
  updated_at: string;
}

interface DbSprintDaySubmissionRow {
  id: string;
  sprint_day_id: string;
  cohort_id: string;
  github_url: string;
  submitted_at: string;
  score: number | null;
  evaluator_notes: string | null;
  reviewed_at: string | null;
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
    logSupabaseQueryError("users lookup failed", error);
    throw new Error("Unable to load your profile.");
  }

  return (data as DbProfileRow | null) ?? null;
}

function groupSprintDays(
  rows: DbSprintDayTaskRow[],
): Map<string, SprintDayTask[]> {
  const sprintDaysByCohort = new Map<string, SprintDayTask[]>();

  for (const row of rows) {
    const current = sprintDaysByCohort.get(row.cohort_id) ?? [];
    current.push(row);
    sprintDaysByCohort.set(row.cohort_id, current);
  }

  for (const [cohortId, sprintDays] of sprintDaysByCohort.entries()) {
    sprintDaysByCohort.set(
      cohortId,
      sprintDays
        .slice()
        .sort((left, right) => left.day_number - right.day_number),
    );
  }

  return sprintDaysByCohort;
}

function groupSprintSubmissions(
  rows: DbSprintDaySubmissionRow[],
): Map<string, Map<string, SprintDaySubmission>> {
  const submissionsByCohort = new Map<
    string,
    Map<string, SprintDaySubmission>
  >();

  for (const row of rows) {
    const current = submissionsByCohort.get(row.cohort_id) ?? new Map();
    if (!current.has(row.sprint_day_id)) {
      current.set(row.sprint_day_id, row);
    }
    submissionsByCohort.set(row.cohort_id, current);
  }

  return submissionsByCohort;
}

function logSupabaseQueryError(label: string, error: unknown) {
  if (!error) {
    return;
  }

  console.error(`[dashboard] ${label}`, error);
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
      "id, slug, type, apply_window, qualifier_window, sprint_window, apply_by, application_open_date, application_close_date, qualifier_open_date, qualifier_close_date, sprint_start_date, sprint_end_date, schedule_timezone, qualifier_test_url, is_active, created_at",
    )
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: true });

  if (cohortsError) {
    logSupabaseQueryError("cohorts lookup failed", cohortsError);
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
    { data: sprintDayRows, error: sprintDayError },
    { data: sprintSubmissionRows, error: sprintSubmissionError },
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
      .from("sprint_day_tasks")
      .select(
        "id, cohort_id, day_number, title, description, brief, created_at, updated_at",
      )
      .order("day_number", { ascending: true }),
    supabase
      .from("sprint_day_submissions")
      .select(
        "id, sprint_day_id, cohort_id, github_url, submitted_at, score, evaluator_notes, reviewed_at",
      )
      .eq("user_id", profile.id)
      .order("submitted_at", { ascending: false }),
  ]);

  if (
    membershipsError ||
    qualifierError ||
    sprintDayError ||
    sprintSubmissionError
  ) {
    logSupabaseQueryError("user_cohorts lookup failed", membershipsError);
    logSupabaseQueryError("qualifier_attempts lookup failed", qualifierError);
    logSupabaseQueryError("sprint_day_tasks lookup failed", sprintDayError);
    logSupabaseQueryError(
      "sprint_day_submissions lookup failed",
      sprintSubmissionError,
    );
    throw new Error("Unable to load your dashboard progress.");
  }

  const cohortById = new Map(cohorts.map((cohort) => [cohort.id, cohort]));
  const latestQualifierByCohort = new Map<string, QualifierAttempt>();

  for (const row of (qualifierRows ?? []) as DbQualifierAttemptRow[]) {
    if (!latestQualifierByCohort.has(row.cohort_id)) {
      latestQualifierByCohort.set(row.cohort_id, row);
    }
  }

  const sprintDaysByCohort = groupSprintDays(
    (sprintDayRows ?? []) as DbSprintDayTaskRow[],
  );
  const sprintSubmissionsByCohort = groupSprintSubmissions(
    (sprintSubmissionRows ?? []) as DbSprintDaySubmissionRow[],
  );

  const memberships = ((membershipRows ?? []) as DbUserCohortRow[])
    .map((row) => {
      const cohort = cohortById.get(row.cohort_id);
      if (!cohort) {
        return null;
      }

      const sprintDays = sprintDaysByCohort.get(row.cohort_id) ?? [];
      const sprintSubmissions =
        sprintSubmissionsByCohort.get(row.cohort_id) ?? new Map();

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
        sprint_days: buildSprintDayProgress(
          sprintDays,
          sprintSubmissions,
          row.status,
          cohort,
        ),
      };

      return membership;
    })
    .filter(
      (membership): membership is CohortMembership => membership !== null,
    );

  return {
    user,
    memberships,
    cohorts,
    summary: {
      appliedCount: memberships.length,
      enrolledCount: memberships.filter((item) => item.status === "enrolled")
        .length,
      completedCount: memberships.filter((item) => item.status === "completed")
        .length,
      completedStageCount: memberships.reduce(
        (count, membership) =>
          count +
          membership.sprint_days.filter(
            (sprintDay) => sprintDay.submission !== null,
          ).length,
        0,
      ),
    },
  };
}
