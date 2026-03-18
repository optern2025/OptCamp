"use client";

import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, ShieldCheck, TimerReset } from "lucide-react";
import { hasClerkPublishableKey } from "@/lib/clerkEnv";

interface ProctorQuestion {
  id: number;
  text: string;
}

interface ProctorExamPayload {
  cohortId: string;
  examId: string;
  subject: string;
  cohortType: string;
  durationSeconds: number;
  questions: ProctorQuestion[];
}

interface GradeResponse {
  score: number;
  feedback: string;
  passed: boolean;
}

type PortalState = "loading" | "ready" | "exam" | "results";

function QualifierPageWithAuth() {
  const searchParams = useSearchParams();
  const cohortId = searchParams.get("cohortId") ?? "";
  const [portal, setPortal] = useState<PortalState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exam, setExam] = useState<ProctorExamPayload | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isScoring, setIsScoring] = useState(false);
  const [result, setResult] = useState<GradeResponse | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  const answersRef = useRef<Record<number, string>>({});
  const timerRef = useRef<number | null>(null);

  const loadExam = useCallback(async () => {
    if (!cohortId) {
      setErrorMessage("A cohort must be selected to launch the qualifier.");
      setPortal("ready");
      return;
    }

    setPortal("loading");
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/me/proctor-exam?cohortId=${encodeURIComponent(cohortId)}`,
        { method: "GET" },
      );
      const data = (await response.json()) as ProctorExamPayload & {
        error?: string;
      };

      if (!response.ok) {
        setErrorMessage(data.error ?? "Unable to load your qualifier.");
        setPortal("ready");
        return;
      }

      setExam(data);
      setTimeLeft(data.durationSeconds);
      setPortal("ready");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unexpected error while loading your qualifier.",
      );
      setPortal("ready");
    }
  }, [cohortId]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  const startExam = useCallback(() => {
    if (!exam || hasStarted) {
      return;
    }

    setHasStarted(true);
    setPortal("exam");
    setTimeLeft(exam.durationSeconds);

    timerRef.current = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }

        return previous - 1;
      });
    }, 1000);
  }, [exam, hasStarted]);

  const handleFinish = useCallback(async () => {
    if (!exam || isScoring || result) {
      return;
    }

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsScoring(true);

    try {
      const answers = exam.questions.map((question, index) => ({
        questionId: question.id,
        question: question.text,
        answer: answersRef.current[index] ?? "",
      }));

      const response = await fetch("/api/proctor/grade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cohortId: exam.cohortId,
          examId: exam.examId,
          subject: exam.subject,
          cohortType: exam.cohortType,
          answers,
        }),
      });

      const data = (await response.json()) as GradeResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to grade your submission.");
      }

      setResult(data);
      setPortal("results");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to complete grading.",
      );
      setResult({
        score: 0,
        feedback:
          "Submission captured. Manual review required due to a grading issue.",
        passed: false,
      });
      setPortal("results");
    } finally {
      setIsScoring(false);
    }
  }, [exam, isScoring, result]);

  useEffect(() => {
    if (portal === "exam" && timeLeft === 0 && !isScoring && !result) {
      handleFinish();
    }
  }, [handleFinish, isScoring, portal, result, timeLeft]);

  const formatTime = useMemo(
    () => (seconds: number) =>
      `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`,
    [],
  );

  const resetAttempt = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    answersRef.current = {};
    setResult(null);
    setErrorMessage(null);
    setHasStarted(false);
    setTimeLeft(exam?.durationSeconds ?? 0);
    setPortal("ready");
  };

  return (
    <main
      className="min-h-screen bg-[#050505] px-4 py-8 text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0, 242, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 255, 0.05) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    >
      <SignedOut>
        <section className="mx-auto max-w-2xl border border-white/10 bg-black/40 p-8">
          <h1 className="text-3xl font-black uppercase tracking-tight">
            Sign in to continue
          </h1>
          <p className="mt-2 mb-8 text-xs font-bold uppercase tracking-widest text-white/60">
            Qualifier access requires an authenticated session.
          </p>
          <div className="flex flex-wrap gap-3">
            <SignInButton mode="modal">
              <button
                type="button"
                className="bg-cyan-500 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-cyan-400"
              >
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                type="button"
                className="border border-cyan-500 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-cyan-500 transition-colors hover:bg-cyan-500 hover:text-black"
              >
                Create Account
              </button>
            </SignUpButton>
          </div>
        </section>
      </SignedOut>

      <SignedIn>
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-4xl font-black uppercase italic tracking-tight text-cyan-400">
                Qualifier Test
              </h1>
              {exam && (
                <p className="mt-2 text-xs font-bold uppercase tracking-widest text-white/60">
                  {exam.cohortType} | {exam.subject}
                </p>
              )}
            </div>
            <Link
              href="/dashboard"
              className="border border-cyan-500 px-5 py-3 text-xs font-black uppercase tracking-widest text-cyan-500 transition-colors hover:bg-cyan-500 hover:text-black"
            >
              Back Dashboard
            </Link>
          </div>

          {errorMessage && (
            <div className="mb-4 border border-red-500/30 bg-red-500/10 p-4 text-xs font-bold uppercase tracking-widest text-red-300">
              {errorMessage}
            </div>
          )}

          {portal === "loading" && (
            <section className="border border-white/10 bg-black/40 p-8">
              <p className="text-sm font-bold uppercase tracking-widest text-white/60">
                Loading your qualifier configuration...
              </p>
            </section>
          )}

          {portal === "ready" && exam && (
            <section className="space-y-6 border border-white/10 bg-black/40 p-8">
              <h2 className="text-3xl font-black uppercase tracking-tight">
                Ready to begin
              </h2>
              <p className="max-w-3xl text-sm font-bold uppercase tracking-[0.14em] text-white/60">
                Face and microphone tracking are currently disabled. This is a straightforward timed qualifier, so you can start immediately and focus on your answers.
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-3 text-cyan-400">
                    <FileText size={18} />
                    <span className="text-[10px] font-black uppercase tracking-[0.24em]">
                      Questions
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-black">{exam.questions.length}</p>
                </div>
                <div className="border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-3 text-cyan-400">
                    <TimerReset size={18} />
                    <span className="text-[10px] font-black uppercase tracking-[0.24em]">
                      Time
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-black">
                    {formatTime(exam.durationSeconds)}
                  </p>
                </div>
                <div className="border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-3 text-cyan-400">
                    <ShieldCheck size={18} />
                    <span className="text-[10px] font-black uppercase tracking-[0.24em]">
                      Pass Mark
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-black">70+</p>
                </div>
              </div>

              <button
                type="button"
                onClick={startExam}
                className="bg-cyan-500 px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-cyan-400"
              >
                Start Qualifier
              </button>
            </section>
          )}

          {portal === "exam" && exam && (
            <section className="space-y-10 border border-white/10 bg-black/40 p-8">
              <div className="flex flex-col gap-6 border-b-4 border-cyan-400 pb-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <h4 className="mb-2 text-xs font-black uppercase tracking-widest opacity-40">
                    Unit: {exam.cohortType} / {exam.examId}
                  </h4>
                  <h2 className="text-4xl font-black uppercase italic tracking-tight leading-none md:text-6xl">
                    {exam.subject}
                  </h2>
                </div>
                <div className="text-right">
                  <h4 className="text-xs font-bold uppercase opacity-40">
                    Time Remaining
                  </h4>
                  <div className="text-5xl font-black tracking-tighter text-cyan-400 tabular-nums">
                    {formatTime(timeLeft)}
                  </div>
                </div>
              </div>

              <div className="space-y-14">
                {exam.questions.map((question, index) => (
                  <article key={question.id} className="flex gap-6">
                    <div className="text-3xl font-black italic text-cyan-400 opacity-50 md:text-4xl">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="flex-1 space-y-5">
                      <p className="text-xl font-black uppercase tracking-tight text-white/90 md:text-2xl">
                        {question.text}
                      </p>
                      <textarea
                        onChange={(event) => {
                          answersRef.current[index] = event.target.value;
                        }}
                        className="min-h-[170px] w-full border-l-4 border-white/10 bg-white/5 p-6 font-mono text-base text-gray-300 outline-none transition-colors focus:border-cyan-400 focus:bg-white/[0.08]"
                        placeholder="Type your response here..."
                      />
                    </div>
                  </article>
                ))}
              </div>

              <button
                type="button"
                onClick={handleFinish}
                disabled={isScoring}
                className="w-full bg-cyan-400 py-5 text-black font-black uppercase tracking-[0.3em] transition-colors hover:bg-cyan-300 disabled:opacity-60"
              >
                {isScoring ? "Analyzing Submission" : "Submit Qualifier"}
              </button>
            </section>
          )}

          {portal === "results" && result && (
            <section className="space-y-6 border border-white/10 bg-black/60 p-8 text-center">
              <h2 className="text-5xl font-black italic text-cyan-400">
                Performance
              </h2>
              <div className="text-8xl font-black leading-none italic">
                {result.score}
              </div>
              <p
                className={`text-xs font-black uppercase tracking-[0.3em] ${
                  result.passed ? "text-emerald-300" : "text-amber-200"
                }`}
              >
                {result.passed ? "Qualifier Passed" : "Qualifier Not Cleared"}
              </p>
              <p className="border-y border-white/10 py-5 text-sm font-bold uppercase tracking-widest text-white/70">
                {result.feedback}
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                {!result.passed && (
                  <button
                    type="button"
                    onClick={resetAttempt}
                    className="bg-cyan-400 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-cyan-300"
                  >
                    Retry Qualifier
                  </button>
                )}
                <Link
                  href="/dashboard"
                  className="border border-cyan-500 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-cyan-500 transition-colors hover:bg-cyan-500 hover:text-black"
                >
                  Back Dashboard
                </Link>
              </div>
            </section>
          )}
        </div>
      </SignedIn>
    </main>
  );
}

function QualifierPageFallback() {
  return (
    <main className="min-h-screen bg-[#050505] px-4 py-8 text-white">
      <section className="mx-auto max-w-2xl border border-white/10 bg-black/40 p-8">
        <p className="text-sm font-bold uppercase tracking-widest text-white/60">
          Loading qualifier...
        </p>
      </section>
    </main>
  );
}

export default function ProctoredQualifierPage() {
  if (!hasClerkPublishableKey()) {
    return (
      <main className="min-h-screen bg-[#050505] px-4 py-8 text-white">
        <section className="mx-auto max-w-2xl border border-white/10 bg-black/40 p-8">
          <h1 className="text-3xl font-black uppercase tracking-tight">
            Missing Clerk Configuration
          </h1>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-white/60">
            Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to access the qualifier flow.
          </p>
        </section>
      </main>
    );
  }

  return (
    <Suspense fallback={<QualifierPageFallback />}>
      <QualifierPageWithAuth />
    </Suspense>
  );
}
