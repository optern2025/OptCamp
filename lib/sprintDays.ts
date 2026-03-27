import type {
  AdminAssessmentResultRow,
  SprintDayProgress,
  SprintDaySubmission,
  SprintDayTask,
  UserCohortStatus,
} from "@/lib/types";

export function buildDefaultSprintDays(cohortId: string): SprintDayTask[] {
  return [
    {
      id: "",
      cohort_id: cohortId,
      day_number: 1,
      title: "Environment Setup",
      description:
        "Set up the repository, local environment, and initial app shell.",
      brief:
        "Create a working project scaffold, verify the build runs locally, and commit the initial setup with a short README note on how to run it.",
      created_at: "",
      updated_at: "",
    },
    {
      id: "",
      cohort_id: cohortId,
      day_number: 2,
      title: "Core Feature Build",
      description: "Implement the primary feature for the sprint challenge.",
      brief:
        "Build the main user flow for the assigned problem, commit incremental progress, and keep the repository in a runnable state.",
      created_at: "",
      updated_at: "",
    },
    {
      id: "",
      cohort_id: cohortId,
      day_number: 3,
      title: "Refinement and Quality",
      description:
        "Improve reliability, polish the implementation, and cover edge cases.",
      brief:
        "Strengthen the project with validation, better UX, or tests where appropriate, and document the tradeoffs you chose not to address.",
      created_at: "",
      updated_at: "",
    },
    {
      id: "",
      cohort_id: cohortId,
      day_number: 4,
      title: "Final Submission",
      description: "Prepare the final repository state and delivery notes.",
      brief:
        "Submit the final GitHub repository link with a concise summary of what works, what is incomplete, and any setup steps for reviewers.",
      created_at: "",
      updated_at: "",
    },
  ];
}

export function buildSprintDayProgress(
  sprintDays: SprintDayTask[],
  submissionsBySprintDayId: Map<string, SprintDaySubmission>,
  membershipStatus: UserCohortStatus,
): SprintDayProgress[] {
  const hasSprintAccess =
    membershipStatus === "enrolled" || membershipStatus === "completed";
  let previousDaySatisfied = hasSprintAccess;

  return sprintDays
    .slice()
    .sort((left, right) => left.day_number - right.day_number)
    .map((sprintDay) => {
      const submission = submissionsBySprintDayId.get(sprintDay.id) ?? null;
      const reviewed =
        submission !== null &&
        (submission.score !== null || submission.reviewed_at !== null);
      const isUnlocked = previousDaySatisfied;

      const progress: SprintDayProgress = {
        ...sprintDay,
        status: reviewed
          ? "reviewed"
          : submission
            ? "submitted"
            : isUnlocked
              ? "unlocked"
              : "locked",
        submission,
      };

      previousDaySatisfied = previousDaySatisfied && submission !== null;
      return progress;
    });
}

export type AdminAssessmentResultSortField =
  | "submitted_at"
  | "score"
  | "candidate_name"
  | "cohort_type"
  | "status";

export interface AdminAssessmentResultFilters {
  query: string;
  cohortId: string;
  testType: "all" | "qualifier" | "sprint_day";
  status: "all" | "submitted" | "reviewed" | "passed" | "failed";
  sortField: AdminAssessmentResultSortField;
  sortDirection: "asc" | "desc";
}

function compareNullableNumber(
  left: number | null,
  right: number | null,
  direction: "asc" | "desc",
) {
  const leftValue =
    left ??
    (direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
  const rightValue =
    right ??
    (direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
  return leftValue - rightValue;
}

export function filterAndSortAssessmentResults(
  rows: AdminAssessmentResultRow[],
  filters: AdminAssessmentResultFilters,
): AdminAssessmentResultRow[] {
  const query = filters.query.trim().toLowerCase();

  return rows
    .filter((row) => {
      if (filters.cohortId && row.cohort_id !== filters.cohortId) {
        return false;
      }

      if (filters.testType !== "all" && row.test_type !== filters.testType) {
        return false;
      }

      if (filters.status !== "all" && row.status !== filters.status) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        row.candidate_name,
        row.candidate_email,
        row.candidate_university,
        row.cohort_type,
        row.cohort_slug,
        row.test_label,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .sort((left, right) => {
      let comparison = 0;

      switch (filters.sortField) {
        case "score":
          comparison = compareNullableNumber(
            left.score,
            right.score,
            filters.sortDirection,
          );
          break;
        case "candidate_name":
          comparison = left.candidate_name.localeCompare(right.candidate_name);
          break;
        case "cohort_type":
          comparison = left.cohort_type.localeCompare(right.cohort_type);
          break;
        case "status":
          comparison = left.status.localeCompare(right.status);
          break;
        default:
          comparison = left.submitted_at.localeCompare(right.submitted_at);
          break;
      }

      if (comparison === 0) {
        comparison = left.id.localeCompare(right.id);
      }

      return filters.sortDirection === "asc" ? comparison : -comparison;
    });
}
