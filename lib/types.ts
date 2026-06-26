export interface Cohort {
  id: string;
  slug: string;
  type: string;
  apply_window: string;
  qualifier_window: string;
  sprint_window: string;
  apply_by: string;
  results_on: string;
  application_open_date: string;
  application_close_date: string;
  qualifier_open_date: string;
  qualifier_close_date: string;
  sprint_start_date: string;
  sprint_end_date: string;
  results_announcement_date: string;
  schedule_timezone: string;
  qualifier_test_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Cycle {
  id: string;
  title: string;
  slug: string;
  cohort_type: "inclusive" | "exclusive" | null;
  status: "draft" | "active" | "upcoming" | "closed";
  application_start_at: string | null;
  application_end_at: string | null;
  screening_start_at: string | null;
  screening_end_at: string | null;
  cohort_start_at: string | null;
  cohort_end_at: string | null;
  created_at: string;
}

export interface AdminSettings {
  time_limits_enabled: boolean;
  ai_screening_enabled: boolean;
  ai_model: string;
  ai_fallback_model: string;
  ai_pass_percentage: number;
  ai_max_difficulty: number;
  // Centralized grading configuration
  pass_threshold: number;      // Final score >= this to PASS (default: 70)
  confidence_threshold: number; // AI confidence below this triggers admin review (default: 60)
  practical_weight: number;    // Reserved for future weighted scoring (default: 1)
  mcq_weight: number;          // Reserved for future weighted scoring (default: 1)
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
  phone: string | null;
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

export interface SprintDayTask {
  id: string;
  cohort_id: string;
  day_number: number;
  title: string;
  description: string;
  brief: string;
  created_at: string;
  updated_at: string;
}

export interface SprintDaySubmission {
  id: string;
  sprint_day_id: string;
  cohort_id: string;
  github_url: string;
  submitted_at: string;
  score: number | null;
  evaluator_notes: string | null;
  reviewed_at: string | null;
}

export interface SprintDayProgress extends SprintDayTask {
  status: "locked" | "unlocked" | "submitted" | "reviewed";
  submission: SprintDaySubmission | null;
  scheduled_date: string | null;
  availability: "upcoming" | "open" | "closed";
  access_message: string | null;
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
  sprintDays: SprintDayTask[];
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
  sprint_days: SprintDayProgress[];
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
  adminSettings: AdminSettings;
  summary: DashboardSummary;
}

export interface AdminContentPayload {
  cohorts: Cohort[];
  contentByCohort: Record<string, CohortContentBundle>;
  adminSettings: AdminSettings;
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
  sprint_days_submitted_count: number;
  total_sprint_day_count: number;
  latest_activity_at: string | null;
  sprint_submissions: AdminSprintSubmissionLink[];
}

export interface AdminAssessmentResultRow {
  id: string;
  user_id: string;
  cohort_id: string;
  cohort_slug: string;
  cohort_type: string;
  candidate_name: string;
  candidate_email: string;
  candidate_university: string;
  test_type: "qualifier" | "sprint_day";
  test_label: string;
  submitted_at: string;
  score: number | null;
  status: "submitted" | "reviewed" | "passed" | "failed";
  passed: boolean | null;
  feedback: string | null;
  github_url?: string | null;
}

export interface AdminSprintSubmissionLink {
  submission_id: string;
  sprint_day_id: string;
  day_number: number;
  task_title: string;
  github_url: string;
  submitted_at: string;
}

export interface AdminSprintSubmissionReview {
  submission_id: string;
  sprint_day_id: string;
  cohort_id: string;
  cohort_slug: string;
  cohort_type: string;
  day_number: number;
  task_title: string;
  candidate_name: string;
  candidate_email: string;
  github_url: string;
  submitted_at: string;
  score: number | null;
  evaluator_notes: string | null;
  reviewed_at: string | null;
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
  assessmentResults: AdminAssessmentResultRow[];
  sprintSubmissionReviews: AdminSprintSubmissionReview[];
}

export interface ApiError {
  error: string;
}
