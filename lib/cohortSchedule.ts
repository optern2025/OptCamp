import type { Cohort } from "@/lib/types";

export const DEFAULT_COHORT_TIMEZONE = "Asia/Kolkata";

type CohortScheduleKeys =
  | "application_open_date"
  | "application_close_date"
  | "qualifier_open_date"
  | "qualifier_close_date"
  | "sprint_start_date"
  | "sprint_end_date";

export interface CohortScheduleInput {
  application_open_date: string;
  application_close_date: string;
  qualifier_open_date: string;
  qualifier_close_date: string;
  sprint_start_date: string;
  sprint_end_date: string;
  results_announcement_date: string;
  schedule_timezone?: string | null;
}

function formatOrdinal(day: number) {
  const remainder = day % 10;
  const teens = day % 100;

  if (teens >= 11 && teens <= 13) {
    return `${day}th`;
  }

  switch (remainder) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function parseDateString(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatMonth(value: string) {
  return parseDateString(value).toLocaleDateString("en-IN", {
    month: "long",
    timeZone: "UTC",
  });
}

function formatShortMonth(value: string) {
  return parseDateString(value).toLocaleDateString("en-IN", {
    month: "short",
    timeZone: "UTC",
  });
}

function getDayOfMonth(value: string) {
  return parseDateString(value).getUTCDate();
}

export function formatDateLabel(value: string) {
  return `${formatOrdinal(getDayOfMonth(value))} ${formatMonth(value)}`;
}

export function formatDateRangeLabel(start: string, end: string) {
  if (start === end) {
    return formatDateLabel(start);
  }

  const startMonth = formatMonth(start);
  const endMonth = formatMonth(end);
  const startDay = formatOrdinal(getDayOfMonth(start));
  const endDay = formatOrdinal(getDayOfMonth(end));

  if (startMonth === endMonth) {
    const dayDifference = differenceInDays(start, end);
    if (dayDifference === 1) {
      return `${getDayOfMonth(start)} & ${endDay} ${endMonth}`;
    }

    return `${startDay} - ${endDay} ${endMonth}`;
  }

  return `${startDay} ${formatShortMonth(start)} - ${endDay} ${endMonth}`;
}

function getFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function getCurrentDateInTimeZone(
  timeZone: string,
  nowMs = Date.now(),
): string {
  const parts = getFormatter(timeZone).formatToParts(new Date(nowMs));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Unable to resolve date for timezone ${timeZone}.`);
  }

  return `${year}-${month}-${day}`;
}

export function addDays(value: string, days: number) {
  const date = parseDateString(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function differenceInDays(start: string, end: string) {
  const startMs = parseDateString(start).getTime();
  const endMs = parseDateString(end).getTime();
  return Math.round((endMs - startMs) / (24 * 60 * 60 * 1000));
}

export function getSprintDayCountForCohort(
  schedule: Pick<CohortScheduleInput, "sprint_start_date" | "sprint_end_date">,
) {
  return (
    differenceInDays(schedule.sprint_start_date, schedule.sprint_end_date) + 1
  );
}

export function buildCohortDisplayFields(schedule: CohortScheduleInput) {
  return {
    apply_window: formatDateRangeLabel(
      schedule.application_open_date,
      schedule.application_close_date,
    ),
    qualifier_window: formatDateRangeLabel(
      schedule.qualifier_open_date,
      schedule.qualifier_close_date,
    ),
    sprint_window: formatDateRangeLabel(
      schedule.sprint_start_date,
      schedule.sprint_end_date,
    ),
    apply_by: formatDateLabel(schedule.application_close_date),
    results_on: formatDateLabel(schedule.results_announcement_date),
  };
}

export function buildCohortUpdatePayload(schedule: CohortScheduleInput) {
  const schedule_timezone =
    schedule.schedule_timezone?.trim() || DEFAULT_COHORT_TIMEZONE;

  return {
    ...schedule,
    schedule_timezone,
    ...buildCohortDisplayFields({
      ...schedule,
      schedule_timezone,
    }),
  };
}

export function validateCohortSchedule(
  schedule: CohortScheduleInput,
  sprintDayCount?: number,
) {
  const errors: string[] = [];
  const fields: CohortScheduleKeys[] = [
    "application_open_date",
    "application_close_date",
    "qualifier_open_date",
    "qualifier_close_date",
    "sprint_start_date",
    "sprint_end_date",
  ];

  for (const field of fields) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(schedule[field])) {
      errors.push(`Invalid ${field.replaceAll("_", " ")}.`);
    }
  }

  if (errors.length > 0) {
    return errors;
  }

  if (schedule.application_open_date > schedule.application_close_date) {
    errors.push("Application window must end on or after it starts.");
  }

  if (schedule.qualifier_open_date > schedule.qualifier_close_date) {
    errors.push("Qualifier window must end on or after it starts.");
  }

  if (schedule.sprint_start_date > schedule.sprint_end_date) {
    errors.push("Sprint window must end on or after it starts.");
  }

  if (schedule.application_close_date > schedule.qualifier_open_date) {
    errors.push(
      "Qualifier round must start on or after applications close.",
    );
  }

  if (schedule.qualifier_close_date >= schedule.sprint_start_date) {
    errors.push("Sprint must start after the qualifier round ends.");
  }

  if (schedule.results_announcement_date < schedule.sprint_end_date) {
    errors.push("Results announcement must be on or after the sprint ends.");
  }

  if (
    typeof sprintDayCount === "number" &&
    getSprintDayCountForCohort(schedule) !== sprintDayCount
  ) {
    errors.push("Sprint day count must match the inclusive sprint date range.");
  }

  return errors;
}

export function isDateWithinWindow(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

export function getCohortTimelineState(
  cohort: Pick<
    Cohort,
    | "application_open_date"
    | "application_close_date"
    | "qualifier_open_date"
    | "qualifier_close_date"
    | "sprint_start_date"
    | "sprint_end_date"
    | "schedule_timezone"
  >,
  nowMs = Date.now(),
) {
  const timeZone = cohort.schedule_timezone || DEFAULT_COHORT_TIMEZONE;
  const currentDate = getCurrentDateInTimeZone(timeZone, nowMs);

  return {
    currentDate,
    timeZone,
    isApplicationOpen: isDateWithinWindow(
      currentDate,
      cohort.application_open_date,
      cohort.application_close_date,
    ),
    isQualifierOpen: isDateWithinWindow(
      currentDate,
      cohort.qualifier_open_date,
      cohort.qualifier_close_date,
    ),
    isSprintActive: isDateWithinWindow(
      currentDate,
      cohort.sprint_start_date,
      cohort.sprint_end_date,
    ),
  };
}
