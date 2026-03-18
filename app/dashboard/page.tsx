"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Clock3, Layers3, ShieldCheck } from "lucide-react";
import type { DashboardPayload, CohortMembership, CohortStageProgress } from "@/lib/types";

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

function findCurrentStage(stages: CohortStageProgress[]) {
  return stages.find((stage) => stage.status === "unlocked") ?? null;
}

function nextAction(membership: CohortMembership) {
  if (
    membership.status === "applied" ||
    membership.status === "qualifier_in_progress" ||
    membership.status === "qualifier_failed"
  ) {
    return {
      label:
        membership.status === "qualifier_failed"
          ? "Retry Qualifier"
          : "Start Qualifier",
      href: `/cohort-test/proctor?cohortId=${membership.cohort.id}`,
    };
  }

  const stage = findCurrentStage(membership.stages);
  if (stage) {
    return {
      label: `Open Stage ${stage.stage_number}`,
      href: `/dashboard/stage?cohortId=${membership.cohort.id}&stageId=${stage.id}`,
    };
  }

  return null;
}

export default function DashboardPage() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/me/dashboard");
      const data = (await response.json()) as DashboardPayload & { error?: string };

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
        error instanceof Error ? error.message : "Failed to load your dashboard.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const availableCohorts = useMemo(() => payload?.cohorts ?? [], [payload]);

  return (
    <main className="min-h-screen bg-[#061018] text-white px-4 py-12">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="overflow-hidden rounded-[28px] border border-cyan-500/20 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.24),_transparent_28%),linear-gradient(135deg,#08131d_0%,#05080c_100%)] p-8 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-4">
              <p className="text-[11px] font-black uppercase tracking-[0.35em] text-cyan-300/80">
                Cohort Command Center
              </p>
              <h1 className="text-4xl font-black uppercase italic tracking-tight md:text-6xl">
                Your Cohorts. Your Progress.
              </h1>
              <p className="max-w-2xl text-sm font-bold uppercase tracking-[0.18em] text-white/55">
                Track applications, clear the qualifier, and unlock the sprint stages one by one.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/?apply=1"
                className="inline-flex items-center gap-2 border border-cyan-400 px-5 py-3 text-xs font-black uppercase tracking-[0.24em] text-cyan-300 transition-colors hover:bg-cyan-400 hover:text-black"
              >
                Apply to Another Cohort <ArrowRight size={14} />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 border border-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.24em] text-white/70 transition-colors hover:border-white/30 hover:text-white"
              >
                Back Home
              </Link>
            </div>
          </div>
        </header>

        <SignedOut>
          <section className="rounded-[24px] border border-white/10 bg-black/30 p-8">
            <h2 className="text-2xl font-black uppercase tracking-tight">
              Sign in to open your dashboard
            </h2>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-white/55">
              Your applications, qualifier state, and cohort stages live behind your account.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="bg-cyan-400 px-6 py-3 text-xs font-black uppercase tracking-[0.24em] text-black transition-colors hover:bg-cyan-300"
                >
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="border border-cyan-400 px-6 py-3 text-xs font-black uppercase tracking-[0.24em] text-cyan-300 transition-colors hover:bg-cyan-400 hover:text-black"
                >
                  Create Account
                </button>
              </SignUpButton>
            </div>
          </section>
        </SignedOut>

        <SignedIn>
          {isLoading && (
            <section className="rounded-[24px] border border-white/10 bg-black/30 p-8">
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-white/55">
                Loading dashboard telemetry...
              </p>
            </section>
          )}

          {!isLoading && errorMessage && (
            <section className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-8">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-red-200">
                {errorMessage}
              </p>
            </section>
          )}

          {!isLoading && payload && (
            <div className="space-y-8">
              <section className="grid gap-4 md:grid-cols-4">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
                    Candidate
                  </p>
                  <p className="mt-3 text-xl font-black uppercase tracking-tight">
                    {payload.user.name}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/80">
                    {payload.user.email}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
                    Applied Cohorts
                  </p>
                  <p className="mt-3 text-4xl font-black tracking-tight">
                    {payload.summary.appliedCount}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
                    Enrolled
                  </p>
                  <p className="mt-3 text-4xl font-black tracking-tight">
                    {payload.summary.enrolledCount}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
                    Stages Cleared
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
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                      Each card shows your current gateway into that sprint.
                    </p>
                  </div>
                </div>

                {payload.memberships.length === 0 && (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 p-10 text-center">
                    <p className="text-sm font-black uppercase tracking-[0.24em] text-white/60">
                      No cohorts joined yet.
                    </p>
                    <Link
                      href="/?apply=1"
                      className="mt-6 inline-flex items-center gap-2 border border-cyan-400 px-5 py-3 text-xs font-black uppercase tracking-[0.24em] text-cyan-300 transition-colors hover:bg-cyan-400 hover:text-black"
                    >
                      Apply Now <ArrowRight size={14} />
                    </Link>
                  </div>
                )}

                <div className="grid gap-5 xl:grid-cols-2">
                  {payload.memberships.map((membership) => {
                    const action = nextAction(membership);

                    return (
                      <article
                        key={membership.cohort.id}
                        className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-7"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300/80">
                              {membership.cohort.slug}
                            </p>
                            <h3 className="mt-2 text-3xl font-black uppercase tracking-tight">
                              {membership.cohort.type}
                            </h3>
                          </div>
                          <span
                            className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.24em] ${getMembershipTone(
                              membership.status,
                            )}`}
                          >
                            {formatStatus(membership.status)}
                          </span>
                        </div>

                        <div className="mt-6 grid gap-3 md:grid-cols-3">
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">
                              Application
                            </p>
                            <p className="mt-3 text-sm font-black uppercase tracking-[0.16em] text-white/80">
                              {membership.cohort.apply_window}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">
                              Sprint
                            </p>
                            <p className="mt-3 text-sm font-black uppercase tracking-[0.16em] text-white/80">
                              {membership.cohort.sprint_window}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">
                              Qualifier
                            </p>
                            <p className="mt-3 text-sm font-black uppercase tracking-[0.16em] text-white/80">
                              {membership.latest_qualifier_attempt
                                ? `${membership.latest_qualifier_attempt.score}/100`
                                : "Pending"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-5">
                          <div className="flex items-center gap-3">
                            <ShieldCheck className="text-cyan-300" size={18} />
                            <h4 className="text-sm font-black uppercase tracking-[0.22em]">
                              Qualifier Gate
                            </h4>
                          </div>
                          <p className="mt-3 text-sm font-bold uppercase tracking-[0.16em] text-white/65">
                            {membership.latest_qualifier_attempt?.feedback ??
                              "Complete the proctored qualifier to unlock cohort stages."}
                          </p>
                          {action && (
                            <Link
                              href={action.href}
                              className="mt-5 inline-flex items-center gap-2 bg-cyan-400 px-5 py-3 text-xs font-black uppercase tracking-[0.24em] text-black transition-colors hover:bg-cyan-300"
                            >
                              {action.label} <ArrowRight size={14} />
                            </Link>
                          )}
                        </div>

                        <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-5">
                          <div className="flex items-center gap-3">
                            <Layers3 className="text-cyan-300" size={18} />
                            <h4 className="text-sm font-black uppercase tracking-[0.22em]">
                              Stage Progression
                            </h4>
                          </div>
                          <div className="mt-5 grid gap-3">
                            {membership.stages.map((stage) => (
                              <div
                                key={stage.id}
                                className={`rounded-2xl border p-4 ${
                                  stage.status === "passed"
                                    ? "border-emerald-400/40 bg-emerald-400/10"
                                    : stage.status === "unlocked"
                                      ? "border-cyan-400/40 bg-cyan-400/10"
                                      : "border-white/10 bg-white/[0.03]"
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
                                      Stage {stage.stage_number}
                                    </p>
                                    <p className="mt-2 text-lg font-black uppercase tracking-tight">
                                      {stage.title}
                                    </p>
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">
                                    {stage.status}
                                  </span>
                                </div>
                                <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-white/55">
                                  {stage.description}
                                </p>
                                <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
                                  <span className="inline-flex items-center gap-2">
                                    <Clock3 size={12} /> {stage.duration_minutes} min
                                  </span>
                                  {stage.attempt && (
                                    <span className="inline-flex items-center gap-2">
                                      <CheckCircle2 size={12} /> {stage.attempt.score}/100
                                    </span>
                                  )}
                                </div>
                                {stage.status !== "locked" && (
                                  <Link
                                    href={`/dashboard/stage?cohortId=${membership.cohort.id}&stageId=${stage.id}`}
                                    className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-cyan-300 transition-colors hover:text-cyan-200"
                                  >
                                    {stage.status === "passed" ? "Review Stage" : "Open Stage"}
                                    <ArrowRight size={14} />
                                  </Link>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
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
                      <div className="mt-4 space-y-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/55">
                        <p>Apps {cohort.apply_window}</p>
                        <p>Sprint {cohort.sprint_window}</p>
                        <p>Apply By {cohort.apply_by}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </SignedIn>
      </div>
    </main>
  );
}
