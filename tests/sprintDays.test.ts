import { describe, expect, it } from "vitest";
import {
  buildDefaultSprintDays,
  buildSprintDayProgress,
  filterAndSortAssessmentResults,
} from "@/lib/sprintDays";
import type { AdminAssessmentResultRow } from "@/lib/types";

describe("buildSprintDayProgress", () => {
  const cohort = {
    sprint_start_date: "2026-04-01",
    schedule_timezone: "Asia/Kolkata",
  };

  it("unlocks only the first sprint day initially", () => {
    const sprintDays = buildDefaultSprintDays("cohort-1").map((day, index) => ({
      ...day,
      id: `day-${index + 1}`,
    }));

    const progress = buildSprintDayProgress(
      sprintDays,
      new Map(),
      "enrolled",
      cohort,
      true,
      Date.parse("2026-04-01T06:00:00.000Z"),
    );

    expect(progress[0]?.status).toBe("unlocked");
    expect(progress[1]?.status).toBe("locked");
  });

  it("unlocks the next day after the previous submission exists", () => {
    const sprintDays = buildDefaultSprintDays("cohort-1").map((day, index) => ({
      ...day,
      id: `day-${index + 1}`,
    }));

    const progress = buildSprintDayProgress(
      sprintDays,
      new Map([
        [
          "day-1",
          {
            id: "submission-1",
            sprint_day_id: "day-1",
            cohort_id: "cohort-1",
            github_url: "https://github.com/example/day-1",
            submitted_at: "2026-03-27T12:00:00.000Z",
            score: null,
            evaluator_notes: null,
            reviewed_at: null,
          },
        ],
      ]),
      "enrolled",
      cohort,
      true,
      Date.parse("2026-04-02T06:00:00.000Z"),
    );

    expect(progress[0]?.status).toBe("submitted");
    expect(progress[1]?.status).toBe("unlocked");
  });

  it("keeps the next day locked until its scheduled date even after prior submission", () => {
    const sprintDays = buildDefaultSprintDays("cohort-1").map((day, index) => ({
      ...day,
      id: `day-${index + 1}`,
    }));

    const progress = buildSprintDayProgress(
      sprintDays,
      new Map([
        [
          "day-1",
          {
            id: "submission-1",
            sprint_day_id: "day-1",
            cohort_id: "cohort-1",
            github_url: "https://github.com/example/day-1",
            submitted_at: "2026-04-01T12:00:00.000Z",
            score: null,
            evaluator_notes: null,
            reviewed_at: null,
          },
        ],
      ]),
      "enrolled",
      cohort,
      true,
      Date.parse("2026-04-01T12:30:00.000Z"),
    );

    expect(progress[1]?.status).toBe("locked");
    expect(progress[1]?.availability).toBe("upcoming");
  });

  it("bypasses sprint-day date and qualifier gates when time limits are disabled", () => {
    const sprintDays = buildDefaultSprintDays("cohort-1").map((day, index) => ({
      ...day,
      id: `day-${index + 1}`,
    }));

    const progress = buildSprintDayProgress(
      sprintDays,
      new Map(),
      "applied",
      cohort,
      false,
      Date.parse("2026-03-28T06:00:00.000Z"),
    );

    expect(progress.every((day) => day.availability === "open")).toBe(true);
    expect(progress.every((day) => day.status === "unlocked")).toBe(true);
  });
});

describe("filterAndSortAssessmentResults", () => {
  const rows: AdminAssessmentResultRow[] = [
    {
      id: "q-1",
      user_id: "user-1",
      cohort_id: "cohort-1",
      cohort_slug: "aiml-mar-2026",
      cohort_type: "AI / ML",
      candidate_name: "Alicia",
      candidate_email: "alicia@example.com",
      candidate_university: "IIT Delhi",
      test_type: "qualifier",
      test_label: "Qualifier",
      submitted_at: "2026-03-27T10:00:00.000Z",
      score: 82,
      status: "passed",
      passed: true,
      feedback: "Strong.",
    },
    {
      id: "s-1",
      user_id: "user-2",
      cohort_id: "cohort-2",
      cohort_slug: "fullstack-apr-2026",
      cohort_type: "Full Stack",
      candidate_name: "Bharat",
      candidate_email: "bharat@example.com",
      candidate_university: "BITS Pilani",
      test_type: "sprint_day",
      test_label: "Day 2: Core Feature Build",
      submitted_at: "2026-03-27T12:00:00.000Z",
      score: null,
      status: "submitted",
      passed: null,
      feedback: null,
    },
  ];

  it("filters by free text across candidate and cohort fields", () => {
    const filtered = filterAndSortAssessmentResults(rows, {
      query: "bits",
      cohortId: "",
      testType: "all",
      status: "all",
      sortField: "submitted_at",
      sortDirection: "desc",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.candidate_name).toBe("Bharat");
  });

  it("sorts by score descending while keeping null scores last", () => {
    const filtered = filterAndSortAssessmentResults(rows, {
      query: "",
      cohortId: "",
      testType: "all",
      status: "all",
      sortField: "score",
      sortDirection: "desc",
    });

    expect(filtered.map((row) => row.id)).toEqual(["q-1", "s-1"]);
  });
});
