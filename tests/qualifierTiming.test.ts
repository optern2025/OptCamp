import { describe, expect, it } from "vitest";
import {
  getQualifierTiming,
  QUALIFIER_AVAILABILITY_WINDOW_SECONDS,
  QUALIFIER_DURATION_SECONDS,
} from "@/lib/qualifierTiming";

describe("getQualifierTiming", () => {
  it("allows starting inside the availability window", () => {
    const nowMs = Date.parse("2026-03-27T12:00:00.000Z");
    const timing = getQualifierTiming({
      appliedAt: "2026-03-27T10:00:00.000Z",
      startedAt: null,
      submittedAt: null,
      nowMs,
    });

    expect(timing.canStart).toBe(true);
    expect(timing.canResume).toBe(false);
    expect(timing.remainingAvailabilitySeconds).toBe(
      QUALIFIER_AVAILABILITY_WINDOW_SECONDS - 2 * 60 * 60,
    );
  });

  it("allows resuming an active attempt before expiry", () => {
    const nowMs = Date.parse("2026-03-27T12:00:00.000Z");
    const timing = getQualifierTiming({
      appliedAt: "2026-03-27T08:00:00.000Z",
      startedAt: "2026-03-27T11:00:00.000Z",
      submittedAt: null,
      nowMs,
    });

    expect(timing.canStart).toBe(false);
    expect(timing.canResume).toBe(true);
    expect(timing.remainingAttemptSeconds).toBe(
      QUALIFIER_DURATION_SECONDS - 60 * 60,
    );
  });

  it("marks an active attempt as expired after the duration window", () => {
    const nowMs = Date.parse("2026-03-27T15:00:01.000Z");
    const timing = getQualifierTiming({
      appliedAt: "2026-03-27T08:00:00.000Z",
      startedAt: "2026-03-27T12:00:00.000Z",
      submittedAt: null,
      nowMs,
    });

    expect(timing.attemptExpired).toBe(true);
    expect(timing.canResume).toBe(false);
  });
});
