"use client";

import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { hasClerkPublishableKey } from "@/lib/clerkEnv";
import type { Cohort, CohortStageProgress } from "@/lib/types";

interface StagePayload {
  cohort: Cohort;
  membershipStatus: string;
  stage: CohortStageProgress;
}

interface StageGradeResponse {
  score: number;
  feedback: string;
  passed: boolean;
}

function DashboardStagePageWithAuth() {
  const searchParams = useSearchParams();
  const cohortId = searchParams.get("cohortId") ?? "";
  const stageId = searchParams.get("stageId") ?? "";

  const [payload, setPayload] = useState<StagePayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<StageGradeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadStage = useCallback(async () => {
    if (!cohortId || !stageId) {
      setErrorMessage("Missing stage selection.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/me/cohort-stage?cohortId=${encodeURIComponent(
          cohortId,
        )}&stageId=${encodeURIComponent(stageId)}`,
      );
      const data = (await response.json()) as StagePayload & { error?: string };

      if (!response.ok) {
        setPayload(null);
        setErrorMessage(data.error ?? "Unable to load stage.");
        return;
      }

      setPayload(data);
      setAnswers(
        Object.fromEntries(
          data.stage.questions.map((question) => [question.id, ""]),
        ),
      );
    } catch (error) {
      setPayload(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load stage.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [cohortId, stageId]);

  useEffect(() => {
    loadStage();
  }, [loadStage]);

  const hasSubmittedAttempt = useMemo(
    () => payload?.stage.attempt !== null,
    [payload],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!payload) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const response = await fetch("/api/me/cohort-stage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cohortId,
          stageId,
          answers: payload.stage.questions.map((question, index) => ({
            questionId: index + 1,
            question: question.prompt,
            answer: answers[question.id] ?? "",
          })),
        }),
      });

      const data = (await response.json()) as StageGradeResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to submit stage.");
      }

      setResult(data);
      await loadStage();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to submit stage.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#071018] px-4 py-10 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-cyan-300/75">
              Cohort Stage
            </p>
            <h1 className="mt-2 text-4xl font-black uppercase italic tracking-tight">
              Progressive Test
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
                Loading stage environment...
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
                  Stage {payload.stage.stage_number}: {payload.stage.title}
                </h2>
                <p className="mt-4 max-w-3xl text-sm font-bold uppercase tracking-[0.16em] text-white/60">
                  {payload.stage.description}
                </p>
                <div className="mt-6 flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-white/50">
                  <span>
                    {payload.stage.duration_minutes} minute suggested window
                  </span>
                  <span>{payload.stage.questions.length} prompts</span>
                  <span>status {payload.stage.status}</span>
                </div>
              </section>

              {payload.stage.attempt && (
                <section className="rounded-[24px] border border-emerald-400/30 bg-emerald-400/10 p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-100/80">
                    Latest Attempt
                  </p>
                  <p className="mt-3 text-3xl font-black tracking-tight">
                    {payload.stage.attempt.score}/100
                  </p>
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-emerald-50/80">
                    {payload.stage.attempt.feedback}
                  </p>
                </section>
              )}

              <form
                onSubmit={handleSubmit}
                className="space-y-6 rounded-[28px] border border-white/10 bg-black/20 p-8"
              >
                {payload.stage.questions.map((question, index) => (
                  <article key={question.id} className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300/80">
                      Prompt {index + 1}
                    </p>
                    <h3 className="text-2xl font-black uppercase tracking-tight">
                      {question.prompt}
                    </h3>
                    {question.guidance && (
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                        {question.guidance}
                      </p>
                    )}
                    <textarea
                      required
                      rows={7}
                      value={answers[question.id] ?? ""}
                      onChange={(event) =>
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: event.target.value,
                        }))
                      }
                      className="w-full rounded-[20px] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white outline-none transition-colors focus:border-cyan-400"
                      placeholder="Write your response here..."
                    />
                  </article>
                ))}

                {result && (
                  <div
                    className={`rounded-[20px] border p-5 ${
                      result.passed
                        ? "border-emerald-400/30 bg-emerald-400/10"
                        : "border-amber-400/30 bg-amber-400/10"
                    }`}
                  >
                    <p className="text-3xl font-black tracking-tight">
                      {result.score}/100
                    </p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-white/75">
                      {result.feedback}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-cyan-400 px-6 py-3 text-xs font-black uppercase tracking-[0.24em] text-black transition-colors hover:bg-cyan-300 disabled:opacity-70"
                  >
                    {isSubmitting
                      ? "Submitting Stage"
                      : hasSubmittedAttempt
                        ? "Submit New Attempt"
                        : "Submit Stage"}
                  </button>
                  <Link
                    href="/dashboard"
                    className="border border-white/10 px-6 py-3 text-xs font-black uppercase tracking-[0.24em] text-white/70 transition-colors hover:border-white/25 hover:text-white"
                  >
                    Return to Dashboard
                  </Link>
                </div>
              </form>
            </>
          )}
        </SignedIn>
      </div>
    </main>
  );
}

export default function DashboardStagePage() {
  if (!hasClerkPublishableKey) {
    return (
      <main className="min-h-screen bg-[#071018] px-4 py-10 text-white">
        <section className="mx-auto max-w-4xl rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-8">
          <h1 className="text-3xl font-black uppercase tracking-tight">
            Stage access is unavailable
          </h1>
          <p className="mt-4 text-sm font-bold uppercase tracking-[0.16em] text-white/65">
            Add <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> to render the
            authenticated stage flow in this deployment.
          </p>
        </section>
      </main>
    );
  }

  return <DashboardStagePageWithAuth />;
}
