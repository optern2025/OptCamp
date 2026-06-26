/**
 * Centralized Date Utility for OptCamp
 * Standardizes on Asia/Kolkata (IST) for display and admin inputs.
 * Database continues to store everything in UTC (timestamptz).
 */

const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Formats a UTC string/date to the standard IST display format:
 * Example: 20 Jun 2026, 10:30 AM IST
 */
export function toISTDisplay(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d) + " IST";
}

/**
 * Converts a UTC string/date to an IST datetime-local input string:
 * Example: "2026-06-20T10:30"
 */
export function utcToISTInputValue(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  // Get parts in IST
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false, // 24hr format needed for input value
  }).formatToParts(d);

  const get = (type: string) => parts.find(p => p.type === type)?.value || "00";
  
  // Format: YYYY-MM-DDTHH:mm
  // Note: Intl sometimes returns 24 as hour, we should map 24 to 00.
  let hour = get("hour");
  if (hour === "24") hour = "00";

  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/**
 * Converts an IST datetime-local input string back to a UTC ISO string.
 * Input example: "2026-06-20T10:30" -> assumes it is IST -> returns UTC string.
 */
export function istInputToUTC(istInput: string | null | undefined): string | null {
  if (!istInput) return null;
  // Format: YYYY-MM-DDTHH:mm
  const [datePart, timePart] = istInput.split("T");
  if (!datePart || !timePart) return null;

  // We append the IST offset (+05:30) so JS parses it as IST time correctly
  const isoWithOffset = `${datePart}T${timePart}:00+05:30`;
  const d = new Date(isoWithOffset);
  
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Checks if the current time is strictly within a window (inclusive).
 * Uses canonical Date objects for UTC comparison.
 */
export function isWithinWindow(now: Date, startStr: string | null | undefined, endStr: string | null | undefined): boolean {
  if (!startStr || !endStr) return false;
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;

  return now.getTime() >= start.getTime() && now.getTime() <= end.getTime();
}

/**
 * Validates a date range. Only invalid if end is strictly before start.
 */
export function validateDateRange(startStr: string | null | undefined, endStr: string | null | undefined): boolean {
  if (!startStr || !endStr) return true; // Can't validate if missing
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return true;

  return end.getTime() >= start.getTime();
}
