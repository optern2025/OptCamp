"use client";

import { useEffect, useState } from "react";
import { Github, ExternalLink, FileText, Video, MessageSquare, CheckCircle, XCircle, AlertTriangle, Inbox } from "lucide-react";
import { Badge, Button, Skeleton, EmptyState, Select, Drawer, FormField, Textarea, Input, useToast } from "@/app/components/ui/design-system";
import { toISTDisplay } from "@/lib/dateTime";

const STATUS_COLORS: Record<string, "neutral" | "success" | "info" | "warning" | "danger"> = {
  pending: "info", approved: "success", needs_revision: "warning", rejected: "danger",
};

const AVATAR_COLORS = [
  "bg-violet-500/20 text-violet-300",
  "bg-cyan-500/20 text-cyan-300",
  "bg-emerald-500/20 text-emerald-300",
  "bg-amber-500/20 text-amber-300",
  "bg-rose-500/20 text-rose-300",
  "bg-sky-500/20 text-sky-300",
];

function avatarColor(name: string) {
  return AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

function initials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length === 1 ? parts[0].charAt(0).toUpperCase() : (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface Submission {
  id: string; status: string; score: number; admin_feedback: string;
  submitted_at: string; reviewed_at: string;
  github_link: string; deployment_link: string; document_url: string;
  video_url: string; explanation: string;
  tasks: { id: string; title: string; points: number; sprints: { title: string } } | { id: string; title: string; points: number; sprints: { title: string } }[];
  new_users: { id: string; full_name: string; email: string } | { id: string; full_name: string; email: string }[];
}

const STATUS_TABS = [
  { value: "pending",       label: "Pending",      color: "text-amber-400",   activeClasses: "bg-amber-500/10 border-amber-500/25 text-amber-300" },
  { value: "approved",      label: "Approved",     color: "text-emerald-400", activeClasses: "bg-emerald-500/10 border-emerald-500/25 text-emerald-300" },
  { value: "needs_revision",label: "Needs Revision",color: "text-orange-400", activeClasses: "bg-orange-500/10 border-orange-500/25 text-orange-300" },
  { value: "rejected",      label: "Rejected",     color: "text-rose-400",    activeClasses: "bg-rose-500/10 border-rose-500/25 text-rose-300" },
  { value: "",              label: "All",           color: "text-white/50",    activeClasses: "bg-white/8 border-white/15 text-white" },
];

export default function CohortSubmissions({ cycleId }: { cycleId: string }) {
  const { success, error: toastError } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [reviewing, setReviewing] = useState<Submission | null>(null);
  const [reviewForm, setReviewForm] = useState({ status: "approved", score: 0, admin_feedback: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = filterStatus ? `?status=${filterStatus}` : "";
      const res = await fetch(`/api/admin/cohorts/${cycleId}/submissions${params}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSubmissions(data.submissions || []);
    } catch (e: any) {
      setError(e.message || "Failed to load submissions");
      toastError("Failed to load submissions");
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [cycleId, filterStatus]);

  const getUser = (s?: Submission | null) => {
    if (!s) return null;
    if (Array.isArray(s.new_users)) return s.new_users[0] ?? null;
    return s.new_users ?? null;
  };

  const getTask = (s?: Submission | null) => {
    if (!s) return null;
    if (Array.isArray(s.tasks)) return s.tasks[0] ?? null;
    return s.tasks ?? null;
  };

  const openReview = (sub: Submission) => {
    const task = getTask(sub);
    setReviewing(sub);
    setReviewForm({ status: "approved", score: task?.points ?? 10, admin_feedback: sub.admin_feedback || "" });
  };

  const handleReview = async () => {
    if (!reviewing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/cohorts/${cycleId}/submissions/${reviewing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewForm),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      success("Submission reviewed");
      setReviewing(null);
      await load();
    } catch (e: any) { toastError(e.message || "Review failed"); }
    finally { setSaving(false); }
  };

  const quickAction = async (id: string, status: string, score = 0) => {
    try {
      const res = await fetch(`/api/admin/cohorts/${cycleId}/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, score, admin_feedback: "" }),
      });
      if (!res.ok) throw new Error();
      success(`Marked as ${status}`);
      setSubmissions(prev => prev.filter(s => s.id !== id));
    } catch { toastError("Action failed"); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Review Queue</h2>
          <p className="text-white/35 text-sm mt-0.5">{submissions.length} submission{submissions.length !== 1 ? "s" : ""} in view</p>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilterStatus(tab.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              filterStatus === tab.value
                ? tab.activeClasses
                : "bg-white/4 border-white/8 text-white/35 hover:text-white/60 hover:border-white/15"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <EmptyState title="Unable to load submissions" description={error} icon={<Inbox />} />}

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : submissions.length === 0 ? (
        <EmptyState
          title={filterStatus === "pending" ? "No pending submissions" : filterStatus === "approved" ? "No approved submissions yet" : "No submissions found"}
          description={filterStatus === "pending" ? "All caught up! New submissions will appear here." : "Try a different filter to find submissions."}
          icon={<Inbox />}
        />
      ) : (
        <div className="space-y-3">
          {submissions.filter(Boolean).map(sub => {
            const user = getUser(sub);
            const task = getTask(sub);
            return (
              <div key={sub.id} className="bg-[#0A0E17] border border-white/[0.07] rounded-2xl p-5 hover:border-white/12 transition-all">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${avatarColor(user?.full_name ?? "")}`}>
                      {initials(user?.full_name ?? "")}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{user?.full_name ?? "Unknown"}</p>
                      <p className="text-[10px] text-white/30">{user?.email ?? ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_COLORS[sub.status] ?? "neutral"} className="text-[8px] uppercase tracking-wider">
                      {sub.status.replace(/_/g, " ")}
                    </Badge>
                    {sub.score > 0 && <span className="text-emerald-400 font-bold text-sm">{sub.score} pts</span>}
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-white/40">
                    <span className="text-white/25">Task: </span>{task?.title ?? "Unknown task"}
                    {task?.sprints?.title && <> <span className="text-white/15">·</span> <span className="text-white/25">{task.sprints.title}</span></>}
                  </p>
                </div>

                {/* Resource links */}
                {(sub.github_link || sub.deployment_link || sub.document_url || sub.video_url) && (
                  <div className="flex flex-wrap gap-3 mb-3">
                    {sub.github_link && <a href={sub.github_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] text-primary-400 hover:text-primary-300 transition-colors"><Github size={11} />GitHub</a>}
                    {sub.deployment_link && <a href={sub.deployment_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] text-primary-400 hover:text-primary-300 transition-colors"><ExternalLink size={11} />Live Demo</a>}
                    {sub.document_url && <a href={sub.document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] text-primary-400 hover:text-primary-300 transition-colors"><FileText size={11} />Document</a>}
                    {sub.video_url && <a href={sub.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] text-primary-400 hover:text-primary-300 transition-colors"><Video size={11} />Video</a>}
                  </div>
                )}

                {sub.explanation && (
                  <div className="bg-black/20 rounded-xl p-3 border border-white/[0.05] mb-3">
                    <p className="text-[9px] uppercase tracking-widest text-white/25 mb-1">Explanation</p>
                    <p className="text-xs text-white/50 line-clamp-2">{sub.explanation}</p>
                  </div>
                )}

                {sub.admin_feedback && (
                  <div className="bg-amber-500/5 border border-amber-400/15 rounded-xl p-3 mb-3">
                    <p className="text-[9px] uppercase tracking-widest text-amber-400/50 mb-1">Mentor Feedback</p>
                    <p className="text-xs text-white/50">{sub.admin_feedback}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-white/[0.05] flex-wrap">
                  <p className="text-[10px] text-white/25 mr-auto">Submitted {toISTDisplay(sub.submitted_at)}</p>
                  {sub.status === "pending" && (
                    <>
                      <Button size="sm" variant="ghost" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" onClick={() => openReview(sub)}>
                        <CheckCircle size={12} className="mr-1" /> Approve & Score
                      </Button>
                      <Button size="sm" variant="ghost" className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" onClick={() => quickAction(sub.id, "needs_revision")}>
                        <AlertTriangle size={12} className="mr-1" /> Needs Revision
                      </Button>
                      <Button size="sm" variant="ghost" className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" onClick={() => quickAction(sub.id, "rejected")}>
                        <XCircle size={12} className="mr-1" /> Reject
                      </Button>
                    </>
                  )}
                  {sub.status !== "pending" && (
                    <Button size="sm" variant="ghost" onClick={() => openReview(sub)}>
                      <MessageSquare size={12} className="mr-1" /> Re-review
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Drawer */}
      <Drawer
        isOpen={!!reviewing}
        onClose={() => setReviewing(null)}
        title="Review Submission"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReviewing(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleReview} disabled={saving}>{saving ? "Saving..." : "Submit Review"}</Button>
          </>
        }
      >
        {reviewing && (
          <div className="space-y-5">
            <div className="bg-[#060810] border border-white/[0.07] rounded-xl p-4">
              <p className="text-white/35 text-xs mb-1">Reviewing submission by</p>
              <p className="font-bold text-white">{getUser(reviewing)?.full_name ?? "Unknown"}</p>
              <p className="text-xs text-white/30 mt-0.5">{getTask(reviewing)?.title ?? "Unknown task"}</p>
            </div>

            {/* Resource links in drawer */}
            {(reviewing.github_link || reviewing.deployment_link || reviewing.document_url || reviewing.video_url) && (
              <div className="flex flex-wrap gap-3">
                {reviewing.github_link && <a href={reviewing.github_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300"><Github size={12} />GitHub</a>}
                {reviewing.deployment_link && <a href={reviewing.deployment_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300"><ExternalLink size={12} />Live Demo</a>}
                {reviewing.document_url && <a href={reviewing.document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300"><FileText size={12} />Document</a>}
                {reviewing.video_url && <a href={reviewing.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300"><Video size={12} />Video</a>}
              </div>
            )}

            <FormField label="Decision">
              <Select value={reviewForm.status} onChange={e => setReviewForm(f => ({ ...f, status: e.target.value }))}>
                <option value="approved" className="bg-black">✓ Approved</option>
                <option value="needs_revision" className="bg-black">⚠ Needs Improvement</option>
                <option value="rejected" className="bg-black">✗ Rejected</option>
              </Select>
            </FormField>
            {reviewForm.status === "approved" && (
              <FormField label={`Score (max ${getTask(reviewing)?.points ?? 10} pts)`}>
                <Input type="number" min={0} max={getTask(reviewing)?.points ?? 100} value={reviewForm.score} onChange={e => setReviewForm(f => ({ ...f, score: parseInt(e.target.value) || 0 }))} />
              </FormField>
            )}
            <FormField label="Mentor Feedback (optional)">
              <Textarea rows={4} value={reviewForm.admin_feedback} onChange={e => setReviewForm(f => ({ ...f, admin_feedback: e.target.value }))} placeholder="Leave constructive feedback for the student..." />
            </FormField>
          </div>
        )}
      </Drawer>
    </div>
  );
}
