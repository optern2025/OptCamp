"use client";

import { useEffect, useState } from "react";
import { Plus, GitBranch, Edit2, Trash2, CheckCircle, Clock, Archive, Play, Zap } from "lucide-react";
import { Badge, Button, Skeleton, EmptyState, Drawer, FormField, Input, Textarea, Select, useToast, Modal } from "@/app/components/ui/design-system";
import { DateTimePicker } from "@/app/components/ui/DateTimePicker";
import { toISTDisplay } from "@/lib/dateTime";

const SPRINT_STATUSES = ["upcoming", "active", "completed", "archived"];
const STATUS_COLORS: Record<string, "neutral" | "success" | "info" | "warning" | "danger"> = {
  upcoming: "info", active: "success", completed: "neutral", archived: "neutral",
};
const STATUS_ICONS: Record<string, any> = {
  upcoming: Clock, active: Play, completed: CheckCircle, archived: Archive,
};

interface Sprint {
  id: string; title: string; description: string;
  start_date: string; end_date: string; status: string; task_count: number;
}

const emptyForm = { title: "", description: "", start_date: "", end_date: "", status: "upcoming" };

function daysRemaining(end: string) {
  return Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

export default function CohortSprints({ cycleId }: { cycleId: string }) {
  const { success, error: toastError } = useToast();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editing, setEditing] = useState<Sprint | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/cohorts/${cycleId}/sprints`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSprints(data.sprints || []);
    } catch (e: any) {
      setError(e.message || "Failed to load sprints");
      toastError("Failed to load sprints");
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [cycleId]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowDrawer(true); };
  const openEdit = (s: Sprint) => {
    setEditing(s);
    setForm({
      title: s.title, description: s.description || "",
      start_date: s.start_date?.slice(0, 16) || "",
      end_date: s.end_date?.slice(0, 16) || "",
      status: s.status || "upcoming",
    });
    setShowDrawer(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.start_date || !form.end_date) {
      toastError("Title, start date and end date are required");
      return;
    }
    setSaving(true);
    try {
      const url = editing
        ? `/api/admin/cohorts/${cycleId}/sprints/${editing.id}`
        : `/api/admin/cohorts/${cycleId}/sprints`;
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, start_date: new Date(form.start_date).toISOString(), end_date: new Date(form.end_date).toISOString() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      success(editing ? "Sprint updated" : "Sprint created");
      setShowDrawer(false);
      await load();
    } catch (e: any) { toastError(e.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (sprint: Sprint, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/cohorts/${cycleId}/sprints/${sprint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      success(`Sprint marked as ${newStatus}`);
      setSprints(prev => prev.map(s => s.id === sprint.id ? { ...s, status: newStatus } : s));
    } catch { toastError("Failed to update status"); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/cohorts/${cycleId}/sprints/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      success("Sprint deleted");
      setSprints(prev => prev.filter(s => s.id !== deleteId));
      setDeleteId(null);
    } catch { toastError("Failed to delete sprint"); }
  };

  const activeSprint = sprints.find(s => s.status === "active");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Sprint Command Center</h2>
          <p className="text-white/35 text-sm mt-0.5">{sprints.length} sprint{sprints.length !== 1 ? "s" : ""} in this cohort</p>
        </div>
        <Button variant="primary" className="flex items-center gap-2" onClick={openCreate}>
          <Plus size={16} /> Create Sprint
        </Button>
      </div>

      {error && <EmptyState title="Unable to load sprints" description={error} icon={<Archive />} />}

      {/* Active Sprint Hero */}
      {!loading && (
        activeSprint ? (
          <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-2xl p-5 ring-1 ring-emerald-500/10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-emerald-400/70 font-bold mb-0.5">Active Sprint</p>
                  <p className="font-bold text-white">{activeSprint.title}</p>
                  <p className="text-[10px] text-white/35 mt-0.5">
                    {toISTDisplay(activeSprint.start_date)} → {toISTDisplay(activeSprint.end_date)}
                    {activeSprint.task_count > 0 && ` · ${activeSprint.task_count} task${activeSprint.task_count !== 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
              {activeSprint.end_date && (
                <div className="text-right">
                  <p className="text-3xl font-black text-emerald-400">{daysRemaining(activeSprint.end_date)}</p>
                  <p className="text-[9px] text-white/30 uppercase tracking-wider">days left</p>
                </div>
              )}
            </div>
          </div>
        ) : sprints.length > 0 ? (
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-4 text-center">
            <p className="text-sm text-white/30">No active sprint — activate one below to start tracking.</p>
          </div>
        ) : null
      )}

      {/* Sprint Timeline (roadmap) */}
      {!loading && sprints.length > 0 && (
        <div className="bg-[#0A0E17] border border-white/[0.07] rounded-2xl p-5 overflow-x-auto">
          <p className="text-[9px] uppercase tracking-widest text-white/25 font-black mb-5">Sprint Roadmap</p>
          <div className="flex items-start gap-0">
            {sprints.map((sprint, idx) => {
              const isActive = sprint.status === "active";
              const isCompleted = sprint.status === "completed";
              return (
                <div key={sprint.id} className="flex items-start shrink-0">
                  <div className="flex flex-col items-center w-28">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black border-2 ${
                      isActive ? "border-emerald-400 bg-emerald-400/15 text-emerald-400" :
                      isCompleted ? "border-white/30 bg-white/10 text-white/60" :
                      "border-white/12 bg-white/4 text-white/25"
                    }`}>{idx + 1}</div>
                    <p className="text-[10px] font-semibold text-white/60 text-center mt-2 line-clamp-2 leading-tight px-1">{sprint.title}</p>
                    <Badge variant={STATUS_COLORS[sprint.status] ?? "neutral"} className="text-[7px] uppercase mt-1">
                      {sprint.status}
                    </Badge>
                  </div>
                  {idx < sprints.length - 1 && (
                    <div className={`w-8 h-0.5 mt-4 ${isCompleted ? "bg-white/20" : "bg-white/6"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sprint Cards */}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : sprints.length === 0 ? (
        <EmptyState
          title="No sprints created yet"
          description="Create your first sprint to structure the cohort curriculum."
          icon={<GitBranch />}
          action={<Button variant="primary" onClick={openCreate}><Plus size={14} className="mr-2" />Create Sprint</Button>}
        />
      ) : (
        <div className="space-y-3">
          {sprints.map(sprint => {
            const Icon = STATUS_ICONS[sprint.status] || Clock;
            const isActive = sprint.status === "active";
            return (
              <div
                key={sprint.id}
                className={`border rounded-2xl p-5 transition-all ${
                  isActive
                    ? "bg-emerald-500/4 border-emerald-500/20"
                    : "bg-[#0A0E17] border-white/[0.07] hover:border-white/15"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isActive ? "bg-emerald-500/15" : "bg-white/5"}`}>
                      <Icon className={`w-5 h-5 ${isActive ? "text-emerald-400" : "text-white/35"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-white">{sprint.title}</h3>
                        <Badge variant={STATUS_COLORS[sprint.status] ?? "neutral"} className="text-[8px] uppercase tracking-wider">
                          {sprint.status}
                        </Badge>
                        {sprint.task_count > 0 && (
                          <span className="text-[10px] text-white/30">{sprint.task_count} task{sprint.task_count !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                      {sprint.description && <p className="text-xs text-white/35 line-clamp-1 mb-1">{sprint.description}</p>}
                      <p className="text-[10px] text-white/25">
                        {toISTDisplay(sprint.start_date)} → {toISTDisplay(sprint.end_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {sprint.status === "upcoming" && (
                      <Button size="sm" variant="ghost" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" onClick={() => handleStatusChange(sprint, "active")}>
                        <Play size={13} className="mr-1" /> Activate
                      </Button>
                    )}
                    {sprint.status === "active" && (
                      <Button size="sm" variant="ghost" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10" onClick={() => handleStatusChange(sprint, "completed")}>
                        <CheckCircle size={13} className="mr-1" /> Complete
                      </Button>
                    )}
                    {sprint.status === "completed" && (
                      <Button size="sm" variant="ghost" className="text-white/35 hover:text-white/60" onClick={() => handleStatusChange(sprint, "archived")}>
                        <Archive size={13} className="mr-1" /> Archive
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openEdit(sprint)}><Edit2 size={13} /></Button>
                    <Button size="sm" variant="ghost" className="text-red-400/50 hover:text-red-400 hover:bg-red-500/10" onClick={() => setDeleteId(sprint.id)}><Trash2 size={13} /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Drawer */}
      <Drawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={editing ? "Edit Sprint" : "Create Sprint"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDrawer(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editing ? "Save Changes" : "Create Sprint"}</Button>
          </>
        }
      >
        <div className="space-y-5">
          <FormField label="Sprint Title *">
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Week 1: Foundations" />
          </FormField>
          <FormField label="Description">
            <Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What will participants learn in this sprint?" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date *">
              <DateTimePicker value={form.start_date} onChange={v => setForm(f => ({ ...f, start_date: v }))} placeholder="Sprint start" />
            </FormField>
            <FormField label="End Date *">
              <DateTimePicker value={form.end_date} onChange={v => setForm(f => ({ ...f, end_date: v }))} placeholder="Sprint end" minValue={form.start_date || undefined} />
            </FormField>
          </div>
          <FormField label="Status">
            <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {SPRINT_STATUSES.map(s => <option key={s} value={s} className="bg-black">{s}</option>)}
            </Select>
          </FormField>
        </div>
      </Drawer>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Sprint"
        footer={<><Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button><Button variant="danger" onClick={handleDelete}>Delete Sprint</Button></>}
      >
        <p className="text-white/70">Are you sure you want to delete this sprint? All tasks under it will also be deleted. This cannot be undone.</p>
      </Modal>
    </div>
  );
}
