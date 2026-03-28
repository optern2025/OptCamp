"use client";

import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ConfettiBurst } from "@/app/components/ConfettiBurst";
import { hasClerkPublishableKey } from "@/lib/clerkEnv";
import type { Cohort, SprintDayProgress } from "@/lib/types";

interface SprintDayPayload {
  cohort: Cohort;
  membershipStatus: string;
  sprintDay: SprintDayProgress;
  isFinalSprintDay: boolean;
}

interface SubmissionResponse {
  status: "submitted";
  submittedAt: string;
}

function SprintDayPageWithAuth() {
  const searchParams = useSearchParams();
  const cohortId = searchParams.get("cohortId") ?? "";
  const sprintDayId = searchParams.get("sprintDayId") ?? "";

  const [payload, setPayload] = useState<SprintDayPayload | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [submissionStatus, setSubmissionStatus] =
    useState<SubmissionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const loadSprintDay = useCallback(async () => {
    if (!cohortId || !sprintDayId) {
      setErrorMessage("Missing sprint day selection.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/me/sprint-day?cohortId=${encodeURIComponent(
          cohortId,
        )}&sprintDayId=${encodeURIComponent(sprintDayId)}`,
      );
      const data = (await response.json()) as SprintDayPayload & {
        error?: string;
      };

      if (!response.ok) {
        setPayload(null);
        setErrorMessage(data.error ?? "Unable to load sprint day.");
        return;
      }

      setPayload(data);
      setGithubUrl(data.sprintDay.submission?.github_url ?? "");
      setSubmissionStatus(
        data.sprintDay.submission
          ? {
              status: "submitted",
              submittedAt: data.sprintDay.submission.submitted_at,
            }
          : null,
      );
    } catch (error) {
      setPayload(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load sprint day.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [cohortId, sprintDayId]);

  useEffect(() => {
    loadSprintDay();
  }, [loadSprintDay]);

  useEffect(() => {
    if (!payload) {
      return;
    }

    const shouldCelebrate =
      payload.isFinalSprintDay &&
      payload.membershipStatus === "completed" &&
      payload.sprintDay.submission !== null;

    if (!shouldCelebrate) {
      setShowConfetti(false);
      return;
    }

    setShowConfetti(true);
    const timeoutId = window.setTimeout(() => {
      setShowConfetti(false);
    }, 5200);

    return () => window.clearTimeout(timeoutId);
  }, [payload]);

  const handleSubmit = async () => {
    if (!payload || payload.sprintDay.submission) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/me/sprint-day", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cohortId,
          sprintDayId,
          githubUrl,
        }),
      });

      const data = (await response.json()) as SubmissionResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to submit sprint day.");
      }

      setSubmissionStatus(data);
      await loadSprintDay();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to submit sprint day.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#071018] px-4 py-10 text-white">
      <ConfettiBurst active={showConfetti} />
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-cyan-300/75">
              Sprint Submission
            </p>
            <h1 className="mt-2 text-4xl font-black uppercase italic tracking-tight">
              Daily GitHub Delivery
            </h1>
          </div>
          <Link
            href="/dashboard"
            className="border border-cyan-400 px-5 py-3 text-xs font-black uppercase tracking-[0.24em] text-cyan-300 transition-colors hover:bg-cyan-400 hover:text-black"
          >
            Back Dashboard
          </Link>
        </div>

        <SignedOut>
          <section className="rounded-[24px] border border-white/10 bg-black/30 p-8">
            <h2 className="text-2xl font-black uppercase tracking-tight">
              Sign in to continue
            </h2>
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
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-white/55">
                Loading sprint day...
              </p>
            </section>
          )}

          {errorMessage && (
            <section className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-6">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-200">
                {errorMessage}
              </p>
            </section>
          )}

          {payload && (
            <>
              <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-8">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300/80">
                  {payload.cohort.type}
                </p>
                <h2 className="mt-3 text-4xl font-black uppercase tracking-tight">
                  Day {payload.sprintDay.day_number}: {payload.sprintDay.title}
                </h2>
                <p className="mt-4 text-sm font-bold uppercase tracking-[0.16em] text-white/60">
                  {payload.sprintDay.description}
                </p>
                <div className="mt-6 rounded-[20px] border border-white/10 bg-black/20 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">
                    Task Brief
                  </p>
                  <p className="mt-3 text-sm text-white/85">
                    {payload.sprintDay.brief}
                  </p>
                </div>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-black/20 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300/80">
                      Submission
                    </p>
                    <h3 className="mt-2 text-2xl font-black uppercase tracking-tight">
                      GitHub Project Link
                    </h3>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/60">
                    {payload.sprintDay.submission
                      ? "Submitted"
                      : payload.sprintDay.status}
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  <FieldLike label="Repository URL">
                    <input
                      value={githubUrl}
                      onChange={(event) => setGithubUrl(event.target.value)}
                      disabled={Boolean(payload.sprintDay.submission)}
                      placeholder="https://github.com/your-org/your-project"
                      className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300 disabled:opacity-60"
                    />
                  </FieldLike>

                  <p className="text-xs uppercase tracking-[0.16em] text-white/50">
                    Your link is stored for admin review. Numeric scores are not
                    shown here.
                  </p>

                  {submissionStatus && (
                    <div className="rounded-[18px] border border-emerald-400/30 bg-emerald-400/10 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-100">
                        Submission received
                      </p>
                      <p className="mt-2 text-sm text-white/80">
                        Submitted at{" "}
                        {new Date(
                          submissionStatus.submittedAt,
                        ).toLocaleString()}
                      </p>
                      {payload.isFinalSprintDay &&
                        payload.membershipStatus === "completed" && (
                          <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
                            Final sprint day complete
                          </p>
                        )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={
                      isSubmitting ||
                      Boolean(payload.sprintDay.submission) ||
                      githubUrl.trim().length === 0
                    }
                    className="inline-flex rounded-full bg-cyan-300 px-5 py-3 text-xs font-black uppercase tracking-[0.24em] text-black transition-colors hover:bg-cyan-200 disabled:opacity-60"
                  >
                    {payload.sprintDay.submission
                      ? "Already Submitted"
                      : isSubmitting
                        ? "Submitting..."
                        : "Submit GitHub Link"}
                  </button>
                </div>
              </section>
            </>
          )}
        </SignedIn>
      </div>
    </main>
  );
}

function FieldLike({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <span className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">
        {label}
      </span>
      {children}
    </div>
  );
}

export default function SprintDayPage() {
  if (!hasClerkPublishableKey) {
    return (
      <main className="min-h-screen bg-[#071018] px-4 py-10 text-white">
        <section className="mx-auto max-w-4xl rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-8">
          <h1 className="text-3xl font-black uppercase tracking-tight">
            Sprint access is unavailable
          </h1>
          <p className="mt-4 text-sm font-bold uppercase tracking-[0.16em] text-white/65">
            Add <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> to render the
            authenticated sprint flow in this deployment.
          </p>
        </section>
      </main>
    );
  }

  return (
    <Suspense fallback={null}>
      <SprintDayPageWithAuth />
    </Suspense>
  );
}
