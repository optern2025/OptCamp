import { describe, expect, it } from "vitest";
import {
  buildCohortDisplayFields,
  getSprintDayCountForCohort,
  validateCohortSchedule,
} from "@/lib/cohortSchedule";

describe("cohort schedule helpers", () => {
  it("builds landing-page labels from the stored date ranges", () => {
    expect(
      buildCohortDisplayFields({
        application_open_date: "2026-03-26",
        application_close_date: "2026-03-29",
        qualifier_open_date: "2026-03-30",
        qualifier_close_date: "2026-03-31",
        sprint_start_date: "2026-04-01",
        sprint_end_date: "2026-04-04",
        schedule_timezone: "Asia/Kolkata",
      }),
    ).toEqual({
      apply_window: "26th - 29th March",
      qualifier_window: "30 & 31st March",
      sprint_window: "1st - 4th April",
      apply_by: "29th March",
    });
  });

  it("requires sprint day count to match the inclusive sprint date range", () => {
    const schedule = {
      application_open_date: "2026-03-26",
      application_close_date: "2026-03-29",
      qualifier_open_date: "2026-03-30",
      qualifier_close_date: "2026-03-31",
      sprint_start_date: "2026-04-01",
      sprint_end_date: "2026-04-04",
      schedule_timezone: "Asia/Kolkata",
    };

    expect(getSprintDayCountForCohort(schedule)).toBe(4);
    expect(validateCohortSchedule(schedule, 4)).toEqual([]);
    expect(validateCohortSchedule(schedule, 3)).toContain(
      "Sprint day count must match the inclusive sprint date range.",
    );
  });
});
