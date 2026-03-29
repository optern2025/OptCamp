"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  useUser,
} from "@clerk/nextjs";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { canAccessAdmin } from "@/lib/adminAccess";
import { hasClerkPublishableKey } from "@/lib/clerkEnv";
import {
  formatDateRangeLabel,
  getCohortTimelineState,
} from "@/lib/cohortSchedule";
import { getQualifierTiming } from "@/lib/qualifierTiming";
import type {
  CohortMembership,
  DashboardPayload,
  SprintDayProgress,
} from "@/lib/types";

function getMembershipTone(status: CohortMembership["status"]) {
  switch (status) {
    case "completed":
      return "border-emerald-400/50 bg-emerald-400/10 text-emerald-200";
    case "enrolled":
      return "border-cyan-400/50 bg-cyan-400/10 text-cyan-200";
    case "qualifier_failed":
      return "border-amber-400/50 bg-amber-400/10 text-amber-200";
    case "qualifier_in_progress":
      return "border-sky-400/50 bg-sky-400/10 text-sky-200";
    default:
      return "border-white/10 bg-white/5 text-white/70";
  }
}

function formatStatus(status: CohortMembership["status"]) {
  return status.replaceAll("_", " ");
}

function findCurrentSprintDay(sprintDays: SprintDayProgress[]) {
  return (
    sprintDays.find((sprintDay) => sprintDay.status === "unlocked") ??
    sprintDays.find((sprintDay) => sprintDay.status === "submitted") ??
    sprintDays.find((sprintDay) => sprintDay.status === "reviewed") ??
    null
  );
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function getQualifierState(membership: CohortMembership) {
  return getQualifierTiming({
    appliedAt: membership.applied_at,
    startedAt: membership.qualifier_started_at,
    submittedAt: membership.qualifier_submitted_at,
  });
}

function nextAction(membership: CohortMembership) {
  const qualifierState = getQualifierState(membership);
  const timeline = getCohortTimelineState(membership.cohort);

  if (
    (timeline.isQualifierOpen && qualifierState.canStart) ||
    (qualifierState.canResume && membership.status === "qualifier_in_progress")
  ) {
    return {
      label:
        membership.status === "qualifier_in_progress"
          ? "Resume Qualifier"
          : "Start Qualifier",
      href: `/cohort-test/proctor?cohortId=${membership.cohort.id}`,
    };
  }

  const sprintDay = findCurrentSprintDay(membership.sprint_days);
  if (sprintDay) {
    return {
      label:
        sprintDay.submission !== null
          ? `View Day ${sprintDay.day_number}`
          : `Open Day ${sprintDay.day_number}`,
      href: `/dashboard/sprint-day?cohortId=${membership.cohort.id}&sprintDayId=${sprintDay.id}`,
    };
  }

  return null;
}

function getQualifierGateMessage(membership: CohortMembership) {
  const qualifierState = getQualifierState(membership);
  const timeline = getCohortTimelineState(membership.cohort);

  if (qualifierState.canResume) {
    return `Qualifier in progress. ${formatDuration(
      qualifierState.remainingAttemptSeconds,
    )} remaining in the 3-hour attempt.`;
  }

  if (qualifierState.canStart) {
    if (!timeline.isQualifierOpen) {
      return `Qualifier round runs from ${formatDateRangeLabel(
        membership.cohort.qualifier_open_date,
        membership.cohort.qualifier_close_date,
      )}.`;
    }

    return `Qualifier available for ${formatDuration(
      qualifierState.remainingAvailabilitySeconds,
    )} more from your 48-hour signup window.`;
  }

  if (qualifierState.attemptExpired) {
    return "Your 3-hour qualifier time limit has expired.";
  }

  if (qualifierState.availabilityExpired) {
    return "Your 48-hour qualifier access window has ended.";
  }

  if (membership.status === "qualifier_failed") {
    return "Qualifier submitted. Your status has been updated and your result is recorded internally.";
  }

  if (membership.status === "enrolled" || membership.status === "completed") {
    return "Qualifier cleared. Continue with your sprint submissions.";
  }

  return "Complete the qualifier to unlock your sprint submission days.";
}

function DashboardPageWithAuth() {
  const { user } = useUser();
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canViewAdminLink = canAccessAdmin(
    user?.primaryEmailAddress?.emailAddress ?? "",
  );

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/me/dashboard");
      const data = (await response.json()) as DashboardPayload & {
        error?: string;
      };

      if (response.status === 401) {
        setPayload(null);
        return;
      }

      if (!response.ok) {
        setPayload(null);
        setErrorMessage(data.error ?? "Failed to load your dashboard.");
        return;
      }

      setPayload(data);
    } catch (error) {
      setPayload(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load your dashboard.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const availableCohorts = useMemo(() => payload?.cohorts ?? [], [payload]);
  const memberships = useMemo(() => payload?.memberships ?? [], [payload]);
  const isSingleMembership = memberships.length === 1;

  return (
    <main className="min-h-screen bg-[#061018] text-white">
      <SignedOut>
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <section className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-cyan-500/20 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.15),_transparent_40%),linear-gradient(135deg,#08131d_0%,#05080c_100%)] p-12 text-center md:p-20">
            <div className="space-y-6">
              <p className="text-[12px] font-black tracking-[0.4em] text-cyan-300/80">
                Authentication Required
              </p>
              <h2 className="text-5xl font-black uppercase italic tracking-tight md:text-7xl">
                Your Sprint <br />
                <span className="text-cyan-400">Starts Here.</span>
              </h2>
              <p className="mx-auto max-w-lg text-sm font-bold tracking-[0.2em] text-white/55">
                Sign in to open your dashboard, track applications, and unlock
                your cohort progression.
              </p>
            </div>

            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="w-full bg-cyan-400 px-10 py-5 text-sm font-black tracking-[0.24em] text-black transition-all hover:scale-105 hover:bg-cyan-300 sm:w-auto"
                >
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="w-full border border-cyan-400 px-10 py-5 text-sm font-black tracking-[0.24em] text-cyan-300 transition-all hover:scale-105 hover:bg-cyan-400 hover:text-black sm:w-auto"
                >
                  Create Account
                </button>
              </SignUpButton>
            </div>

            <div className="mt-12">
              <Link
                href="/"
                className="text-xs font-black tracking-[0.3em] text-white/30 transition-colors hover:text-white"
              >
                ← Back to Home
              </Link>
            </div>
          </section>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="mx-auto max-w-7xl space-y-8 px-4 py-12">
          <header className="overflow-hidden rounded-[28px] border border-cyan-500/20 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.24),_transparent_28%),linear-gradient(135deg,#08131d_0%,#05080c_100%)] p-8 md:p-10">
            <div className="mb-8 flex items-center">
              <Link
                href="/"
                aria-label="Back to home"
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/70 transition-colors hover:border-white/30 hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowLeft size={18} />
              </Link>
            </div>
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="space-y-4">
                <p className="text-[11px] font-black tracking-[0.35em] text-cyan-300/80">
                  Cohort Center
                </p>
                <h1 className="text-4xl font-black uppercase italic tracking-tight md:text-6xl">
                  Your Cohorts. Your Progress.
                </h1>
                <p className="max-w-2xl text-sm font-bold tracking-[0.18em] text-white/55">
                  Track applications, clear the qualifier, and submit your
                  sprint deliverables one day at a time.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/?apply=1"
                  className="inline-flex items-center gap-2 border border-cyan-400 px-5 py-3 text-xs font-black tracking-[0.24em] text-cyan-300 transition-colors hover:bg-cyan-400 hover:text-black"
                >
                  Apply to Another Cohort <ArrowRight size={14} />
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 border border-white/10 px-5 py-3 text-xs font-black tracking-[0.24em] text-white/70 transition-colors hover:border-white/30 hover:text-white"
                >
                  Back Home
                </Link>
                {canViewAdminLink ? (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-2 border border-white/10 px-5 py-3 text-xs font-black tracking-[0.24em] text-white/70 transition-colors hover:border-white/30 hover:text-white"
                  >
                    Content Admin
                  </Link>
                ) : null}
              </div>
            </div>
          </header>

          {isLoading && (
            <section className="rounded-[24px] border border-white/10 bg-black/30 p-8">
              <p className="text-sm font-bold tracking-[0.24em] text-white/55">
                Loading dashboard telemetry...
              </p>
            </section>
          )}

          {!isLoading && errorMessage && (
            <section className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-8">
              <p className="text-xs font-black tracking-[0.24em] text-red-200">
                {errorMessage}
              </p>
            </section>
          )}

          {!isLoading && payload && (
            <div className="space-y-8">
              <section className="grid gap-4 md:grid-cols-4">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-[10px] font-black tracking-[0.28em] text-white/45">
                    Candidate
                  </p>
                  <p className="mt-3 text-xl font-black uppercase tracking-tight">
                    {payload.user.name}
                  </p>
                  <p className="mt-1 text-xs font-bold tracking-[0.18em] text-cyan-300/80">
                    {payload.user.email}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-[10px] font-black tracking-[0.28em] text-white/45">
                    Applied Cohorts
                  </p>
                  <p className="mt-3 text-4xl font-black tracking-tight">
                    {payload.summary.appliedCount}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-[10px] font-black tracking-[0.28em] text-white/45">
                    Enrolled
                  </p>
                  <p className="mt-3 text-4xl font-black tracking-tight">
                    {payload.summary.enrolledCount}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-[10px] font-black tracking-[0.28em] text-white/45">
                    Sprint Days Submitted
                  </p>
                  <p className="mt-3 text-4xl font-black tracking-tight">
                    {payload.summary.completedStageCount}
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight">
                      Joined Cohorts
                    </h2>
                    <p className="mt-2 text-xs font-bold tracking-[0.2em] text-white/50">
                      Each card shows your current gateway into that sprint.
                    </p>
                  </div>
                </div>

                {memberships.length === 0 && (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 p-10 text-center">
                    <p className="text-sm font-black tracking-[0.24em] text-white/60">
                      No cohorts joined yet.
                    </p>
                    <Link
                      href="/?apply=1"
                      className="mt-6 inline-flex items-center gap-2 border border-cyan-400 px-5 py-3 text-xs font-black tracking-[0.24em] text-cyan-300 transition-colors hover:bg-cyan-400 hover:text-black"
                    >
                      Apply Now <ArrowRight size={14} />
                    </Link>
                  </div>
                )}

                <div
                  className={`grid gap-5 ${
                    isSingleMembership ? "mx-auto max-w-5xl" : "xl:grid-cols-2"
                  }`}
                >
                  {memberships.map((membership) => {
                    const action = nextAction(membership);
                    const sprintProgressionBlock = (
                      <div
                        className={`rounded-[24px] border border-white/10 bg-black/20 p-5 ${
                          isSingleMembership ? "mt-0 lg:mt-0 lg:h-full" : "mt-6"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <h4 className="text-sm font-black tracking-[0.22em]">
                            Sprint Progression
                          </h4>
                        </div>
                        <div className="mt-5 grid gap-3">
                          {membership.sprint_days.map((sprintDay) => (
                            <div
                              key={sprintDay.id}
                              className={`rounded-2xl border p-4 ${
                                sprintDay.status === "reviewed"
                                  ? "border-emerald-400/40 bg-emerald-400/10"
                                  : sprintDay.status === "submitted"
                                    ? "border-amber-400/40 bg-amber-400/10"
                                    : sprintDay.status === "unlocked"
                                      ? "border-cyan-400/40 bg-cyan-400/10"
                                      : "border-white/10 bg-white/[0.03]"
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-[10px] font-black tracking-[0.28em] text-white/45">
                                    Day {sprintDay.day_number}
                                  </p>
                                  <p className="mt-2 text-lg font-black uppercase tracking-tight">
                                    {sprintDay.title}
                                  </p>
                                </div>
                                <span className="text-[10px] font-black tracking-[0.24em] text-white/60">
                                  {sprintDay.status}
                                </span>
                              </div>
                              <p className="mt-3 text-xs font-bold tracking-[0.16em] text-white/55">
                                {sprintDay.description}
                              </p>
                              {sprintDay.status !== "locked" && (
                                <Link
                                  href={`/dashboard/sprint-day?cohortId=${membership.cohort.id}&sprintDayId=${sprintDay.id}`}
                                  className="mt-4 inline-flex items-center gap-2 text-xs font-black tracking-[0.24em] text-cyan-300 transition-colors hover:text-cyan-200"
                                >
                                  {sprintDay.submission
                                    ? "View Submission"
                                    : "Open Day"}
                                  <ArrowRight size={14} />
                                </Link>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );

                    const heroColumn = (
                      <div
                        className={isSingleMembership ? "space-y-6" : undefined}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-black tracking-[0.3em] text-cyan-300/80">
                              {membership.cohort.slug}
                            </p>
                            <h3 className="mt-2 text-3xl font-black uppercase tracking-tight">
                              {membership.cohort.type}
                            </h3>
                          </div>
                          <span
                            className={`rounded-full border px-3 py-2 text-[10px] font-black tracking-[0.24em] ${getMembershipTone(
                              membership.status,
                            )}`}
                          >
                            {formatStatus(membership.status)}
                          </span>
                        </div>

                        <div className="mt-6 grid gap-3 md:grid-cols-3">
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <p className="text-[10px] font-black tracking-[0.24em] text-white/40">
                              Application
                            </p>
                            <p className="mt-3 text-sm font-black tracking-[0.16em] text-white/80">
                              {membership.cohort.apply_window}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <p className="text-[10px] font-black tracking-[0.24em] text-white/40">
                              Sprint
                            </p>
                            <p className="mt-3 text-sm font-black tracking-[0.16em] text-white/80">
                              {membership.cohort.sprint_window}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <p className="text-[10px] font-black tracking-[0.24em] text-white/40">
                              Qualifier
                            </p>
                            <p className="mt-3 text-sm font-black tracking-[0.16em] text-white/80">
                              {membership.qualifier_submitted_at
                                ? membership.status === "enrolled" ||
                                  membership.status === "completed"
                                  ? "Passed"
                                  : membership.status === "qualifier_failed"
                                    ? "Failed"
                                    : "Submitted"
                                : "Pending"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-5">
                          <div className="flex items-center gap-3">
                            <ShieldCheck className="text-cyan-300" size={18} />
                            <h4 className="text-sm font-black tracking-[0.22em]">
                              Qualifier Gate
                            </h4>
                          </div>
                          <p className="mt-3 text-sm font-bold tracking-[0.16em] text-white/65">
                            {getQualifierGateMessage(membership)}
                          </p>
                          {action && (
                            <Link
                              href={action.href}
                              className="mt-5 inline-flex items-center gap-2 bg-cyan-400 px-5 py-3 text-xs font-black tracking-[0.24em] text-black transition-colors hover:bg-cyan-300"
                            >
                              {action.label} <ArrowRight size={14} />
                            </Link>
                          )}
                        </div>

                        {!isSingleMembership && sprintProgressionBlock}
                      </div>
                    );

                    return (
                      <article
                        key={membership.cohort.id}
                        className={`rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-7 ${
                          isSingleMembership
                            ? "lg:grid lg:grid-cols-[1.2fr,0.9fr] lg:items-start lg:gap-6"
                            : ""
                        }`}
                      >
                        {isSingleMembership ? (
                          <>
                            {heroColumn}
                            {sprintProgressionBlock}
                          </>
                        ) : (
                          heroColumn
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-black/20 p-7">
                <h2 className="text-2xl font-black uppercase tracking-tight">
                  Available Cohorts
                </h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {availableCohorts.map((cohort) => (
                    <div
                      key={cohort.id}
                      className={`rounded-[22px] border p-5 ${
                        cohort.is_active
                          ? "border-cyan-400/40 bg-cyan-400/10"
                          : "border-white/10 bg-white/[0.03]"
                      }`}
                    >
                      <p className="text-xl font-black uppercase tracking-tight">
                        {cohort.type}
                      </p>
                      <div className="mt-4 space-y-2 text-[10px] font-black tracking-[0.2em] text-white/55">
                        <p>Apps {cohort.apply_window}</p>
                        <p>Sprint {cohort.sprint_window}</p>
                        <p>Results {cohort.results_on}</p>
                        <p>Apply By {cohort.apply_by}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </SignedIn>
    </main>
  );
}

export default function DashboardPage() {
  if (!hasClerkPublishableKey) {
    return (
      <main className="min-h-screen bg-[#061018] px-4 py-12 text-white">
        <section className="mx-auto max-w-4xl rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-8">
          <h1 className="text-3xl font-black uppercase tracking-tight">
            Dashboard auth is not configured
          </h1>
          <p className="mt-4 text-sm font-bold tracking-[0.16em] text-white/65">
            Set <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> in the deployment
            environment to enable the protected dashboard.
          </p>
        </section>
      </main>
    );
  }

  return <DashboardPageWithAuth />;
}
