"use client";

import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ProctorQuestion {
  id: number;
  text: string;
}

interface ProctorExamPayload {
  examId: string;
  subject: string;
  cohortType: string;
  durationSeconds: number;
  questions: ProctorQuestion[];
}

interface GradeResponse {
  score: number;
  feedback: string;
}

type PortalState = "loading" | "ready" | "candidate" | "exam" | "results";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    clm?: {
      tracker: new () => {
        init: () => void;
        start: (video: HTMLVideoElement | null) => void;
        stop: () => void;
        getCurrentPosition: () => number[][] | false;
      };
    };
  }
}

export default function ProctoredQualifierPage() {
  const [portal, setPortal] = useState<PortalState>("loading");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exam, setExam] = useState<ProctorExamPayload | null>(null);

  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const [isScoring, setIsScoring] = useState(false);
  const [disqualified, setDisqualified] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResponse | null>(null);

  const primaryVideoRef = useRef<HTMLVideoElement | null>(null);
  const widgetVideoRef = useRef<HTMLVideoElement | null>(null);
  const ctrackRef = useRef<{
    stop: () => void;
    getCurrentPosition: () => number[][] | false;
  } | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const baselineRef = useRef({ eyeDist: 0, mouthOpen: 0 });
  const answersRef = useRef<Record<number, string>>({});
  const monitorRafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const isExamActive =
    portal === "exam" && !disqualified && !isScoring && !result;

  const loadExam = useCallback(async () => {
    setPortal("loading");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/me/proctor-exam", { method: "GET" });
      const data = (await response.json()) as ProctorExamPayload & {
        error?: string;
      };

      if (!response.ok) {
        setErrorMessage(data.error ?? "Unable to load your proctored exam.");
        setPortal("ready");
        return;
      }

      setExam(data);
      setPortal("ready");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unexpected error while loading your proctored exam.",
      );
      setPortal("ready");
    }
  }, []);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  const cleanupSession = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (monitorRafRef.current) {
      window.cancelAnimationFrame(monitorRafRef.current);
      monitorRafRef.current = null;
    }

    if (ctrackRef.current) {
      try {
        ctrackRef.current.stop();
      } catch {
        // no-op
      }
      ctrackRef.current = null;
    }

    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => undefined);
    }

    audioCtxRef.current = null;
    analyserRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (primaryVideoRef.current) {
      primaryVideoRef.current.srcObject = null;
    }

    if (widgetVideoRef.current) {
      widgetVideoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupSession();
    };
  }, [cleanupSession]);

  const attachStreamToVideos = useCallback((stream: MediaStream) => {
    if (primaryVideoRef.current) {
      primaryVideoRef.current.srcObject = stream;
      primaryVideoRef.current.play().catch(() => undefined);
    }

    if (widgetVideoRef.current) {
      widgetVideoRef.current.srcObject = stream;
      widgetVideoRef.current.play().catch(() => undefined);
    }
  }, []);

  const handleDisqualify = useCallback(
    (reason: string) => {
      if (disqualified || portal !== "exam") {
        return;
      }

      setDisqualified(reason);
      setStatusMessage("Session terminated due to policy violation.");
      cleanupSession();
      setPortal("results");
    },
    [cleanupSession, disqualified, portal],
  );

  const startProctoring = useCallback(() => {
    if (!exam || !streamRef.current) {
      return;
    }

    setTimeLeft(exam.durationSeconds);

    try {
      const AudioContextClass =
        window.AudioContext ?? window.webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error("AudioContext is unavailable in this browser.");
      }

      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(streamRef.current);
      source.connect(analyser);
      analyser.fftSize = 256;
      audioCtxRef.current = audioContext;
      analyserRef.current = analyser;
    } catch {
      audioCtxRef.current = null;
      analyserRef.current = null;
    }

    timerRef.current = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timerRef.current ?? undefined);
          timerRef.current = null;
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
  }, [exam]);

  const handleFinish = useCallback(async () => {
    if (!exam || isScoring || result) {
      return;
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
          examId: exam.examId,
          subject: exam.subject,
          cohortType: exam.cohortType,
          answers,
        }),
      });

      const data = (await response.json()) as GradeResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to grade your submission.");
      }

      setResult({ score: data.score, feedback: data.feedback });
      setPortal("results");
      cleanupSession();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to complete grading.",
      );
      setResult({
        score: 0,
        feedback:
          "Submission captured. Manual review required due to a grading issue.",
      });
      setPortal("results");
      cleanupSession();
    } finally {
      setIsScoring(false);
    }
  }, [cleanupSession, exam, isScoring, result]);

  useEffect(() => {
    if (!isExamActive) {
      return;
    }

    const monitor = () => {
      if (!isExamActive) {
        return;
      }

      const points = ctrackRef.current?.getCurrentPosition() ?? false;

      if (points) {
        const eyeDist = Math.hypot(
          points[27][0] - points[32][0],
          points[27][1] - points[32][1],
        );
        const mouthOpen = Math.hypot(
          points[47][0] - points[53][0],
          points[47][1] - points[53][1],
        );

        if (
          Math.abs(eyeDist - baselineRef.current.eyeDist) >
          baselineRef.current.eyeDist * 0.18
        ) {
          handleDisqualify("Excessive face movement detected.");
          return;
        }

        if (mouthOpen > baselineRef.current.mouthOpen + 4.8) {
          handleDisqualify("Speech detected during the proctored attempt.");
          return;
        }
      } else {
        handleDisqualify("Face not detected in the camera frame.");
        return;
      }

      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const averageVolume =
          dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

        if (averageVolume > 72) {
          handleDisqualify("Unexpected background audio detected.");
          return;
        }
      }

      monitorRafRef.current = window.requestAnimationFrame(monitor);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        handleDisqualify("Tab switching is not allowed during the attempt.");
      }
    };

    const handleBlur = () => {
      handleDisqualify("Window focus changed during the attempt.");
    };

    const blockContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("contextmenu", blockContextMenu);

    monitorRafRef.current = window.requestAnimationFrame(monitor);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("contextmenu", blockContextMenu);

      if (monitorRafRef.current) {
        window.cancelAnimationFrame(monitorRafRef.current);
        monitorRafRef.current = null;
      }
    };
  }, [handleDisqualify, isExamActive]);

  useEffect(() => {
    if (
      portal === "exam" &&
      timeLeft === 0 &&
      !isScoring &&
      !result &&
      !disqualified
    ) {
      handleFinish();
    }
  }, [disqualified, handleFinish, isScoring, portal, result, timeLeft]);

  const initTracker = useCallback(() => {
    if (!window.clm || !primaryVideoRef.current) {
      throw new Error("Face tracker could not be initialized.");
    }

    const tracker = new window.clm.tracker();
    tracker.init();
    tracker.start(primaryVideoRef.current);
    ctrackRef.current = tracker;

    let progress = 2;

    const interval = window.setInterval(() => {
      const points = tracker.getCurrentPosition();

      if (points) {
        setIsFaceDetected(true);
        progress += 3.2;

        if (progress > 30 && progress < 95) {
          baselineRef.current.eyeDist = Math.hypot(
            points[27][0] - points[32][0],
            points[27][1] - points[32][1],
          );
          baselineRef.current.mouthOpen = Math.hypot(
            points[47][0] - points[53][0],
            points[47][1] - points[53][1],
          );
        }
      } else {
        setIsFaceDetected(false);
        progress += 0.25;
      }

      setCalibrationProgress(Math.min(Math.floor(progress), 100));

      if (progress >= 100) {
        window.clearInterval(interval);
        setPortal("exam");
        setIsInitializing(false);
        startProctoring();
      }
    }, 50);
  }, [startProctoring]);

  const startCalibration = useCallback(async () => {
    if (isInitializing || !exam) {
      return;
    }

    setIsInitializing(true);
    setStatusMessage("Initializing camera and microphone checks...");
    setErrorMessage(null);
    setCalibrationProgress(2);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;
      attachStreamToVideos(stream);

      if (!window.clm) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src =
            "https://cdn.jsdelivr.net/npm/clmtrackr@1.1.2/build/clmtrackr.min.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error("Unable to load face tracker library."));
          document.head.appendChild(script);
        });
      }

      initTracker();
      setStatusMessage("Calibration in progress...");
      setPortal("candidate");
    } catch (error) {
      cleanupSession();
      setCalibrationProgress(0);
      setIsInitializing(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Camera and microphone access is required for this proctored test.",
      );
    }
  }, [attachStreamToVideos, cleanupSession, exam, initTracker, isInitializing]);

  const formatTime = useMemo(
    () => (seconds: number) =>
      `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`,
    [],
  );

  return (
    <main
      className="min-h-screen bg-[#050505] text-white px-4 py-8"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0, 242, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 255, 0.05) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    >
      <SignedOut>
        <section className="max-w-2xl mx-auto border border-white/10 bg-black/40 p-8">
          <h1 className="text-3xl font-black uppercase tracking-tight">
            Sign in to continue
          </h1>
          <p className="text-white/60 font-bold uppercase tracking-widest text-xs mt-2 mb-8">
            Proctored qualifier requires an authenticated session.
          </p>
          <div className="flex gap-3 flex-wrap">
            <SignInButton mode="modal">
              <button
                type="button"
                className="px-6 py-3 bg-cyan-500 text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-cyan-400 transition-colors"
              >
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                type="button"
                className="px-6 py-3 border border-cyan-500 text-cyan-500 font-black uppercase tracking-[0.2em] text-xs hover:bg-cyan-500 hover:text-black transition-colors"
              >
                Create Account
              </button>
            </SignUpButton>
          </div>
        </section>
      </SignedOut>

      <SignedIn>
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 flex flex-wrap gap-3 items-center justify-between">
            <div>
              <h1 className="text-4xl font-black uppercase italic tracking-tight text-cyan-400">
                Proctored Qualifier
              </h1>
              {exam && (
                <p className="text-white/60 text-xs uppercase tracking-widest font-bold mt-2">
                  {exam.cohortType} | {exam.subject}
                </p>
              )}
            </div>
            <Link
              href="/cohort-test"
              className="px-5 py-3 border border-cyan-500 text-cyan-500 font-black uppercase tracking-widest text-xs hover:bg-cyan-500 hover:text-black transition-colors"
            >
              Back Dashboard
            </Link>
          </div>

          {statusMessage && (
            <div className="mb-4 p-4 border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-bold uppercase tracking-widest">
              {statusMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-4 border border-red-500/30 bg-red-500/10 text-red-300 text-xs font-bold uppercase tracking-widest">
              {errorMessage}
            </div>
          )}

          {portal === "loading" && (
            <section className="border border-white/10 bg-black/40 p-8">
              <p className="text-white/60 text-sm uppercase tracking-widest font-bold">
                Loading your proctored exam configuration...
              </p>
            </section>
          )}

          {portal === "ready" && exam && (
            <section className="border border-white/10 bg-black/40 p-8 space-y-6">
              <h2 className="text-3xl font-black uppercase tracking-tight">
                Ready for biometric sync
              </h2>
              <div className="grid gap-2 text-xs uppercase tracking-widest font-bold text-white/60">
                <p>Exam ID: {exam.examId}</p>
                <p>Duration: {formatTime(exam.durationSeconds)}</p>
                <p>Questions: {exam.questions.length}</p>
              </div>
              <button
                type="button"
                onClick={startCalibration}
                disabled={isInitializing}
                className="px-8 py-4 bg-cyan-500 text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-cyan-400 transition-colors disabled:opacity-70"
              >
                {isInitializing ? "Initializing" : "Initiate Biometrics"}
              </button>
            </section>
          )}

          {portal === "candidate" && (
            <section className="border border-white/10 bg-black/40 p-8 text-center space-y-8">
              <h2 className="text-4xl font-black italic text-cyan-400">
                Neural Sync
              </h2>
              <div className="relative w-56 h-56 mx-auto border-4 border-cyan-400 rounded-full overflow-hidden bg-black shadow-[0_0_60px_rgba(0,242,255,0.2)]">
                <video
                  ref={primaryVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover grayscale opacity-80"
                />
                <div
                  className="absolute top-0 left-0 w-full h-1 bg-cyan-400 animate-[scan_2s_linear_infinite]"
                  style={{ boxShadow: "0_0_15px #00f2ff" }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[4px]">
                  <span className="text-cyan-400 text-6xl font-black italic animate-pulse">
                    {calibrationProgress}%
                  </span>
                  {!isFaceDetected && calibrationProgress < 100 && (
                    <span className="text-[10px] uppercase tracking-[0.3em] font-black text-white mt-4 animate-pulse">
                      Position Face
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full max-w-[360px] mx-auto space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-cyan-400">
                  <span>
                    {isFaceDetected ? "Mapping Biometrics" : "Awaiting Subject"}
                  </span>
                  <span className="animate-pulse">
                    {isFaceDetected ? "Syncing" : "Searching"}
                  </span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full border border-white/10 overflow-hidden p-[2px]">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-300 shadow-[0_0_20px_#00f2ff]"
                    style={{ width: `${calibrationProgress}%` }}
                  />
                </div>
              </div>
            </section>
          )}

          {portal === "exam" && exam && (
            <section className="border border-white/10 bg-black/40 p-8 space-y-10">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b-4 border-cyan-400 pb-6">
                <div>
                  <h4 className="text-xs uppercase font-black opacity-40 tracking-widest mb-2">
                    Unit: {exam.cohortType} / {exam.examId}
                  </h4>
                  <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight leading-none">
                    {exam.subject}
                  </h2>
                </div>
                <div className="text-right">
                  <h4 className="text-xs uppercase font-bold opacity-40">
                    Cycle Remaining
                  </h4>
                  <div className="text-5xl font-black text-cyan-400 tracking-tighter tabular-nums">
                    {formatTime(timeLeft)}
                  </div>
                </div>
              </div>

              <div className="space-y-14">
                {exam.questions.map((question, index) => (
                  <article key={question.id} className="flex gap-6">
                    <div className="text-3xl md:text-4xl font-black text-cyan-400 italic opacity-50">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="flex-1 space-y-5">
                      <p className="text-xl md:text-2xl font-black leading-tight uppercase tracking-tight text-white/90">
                        {question.text}
                      </p>
                      <textarea
                        onChange={(event) => {
                          answersRef.current[index] = event.target.value;
                        }}
                        onPaste={(event) => event.preventDefault()}
                        className="w-full bg-white/5 border-l-4 border-white/10 p-6 min-h-[170px] outline-none focus:border-cyan-400 font-mono text-gray-300 text-base focus:bg-white/[0.08] transition-colors"
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
                className="w-full bg-cyan-400 text-black font-black py-5 uppercase tracking-[0.3em] hover:bg-cyan-300 transition-colors disabled:opacity-60"
              >
                {isScoring ? "Analyzing Submission" : "Submit Qualifier"}
              </button>
            </section>
          )}

          {portal === "results" && (disqualified || result) && (
            <section className="border border-white/10 bg-black/60 p-8 text-center space-y-6">
              <h2 className="text-5xl font-black italic text-cyan-400">
                Performance
              </h2>

              {disqualified ? (
                <>
                  <p className="text-2xl md:text-4xl font-black text-red-400 uppercase tracking-tight">
                    Terminated
                  </p>
                  <p className="text-sm uppercase tracking-widest font-bold text-red-200 border border-red-500/30 bg-red-500/10 p-4">
                    {disqualified}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-8xl font-black leading-none italic">
                    {result?.score ?? 0}
                  </div>
                  <p className="text-sm uppercase tracking-widest font-bold text-white/70 border-y border-white/10 py-5">
                    {result?.feedback}
                  </p>
                </>
              )}

              <div className="flex gap-3 justify-center flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setDisqualified(null);
                    setResult(null);
                    setCalibrationProgress(0);
                    setIsFaceDetected(false);
                    setStatusMessage(null);
                    setErrorMessage(null);
                    answersRef.current = {};
                    cleanupSession();
                    setPortal("ready");
                  }}
                  className="px-6 py-3 bg-cyan-400 text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-cyan-300 transition-colors"
                >
                  Retry Setup
                </button>
                <Link
                  href="/cohort-test"
                  className="px-6 py-3 border border-cyan-500 text-cyan-500 font-black uppercase tracking-[0.2em] text-xs hover:bg-cyan-500 hover:text-black transition-colors"
                >
                  Back Dashboard
                </Link>
              </div>
            </section>
          )}
        </div>

        {(portal === "candidate" || portal === "exam") && (
          <div className="fixed bottom-8 right-8 w-44 h-32 md:w-60 md:h-44 bg-black border-2 border-cyan-400 overflow-hidden z-[100] shadow-[0_0_30px_rgba(0,242,255,0.3)]">
            <video
              ref={widgetVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover opacity-60 grayscale contrast-150 brightness-75"
            />
            <div className="absolute top-2 left-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_#00f2ff]" />
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                Neural Watch
              </span>
            </div>
          </div>
        )}
      </SignedIn>

      <style>{`
        @keyframes scan {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(240px);
          }
        }
      `}</style>
    </main>
  );
}
