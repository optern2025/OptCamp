"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, GitBranch, Globe, FileText, Video, Upload,
  Clock, Star, CheckCircle, AlertCircle, RotateCcw, ExternalLink
} from "lucide-react";
import { toISTDisplay } from "@/lib/dateTime";

type SubmissionStatus = "pending" | "approved" | "needs_revision" | "rejected";

interface TaskData {
  id: string;
  title: string;
  description: string;
  task_type: string;
  due_date: string | null;
  points: number;
  required_proof: string[];
  sprint_title?: string;
}

interface SubmissionData {
  id: string;
  status: SubmissionStatus;
  score: number | null;
  admin_feedback: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  github_link: string | null;
  deployment_link: string | null;
  document_url: string | null;
  video_url: string | null;
  explanation: string | null;
}

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; color: string; bg: string; border: string; icon: any }> = {
  pending:        { label: 'Awaiting Review',  color: 'text-cyan-300',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/25',   icon: Clock },
  approved:       { label: 'Approved',         color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', icon: CheckCircle },
  needs_revision: { label: 'Needs Improvement',color: 'text-amber-300',   bg: 'bg-amber-500/10',   border: 'border-amber-500/25',  icon: AlertCircle },
  rejected:       { label: 'Rejected',         color: 'text-red-300',     bg: 'bg-red-500/10',     border: 'border-red-500/25',    icon: AlertCircle },
};

const PROOF_CONFIG: Record<string, { icon: any; label: string; placeholder: string; field: string }> = {
  github:     { icon: GitBranch, label: 'GitHub Repository', placeholder: 'https://github.com/you/project', field: 'githubLink' },
  deployment: { icon: Globe,     label: 'Live Deployment URL', placeholder: 'https://your-project.vercel.app', field: 'deploymentLink' },
  document:   { icon: FileText,  label: 'Document URL', placeholder: 'https://docs.google.com/...', field: 'documentUrl' },
  video:      { icon: Video,     label: 'Video Demo URL', placeholder: 'https://youtube.com/watch?v=...', field: 'videoUrl' },
};

export default function TaskPage() {
  const params = useParams();
  const cycleId = params.cycleId as string;
  const taskId = params.taskId as string;

  const [task, setTask] = useState<TaskData | null>(null);
  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [githubLink, setGithubLink] = useState("");
  const [deploymentLink, setDeploymentLink] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [explanation, setExplanation] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/cohort/${cycleId}/task/${taskId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setTask(data.task);
        setSubmission(data.submission ?? null);
        if (data.submission) {
          setGithubLink(data.submission.github_link ?? "");
          setDeploymentLink(data.submission.deployment_link ?? "");
          setDocumentUrl(data.submission.document_url ?? "");
          setVideoUrl(data.submission.video_url ?? "");
          setExplanation(data.submission.explanation ?? "");
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [cycleId, taskId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/me/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: taskId,
          github_link: githubLink || null,
          deployment_link: deploymentLink || null,
          document_url: documentUrl || null,
          video_url: videoUrl || null,
          explanation: explanation || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmission(data);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const canResubmit = submission?.status === "needs_revision" || submission?.status === "rejected";
  const isReadOnly = submission?.status === "pending" || submission?.status === "approved";
  const statusCfg = submission ? STATUS_CONFIG[submission.status] : null;

  const isOverdue = task?.due_date && new Date(task.due_date) < new Date() && !submission;

  return (
    <main className="min-h-screen bg-[#060810] text-white px-4 md:px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Back */}
        <Link
          href={`/dashboard/cohort/${cycleId}?tab=tasks`}
          className="inline-flex items-center gap-2 text-[11px] font-bold text-white/30 hover:text-white/60 transition-colors tracking-widest uppercase"
        >
          <ArrowLeft size={12} /> Back to Tasks
        </Link>

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-10 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin mx-auto" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-6">
            <p className="text-sm font-bold text-red-300">{error}</p>
          </div>
        )}

        {task && !loading && (
          <>
            {/* ── TASK HERO ── */}
            <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-8 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-violet-500/8 blur-[60px] rounded-full" />

              <div className="relative">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300/50 mb-3">
                  {task.sprint_title ?? 'Sprint Task'}
                </p>

                <h1 className="text-2xl md:text-3xl font-black text-white mb-4 leading-tight">
                  {task.title}
                </h1>

                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <span className="flex items-center gap-1.5 text-[11px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
                    <Star size={10} /> {task.points} Points
                  </span>
                  {task.due_date && (
                    <span className={`flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-full border ${
                      isOverdue
                        ? 'text-red-300 bg-red-500/10 border-red-500/20'
                        : 'text-white/40 bg-white/5 border-white/10'
                    }`}>
                      <Clock size={10} />
                      {isOverdue ? 'Overdue · ' : 'Due '}{toISTDisplay(task.due_date)}
                    </span>
                  )}
                  <span className="text-[11px] font-black text-white/30 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full capitalize">
                    {task.task_type ?? 'Task'}
                  </span>
                </div>

                {task.description && (
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-4">
                    <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{task.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── REQUIRED PROOF ── */}
            {task.required_proof && task.required_proof.length > 0 && (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/25 mb-3">Required Submissions</p>
                <div className="flex flex-wrap gap-2">
                  {task.required_proof.map((proof: string) => {
                    const cfg = PROOF_CONFIG[proof];
                    if (!cfg) return null;
                    const Icon = cfg.icon;
                    return (
                      <span key={proof} className="flex items-center gap-1.5 text-[11px] font-bold text-white/50 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                        <Icon size={10} /> {cfg.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── SUBMISSION STATUS ── */}
            {submission && statusCfg && (
              <div className={`rounded-2xl border ${statusCfg.border} ${statusCfg.bg} p-6`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black tracking-[0.25em] uppercase opacity-50 mb-1">Submission Status</p>
                    <div className="flex items-center gap-2">
                      <statusCfg.icon size={18} className={statusCfg.color} />
                      <p className={`text-xl font-black ${statusCfg.color}`}>{statusCfg.label}</p>
                    </div>
                    {submission.score != null && (
                      <p className="text-sm font-bold opacity-60 mt-1">{submission.score} / {task.points} points awarded</p>
                    )}
                  </div>
                  <div className="text-right text-[10px] font-bold opacity-40 space-y-0.5">
                    <p>Submitted {toISTDisplay(submission.submitted_at)}</p>
                    {submission.reviewed_at && <p>Reviewed {toISTDisplay(submission.reviewed_at)}</p>}
                  </div>
                </div>

                {submission.admin_feedback && (
                  <div className="mt-4 rounded-xl border border-current/20 bg-black/20 p-4">
                    <p className="text-[9px] font-black tracking-widest uppercase opacity-40 mb-2">Mentor Feedback</p>
                    <p className="text-sm leading-relaxed opacity-80">{submission.admin_feedback}</p>
                  </div>
                )}

                {canResubmit && (
                  <div className="mt-3 flex items-center gap-2 text-[11px] font-black opacity-60">
                    <RotateCcw size={11} /> Update your submission below and resubmit
                  </div>
                )}
              </div>
            )}

            {/* ── SUCCESS BANNER ── */}
            {success && !canResubmit && (
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-6 text-center">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-lg font-black text-emerald-400">Submitted Successfully</p>
                <p className="text-xs text-white/30 mt-1">Your work is now awaiting mentor review.</p>
              </div>
            )}

            {/* ── SUBMISSION FORM ── */}
            {(!isReadOnly || canResubmit) && (
              <form onSubmit={handleSubmit} className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-8 space-y-6">
                <div>
                  <h2 className="text-lg font-black text-white">
                    {canResubmit ? '↺ Update & Resubmit' : 'Submit Your Work'}
                  </h2>
                  <p className="text-xs text-white/30 mt-0.5">
                    {canResubmit ? 'Address the feedback and resubmit.' : 'Fill in your submission details below.'}
                  </p>
                </div>

                {/* Dynamic proof fields */}
                {(task.required_proof ?? []).map((proof: string) => {
                  const cfg = PROOF_CONFIG[proof];
                  if (!cfg) return null;
                  const Icon = cfg.icon;
                  const valueMap: Record<string, string> = {
                    githubLink, deploymentLink, documentUrl, videoUrl
                  };
                  const setterMap: Record<string, (v: string) => void> = {
                    githubLink: setGithubLink,
                    deploymentLink: setDeploymentLink,
                    documentUrl: setDocumentUrl,
                    videoUrl: setVideoUrl,
                  };
                  return (
                    <div key={proof} className="space-y-2">
                      <label className="flex items-center gap-2 text-[11px] font-black tracking-[0.2em] text-white/40 uppercase">
                        <Icon size={11} /> {cfg.label}
                      </label>
                      <input
                        type="url"
                        value={valueMap[cfg.field]}
                        onChange={(e) => setterMap[cfg.field](e.target.value)}
                        disabled={isReadOnly && !canResubmit}
                        placeholder={cfg.placeholder}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 disabled:opacity-30 transition-all"
                      />
                    </div>
                  );
                })}

                {/* Explanation always shown */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black tracking-[0.2em] text-white/40 uppercase">Describe Your Work</label>
                  <textarea
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    disabled={isReadOnly && !canResubmit}
                    rows={5}
                    placeholder="Explain what you built, key decisions made, challenges faced, and what you learned..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 disabled:opacity-30 resize-none transition-all"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3">
                    <p className="text-xs font-bold text-red-300">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || (isReadOnly && !canResubmit)}
                  className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-sm px-6 py-3 rounded-xl transition-all"
                >
                  <Upload size={14} />
                  {submitting ? 'Submitting...' : canResubmit ? 'Resubmit Work' : 'Submit Work'}
                </button>
              </form>
            )}

            {/* Read-only submitted links preview */}
            {submission && isReadOnly && !canResubmit && (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-6 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/25 mb-4">Submitted Links</p>
                {[
                  { label: 'GitHub', value: submission.github_link, icon: GitBranch },
                  { label: 'Live URL', value: submission.deployment_link, icon: Globe },
                  { label: 'Document', value: submission.document_url, icon: FileText },
                  { label: 'Video', value: submission.video_url, icon: Video },
                ].filter(f => f.value).map(f => (
                  <a key={f.label} href={f.value!} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-white/10 transition-all">
                    <f.icon size={13} className="text-white/40 shrink-0" />
                    <span className="text-sm font-bold text-white/60 flex-1 truncate">{f.value}</span>
                    <ExternalLink size={11} className="text-white/20 shrink-0" />
                  </a>
                ))}
                {submission.explanation && (
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <p className="text-[10px] text-white/25 font-bold uppercase tracking-wider mb-2">Your Notes</p>
                    <p className="text-sm text-white/50 leading-relaxed">{submission.explanation}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
