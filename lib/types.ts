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

export type AssessmentQuestionType = "mcq" | "debug" | "scenario";

export interface AssessmentChoice {
  id: string;
  label: string;
  detail?: string;
}

interface AssessmentQuestionBase {
  id: string;
  type: AssessmentQuestionType;
  prompt: string;
  guidance: string;
  rubric?: string;
  solution?: string;
}

export interface MultipleChoiceQuestion extends AssessmentQuestionBase {
  type: "mcq";
  options: AssessmentChoice[];
  correctOptionIds?: string[];
  allowMultiple?: boolean;
}

export interface DebugQuestion extends AssessmentQuestionBase {
  type: "debug";
  language?: string;
  starterCode?: string;
  expectedOutcome?: string;
}

export interface ScenarioQuestion extends AssessmentQuestionBase {
  type: "scenario";
  deliverable?: string;
  constraints?: string[];
}

export type AssessmentQuestion =
  | MultipleChoiceQuestion
  | DebugQuestion
  | ScenarioQuestion;

export interface CohortStage {
  id: string;
  cohort_id: string;
  stage_number: number;
  title: string;
  description: string;
  duration_minutes: number;
  questions: AssessmentQuestion[];
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

export interface QualifierTemplate {
  id: string;
  cohort_id: string;
  duration_seconds: number;
  questions: AssessmentQuestion[];
  updated_at: string;
}

export interface CohortContentBundle {
  qualifier: QualifierTemplate | null;
  stages: CohortStage[];
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

export interface AdminContentPayload {
  cohorts: Cohort[];
  contentByCohort: Record<string, CohortContentBundle>;
}

export interface AdminUserCohortMembership {
  cohort: Pick<Cohort, "id" | "slug" | "type" | "apply_by" | "is_active">;
  status: UserCohortStatus;
  applied_at: string;
  qualifier_score: number | null;
  qualifier_passed: boolean | null;
  qualifier_started_at: string | null;
  qualifier_submitted_at: string | null;
  qualified_at: string | null;
  enrolled_at: string | null;
  completed_at: string | null;
  stages_passed_count: number;
  total_stage_count: number;
  latest_activity_at: string | null;
}

export interface AdminUserDashboardEntry extends UserProfile {
  clerk_user_id: string;
  cohort_count: number;
  latest_activity_at: string | null;
  memberships: AdminUserCohortMembership[];
}

export interface AdminUserDashboardSummary {
  totalUsers: number;
  registeredUsers: number;
  totalApplications: number;
  activeCohorts: number;
  enrolledUsers: number;
  completedUsers: number;
}

export interface AdminUserDashboardPayload {
  users: AdminUserDashboardEntry[];
  summary: AdminUserDashboardSummary;
}

export interface ApiError {
  error: string;
}
