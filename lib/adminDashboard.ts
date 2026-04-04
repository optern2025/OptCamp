import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminAssessmentResultRow,
  AdminSprintSubmissionLink,
  AdminSprintSubmissionReview,
  AdminUserCohortMembership,
  AdminUserDashboardEntry,
  AdminUserDashboardPayload,
  Cohort,
  UserCohortStatus,
  UserProfile,
} from "@/lib/types";

interface DbAdminUserRow extends UserProfile {
  clerk_user_id: string;
}

interface MembershipCohortRow {
  id: string;
  slug: string;
  type: string;
  apply_by: string;
  is_active: boolean;
}

interface DbMembershipRow {
  user_id: string;
  cohort_id: string;
  status: UserCohortStatus;
  applied_at: string;
  qualifier_score: number | null;
  qualifier_started_at: string | null;
  qualifier_submitted_at: string | null;
  qualified_at: string | null;
  enrolled_at: string | null;
  completed_at: string | null;
  cohorts: MembershipCohortRow | MembershipCohortRow[] | null;
}

interface DbQualifierAttemptRow {
  id: string;
  user_id: string;
  cohort_id: string;
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
}

interface DbSprintDaySubmissionRow {
  id: string;
  user_id: string;
  cohort_id: string;
  sprint_day_id: string;
  github_url: string;
  submitted_at: string;
  score: number | null;
  evaluator_notes: string | null;
  reviewed_at: string | null;
}

function getMembershipCohort(
  value: MembershipCohortRow | MembershipCohortRow[] | null,
): MembershipCohortRow | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getLatestTimestamp(
  values: Array<string | null | undefined>,
): string | null {
  const filtered = values.filter((value): value is string => Boolean(value));
  if (filtered.length === 0) {
    return null;
  }

  return filtered.reduce((latest, current) =>
    current.localeCompare(latest) > 0 ? current : latest,
  );
}

export async function loadAdminUserDashboard(
  supabase: SupabaseClient,
): Promise<AdminUserDashboardPayload> {
  const [
    { data: userRows, error: usersError },
    { data: membershipRows, error: membershipsError },
    { data: qualifierRows, error: qualifierError },
    { data: sprintDayRows, error: sprintDayError },
    { data: sprintSubmissionRows, error: sprintSubmissionError },
    { data: cohortRows, error: cohortError },
  ] = await Promise.all([
    supabase
      .from("users")
      .select(
        "id, clerk_user_id, email, name, university, phone, stack, github, availability, intent, created_at, updated_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("user_cohorts")
      .select(
        "user_id, cohort_id, status, applied_at, qualifier_score, qualifier_started_at, qualifier_submitted_at, qualified_at, enrolled_at, completed_at, cohorts (id, slug, type, apply_by, is_active)",
      )
      .order("applied_at", { ascending: false }),
    supabase
      .from("qualifier_attempts")
      .select(
        "id, user_id, cohort_id, score, feedback, passed, started_at, submitted_at",
      )
      .order("submitted_at", { ascending: false }),
    supabase
      .from("sprint_day_tasks")
      .select("id, cohort_id, day_number, title")
      .order("day_number", { ascending: true }),
    supabase
      .from("sprint_day_submissions")
      .select(
        "id, user_id, cohort_id, sprint_day_id, github_url, submitted_at, score, evaluator_notes, reviewed_at",
      )
      .order("submitted_at", { ascending: false }),
    supabase.from("cohorts").select("id, is_active"),
  ]);

  if (
    usersError ||
    membershipsError ||
    qualifierError ||
    sprintDayError ||
    sprintSubmissionError ||
    cohortError
  ) {
    throw new Error("Unable to load the admin user dashboard.");
  }

  const sprintDaysByCohort = new Map<string, DbSprintDayTaskRow[]>();
  const sprintDayById = new Map<string, DbSprintDayTaskRow>();
  for (const row of (sprintDayRows ?? []) as DbSprintDayTaskRow[]) {
    sprintDayById.set(row.id, row);
    const current = sprintDaysByCohort.get(row.cohort_id) ?? [];
    current.push(row);
    sprintDaysByCohort.set(row.cohort_id, current);
  }

  const latestQualifierByMembership = new Map<string, DbQualifierAttemptRow>();
  for (const row of (qualifierRows ?? []) as DbQualifierAttemptRow[]) {
    const key = `${row.user_id}:${row.cohort_id}`;
    if (!latestQualifierByMembership.has(key)) {
      latestQualifierByMembership.set(key, row);
    }
  }

  const sprintSubmissionCountByMembership = new Map<string, number>();
  const latestSprintActivityByMembership = new Map<string, string>();
  const sprintSubmissionsByMembership = new Map<
    string,
    AdminSprintSubmissionLink[]
  >();
  for (const row of (sprintSubmissionRows ??
    []) as DbSprintDaySubmissionRow[]) {
    const key = `${row.user_id}:${row.cohort_id}`;
    const sprintDay = sprintDayById.get(row.sprint_day_id);

    sprintSubmissionCountByMembership.set(
      key,
      (sprintSubmissionCountByMembership.get(key) ?? 0) + 1,
    );

    if (!latestSprintActivityByMembership.has(key)) {
      latestSprintActivityByMembership.set(key, row.submitted_at);
    }

    if (sprintDay) {
      const current = sprintSubmissionsByMembership.get(key) ?? [];
      current.push({
        submission_id: row.id,
        sprint_day_id: row.sprint_day_id,
        day_number: sprintDay.day_number,
        task_title: sprintDay.title,
        github_url: row.github_url,
        submitted_at: row.submitted_at,
      });
      sprintSubmissionsByMembership.set(key, current);
    }
  }

  const userById = new Map(
    ((userRows ?? []) as DbAdminUserRow[]).map((row) => [row.id, row]),
  );
  const membershipCohortByUserAndCohort = new Map<
    string,
    MembershipCohortRow
  >();
  for (const row of (membershipRows ?? []) as DbMembershipRow[]) {
    const cohort = getMembershipCohort(row.cohorts);
    if (cohort) {
      membershipCohortByUserAndCohort.set(
        `${row.user_id}:${row.cohort_id}`,
        cohort,
      );
    }
  }

  const membershipsByUser = new Map<string, AdminUserCohortMembership[]>();
  for (const row of (membershipRows ?? []) as DbMembershipRow[]) {
    const cohort = getMembershipCohort(row.cohorts);
    if (!cohort) {
      continue;
    }

    const key = `${row.user_id}:${row.cohort_id}`;
    const latestQualifier = latestQualifierByMembership.get(key) ?? null;

    const membership: AdminUserCohortMembership = {
      cohort,
      status: row.status,
      applied_at: row.applied_at,
      qualifier_score: row.qualifier_score ?? latestQualifier?.score ?? null,
      qualifier_passed: latestQualifier?.passed ?? null,
      qualifier_started_at:
        row.qualifier_started_at ?? latestQualifier?.started_at ?? null,
      qualifier_submitted_at:
        row.qualifier_submitted_at ?? latestQualifier?.submitted_at ?? null,
      qualified_at: row.qualified_at,
      enrolled_at: row.enrolled_at,
      completed_at: row.completed_at,
      sprint_days_submitted_count:
        sprintSubmissionCountByMembership.get(key) ?? 0,
      total_sprint_day_count:
        sprintDaysByCohort.get(row.cohort_id)?.length ?? 0,
      latest_activity_at: getLatestTimestamp([
        row.completed_at,
        row.enrolled_at,
        row.qualified_at,
        row.qualifier_submitted_at,
        row.qualifier_started_at,
        latestQualifier?.submitted_at ?? null,
        latestSprintActivityByMembership.get(key) ?? null,
        row.applied_at,
      ]),
      sprint_submissions: sprintSubmissionsByMembership.get(key) ?? [],
    };

    const current = membershipsByUser.get(row.user_id) ?? [];
    current.push(membership);
    membershipsByUser.set(row.user_id, current);
  }

  const users = ((userRows ?? []) as DbAdminUserRow[]).map((row) => {
    const memberships = membershipsByUser.get(row.id) ?? [];
    const latestActivityAt = getLatestTimestamp([
      row.updated_at,
      ...memberships.map((membership) => membership.latest_activity_at),
    ]);

    const user: AdminUserDashboardEntry = {
      ...row,
      cohort_count: memberships.length,
      latest_activity_at: latestActivityAt,
      memberships,
    };

    return user;
  });

  const assessmentResults: AdminAssessmentResultRow[] = [];
  for (const row of (qualifierRows ?? []) as DbQualifierAttemptRow[]) {
    const user = userById.get(row.user_id);
    const cohort = membershipCohortByUserAndCohort.get(
      `${row.user_id}:${row.cohort_id}`,
    );

    if (!user || !cohort) {
      continue;
    }

    assessmentResults.push({
      id: `qualifier:${row.id}`,
      user_id: row.user_id,
      cohort_id: row.cohort_id,
      cohort_slug: cohort.slug,
      cohort_type: cohort.type,
      candidate_name: user.name,
      candidate_email: user.email,
      candidate_university: user.university,
      test_type: "qualifier",
      test_label: "Qualifier",
      submitted_at: row.submitted_at,
      score: row.score,
      status: row.passed ? "passed" : "failed",
      passed: row.passed,
      feedback: row.feedback,
      github_url: null,
    });
  }

  const sprintSubmissionReviews: AdminSprintSubmissionReview[] = [];
  for (const row of (sprintSubmissionRows ??
    []) as DbSprintDaySubmissionRow[]) {
    const user = userById.get(row.user_id);
    const cohort = membershipCohortByUserAndCohort.get(
      `${row.user_id}:${row.cohort_id}`,
    );
    const sprintDay = sprintDayById.get(row.sprint_day_id);

    if (!user || !cohort || !sprintDay) {
      continue;
    }

    assessmentResults.push({
      id: `sprint:${row.id}`,
      user_id: row.user_id,
      cohort_id: row.cohort_id,
      cohort_slug: cohort.slug,
      cohort_type: cohort.type,
      candidate_name: user.name,
      candidate_email: user.email,
      candidate_university: user.university,
      test_type: "sprint_day",
      test_label: `Day ${sprintDay.day_number}: ${sprintDay.title}`,
      submitted_at: row.submitted_at,
      score: row.score,
      status: row.score === null ? "submitted" : "reviewed",
      passed: null,
      feedback: row.evaluator_notes,
      github_url: row.github_url,
    });

    sprintSubmissionReviews.push({
      submission_id: row.id,
      sprint_day_id: row.sprint_day_id,
      cohort_id: row.cohort_id,
      cohort_slug: cohort.slug,
      cohort_type: cohort.type,
      day_number: sprintDay.day_number,
      task_title: sprintDay.title,
      candidate_name: user.name,
      candidate_email: user.email,
      github_url: row.github_url,
      submitted_at: row.submitted_at,
      score: row.score,
      evaluator_notes: row.evaluator_notes,
      reviewed_at: row.reviewed_at,
    });
  }

  const registeredUsers = users.filter((user) => user.cohort_count > 0).length;
  const enrolledUsers = users.filter((user) =>
    user.memberships.some(
      (membership) =>
        membership.status === "enrolled" || membership.status === "completed",
    ),
  ).length;
  const completedUsers = users.filter((user) =>
    user.memberships.some((membership) => membership.status === "completed"),
  ).length;

  return {
    users,
    summary: {
      totalUsers: users.length,
      registeredUsers,
      totalApplications: users.reduce(
        (count, user) => count + user.memberships.length,
        0,
      ),
      activeCohorts: (
        (cohortRows ?? []) as Pick<Cohort, "id" | "is_active">[]
      ).filter((cohort) => cohort.is_active).length,
      enrolledUsers,
      completedUsers,
    },
    assessmentResults,
    sprintSubmissionReviews,
  };
}
