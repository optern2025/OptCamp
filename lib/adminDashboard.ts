import type { SupabaseClient } from "@supabase/supabase-js";
import type {
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
  user_id: string;
  cohort_id: string;
  score: number;
  passed: boolean;
  started_at: string | null;
  submitted_at: string;
}

interface DbStageAttemptRow {
  user_id: string;
  cohort_id: string;
  stage_id: string;
  passed: boolean;
  submitted_at: string;
}

interface DbStageRow {
  id: string;
  cohort_id: string;
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
    { data: stageAttemptRows, error: stageAttemptError },
    { data: stageRows, error: stageError },
    { data: cohortRows, error: cohortError },
  ] = await Promise.all([
    supabase
      .from("users")
      .select(
        "id, clerk_user_id, email, name, university, stack, github, availability, intent, created_at, updated_at",
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
      .select("user_id, cohort_id, score, passed, started_at, submitted_at")
      .order("submitted_at", { ascending: false }),
    supabase
      .from("user_cohort_stage_attempts")
      .select("user_id, cohort_id, stage_id, passed, submitted_at")
      .order("submitted_at", { ascending: false }),
    supabase.from("cohort_stages").select("id, cohort_id"),
    supabase.from("cohorts").select("id, is_active"),
  ]);

  if (
    usersError ||
    membershipsError ||
    qualifierError ||
    stageAttemptError ||
    stageError ||
    cohortError
  ) {
    throw new Error("Unable to load the admin user dashboard.");
  }

  const totalStageCountByCohort = new Map<string, number>();
  for (const row of (stageRows ?? []) as DbStageRow[]) {
    totalStageCountByCohort.set(
      row.cohort_id,
      (totalStageCountByCohort.get(row.cohort_id) ?? 0) + 1,
    );
  }

  const latestQualifierByMembership = new Map<string, DbQualifierAttemptRow>();
  for (const row of (qualifierRows ?? []) as DbQualifierAttemptRow[]) {
    const key = `${row.user_id}:${row.cohort_id}`;
    if (!latestQualifierByMembership.has(key)) {
      latestQualifierByMembership.set(key, row);
    }
  }

  const passedStagesByMembership = new Map<string, Set<string>>();
  const latestStageActivityByMembership = new Map<string, string>();
  for (const row of (stageAttemptRows ?? []) as DbStageAttemptRow[]) {
    const key = `${row.user_id}:${row.cohort_id}`;

    if (row.passed) {
      const current = passedStagesByMembership.get(key) ?? new Set<string>();
      current.add(row.stage_id);
      passedStagesByMembership.set(key, current);
    }

    if (!latestStageActivityByMembership.has(key)) {
      latestStageActivityByMembership.set(key, row.submitted_at);
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
    const latestStageActivity =
      latestStageActivityByMembership.get(key) ?? null;

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
      stages_passed_count: passedStagesByMembership.get(key)?.size ?? 0,
      total_stage_count: totalStageCountByCohort.get(row.cohort_id) ?? 0,
      latest_activity_at: getLatestTimestamp([
        row.completed_at,
        row.enrolled_at,
        row.qualified_at,
        row.qualifier_submitted_at,
        row.qualifier_started_at,
        latestQualifier?.submitted_at ?? null,
        latestStageActivity,
        row.applied_at,
      ]),
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
  };
}
