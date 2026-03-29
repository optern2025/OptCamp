"use client";

import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { FileText, ShieldCheck, TimerReset } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type AssessmentAnswerValue,
  AssessmentRunner,
} from "@/app/components/AssessmentRunner";
import { hasClerkPublishableKey } from "@/lib/clerkEnv";
import type { AssessmentQuestion } from "@/lib/types";

interface ProctorExamPayload {
  cohortId: string;
  examId: string;
  subject: string;
  cohortType: string;
  durationSeconds: number;
  questions: AssessmentQuestion[];
  startedAt: string | null;
  remainingSeconds: number;
  availabilityEndsAt: string | null;
  attemptEndsAt: string | null;
  hasStarted: boolean;
  timeLimitsEnabled: boolean;
}

interface GradeResponse {
  status: "submitted" | "passed" | "failed";
  submittedAt: string;
}

type PortalState = "loading" | "ready" | "exam" | "results";

function normalizeAnswer(value: AssessmentAnswerValue | undefined): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return typeof value === "string" ? value : "";
}

function secondsUntil(isoTimestamp: string | null): number {
  if (!isoTimestamp) {
    return 0;
  }

  const deadline = Date.parse(isoTimestamp);
  if (!Number.isFinite(deadline)) {
    return 0;
  }

  return Math.max(0, Math.floor((deadline - Date.now()) / 1000));
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return date.toLocaleString();
}

function QualifierPageWithAuth() {
  const searchParams = useSearchParams();
  const cohortId = searchParams.get("cohortId") ?? "";
  const [portal, setPortal] = useState<PortalState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exam, setExam] = useState<ProctorExamPayload | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [availabilityTimeLeft, setAvailabilityTimeLeft] = useState(0);
  const [isScoring, setIsScoring] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [result, setResult] = useState<GradeResponse | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AssessmentAnswerValue>>(
    {},
  );
  const [reviewFlags, setReviewFlags] = useState<Record<string, boolean>>({});

  const timerRef = useRef<number | null>(null);
  const securityStopRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const syncClock = useCallback(
    (nextPortal: PortalState, payload: ProctorExamPayload) => {
      clearTimer();

      if (nextPortal === "exam") {
        if (!payload.timeLimitsEnabled || !payload.attemptEndsAt) {
          setTimeLeft(payload.remainingSeconds);
          return;
        }

        const update = () => {
          setTimeLeft(secondsUntil(payload.attemptEndsAt));
        };

        update();
        timerRef.current = window.setInterval(update, 1000);
        return;
      }

      if (nextPortal === "ready") {
        if (!payload.timeLimitsEnabled || !payload.availabilityEndsAt) {
          setAvailabilityTimeLeft(payload.remainingSeconds);
          return;
        }

        const update = () => {
          setAvailabilityTimeLeft(secondsUntil(payload.availabilityEndsAt));
        };

        update();
        timerRef.current = window.setInterval(update, 1000);
      }
    },
    [clearTimer],
  );

  const hydrateExamState = useCallback(
    (payload: ProctorExamPayload) => {
      const initialAnswers = Object.fromEntries(
        payload.questions.map((question) => [
          question.id,
          question.type === "mcq" && question.allowMultiple ? [] : "",
        ]),
      ) as Record<string, AssessmentAnswerValue>;

      setExam(payload);
      setAnswers(initialAnswers);
      setReviewFlags(
        Object.fromEntries(
          payload.questions.map((question) => [question.id, false]),
        ),
      );
      setCurrentIndex(0);
      setResult(null);
      setErrorMessage(null);
      securityStopRef.current = false;

      if (payload.hasStarted) {
        setHasStarted(true);
        setTimeLeft(payload.remainingSeconds);
        setPortal("exam");
        syncClock("exam", payload);
        return;
      }

      setHasStarted(false);
      setTimeLeft(payload.durationSeconds);
      setAvailabilityTimeLeft(secondsUntil(payload.availabilityEndsAt));
      setPortal("ready");
      syncClock("ready", payload);
    },
    [syncClock],
  );

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
        clearTimer();
        setExam(null);
        setErrorMessage(data.error ?? "Unable to load your qualifier.");
        setPortal("ready");
        return;
      }

      hydrateExamState(data);
    } catch (error) {
      clearTimer();
      setExam(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unexpected error while loading your qualifier.",
      );
      setPortal("ready");
    }
  }, [clearTimer, cohortId, hydrateExamState]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  useEffect(() => clearTimer, [clearTimer]);

  const startExam = useCallback(async () => {
    if (!exam || hasStarted || isStarting) {
      return;
    }

    setIsStarting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/me/proctor-exam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cohortId: exam.cohortId,
        }),
      });

      const data = (await response.json()) as ProctorExamPayload & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to start your qualifier.");
      }

      hydrateExamState(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to start the qualifier.",
      );
      await loadExam();
    } finally {
      setIsStarting(false);
    }
  }, [exam, hasStarted, hydrateExamState, isStarting, loadExam]);

  const openTermsDialog = useCallback(() => {
    setHasAcceptedTerms(false);
    setShowTermsDialog(true);
    setErrorMessage(null);
  }, []);

  const confirmTermsAndStart = useCallback(() => {
    if (!hasAcceptedTerms) {
      setErrorMessage(
        "Accept the Terms & Conditions before starting the qualifier.",
      );
      return;
    }

    setShowTermsDialog(false);
    void startExam();
  }, [hasAcceptedTerms, startExam]);

  const handleFinish = useCallback(async () => {
    if (!exam || isScoring || result) {
      return;
    }

    clearTimer();
    setIsScoring(true);

    try {
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
          answers: exam.questions.map((question) => ({
            questionId: question.id,
            question: question.prompt,
            answer: normalizeAnswer(answers[question.id]),
            questionType: question.type,
            guidance: question.guidance,
            rubric: question.rubric,
            correctOptionIds:
              question.type === "mcq" ? question.correctOptionIds : undefined,
          })),
        }),
      });

      const data = (await response.json()) as GradeResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to grade your submission.");
      }

      setResult(data);
      setPortal("results");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to complete grading.";
      setErrorMessage(message);
      setPortal("ready");
    } finally {
      setIsScoring(false);
    }
  }, [answers, clearTimer, exam, isScoring, result]);

  const stopExamForSecurityReason = useCallback(
    (message: string) => {
      if (portal !== "exam" || isScoring || result || securityStopRef.current) {
        return;
      }

      securityStopRef.current = true;
      setErrorMessage(message);
      void handleFinish();
    },
    [handleFinish, isScoring, portal, result],
  );

  useEffect(() => {
    if (
      portal === "exam" &&
      exam?.timeLimitsEnabled &&
      timeLeft === 0 &&
      !isScoring &&
      !result
    ) {
      void handleFinish();
    }
  }, [exam?.timeLimitsEnabled, handleFinish, isScoring, portal, result, timeLeft]);

  useEffect(() => {
    if (portal !== "ready" || !exam) {
      return;
    }

    if (exam.timeLimitsEnabled && availabilityTimeLeft === 0) {
      void loadExam();
    }
  }, [availabilityTimeLeft, exam, loadExam, portal]);

  useEffect(() => {
    if (portal !== "exam") {
      return;
    }

    const preventClipboardAction = (event: ClipboardEvent) => {
      event.preventDefault();
    };

    const preventContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const preventRestrictedShortcut = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const blockedCombo =
        (event.ctrlKey || event.metaKey) &&
        ["a", "c", "p", "s", "u", "v", "x"].includes(key);

      if (blockedCombo || (event.shiftKey && key === "insert")) {
        event.preventDefault();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopExamForSecurityReason(
          "Attempt ended because leaving the active test tab is disabled.",
        );
      }
    };

    const handleWindowBlur = () => {
      stopExamForSecurityReason(
        "Attempt ended because switching tabs or windows is disabled.",
      );
    };

    document.addEventListener("copy", preventClipboardAction);
    document.addEventListener("cut", preventClipboardAction);
    document.addEventListener("paste", preventClipboardAction);
    document.addEventListener("contextmenu", preventContextMenu);
    document.addEventListener("keydown", preventRestrictedShortcut);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("copy", preventClipboardAction);
      document.removeEventListener("cut", preventClipboardAction);
      document.removeEventListener("paste", preventClipboardAction);
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("keydown", preventRestrictedShortcut);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [portal, stopExamForSecurityReason]);

  const formatTime = useMemo(
    () => (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;

      return [hours, minutes, remainingSeconds]
        .map((value) => value.toString().padStart(2, "0"))
        .join(":");
    },
    [],
  );

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
          <p className="mb-8 mt-2 text-xs font-bold tracking-widest text-white/60">
            Qualifier access requires an authenticated session.
          </p>
          <div className="flex flex-wrap gap-3">
            <SignInButton mode="modal">
              <button
                type="button"
                className="bg-cyan-500 px-6 py-3 text-xs font-black tracking-[0.2em] text-black transition-colors hover:bg-cyan-400"
              >
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                type="button"
                className="border border-cyan-500 px-6 py-3 text-xs font-black tracking-[0.2em] text-cyan-500 transition-colors hover:bg-cyan-500 hover:text-black"
              >
                Create Account
              </button>
            </SignUpButton>
          </div>
        </section>
      </SignedOut>

      <SignedIn>
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-4xl font-black uppercase italic tracking-tight text-cyan-400">
                Qualifier Test
              </h1>
              {exam && (
                <p className="mt-2 text-xs font-bold tracking-widest text-white/60">
                  {exam.cohortType} | {exam.subject}
                </p>
              )}
            </div>
            <Link
              href="/dashboard"
              className="border border-cyan-500 px-5 py-3 text-xs font-black tracking-widest text-cyan-500 transition-colors hover:bg-cyan-500 hover:text-black"
            >
              Back Dashboard
            </Link>
          </div>

          {errorMessage && (
            <div className="mb-4 border border-red-500/30 bg-red-500/10 p-4 text-xs font-bold tracking-widest text-red-300">
              {errorMessage}
            </div>
          )}

          {portal === "loading" && (
            <section className="border border-white/10 bg-black/40 p-8">
              <p className="text-sm font-bold tracking-widest text-white/60">
                Loading your qualifier configuration...
              </p>
            </section>
          )}

          {portal === "ready" && exam && (
            <section className="space-y-6 border border-white/10 bg-black/40 p-8">
              <h2 className="text-3xl font-black uppercase tracking-tight">
                Ready to begin
              </h2>
              <p className="max-w-3xl text-sm font-bold tracking-[0.14em] text-white/60">
                {exam.timeLimitsEnabled
                  ? "After signup, the qualifier is only available for 48 hours. Once you start, the 3-hour exam timer is final and cannot be restarted."
                  : "Testing override is active. The qualifier can be opened without time-based limits, and no countdown will force submission."}
              </p>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-3 text-cyan-400">
                    <FileText size={18} />
                    <span className="text-[10px] font-black tracking-[0.24em]">
                      Questions
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-black">
                    {exam.questions.length}
                  </p>
                </div>
                <div className="border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-3 text-cyan-400">
                    <TimerReset size={18} />
                    <span className="text-[10px] font-black tracking-[0.24em]">
                      Exam Time
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-black">
                    {formatTime(exam.durationSeconds)}
                  </p>
                </div>
                <div className="border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-3 text-cyan-400">
                    <TimerReset size={18} />
                    <span className="text-[10px] font-black tracking-[0.24em]">
                      {exam.timeLimitsEnabled ? "Access Left" : "Access Mode"}
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-black">
                    {exam.timeLimitsEnabled
                      ? formatTime(availabilityTimeLeft)
                      : "OPEN"}
                  </p>
                </div>
                <div className="border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-3 text-cyan-400">
                    <ShieldCheck size={18} />
                    <span className="text-[10px] font-black tracking-[0.24em]">
                      Pass Mark
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-black">70+</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="border border-white/10 bg-white/5 p-5 text-xs font-bold tracking-[0.18em] text-white/65">
                  <p>
                    {exam.timeLimitsEnabled
                      ? "Access closes at"
                      : "Testing override"}
                  </p>
                  <p className="mt-2 text-sm text-cyan-300">
                    {exam.timeLimitsEnabled
                      ? formatDateTime(exam.availabilityEndsAt)
                      : "Time-based qualifier limits are bypassed."}
                  </p>
                </div>
                <div className="border border-white/10 bg-white/5 p-5 text-xs font-bold tracking-[0.18em] text-white/65">
                  <p>Timer starts only after you press start</p>
                  <p className="mt-2 text-sm text-cyan-300">
                    {exam.timeLimitsEnabled
                      ? "Submission is auto-sent when the 3-hour timer hits zero."
                      : "No automatic submission timer is running in testing mode."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={openTermsDialog}
                disabled={
                  isStarting ||
                  (exam.timeLimitsEnabled && availabilityTimeLeft === 0)
                }
                className="bg-cyan-500 px-8 py-4 text-xs font-black tracking-[0.2em] text-black transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/45"
              >
                {isStarting ? "Starting..." : "Start Qualifier"}
              </button>
            </section>
          )}

          {showTermsDialog && exam && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
              <div className="relative w-full max-w-xl overflow-hidden rounded-[28px] border border-cyan-500/60 bg-[#0B0F14] p-8">
                <div className="absolute left-0 top-0 h-1 w-full bg-cyan-500" />
                <p className="text-[10px] font-black tracking-[0.3em] text-cyan-300/80">
                  Mandatory Acceptance
                </p>
                <h3 className="mt-4 text-3xl font-black uppercase tracking-tight">
                  Accept Legal Terms Before Starting
                </h3>
                <p className="mt-4 text-sm font-bold tracking-[0.14em] text-white/65">
                  You must review and accept all Terms & Conditions, privacy
                  terms, and rules before the {exam.cohortType} qualifier can
                  begin.
                </p>

                <Link
                  href="/legal"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex items-center gap-2 border border-cyan-400 px-5 py-3 text-xs font-black tracking-[0.24em] text-cyan-300 transition-colors hover:bg-cyan-400 hover:text-black"
                >
                  Open Legal Page
                </Link>

                <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-[20px] border border-white/10 bg-white/[0.03] p-4 text-xs font-bold tracking-[0.16em] text-white/75">
                  <input
                    type="checkbox"
                    checked={hasAcceptedTerms}
                    onChange={(event) =>
                      setHasAcceptedTerms(event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 accent-cyan-400"
                  />
                  <span>
                    I have read the legal page and accept all Terms & Conditions
                    required to take this qualifier.
                  </span>
                </label>

                <div className="mt-8 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTermsDialog(false);
                      setHasAcceptedTerms(false);
                    }}
                    className="border border-white/15 px-5 py-3 text-xs font-black tracking-[0.24em] text-white/70 transition-colors hover:border-white/30 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmTermsAndStart}
                    disabled={isStarting}
                    className="bg-cyan-500 px-5 py-3 text-xs font-black tracking-[0.24em] text-black transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/45"
                  >
                    {isStarting ? "Starting..." : "Accept and Start"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {portal === "exam" && exam && (
            <AssessmentRunner
              eyebrow={`${exam.cohortType} / ${exam.examId}`}
              title={exam.subject}
              subtitle={
                exam.timeLimitsEnabled
                  ? "Move through the test with the question palette, mark uncertain items for review, and submit before the timer expires."
                  : "Testing override is active. Move through the test and submit when you are ready."
              }
              questions={exam.questions}
              answers={answers}
              reviewFlags={reviewFlags}
              currentIndex={currentIndex}
              onNavigate={setCurrentIndex}
              onAnswerChange={(questionId, value) =>
                setAnswers((current) => ({
                  ...current,
                  [questionId]: value,
                }))
              }
              onToggleReview={(questionId) =>
                setReviewFlags((current) => ({
                  ...current,
                  [questionId]: !current[questionId],
                }))
              }
              onSubmit={handleFinish}
              submitLabel="Submit Qualifier"
              isSubmitting={isScoring}
              timeDisplay={
                exam.timeLimitsEnabled ? formatTime(timeLeft) : "No limit"
              }
              meta={
                <div className="rounded-[18px] border border-cyan-300/20 bg-cyan-300/10 p-4 text-xs tracking-[0.18em] text-cyan-50/85">
                  {exam.timeLimitsEnabled
                    ? `Timer is live and server-enforced until ${formatDateTime(
                        exam.attemptEndsAt,
                      )}. Copy, paste, and tab switching are disabled. When the clock reaches zero, your submission is sent automatically.`
                    : "Testing override is active. Copy, paste, and tab switching are still disabled, but the attempt is not time-limited."}
                </div>
              }
            />
          )}

          {portal === "results" && result && (
            <section className="space-y-6 border border-white/10 bg-black/60 p-8 text-center">
              <h2 className="text-5xl font-black italic text-cyan-400">
                Submission Recorded
              </h2>
              <p
                className={`text-xs font-black tracking-[0.3em] ${
                  result.status === "passed"
                    ? "text-emerald-300"
                    : result.status === "failed"
                      ? "text-amber-200"
                      : "text-cyan-200"
                }`}
              >
                {result.status === "passed"
                  ? "Qualifier Cleared"
                  : result.status === "failed"
                    ? "Qualifier Submitted"
                    : "Submission Received"}
              </p>
              <p className="border-y border-white/10 py-5 text-sm font-bold tracking-widest text-white/70">
                Thank you for attempting. Your attempt has been saved and will
                be reviewed. Stay tuned.
              </p>
              <p className="text-xs font-bold tracking-[0.2em] text-white/50">
                Submitted {formatDateTime(result.submittedAt)}
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/dashboard"
                  className="border border-cyan-500 px-6 py-3 text-xs font-black tracking-[0.2em] text-cyan-500 transition-colors hover:bg-cyan-500 hover:text-black"
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
        <p className="text-sm font-bold tracking-widest text-white/60">
          Loading qualifier...
        </p>
      </section>
    </main>
  );
}

export default function ProctoredQualifierPage() {
  if (!hasClerkPublishableKey) {
    return (
      <main className="min-h-screen bg-[#050505] px-4 py-8 text-white">
        <section className="mx-auto max-w-2xl border border-white/10 bg-black/40 p-8">
          <h1 className="text-3xl font-black uppercase tracking-tight">
            Missing Clerk Configuration
          </h1>
          <p className="mt-2 text-xs font-bold tracking-widest text-white/60">
            Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to access the qualifier
            flow.
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
