"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, CheckSquare, Calendar, Github, FileText, Video, FolderOpen, Wrench, Target, GitBranch } from "lucide-react";
import { Badge, Button, Skeleton, EmptyState, Drawer, FormField, Input, Textarea, Select, useToast, Modal } from "@/app/components/ui/design-system";
import { DateTimePicker } from "@/app/components/ui/DateTimePicker";
import { toISTDisplay } from "@/lib/dateTime";

const TASK_TYPES = ["assignment", "github", "project", "document", "video", "custom"];
const PROOF_OPTIONS = ["github", "deployment", "document", "video", "custom"];

const TYPE_ICONS: Record<string, any> = {
  assignment: CheckSquare,
  github: Github,
  project: FolderOpen,
  document: FileText,
  video: Video,
  custom: Wrench,
};

interface Task {
  id: string; title: string; description: string; task_type: string;
  due_date: string; points: number; required_proof: string[]; sprint_id: string;
  sprints?: { title: string };
}

interface Sprint {
  id: string; title: string; status: string;
}

const emptyForm = { sprint_id: "", title: "", description: "", task_type: "assignment", due_date: "", points: 10, required_proof: ["github"] as string[] };

export default function CohortTasks({ cycleId }: { cycleId: string }) {
  const { success, error: toastError } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSprint, setFilterSprint] = useState("");
  const [showDrawer, setShowDrawer] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [taskRes, sprintRes] = await Promise.all([
        fetch(`/api/admin/cohorts/${cycleId}/tasks${filterSprint ? `?sprint_id=${filterSprint}` : ""}`),
        fetch(`/api/admin/cohorts/${cycleId}/sprints`),
      ]);
      const taskData = await taskRes.json();
      const sprintData = await sprintRes.json();
      if (taskData.error) throw new Error(taskData.error);
      if (sprintData.error) throw new Error(sprintData.error);
      setTasks(taskData.tasks || []);
      setSprints(sprintData.sprints || []);
    } catch (e: any) {
      setError(e.message || "Failed to load tasks");
      toastError("Failed to load tasks");
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [cycleId, filterSprint]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, sprint_id: sprints[0]?.id || "" });
    setShowDrawer(true);
  };

  const openEdit = (t: Task) => {
    setEditing(t);
    setForm({
      sprint_id: t.sprint_id, title: t.title, description: t.description,
      task_type: t.task_type, due_date: t.due_date?.slice(0, 16) || "",
      points: t.points, required_proof: t.required_proof || ["github"],
    });
    setShowDrawer(true);
  };

  const toggleProof = (p: string) => {
    setForm(f => ({
      ...f,
      required_proof: f.required_proof.includes(p)
        ? f.required_proof.filter(x => x !== p)
        : [...f.required_proof, p],
    }));
  };

  const handleSave = async () => {
    if (!form.sprint_id || !form.title || !form.description) {
      toastError("Sprint, title and description are required");
      return;
    }
    setSaving(true);
    try {
      const url = editing
        ? `/api/admin/cohorts/${cycleId}/tasks/${editing.id}`
        : `/api/admin/cohorts/${cycleId}/tasks`;
      const payload = { ...form, due_date: form.due_date ? new Date(form.due_date).toISOString() : null };
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      success(editing ? "Task updated" : "Task created");
      setShowDrawer(false);
      await load();
    } catch (e: any) { toastError(e.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/cohorts/${cycleId}/tasks/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      success("Task deleted");
      setTasks(prev => prev.filter(t => t.id !== deleteId));
      setDeleteId(null);
    } catch { toastError("Failed to delete task"); }
  };

  // Group tasks by sprint
  const tasksBySprint: Record<string, Task[]> = {};
  tasks.forEach(t => {
    const key = t.sprint_id;
    if (!tasksBySprint[key]) tasksBySprint[key] = [];
    tasksBySprint[key].push(t);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-white">Task Operations</h2>
          <Badge variant="neutral" className="text-[10px]">{tasks.length}</Badge>
        </div>
        <Button variant="primary" className="flex items-center gap-2" onClick={openCreate} disabled={sprints.length === 0}>
          <Plus size={16} /> Add Task
        </Button>
      </div>

      {/* Sprint filter pills */}
      {sprints.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterSprint("")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              !filterSprint ? "bg-primary-500/15 border-primary-500/30 text-primary-300" : "bg-white/4 border-white/8 text-white/35 hover:text-white/70 hover:border-white/15"
            }`}
          >
            All Sprints
          </button>
          {sprints.map(s => (
            <button
              key={s.id}
              onClick={() => setFilterSprint(s.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                filterSprint === s.id ? "bg-primary-500/15 border-primary-500/30 text-primary-300" : "bg-white/4 border-white/8 text-white/35 hover:text-white/70 hover:border-white/15"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      )}

      {error && <EmptyState title="Unable to load tasks" description={error} icon={<CheckSquare />} />}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks created yet"
          description={sprints.length === 0 ? "Create a sprint first, then add tasks to it." : "Add tasks to your sprints for participants to complete."}
          icon={<CheckSquare />}
          action={sprints.length > 0 ? <Button variant="primary" onClick={openCreate}><Plus size={14} className="mr-2" />Add Task</Button> : undefined}
        />
      ) : (
        <div className="space-y-8">
          {sprints.map(sprint => {
            const sprintTasks = tasksBySprint[sprint.id] || [];
            if (filterSprint && sprint.id !== filterSprint) return null;
            return (
              <div key={sprint.id}>
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch className="w-3.5 h-3.5 text-white/30" />
                  <h3 className="font-bold text-white/50 text-xs uppercase tracking-wider">{sprint.title}</h3>
                  <Badge variant={sprint.status === "active" ? "success" : "neutral"} className="text-[8px] uppercase">{sprint.status}</Badge>
                  <span className="text-[10px] text-white/25">{sprintTasks.length} task{sprintTasks.length !== 1 ? "s" : ""}</span>
                </div>

                {sprintTasks.length === 0 ? (
                  <div className="border border-dashed border-white/8 rounded-2xl p-5 text-center">
                    <p className="text-sm text-white/25 mb-2">No tasks in this sprint yet.</p>
                    <Button size="sm" variant="ghost" onClick={() => { setForm({ ...emptyForm, sprint_id: sprint.id }); setEditing(null); setShowDrawer(true); }}>
                      <Plus size={12} className="mr-1" /> Add Task
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sprintTasks.map(task => {
                      const TypeIcon = TYPE_ICONS[task.task_type] || Target;
                      return (
                        <div key={task.id} className="bg-[#0A0E17] border border-white/[0.07] rounded-2xl p-4 hover:border-white/15 transition-all">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                              <TypeIcon className="w-4 h-4 text-white/40" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-white text-sm truncate">{task.title}</h4>
                              <p className="text-[11px] text-white/35 line-clamp-1">{task.description}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-3">
                            <Badge variant="info" className="text-[8px] uppercase tracking-wider">{task.task_type}</Badge>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold text-amber-400">
                              {task.points} pts
                            </span>
                            {task.due_date && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 border border-white/8 text-[9px] text-white/35">
                                <Calendar size={9} /> {toISTDisplay(task.due_date)}
                              </span>
                            )}
                          </div>

                          {task.required_proof?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {task.required_proof.map(p => (
                                <span key={p} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/8 text-[8px] text-white/30 uppercase tracking-wide">{p}</span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                            <Button size="sm" variant="ghost" className="text-white/40 hover:text-white" onClick={() => openEdit(task)}><Edit2 size={12} /></Button>
                            <Button size="sm" variant="ghost" className="text-red-400/40 hover:text-red-400 hover:bg-red-500/10" onClick={() => setDeleteId(task.id)}><Trash2 size={12} /></Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Drawer */}
      <Drawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={editing ? "Edit Task" : "Create Task"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDrawer(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editing ? "Save Changes" : "Create Task"}</Button>
          </>
        }
      >
        <div className="space-y-5">
          <FormField label="Sprint *">
            <Select value={form.sprint_id} onChange={e => setForm(f => ({ ...f, sprint_id: e.target.value }))}>
              <option value="" className="bg-black">Select Sprint...</option>
              {sprints.map(s => <option key={s.id} value={s.id} className="bg-black">{s.title}</option>)}
            </Select>
          </FormField>
          <FormField label="Task Title *">
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Build a REST API" />
          </FormField>
          <FormField label="Description *">
            <Textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detailed description of what participants need to submit..." />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Task Type">
              <Select value={form.task_type} onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))}>
                {TASK_TYPES.map(t => <option key={t} value={t} className="bg-black">{t}</option>)}
              </Select>
            </FormField>
            <FormField label="Points">
              <Input type="number" min={1} max={100} value={form.points} onChange={e => setForm(f => ({ ...f, points: parseInt(e.target.value) || 10 }))} />
            </FormField>
          </div>
          <FormField label="Due Date">
            <DateTimePicker value={form.due_date} onChange={v => setForm(f => ({ ...f, due_date: v }))} placeholder="Set task deadline" />
          </FormField>
          <FormField label="Required Proof">
            <div className="flex flex-wrap gap-2 mt-1">
              {PROOF_OPTIONS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggleProof(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${form.required_proof.includes(p) ? "bg-primary-500/20 border-primary-400/50 text-primary-300" : "bg-white/5 border-white/10 text-white/35 hover:border-white/20"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </FormField>
        </div>
      </Drawer>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Task"
        footer={<><Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button><Button variant="danger" onClick={handleDelete}>Delete Task</Button></>}
      >
        <p className="text-white/70">Are you sure? This will delete the task and all associated submissions.</p>
      </Modal>
    </div>
  );
}
