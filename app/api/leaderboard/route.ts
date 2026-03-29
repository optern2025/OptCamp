import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { UserCohortStatus } from "@/lib/types";

interface UserRow {
  id: string;
  name: string;
  email: string;
  university: string;
}

interface CohortRow {
  id: string;
  slug: string;
  type: string;
}

interface MembershipRow {
  user_id: string;
  cohort_id: string;
  status: UserCohortStatus;
  qualifier_score: number | null;
  qualifier_submitted_at: string | null;
  qualified_at: string | null;
  enrolled_at: string | null;
  completed_at: string | null;
  cohorts: CohortRow | CohortRow[] | null;
}

interface QualifierAttemptRow {
  user_id: string;
  cohort_id: string;
  score: number;
  submitted_at: string;
}

interface SprintDayTaskRow {
  id: string;
  cohort_id: string;
}

interface SprintDaySubmissionRow {
  user_id: string;
  cohort_id: string;
  sprint_day_id: string;
  submitted_at: string;
  score: number | null;
  reviewed_at: string | null;
}

interface LeaderboardEntry {
  id: string;
  cohortId: string;
  cohortSlug: string;
  cohortType: string;
  name: string;
  college: string;
  avatar: string;
  score: number;
  progress: number;
  lastActive: string | null;
}

function getJoinedCohort(
  value: CohortRow | CohortRow[] | null,
): CohortRow | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function buildAvatar(name: string, email: string): string {
  const source = name.trim() || email.trim() || "Candidate";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function maxTimestamp(values: Array<string | null | undefined>): string | null {
  const filtered = values.filter((value): value is string => Boolean(value));
  if (filtered.length === 0) {
    return null;
  }

  return filtered.reduce((latest, current) =>
    current.localeCompare(latest) > 0 ? current : latest,
  );
}

async function loadLeaderboardData(supabase: SupabaseClient) {
  const [
    { data: usersData, error: usersError },
    { data: membershipsData, error: membershipsError },
    { data: qualifierAttemptsData, error: qualifierAttemptsError },
    { data: sprintDayTasksData, error: sprintDayTasksError },
    { data: sprintDaySubmissionsData, error: sprintDaySubmissionsError },
  ] = await Promise.all([
    supabase.from("users").select("id, name, email, university"),
    supabase
      .from("user_cohorts")
      .select(
        "user_id, cohort_id, status, qualifier_score, qualifier_submitted_at, qualified_at, enrolled_at, completed_at, cohorts (id, slug, type)",
      ),
    supabase
      .from("qualifier_attempts")
      .select("user_id, cohort_id, score, submitted_at")
      .order("submitted_at", { ascending: false }),
    supabase.from("sprint_day_tasks").select("id, cohort_id"),
    supabase
      .from("sprint_day_submissions")
      .select(
        "user_id, cohort_id, sprint_day_id, submitted_at, score, reviewed_at",
      )
      .order("submitted_at", { ascending: false }),
  ]);

  if (
    usersError ||
    membershipsError ||
    qualifierAttemptsError ||
    sprintDayTasksError ||
    sprintDaySubmissionsError
  ) {
    throw new Error("Unable to load leaderboard.");
  }

  const users = (usersData ?? []) as UserRow[];
  const memberships = (membershipsData ?? []) as MembershipRow[];
  const qualifierAttempts = (qualifierAttemptsData ??
    []) as QualifierAttemptRow[];
  const sprintDayTasks = (sprintDayTasksData ?? []) as SprintDayTaskRow[];
  const sprintDaySubmissions = (sprintDaySubmissionsData ??
    []) as SprintDaySubmissionRow[];

  const userById = new Map(users.map((user) => [user.id, user]));
  const totalSprintDaysByCohort = new Map<string, number>();
  for (const task of sprintDayTasks) {
    totalSprintDaysByCohort.set(
      task.cohort_id,
      (totalSprintDaysByCohort.get(task.cohort_id) ?? 0) + 1,
    );
  }

  const latestQualifierByMembership = new Map<string, QualifierAttemptRow>();
  for (const attempt of qualifierAttempts) {
    const key = `${attempt.user_id}:${attempt.cohort_id}`;
    if (!latestQualifierByMembership.has(key)) {
      latestQualifierByMembership.set(key, attempt);
    }
  }

  const sprintSubmissionCountByMembership = new Map<string, number>();
  const reviewedSprintScoreByMembership = new Map<string, number>();
  const latestSprintActivityByMembership = new Map<string, string>();

  for (const submission of sprintDaySubmissions) {
    const key = `${submission.user_id}:${submission.cohort_id}`;

    sprintSubmissionCountByMembership.set(
      key,
      (sprintSubmissionCountByMembership.get(key) ?? 0) + 1,
    );

    if (!latestSprintActivityByMembership.has(key)) {
      latestSprintActivityByMembership.set(key, submission.submitted_at);
    }

    if (typeof submission.score === "number") {
      reviewedSprintScoreByMembership.set(
        key,
        (reviewedSprintScoreByMembership.get(key) ?? 0) + submission.score,
      );
    }
  }

  const entries: LeaderboardEntry[] = [];
  for (const membership of memberships) {
    const user = userById.get(membership.user_id);
    const cohort = getJoinedCohort(membership.cohorts);

    if (!user || !cohort) {
      continue;
    }

    const membershipKey = `${membership.user_id}:${membership.cohort_id}`;
    const latestQualifier = latestQualifierByMembership.get(membershipKey);
    const qualifierScore =
      membership.qualifier_score ?? latestQualifier?.score ?? null;
    const sprintScore = reviewedSprintScoreByMembership.get(membershipKey) ?? 0;

    if (qualifierScore === null && sprintScore === 0) {
      continue;
    }

    const totalSprintDays =
      totalSprintDaysByCohort.get(membership.cohort_id) ?? 0;
    const submittedSprintDays =
      sprintSubmissionCountByMembership.get(membershipKey) ?? 0;
    const progress =
      totalSprintDays > 0
        ? Math.min(
            100,
            Math.round((submittedSprintDays / totalSprintDays) * 100),
          )
        : qualifierScore !== null
          ? 100
          : 0;

    entries.push({
      id: membershipKey,
      cohortId: membership.cohort_id,
      cohortSlug: cohort.slug,
      cohortType: cohort.type,
      name: user.name?.trim() || user.email,
      college: user.university?.trim() || "Independent",
      avatar: buildAvatar(user.name, user.email),
      score:
        qualifierScore !== null ? qualifierScore + sprintScore : sprintScore,
      progress,
      lastActive: maxTimestamp([
        membership.completed_at,
        membership.enrolled_at,
        membership.qualified_at,
        membership.qualifier_submitted_at,
        latestQualifier?.submitted_at,
        latestSprintActivityByMembership.get(membershipKey),
      ]),
    });
  }

  return entries;
}

export async function GET() {
  try {
    const entries = await loadLeaderboardData(getSupabaseAdminClient());
    return NextResponse.json({ entries });
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
