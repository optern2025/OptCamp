export const QUALIFIER_AVAILABILITY_WINDOW_SECONDS = 48 * 60 * 60;
export const QUALIFIER_DURATION_SECONDS = 3 * 60 * 60;

interface QualifierTimingInput {
  appliedAt: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  nowMs?: number;
}

function parseTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function formatIso(timestampMs: number | null): string | null {
  return timestampMs === null ? null : new Date(timestampMs).toISOString();
}

export function getQualifierTiming(input: QualifierTimingInput) {
  const nowMs = input.nowMs ?? Date.now();
  const appliedAtMs = parseTimestamp(input.appliedAt);
  const startedAtMs = parseTimestamp(input.startedAt);
  const submittedAtMs = parseTimestamp(input.submittedAt);

  const availabilityEndsAtMs =
    appliedAtMs === null
      ? null
      : appliedAtMs + QUALIFIER_AVAILABILITY_WINDOW_SECONDS * 1000;
  const attemptEndsAtMs =
    startedAtMs === null
      ? null
      : startedAtMs + QUALIFIER_DURATION_SECONDS * 1000;

  const remainingAvailabilitySeconds =
    availabilityEndsAtMs === null
      ? 0
      : Math.max(0, Math.floor((availabilityEndsAtMs - nowMs) / 1000));
  const remainingAttemptSeconds =
    attemptEndsAtMs === null
      ? 0
      : Math.max(0, Math.floor((attemptEndsAtMs - nowMs) / 1000));

  const hasSubmitted = submittedAtMs !== null;
  const hasStarted = startedAtMs !== null;
  const availabilityExpired =
    !hasStarted &&
    !hasSubmitted &&
    availabilityEndsAtMs !== null &&
    nowMs >= availabilityEndsAtMs;
  const attemptExpired =
    hasStarted &&
    !hasSubmitted &&
    attemptEndsAtMs !== null &&
    nowMs >= attemptEndsAtMs;

  return {
    hasStarted,
    hasSubmitted,
    availabilityExpired,
    attemptExpired,
    canStart: !hasStarted && !hasSubmitted && !availabilityExpired,
    canResume: hasStarted && !hasSubmitted && !attemptExpired,
    remainingAvailabilitySeconds,
    remainingAttemptSeconds,
    availabilityEndsAt: formatIso(availabilityEndsAtMs),
    attemptEndsAt: formatIso(attemptEndsAtMs),
  };
}
