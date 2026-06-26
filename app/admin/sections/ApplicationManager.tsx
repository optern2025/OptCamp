"use client";

import { useEffect, useState } from "react";
import { Search, Filter, ShieldCheck, Mail, Phone, GraduationCap, Github, Linkedin, ExternalLink, Globe, Clock, FileText, CheckSquare, Square, History, AlertTriangle, Zap, RefreshCw } from "lucide-react";
import { toISTDisplay } from "@/lib/dateTime";

import { 
  Drawer, Modal, Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
  Input, Textarea, Select, useToast, EmptyState, Button, PageHeader, Badge, Skeleton, Timeline, FormField
} from "@/app/components/ui/design-system";

interface Application {
  id: string; full_name: string; email: string; mobile_number: string;
  college: string; graduation_year: string; skills: string;
  github_url: string; linkedin_url: string; portfolio_url: string;
  resume_url: string; motivation: string; status: string;
  admin_notes: string; submitted_at: string;
  packet_status?: string | null; // "generated" | "pending" | "failed" | null (null = missing)
  cycles: { title: string; cohort_type: string; domains?: { name: string } | null } | null;
}

interface ApplicationDetail extends Application {
  previousApps: { id: string; status: string; submitted_at: string; cycles: { title: string } | null }[];
  screeningHistory: { id: string; score: number; passed: boolean; difficulty_level: number; submitted_at: string; status: string }[];
  domainEligibility: any[];
}

const STATUSES = ["pending", "approved", "rejected", "screening_required", "screening_passed", "screening_failed", "selected", "enrolled", "waitlisted"];

const STATUS_COLORS: Record<string, "neutral" | "success" | "info" | "warning" | "danger"> = {
  pending: "warning",
  under_review: "warning",
  approved: "success",
  screening_passed: "success",
  selected: "success",
  enrolled: "success",
  completed: "success",
  rejected: "danger",
  screening_failed: "danger",
  screening_required: "info",
  waitlisted: "neutral",
};

export default function ApplicationManager({ cycleId }: { cycleId?: string }) {
  const { success, error: toastError } = useToast();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  
  // Drawer State
  const [selected, setSelected] = useState<ApplicationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  // Bulk State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [backfillingPacket, setBackfillingPacket] = useState(false);
  const [backfillAllLoading, setBackfillAllLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (search) params.set("search", search);
      if (cycleId) params.set("cycle_id", cycleId);
      const res = await fetch(`/api/admin/applications?${params}`);
      const data = await res.json();
      setApps(data.applications || []);
    } catch (err) {
      toastError("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [filterStatus, search]);

  const openDetail = async (id: string) => {
    setDetailLoading(true); 
    setSelected(null);
    try {
      const res = await fetch(`/api/admin/applications/${id}`);
      const data = await res.json();
      setSelected(data.application ? { ...data.application, previousApps: data.previousApps, screeningHistory: data.screeningHistory } : null);
      setAdminNotes(data.application?.admin_notes || "");
    } catch (e) {
      toastError("Failed to load application details");
    } finally {
      setDetailLoading(false);
    }
  };

  // Works on the currently-open drawer application
  const handleQuickStatus = async (newStatus: string) => {
    if (!selected) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/applications/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, admin_notes: adminNotes }),
      });
      if (!res.ok) throw new Error();
      setSelected(prev => prev ? { ...prev, status: newStatus } : null);
      success("Status updated", `Moved to ${newStatus.replace(/_/g, " ")}`);
      await load();
    } catch {
      toastError("Update failed");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleGenerateScreening = async () => {
    if (!selected) return;
    setGeneratingAI(true);
    try {
      const res = await fetch(`/api/admin/applications/${selected.id}/generate-screening`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      success("Screening Generated", "Screening test created successfully. Application moved to Screening Test Available.");
      setSelected(prev => prev ? { ...prev, status: 'screening_required' } : null);
      await load();
    } catch (err: any) {
      toastError("Failed to update status", err.message);
    } finally {
      setGeneratingAI(false);
    }
  };

  // Generate / Backfill Packet
  const handleBackfillPacket = async (appId: string) => {
    setBackfillingPacket(true);
    try {
      const res = await fetch(`/api/admin/applications/${appId}/generate-screening`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate screening");
      success("Screening Generated", "Screening test created successfully.");
      // update local
      setSelected(prev => prev && prev.id === appId ? { ...prev, status: 'screening_required', packet_status: 'generated' } : prev);
      // update list
      setApps(prev => prev.map(a => a.id === appId ? { ...a, packet_status: 'generated' } : a));
      await load();
    } catch (err: any) {
      console.error(err);
      toastError("Screening generation failed", err.message);
    } finally {
      setBackfillingPacket(false);
    }
  };

  const handleBackfillAll = async () => {
    setBackfillAllLoading(true);
    try {
      const res = await fetch("/api/admin/screening/backfill-packets", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Backfill failed");
      success(
        "Backfill Complete",
        `Generated: ${data.generated} | Skipped: ${data.skipped} | Failed: ${data.failed}`
      );
      await load();
    } catch (err: any) {
      toastError("Backfill failed", err.message);
    } finally {
      setBackfillAllLoading(false);
    }
  };

  // Works directly from the table row — does NOT require selected/drawer to be open
  const handleDirectStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      success("Status updated", `Moved to ${newStatus.replace(/_/g, " ")}`);
      // Optimistically update the list row immediately
      setApps(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
      // Also refresh the drawer if it's open for this application
      setSelected(prev => prev && prev.id === id ? { ...prev, status: newStatus } : prev);
      await load();
    } catch {
      toastError("Update failed");
    }
  };

  const handleBulkStatus = async (newStatus: string) => {
    setBulkActionLoading(true);
    let sCount = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/admin/applications/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) sCount++;
      } catch {
        // Continue
      }
    }
    if (sCount > 0) success(`Updated ${sCount} applications to ${newStatus.replace(/_/g, " ")}`);
    setSelectedIds([]);
    await load();
    setBulkActionLoading(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === apps.length) setSelectedIds([]);
    else setSelectedIds(apps.map(a => a.id));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const getTimelineEvents = (app: ApplicationDetail) => {
    const events = [];
    events.push({
      id: "applied",
      title: "Application Submitted",
      date: toISTDisplay(app.submitted_at),
      status: "success" as const
    });

    if (app.status === "rejected") {
      events.push({ id: "rejected", title: "Rejected", status: "error" as const });
      return events;
    }

    if (["screening_required", "screening_passed", "screening_failed", "selected", "enrolled", "waitlisted"].includes(app.status)) {
      events.push({ id: "screening_req", title: "Screening Required", status: "active" as const });
    }

    if (["screening_passed", "selected", "enrolled"].includes(app.status)) {
      events.push({ id: "screening_pass", title: "Screening Cleared", status: "success" as const });
    } else if (app.status === "screening_failed") {
      events.push({ id: "screening_fail", title: "Screening Not Cleared", status: "error" as const });
    }

    if (["selected", "enrolled"].includes(app.status)) {
      events.push({ id: "selected", title: "Selected for Cohort", status: "success" as const });
    }

    if (app.status === "enrolled") {
      events.push({ id: "enrolled", title: "Enrolled", status: "success" as const });
    }

    return events;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Application Review Center" 
          description="Manage cohort applications, screen candidates, and build your classes." 
        />
        
        {/* Backfill All Missing Packets */}
        {!selectedIds.length && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackfillAll}
            disabled={backfillAllLoading}
            className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 flex items-center gap-2"
          >
            <Zap size={14} />
            {backfillAllLoading ? "Backfilling..." : "Backfill All Screenings"}
          </Button>
        )}

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 p-1.5 rounded-[16px] bg-white/5 border border-white/10 animate-in fade-in slide-in-from-right-4">
            <span className="px-3 text-xs font-bold text-white/50">{selectedIds.length} selected</span>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <Button size="sm" variant="ghost" onClick={() => handleBulkStatus('screening_required')} disabled={bulkActionLoading}>Require Screening</Button>
            <Button size="sm" variant="ghost" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" onClick={() => handleBulkStatus('approved')} disabled={bulkActionLoading}>Approve</Button>
            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleBulkStatus('rejected')} disabled={bulkActionLoading}>Reject</Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-[#0B0F14] p-4 rounded-[24px] border border-white/10">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input 
            placeholder="Search applicants..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-white/40" />
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-48"
          >
            <option value="" className="bg-black">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s} className="bg-black">{s.replace(/_/g, " ")}</option>)}
          </Select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-[14px]" />
          <Skeleton className="h-12 w-full rounded-[14px]" />
          <Skeleton className="h-12 w-full rounded-[14px]" />
        </div>
      ) : apps.length === 0 ? (
        <EmptyState 
          title="No applications found" 
          description="There are no applications matching your criteria."
          icon={<FileText />}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <button onClick={toggleSelectAll} className="text-white/40 hover:text-white">
                  {selectedIds.length === apps.length && apps.length > 0 ? <CheckSquare size={16} className="text-cyan-400" /> : <Square size={16} />}
                </button>
              </TableHead>
              <TableHead>Applicant</TableHead>
              {!cycleId && <TableHead>Target Cohort</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>Applied Date</TableHead>
              <TableHead className="text-right">Command Center</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apps.map(app => {
              const isSelected = selectedIds.includes(app.id);
              return (
                <TableRow key={app.id} data-state={isSelected ? "selected" : undefined}>
                  <TableCell>
                    <button onClick={() => toggleSelect(app.id)} className="text-white/40 hover:text-white">
                      {isSelected ? <CheckSquare size={16} className="text-cyan-400" /> : <Square size={16} />}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => openDetail(app.id)}>
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-black text-white text-xs">
                        {app.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-white hover:text-cyan-400 transition-colors">{app.full_name}</p>
                        <p className="text-[10px] text-white/40">{app.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  {!cycleId && (
                    <TableCell className="text-white/60">
                      <p className="text-xs font-bold">{app.cycles?.title ?? "—"}</p>
                      <p className="text-[9px] uppercase tracking-wider text-white/30">{app.cycles?.domains?.name ?? app.cycles?.cohort_type}</p>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={STATUS_COLORS[app.status] || "neutral"} className="uppercase text-[9px] tracking-wider">
                        {app.status.replace(/_/g, " ")}
                      </Badge>
                      {app.status === "screening_required" && !app.packet_status && (
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 w-fit px-2 py-0.5 rounded-full">
                          <AlertTriangle size={9} /> Screening Not Prepared
                        </div>
                      )}
                      {app.status === "screening_required" && app.packet_status === "failed" && (
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-500/10 w-fit px-2 py-0.5 rounded-full">
                          <AlertTriangle size={9} /> Screening Failed
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-white/40 text-xs font-mono">
                    {toISTDisplay(app.submitted_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {app.status === 'pending' && (
                        <>
                          <Button size="sm" variant="primary" onClick={() => handleDirectStatus(app.id, 'screening_required')}>Screen</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDirectStatus(app.id, 'approved')} className="text-emerald-400 hover:text-emerald-300">Approve</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDirectStatus(app.id, 'rejected')} className="text-red-400 hover:text-red-300">Reject</Button>
                        </>
                      )}
                      {app.status === 'screening_passed' && (
                        <>
                          <Button size="sm" variant="primary" onClick={() => handleDirectStatus(app.id, 'selected')}>Select</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDirectStatus(app.id, 'waitlisted')} className="text-amber-400 hover:text-amber-300">Waitlist</Button>
                        </>
                      )}
                      {app.status === 'selected' && (
                        <Button size="sm" variant="primary" onClick={() => handleDirectStatus(app.id, 'enrolled')}>Enroll</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openDetail(app.id)}>Review</Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      {/* Application Drawer */}
      <Drawer
        isOpen={!!selected || detailLoading}
        onClose={() => setSelected(null)}
        title="Review Application"
        description={selected ? `Applied ${toISTDisplay(selected.submitted_at)}` : "Loading..."}
        width="xl"
        footer={
          selected && (
            <>
              {selected.status === 'pending' && (
                <>
                  <Button variant="danger" onClick={() => handleQuickStatus('rejected')} disabled={updatingStatus || generatingAI}>Reject</Button>
                  <Button variant="secondary" onClick={() => handleQuickStatus('approved')} disabled={updatingStatus || generatingAI}>Approve (Waiver)</Button>
                  <Button variant="primary" onClick={handleGenerateScreening} disabled={updatingStatus || generatingAI}>
                    {generatingAI ? "Generating AI..." : "Require Screening"}
                  </Button>
                </>
              )}
              {selected.status === 'screening_required' && !selected.packet_status && (
                <Button variant="secondary" onClick={() => handleBackfillPacket(selected.id)} disabled={backfillingPacket} className="flex items-center gap-2 border-amber-500/40 text-amber-400 hover:text-amber-300">
                  <RefreshCw className={`w-4 h-4 ${backfillingPacket ? 'animate-spin' : ''}`} />
                  {backfillingPacket ? "Generating Screening..." : "Generate Screening"}
                </Button>
              )}
              {selected.status === 'screening_required' && selected.packet_status === 'failed' && (
                <Button variant="secondary" onClick={() => handleBackfillPacket(selected.id)} disabled={backfillingPacket} className="flex items-center gap-2 border-amber-500/40 text-amber-400 hover:text-amber-300">
                  <RefreshCw className={`w-4 h-4 ${backfillingPacket ? 'animate-spin' : ''}`} />
                  {backfillingPacket ? "Retrying..." : "Retry Screening Generation"}
                </Button>
              )}
              {selected.status === 'screening_passed' && (
                <>
                  <Button variant="danger" onClick={() => handleQuickStatus('rejected')} disabled={updatingStatus}>Reject</Button>
                  <Button variant="secondary" onClick={() => handleQuickStatus('waitlisted')} disabled={updatingStatus}>Waitlist</Button>
                  <Button variant="primary" onClick={() => handleQuickStatus('selected')} disabled={updatingStatus}>Select for Cohort</Button>
                </>
              )}
              {selected.status === 'selected' && (
                <Button variant="primary" onClick={() => handleQuickStatus('enrolled')} disabled={updatingStatus}>Enroll Student</Button>
              )}
            </>
          )
        }
      >
        {detailLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-[24px]" />
            <Skeleton className="h-64 w-full rounded-[24px]" />
          </div>
        ) : selected ? (
          <div className="space-y-8 pb-20">
            {/* Header section */}
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="info">{selected.cycles?.title}</Badge>
                  {selected.domainEligibility?.some((d: any) => d.waiver_eligible) && (
                    <Badge variant="success">Screening Already Cleared</Badge>
                  )}
                </div>
                <h2 className="text-3xl font-black text-white">{selected.full_name}</h2>
                <div className="flex gap-4 mt-2 text-sm font-bold text-white/50">
                  <span className="flex items-center gap-1.5"><Mail size={14} /> {selected.email}</span>
                  {selected.mobile_number && <span className="flex items-center gap-1.5"><Phone size={14} /> {selected.mobile_number}</span>}
                </div>
              </div>
              <Badge variant={STATUS_COLORS[selected.status] || "neutral"} className="text-xs px-3 py-1 uppercase tracking-widest">{selected.status.replace(/_/g, " ")}</Badge>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="col-span-2 space-y-6">
                <div className="bg-white/[0.02] border border-white/5 rounded-[24px] p-6 space-y-6">
                  <h3 className="text-[10px] font-black tracking-widest text-white/50 uppercase">Profile & Education</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="flex items-center gap-2 text-xs text-white/40 mb-1"><GraduationCap size={14} /> College</p>
                      <p className="text-sm font-bold text-white">{selected.college || "N/A"}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-2 text-xs text-white/40 mb-1"><Clock size={14} /> Graduation Year</p>
                      <p className="text-sm font-bold text-white">{selected.graduation_year || "N/A"}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <p className="text-xs text-white/40 mb-2 font-bold">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {(selected.skills || "").split(',').map((s: string, i: number) => s.trim() && (
                        <span key={i} className="px-3 py-1 rounded-[10px] bg-white/5 border border-white/10 text-xs font-bold text-white/80">{s.trim()}</span>
                      ))}
                    </div>
                  </div>

                  {selected.motivation && (
                    <div className="pt-4 border-t border-white/5">
                      <p className="text-xs text-white/40 mb-2 font-bold">Motivation</p>
                      <p className="text-sm text-white/80 leading-relaxed italic border-l-2 border-white/20 pl-4 py-1">"{selected.motivation}"</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-white/5 flex gap-4">
                    {selected.resume_url && <a href={selected.resume_url} target="_blank" className="flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300"><FileText size={14} /> Resume <ExternalLink size={12} /></a>}
                    {selected.github_url && <a href={selected.github_url} target="_blank" className="flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300"><Github size={14} /> GitHub <ExternalLink size={12} /></a>}
                    {selected.linkedin_url && <a href={selected.linkedin_url} target="_blank" className="flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300"><Linkedin size={14} /> LinkedIn <ExternalLink size={12} /></a>}
                    {selected.portfolio_url && <a href={selected.portfolio_url} target="_blank" className="flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300"><Globe size={14} /> Portfolio <ExternalLink size={12} /></a>}
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-[24px] p-6 space-y-4">
                  <h3 className="text-[10px] font-black tracking-widest text-white/50 uppercase flex items-center gap-2">
                    <History size={14} /> Screening History
                  </h3>
                  {selected.screeningHistory.length === 0 ? (
                    <p className="text-xs text-white/40">No technical screening history.</p>
                  ) : (
                    <div className="space-y-3">
                      {selected.screeningHistory.map(h => (
                        <div key={h.id} className="flex items-center justify-between p-3 rounded-[12px] bg-white/5">
                          <div>
                            <p className="text-sm font-bold text-white">{h.score}% Score</p>
                            <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Level {h.difficulty_level} • {toISTDisplay(h.submitted_at)}</p>
                          </div>
                          <Badge variant={h.passed ? "success" : "danger"}>{h.passed ? "Cleared" : "Not Cleared"}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <div className="bg-[#0B0F14] border border-white/10 rounded-[24px] p-6">
                  <h3 className="text-[10px] font-black tracking-widest text-white/50 uppercase mb-4">Application Journey</h3>
                  <Timeline events={getTimelineEvents(selected)} />
                </div>

                <div className="bg-[#0B0F14] border border-white/10 rounded-[24px] p-6">
                  <FormField label="Admin Notes" helperText="Private internal notes.">
                    <Textarea 
                      value={adminNotes} 
                      onChange={e => setAdminNotes(e.target.value)} 
                      onBlur={async () => {
                        // Auto-save notes on blur
                        if (adminNotes !== selected.admin_notes) {
                          await handleQuickStatus(selected.status);
                        }
                      }}
                      className="min-h-[120px]"
                    />
                  </FormField>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
