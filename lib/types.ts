export interface Cohort {
  id: string;
  slug: string;
  type: string;
  apply_window: string;
  sprint_window: string;
  apply_by: string;
  qualifier_test_url: string | null;
  is_active: boolean;
  created_at: string;
}

export type UserCohortStatus =
  | "applied"
  | "qualifier_in_progress"
  | "qualifier_failed"
  | "qualifier_passed"
  | "enrolled"
  | "completed";

export interface UserProfile {
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

export interface CohortStageQuestion {
  id: string;
  prompt: string;
  guidance: string;
}

export interface CohortStage {
  id: string;
  cohort_id: string;
  stage_number: number;
  title: string;
  description: string;
  duration_minutes: number;
  questions: CohortStageQuestion[];
  created_at: string;
}

export interface QualifierAttempt {
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

export interface UserCohortStageAttempt {
  id: string;
  stage_id: string;
  cohort_id: string;
  score: number;
  feedback: string;
  passed: boolean;
  submitted_at: string;
}

export interface CohortStageProgress extends CohortStage {
  status: "locked" | "unlocked" | "passed";
  attempt: UserCohortStageAttempt | null;
}

export interface CohortMembership {
  cohort: Cohort;
  status: UserCohortStatus;
  applied_at: string;
  qualifier_score: number | null;
  qualifier_feedback: string | null;
  qualifier_started_at: string | null;
  qualifier_submitted_at: string | null;
  qualified_at: string | null;
  enrolled_at: string | null;
  completed_at: string | null;
  latest_qualifier_attempt: QualifierAttempt | null;
  stages: CohortStageProgress[];
}

export interface DashboardSummary {
  appliedCount: number;
  enrolledCount: number;
  completedCount: number;
  completedStageCount: number;
}

export interface DashboardPayload {
  user: UserProfile;
  memberships: CohortMembership[];
  cohorts: Cohort[];
  summary: DashboardSummary;
}

export interface ApiError {
  error: string;
}
