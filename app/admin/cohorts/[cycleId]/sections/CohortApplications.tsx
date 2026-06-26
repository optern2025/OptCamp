"use client";

import { useEffect, useState } from "react";
import { Search, Brain, Clock, ChevronRight, AlertTriangle, ShieldCheck, Mail, Phone, GraduationCap, Github, Linkedin, ExternalLink, Globe, FileText, Settings, RefreshCw, Ban, CheckCircle2 } from "lucide-react";
import { Badge, Button, Skeleton, EmptyState, Drawer, Select, Input, Textarea, useToast } from "@/app/components/ui/design-system";
import { toISTDisplay } from "@/lib/dateTime";

interface Application {
  id: string; full_name: string; email: string; mobile_number: string;
  college: string; graduation_year: string; skills: string;
  github_url: string; linkedin_url: string; portfolio_url: string;
  resume_url: string; motivation: string; status: string;
  admin_notes: string; submitted_at: string;
  packet_status?: string | null;
  cycles: { title: string; cohort_type: string; domains?: { name: string } | null } | null;
}

interface ApplicationDetail extends Application {
  previousApps: any[];
  screeningHistory: any[];
  packetStatus: string | null;   // null | "pending" | "generated" | "failed"
  attemptStatus: string | null;  // null | "in_progress" | "submitted" | "passed" | "failed" | "pending_review"
}

const STATUS_COLORS: Record<string, "neutral" | "success" | "info" | "warning" | "danger"> = {
  pending: "warning",
  approved: "info",
  rejected: "danger",
  screening_required: "info",
  screening_passed: "success",
  screening_failed: "danger",
  selected: "success",
  enrolled: "success",
  completed: "success",
  waitlisted: "neutral",
};

const LOCKED_ATTEMPT_STATUSES = ["in_progress", "submitted", "passed", "failed", "pending_review", "completed"];

// Derive the screening button state from the current data
function getScreeningButtonState(selected: ApplicationDetail | null): {
  label: string;
  variant: "primary" | "warning" | "ghost";
  canGenerate: boolean;
  isRegenerate: boolean;
  tooltip: string;
} {
  if (!selected) return { label: "Generate AI Screening", variant: "primary", canGenerate: false, isRegenerate: false, tooltip: "" };

  const { attemptStatus, packetStatus } = selected;

  if (attemptStatus && LOCKED_ATTEMPT_STATUSES.includes(attemptStatus)) {
    const label = attemptStatus === "in_progress" ? "Attempt In Progress" : "Attempt Submitted";
    return { label, variant: "ghost", canGenerate: false, isRegenerate: false, tooltip: `Cannot regenerate: candidate has already ${attemptStatus === "in_progress" ? "started" : "submitted"} the screening.` };
  }

  if (packetStatus === "generated") {
    return { label: "Regenerate AI Screening", variant: "warning", canGenerate: true, isRegenerate: true, tooltip: "Replace the existing unused screening questions with fresh ones." };
  }

  if (packetStatus === "pending") {
    return { label: "Generation In Progress...", variant: "ghost", canGenerate: false, isRegenerate: false, tooltip: "AI screening is currently being generated." };
  }

  return { label: "Generate AI Screening", variant: "primary", canGenerate: true, isRegenerate: false, tooltip: "Generate AI screening questions for this candidate." };
}

export default function CohortApplications({ cycleId }: { cycleId: string }) {
  const { success, error: toastError } = useToast();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [selected, setSelected] = useState<ApplicationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  // Confirmation modal state
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (search) params.set("search", search);
      params.set("cycle_id", cycleId);
      const res = await fetch(`/api/admin/applications?${params}`);
      const data = await res.json();
      setApps(data.applications || []);
    } catch { toastError("Failed to load applications"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [cycleId, filterStatus, search]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setSelected(null);
    try {
      const res = await fetch(`/api/admin/applications/${id}`);
      const data = await res.json();
      setSelected(data.application ? {
        ...data.application,
        previousApps: data.previousApps,
        screeningHistory: data.screeningHistory,
        packetStatus: data.packetStatus ?? null,
        attemptStatus: data.attemptStatus ?? null,
      } : null);
      setAdminNotes(data.application?.admin_notes || "");
    } catch { toastError("Failed to load details"); }
    finally { setDetailLoading(false); }
  };

  const handleStatus = async (newStatus: string) => {
    if (!selected) return;

    if (newStatus === "screening_required" && selected.status !== "screening_required") {
      await doGenerateScreening();
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/applications/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, admin_notes: adminNotes }),
      });
      if (!res.ok) throw new Error();
      setSelected(prev => prev ? { ...prev, status: newStatus } : null);
      setApps(prev => prev.map(a => a.id === selected.id ? { ...a, status: newStatus } : a));
      success(`Status updated to ${newStatus}`);
    } catch { toastError("Update failed"); }
    finally { setUpdating(false); }
  };

  const handleNotes = async () => {
    if (!selected) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/applications/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_notes: adminNotes }),
      });
      if (!res.ok) throw new Error();
      success("Notes saved");
      setApps(prev => prev.map(a => a.id === selected.id ? { ...a, admin_notes: adminNotes } : a));
    } catch { toastError("Update failed"); }
    finally { setUpdating(false); }
  };

  // Core generate/regenerate handler
  const doGenerateScreening = async () => {
    if (!selected) return;
    setConfirmOpen(false);
    setGeneratingAI(true);
    try {
      const res = await fetch(`/api/admin/applications/${selected.id}/generate-screening`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      success(data.message || "AI Screening Generated");
      // Refresh detail view to get updated packetStatus + attemptStatus
      await openDetail(selected.id);
      await load();
    } catch (e: any) { toastError(e.message || "Failed to generate screening"); }
    finally { setGeneratingAI(false); }
  };

  // Called when button is clicked
  const handleGenerateScreeningClick = () => {
    if (!selected) return;
    const btnState = getScreeningButtonState(selected);
    if (!btnState.canGenerate) return;

    if (btnState.isRegenerate) {
      // Show confirmation modal before regenerating
      setConfirmOpen(true);
    } else {
      doGenerateScreening();
    }
  };

  const btnState = getScreeningButtonState(selected);

  return (
    <div className="space-y-6">
      {/* Regenerate Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0D1117] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Regenerate AI Screening?</h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  Regenerating will <span className="text-amber-400 font-semibold">replace</span> the current unused screening questions for this candidate with a fresh set. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={doGenerateScreening}
                disabled={generatingAI}
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
              >
                <RefreshCw size={14} className="mr-1.5" />
                {generatingAI ? "Regenerating..." : "Yes, Regenerate"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white">Candidate Pipeline</h2>
          <p className="text-white/35 text-sm mt-0.5">Manage cohort applications and screening progression</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <Input 
              placeholder="Search by name, email, skills..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9 w-64"
            />
          </div>
          <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-40">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="screening_required">Screening Req</option>
            <option value="screening_passed">Screening Passed</option>
            <option value="selected">Selected</option>
            <option value="enrolled">Enrolled</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : apps.length === 0 ? (
        <EmptyState title="No candidates found" description="Adjust your filters or wait for applications." icon={<Settings />} />
      ) : (
        <div className="space-y-2">
          {apps.map(app => (
            <div 
              key={app.id} 
              onClick={() => openDetail(app.id)}
              className="bg-[#0A0E17] border border-white/[0.07] hover:border-white/20 rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all group"
            >
              <div className="flex-1 min-w-0 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold text-white shrink-0">
                  {app.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-primary-400 transition-colors">{app.full_name}</h3>
                  <div className="flex items-center gap-2 text-xs text-white/40 mt-1">
                    <span className="truncate max-w-[150px]">{app.email}</span>
                    <span className="text-white/10">•</span>
                    <span>{app.college || "No College"}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="hidden md:flex flex-col items-end">
                  <Badge variant={STATUS_COLORS[app.status] ?? "neutral"} className="text-[10px] uppercase">
                    {app.status.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-[10px] text-white/30 mt-1">{toISTDisplay(app.submitted_at)}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-primary-400 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Drawer */}
      <Drawer
        isOpen={!!selected || detailLoading}
        onClose={() => setSelected(null)}
        title="Candidate Profile"
        footer={selected && (
          <div className="flex items-center justify-between w-full">
            <Select 
              value={selected.status} 
              onChange={e => handleStatus(e.target.value)} 
              disabled={updating}
              className="w-48 bg-black"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="screening_required">Screening Required</option>
              <option value="screening_passed">Screening Passed</option>
              <option value="screening_failed">Screening Failed</option>
              <option value="selected">Selected</option>
              <option value="enrolled">Enrolled</option>
              <option value="waitlisted">Waitlisted</option>
            </Select>
            <div className="flex gap-2 items-center">
              <Button variant="ghost" onClick={() => handleNotes()} disabled={updating}>Save Notes</Button>

              {/* Smart Generate / Regenerate / Disabled button */}
              {btnState.canGenerate ? (
                <Button
                  variant={btnState.variant as any}
                  onClick={handleGenerateScreeningClick}
                  disabled={generatingAI}
                  title={btnState.tooltip}
                  className={btnState.isRegenerate ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20" : ""}
                >
                  {btnState.isRegenerate
                    ? <RefreshCw size={14} className="mr-1.5" />
                    : <Brain size={14} className="mr-1.5" />}
                  {generatingAI
                    ? (btnState.isRegenerate ? "Regenerating..." : "Generating...")
                    : btnState.label}
                </Button>
              ) : btnState.label !== "Generate AI Screening" && (
                <div
                  title={btnState.tooltip}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/30 text-sm cursor-not-allowed select-none"
                >
                  <Ban size={13} className="mr-0.5" />
                  {btnState.label}
                </div>
              )}
            </div>
          </div>
        )}
      >
        {detailLoading ? (
          <div className="space-y-4 p-4"><Skeleton className="h-32 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>
        ) : selected ? (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-[#0A0E17] border border-white/[0.07] rounded-xl p-5 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">{selected.full_name}</h2>
                <Badge variant={STATUS_COLORS[selected.status] ?? "neutral"} className="text-[10px] uppercase">
                  {selected.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/40 flex items-center justify-end gap-1"><Clock size={12}/> Applied</p>
                <p className="text-sm text-white/80 font-medium">{toISTDisplay(selected.submitted_at)}</p>
              </div>
            </div>

            {/* AI Screening Status Panel */}
            <div className="bg-[#0A0E17] border border-white/[0.07] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary-400" />
                  <h3 className="text-sm font-bold text-white">AI Screening</h3>
                </div>
                {/* Screening State Badge */}
                {selected.attemptStatus && LOCKED_ATTEMPT_STATUSES.includes(selected.attemptStatus) ? (
                  <Badge variant="warning" className="text-[10px] uppercase flex items-center gap-1">
                    <AlertTriangle size={9} />
                    {selected.attemptStatus === "in_progress" ? "In Progress" : selected.attemptStatus}
                  </Badge>
                ) : selected.packetStatus === "generated" ? (
                  <Badge variant="info" className="text-[10px] uppercase flex items-center gap-1">
                    <CheckCircle2 size={9} />
                    Questions Ready
                  </Badge>
                ) : selected.packetStatus === "pending" ? (
                  <Badge variant="neutral" className="text-[10px] uppercase">Generating...</Badge>
                ) : (
                  <Badge variant="neutral" className="text-[10px] uppercase">Not Generated</Badge>
                )}
              </div>

              {selected.screeningHistory?.length > 0 ? (
                <div className="space-y-2">
                  {selected.screeningHistory.map((sh, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/5">
                      <div className="flex items-center gap-3">
                        <Badge variant={sh.passed ? "success" : "danger"} className="text-[10px] uppercase">{sh.passed ? "Passed" : "Failed"}</Badge>
                        <span className="text-sm font-bold text-white">{sh.score}%</span>
                        <span className="text-xs text-white/30 capitalize">{sh.status}</span>
                      </div>
                      <a href={`/admin/screening/review?id=${sh.id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:text-primary-300 flex items-center">
                        View Report <ExternalLink size={10} className="ml-1" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : selected.packetStatus === "generated" ? (
                <p className="text-sm text-white/50">Questions generated. Candidate has not started the test yet.</p>
              ) : selected.packetStatus === "pending" ? (
                <p className="text-sm text-white/50">AI is generating questions...</p>
              ) : (
                <p className="text-sm text-white/40">No screening generated yet. Use the button below to generate.</p>
              )}
            </div>

            {/* Contact & Education */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0A0E17] border border-white/[0.07] rounded-xl p-5">
                <h3 className="text-xs font-black text-white/30 uppercase tracking-widest mb-4">Contact</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-white/70"><Mail size={14} className="text-white/30"/> {selected.email}</div>
                  <div className="flex items-center gap-3 text-sm text-white/70"><Phone size={14} className="text-white/30"/> {selected.mobile_number}</div>
                  <div className="flex items-center gap-3 text-sm text-white/70"><Globe size={14} className="text-white/30"/> {selected.cycles?.title || "Unknown Cohort"}</div>
                </div>
              </div>
              <div className="bg-[#0A0E17] border border-white/[0.07] rounded-xl p-5">
                <h3 className="text-xs font-black text-white/30 uppercase tracking-widest mb-4">Education & Links</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-white/70"><GraduationCap size={14} className="text-white/30"/> {selected.college} ({selected.graduation_year})</div>
                  {selected.github_url && <a href={selected.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-primary-400 hover:underline"><Github size={14}/> GitHub</a>}
                  {selected.linkedin_url && <a href={selected.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-primary-400 hover:underline"><Linkedin size={14}/> LinkedIn</a>}
                  {selected.portfolio_url && <a href={selected.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-primary-400 hover:underline"><ExternalLink size={14}/> Portfolio</a>}
                  {selected.resume_url && <a href={selected.resume_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-primary-400 hover:underline"><FileText size={14}/> Resume</a>}
                </div>
              </div>
            </div>

            {/* Motivation & Skills */}
            <div className="bg-[#0A0E17] border border-white/[0.07] rounded-xl p-5">
              <h3 className="text-xs font-black text-white/30 uppercase tracking-widest mb-3">Skills</h3>
              <p className="text-sm text-white/80 leading-relaxed bg-black/40 p-3 rounded-lg border border-white/5">{selected.skills}</p>
              
              <h3 className="text-xs font-black text-white/30 uppercase tracking-widest mt-5 mb-3">Motivation</h3>
              <p className="text-sm text-white/80 leading-relaxed bg-black/40 p-3 rounded-lg border border-white/5 whitespace-pre-wrap">{selected.motivation}</p>
            </div>

            {/* Admin Notes */}
            <div className="bg-[#0A0E17] border border-white/[0.07] rounded-xl p-5">
              <h3 className="text-xs font-black text-white/30 uppercase tracking-widest mb-3">Admin Notes</h3>
              <Textarea 
                value={adminNotes} 
                onChange={e => setAdminNotes(e.target.value)} 
                placeholder="Private notes about this candidate..."
                className="w-full bg-black/40 border-white/10 text-sm"
                rows={4}
              />
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
