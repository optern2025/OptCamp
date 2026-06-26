"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, AlertTriangle, ShieldCheck } from "lucide-react";

interface Question {
  id: string;
  type: string;
  content: string;
  options: string[] | string | null | undefined;
}

// Safely converts any possible options format to string[]
// Handles: string[], JSON string, comma-string, plain object, null/undefined
function parseOptions(raw: string[] | string | null | undefined): { opts: string[]; error: boolean } {
  try {
    if (raw == null) return { opts: [], error: false };

    if (Array.isArray(raw)) {
      return { opts: raw.map(String).filter(Boolean), error: false };
    }

    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (!trimmed) return { opts: [], error: false };
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return { opts: parsed.map(String).filter(Boolean), error: false };
        }
        if (parsed && typeof parsed === "object") {
          return { opts: Object.values(parsed).map(String).filter(Boolean), error: false };
        }
        return { opts: [String(parsed)], error: false };
      } catch {
        const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
        return { opts: parts, error: false };
      }
    }

    if (typeof raw === "object") {
      return { opts: Object.values(raw as Record<string, unknown>).map(String).filter(Boolean), error: false };
    }

    return { opts: [], error: true };
  } catch {
    return { opts: [], error: true };
  }
}

export default function ScreeningPage({ params }: { params: Promise<{ id: string }> }) {
  const [appId, setAppId] = useState("");
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    params.then((p) => {
      setAppId(p.id);
      checkEligibility(p.id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkEligibility = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/screening/eligibility?applicationId=${id}`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setEligibility(data);
        if (data.resume && data.attemptId) {
          resumeAttempt(data.attemptId);
        } else {
          setLoading(false);
        }
      } else {
        setErrorMsg(data.error || data.message || "Failed to load eligibility.");
        setLoading(false);
      }
    } catch (e: any) {
      setErrorMsg(e.message);
      setLoading(false);
    }
  };

  const resumeAttempt = async (attemptId: string) => {
    try {
      const res = await fetch(`/api/screening/attempt/${attemptId}`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        if (data.attempt.status === "expired" || data.attempt.status === "submitted") {
          setResult({
            status: data.attempt.passed ? "screening_passed" : "screening_failed",
            score: data.attempt.score,
          });
        } else {
          setAttempt(data.attempt);
          setQuestions(data.questions || []);
        }
      } else {
        setErrorMsg(data.error || "Failed to load attempt.");
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const startTest = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/screening/start", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId }),
      });
      const data = await res.json();
      if (res.ok) {
        setAttempt(data.attempt);
        setQuestions(data.questions || []);
      } else {
        setErrorMsg(data.error || "Failed to start test.");
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!confirm("Are you sure you want to submit? You cannot change your answers after submission.")) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/screening/submit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: attempt.id, answers }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setAttempt(null);
      } else {
        setErrorMsg(data.error || "Submission failed.");
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── LOADING ────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <p className="text-sm font-bold tracking-widest text-cyan-400 animate-pulse uppercase">
          Initializing Secure Environment...
        </p>
      </main>
    );
  }

  // ─── RESULT ─────────────────────────────────────────────
  if (result) {
    const passed = result.status === "screening_passed" || result.passed;
    return (
      <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
        <div className="max-w-xl w-full rounded-[28px] border border-white/10 bg-black/40 p-10 text-center space-y-6">
          <h2 className="text-4xl font-black uppercase italic tracking-tight text-white">Screening Completed</h2>

          {passed && (
            <div className="py-8">
              <p className="text-[10px] font-black tracking-[0.3em] uppercase text-white/40 mb-2">Final Score</p>
              <p className="text-6xl font-black text-emerald-400">
                {result.score ?? 0}%
              </p>
            </div>
          )}

          {passed ? (
            <div className="rounded-[16px] bg-emerald-400/10 border border-emerald-400/30 p-6">
              <p className="text-sm font-bold tracking-widest text-emerald-300">
                Congratulations! Your Screening Test is Cleared.
              </p>
              <p className="text-xs text-emerald-200/60 mt-2">
                Your application will now move to the final selection phase.
              </p>
            </div>
          ) : (
            <div className="rounded-[16px] bg-amber-400/10 border border-amber-400/30 p-6">
              <p className="text-sm font-bold tracking-widest text-amber-300">
                Screening Not Cleared.
              </p>
              <p className="text-xs text-amber-200/60 mt-2 mb-4">
                {"Don't give up — upskill and try again in the next cycle."}
              </p>
              <a
                href="https://optlearn.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-amber-400 px-6 py-3 text-xs font-black tracking-widest text-black uppercase transition-colors hover:bg-amber-300"
              >
                Start Upskilling on OptLearn
              </a>
            </div>
          )}

          <div className="pt-6">
            <Link
              href="/dashboard"
              className="border border-white/20 px-6 py-3 text-xs font-black tracking-[0.2em] text-white/70 transition-colors hover:border-white/50 hover:text-white uppercase inline-block"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ─── PRE-TEST INFO SCREEN ────────────────────────────────
  if (!attempt && eligibility) {
    return (
      <main
        className="min-h-screen bg-[#050505] text-white p-4 py-12"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0, 242, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 255, 0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      >
        <div className="max-w-3xl mx-auto space-y-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-black tracking-widest text-cyan-500 hover:text-cyan-400 transition-colors uppercase"
          >
            <ArrowLeft size={14} /> Dashboard
          </Link>

          <div className="rounded-[28px] border border-white/10 bg-black/60 p-8 md:p-12 backdrop-blur-xl">
            <h1 className="text-4xl font-black uppercase italic tracking-tight mb-2">Screening Access</h1>
            <p className="text-sm font-bold tracking-widest text-white/50 mb-8">Secure examination portal</p>

            {errorMsg && (
              <div className="mb-8 rounded-[16px] border border-red-500/30 bg-red-500/10 p-5 flex items-start gap-3">
                <AlertTriangle className="text-red-400 shrink-0" size={18} />
                <p className="text-xs font-bold tracking-widest text-red-300">{errorMsg}</p>
              </div>
            )}

            {!eligibility.eligible && !errorMsg && (
              <div className="rounded-[16px] border border-amber-500/30 bg-amber-500/10 p-6 text-center">
                <p className="text-sm font-bold tracking-widest text-amber-300">{eligibility.message}</p>
              </div>
            )}

            {eligibility.eligible && (
              <div className="space-y-8">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border border-white/10 bg-white/5 p-6 rounded-[20px]">
                    <ShieldCheck className="text-cyan-400 mb-3" size={24} />
                    <p className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase mb-1">Format</p>
                    <p className="text-lg font-black tracking-tight">7 Questions</p>
                  </div>
                  <div className="border border-white/10 bg-white/5 p-6 rounded-[20px]">
                    <Clock className="text-cyan-400 mb-3" size={24} />
                    <p className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase mb-1">Time Limit</p>
                    <p className="text-lg font-black tracking-tight">60 Minutes</p>
                  </div>
                </div>

                <div className="bg-cyan-500/10 border border-cyan-500/20 p-6 rounded-[20px]">
                  <h3 className="text-[10px] font-black tracking-[0.2em] text-cyan-400 uppercase mb-2">
                    Rules & Guidelines
                  </h3>
                  <ul className="text-xs font-bold tracking-widest text-cyan-100/70 space-y-2 list-disc list-inside">
                    <li>The test consists of multiple choice and practical questions.</li>
                    <li>Do not refresh the page once the test starts.</li>
                    <li>You must score at least 70% to pass.</li>
                    <li>Once submitted, answers cannot be changed.</li>
                  </ul>
                </div>

                <button
                  onClick={startTest}
                  disabled={loading}
                  className="w-full bg-cyan-500 py-5 text-sm font-black tracking-[0.2em] text-black uppercase transition-colors hover:bg-cyan-400 disabled:opacity-50 rounded-[16px]"
                >
                  {loading ? "Starting..." : "Acknowledge & Start Test"}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ─── ACTIVE TEST ─────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#02060A] text-white">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md px-6 py-4 flex justify-between items-center">
        <div>
          <p className="text-[9px] font-black tracking-[0.3em] text-cyan-500 uppercase flex items-center gap-1.5">
            Screening Test
            <span 
              className="oc-tooltip text-white/20 text-[9px]" 
              data-tip="An adaptive technical assessment that evaluates your skill level for this Learning Track."
            >(?)</span>
          </p>
          <p className="text-xs font-bold tracking-widest text-white/60">Do not refresh</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-cyan-500 px-6 py-2.5 text-[10px] font-black tracking-[0.2em] text-black uppercase transition-colors hover:bg-cyan-400 disabled:opacity-50 rounded-full"
        >
          {submitting ? "Submitting..." : "Submit Test"}
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        {errorMsg && (
          <div className="rounded-[16px] border border-red-500/30 bg-red-500/10 p-5 flex items-start gap-3">
            <AlertTriangle className="text-red-400 shrink-0" size={18} />
            <p className="text-xs font-bold tracking-widest text-red-300">{errorMsg}</p>
          </div>
        )}

        {questions.map((q, i) => {
          const isMCQ = q.type === "MCQ";
          const { opts, error: optsError } = isMCQ ? parseOptions(q.options) : { opts: [], error: false };

          return (
            <div key={q.id} className="rounded-[24px] border border-white/10 bg-white/[0.02] p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-black text-cyan-400">
                  {i + 1}
                </span>
                <span className="text-[10px] font-black tracking-widest text-white/30 uppercase">{q.type}</span>
              </div>

              <p className="text-lg font-bold text-white/90 mb-8 leading-relaxed">{q.content}</p>

              {isMCQ ? (
                optsError || opts.length === 0 ? (
                  <div className="rounded-[14px] border border-red-500/30 bg-red-500/10 px-5 py-4">
                    <p className="text-xs font-bold text-red-300">
                      Options are not configured correctly for this question. Please contact an admin.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {opts.map((opt, idx) => {
                      const isSelected = answers[q.id] === opt;
                      return (
                        <button
                          key={idx}
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                          className={`w-full text-left px-6 py-4 rounded-[16px] border transition-all ${
                            isSelected
                              ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <span className="text-sm font-bold tracking-wide">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                <textarea
                  rows={5}
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Enter your answer here..."
                  className="w-full resize-none rounded-[16px] border border-white/10 bg-black/40 px-5 py-4 text-sm font-bold text-white focus:border-cyan-500 focus:outline-none focus:bg-white/5"
                />
              )}
            </div>
          );
        })}

        <div className="flex justify-end pt-8">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-cyan-500 px-10 py-4 text-xs font-black tracking-[0.2em] text-black uppercase transition-colors hover:bg-cyan-400 disabled:opacity-50 rounded-[16px]"
          >
            {submitting ? "Submitting..." : "Submit Final Answers"}
          </button>
        </div>
      </div>
    </main>
  );
}
