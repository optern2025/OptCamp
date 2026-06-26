"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Archive, Search, Users, FileText, ChevronRight, Activity, UserCheck, Calendar } from "lucide-react";
import { 
  Drawer, Input, Select, useToast, EmptyState, Button, Skeleton
} from "@/app/components/ui/design-system";
import { DateTimePicker } from "@/app/components/ui/DateTimePicker";

import { utcToISTInputValue, istInputToUTC, validateDateRange } from "@/lib/dateTime";

interface Cycle {
  id: string; title: string; slug: string; status: string;
  cohort_type: string; seats: number; description: string;
  application_start_at: string; application_end_at: string;
  screening_start_at: string; screening_end_at: string;
  cohort_start_at: string; cohort_end_at: string;
  domain_id: string; domains: { name: string } | null;
  requirements?: string; outcomes?: string;
  memberCount: number; applicationCount: number;
}

const BLANK_FORM = {
  title: "", slug: "", domain_id: "", cohort_type: "inclusive",
  status: "draft", seats: "", description: "", requirements: "", outcomes: "",
  application_start_at: "", application_end_at: "",
  screening_start_at: "", screening_end_at: "",
  cohort_start_at: "", cohort_end_at: "",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function CycleManager() {
  const { success, error: toastError } = useToast();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Drawer & Form State
  const [showDrawer, setShowDrawer] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof BLANK_FORM>({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filter State
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const [cyclesRes, domainsRes] = await Promise.all([
        fetch("/api/admin/cycles").then(r => r.json()),
        fetch("/api/admin/domains").then(r => r.json()).catch(() => ({ domains: [] })),
      ]);
      setCycles(cyclesRes.cycles || []);
      setStats(cyclesRes.stats || null);
      setDomains(domainsRes.domains || []);
    } catch (err) {
      toastError("Failed to load cohorts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredCycles = cycles.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    const matchType = filterType === "all" || c.cohort_type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const openCreate = () => { 
    setForm({ ...BLANK_FORM }); 
    setEditId(null); 
    setFormErrors({}); 
    setShowDrawer(true); 
  };
  
  const openEdit = (c: Cycle) => {
    setForm({
      title: c.title, slug: c.slug, domain_id: c.domain_id || "",
      cohort_type: c.cohort_type || "inclusive", status: c.status || "draft",
      seats: String(c.seats || ""), description: c.description || "",
      requirements: c.requirements || "", outcomes: c.outcomes || "",
      application_start_at: utcToISTInputValue(c.application_start_at),
      application_end_at: utcToISTInputValue(c.application_end_at),
      screening_start_at: utcToISTInputValue(c.screening_start_at),
      screening_end_at: utcToISTInputValue(c.screening_end_at),
      cohort_start_at: utcToISTInputValue(c.cohort_start_at),
      cohort_end_at: utcToISTInputValue(c.cohort_end_at),
    });
    setEditId(c.id); 
    setFormErrors({});
    setShowDrawer(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = "Title is required";
    if (!form.slug.trim()) errors.slug = "Slug is required";
    if (!form.domain_id) errors.domain_id = "Learning Track is required";
    
    const phases = [
      { name: "Application", start: form.application_start_at, end: form.application_end_at },
      { name: "Screening", start: form.screening_start_at, end: form.screening_end_at },
      { name: "Cohort", start: form.cohort_start_at, end: form.cohort_end_at }
    ];
    
    for (const phase of phases) {
      if (!validateDateRange(phase.start, phase.end)) {
        errors.dates = `${phase.name} end time must be after start time`;
        break;
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toastError("Validation Error", "Please fix errors before saving");
      return;
    }
    
    setSaving(true);
    try {
      const body = {
        ...form,
        seats: form.seats ? parseInt(form.seats, 10) : null,
        application_start_at: istInputToUTC(form.application_start_at),
        application_end_at: istInputToUTC(form.application_end_at),
        screening_start_at: istInputToUTC(form.screening_start_at),
        screening_end_at: istInputToUTC(form.screening_end_at),
        cohort_start_at: istInputToUTC(form.cohort_start_at),
        cohort_end_at: istInputToUTC(form.cohort_end_at),
      };
      
      const url = editId ? `/api/admin/cycles/${editId}` : "/api/admin/cycles";
      const method = editId ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      
      success(editId ? "Cohort updated" : "Cohort created", form.title);
      setShowDrawer(false);
      await load();
    } catch (e: any) {
      toastError("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const archiveCohort = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/cycles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" })
      });
      if (!res.ok) throw new Error();
      success("Cohort archived");
      await load();
    } catch {
      toastError("Failed to archive cohort");
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'upcoming': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'closed': return 'bg-white/5 text-white/40 border-white/10';
      default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20'; // draft
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Cohorts & Cycles</h1>
          <p className="text-sm text-white/50 mt-1">Manage learning cycles, seating capacity, and cohort phases.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> New Cycle
        </Button>
      </div>

      {/* STATS ROW */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Active Cohorts", value: stats.active, icon: Activity },
            { label: "Upcoming Cohorts", value: stats.upcoming, icon: Calendar },
            { label: "Closed Cohorts", value: stats.closed, icon: Archive },
            { label: "Total Seats", value: stats.totalSeats, icon: Users },
            { label: "Filled Seats", value: stats.filledSeats, icon: UserCheck },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-white/[0.08] bg-[#0A0D12] p-5">
              <div className="flex items-center gap-2 mb-2 text-white/40">
                <s.icon className="w-4 h-4" />
                <span className="text-xs font-semibold">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-center gap-4 p-2 bg-[#0A0D12] border border-white/[0.08] rounded-xl">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cohorts by name or slug..."
            className="pl-9 bg-transparent border-none outline-none focus:ring-0 text-sm w-full"
          />
        </div>
        <div className="w-px h-6 bg-white/10 hidden sm:block" />
        <div className="flex items-center gap-2 w-full sm:w-auto px-2">
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-transparent border-none text-sm w-full sm:w-32 text-white">
            <option value="all" className="bg-[#0A0D12] text-white">All Status</option>
            <option value="active" className="bg-[#0A0D12] text-white">Active</option>
            <option value="upcoming" className="bg-[#0A0D12] text-white">Upcoming</option>
            <option value="draft" className="bg-[#0A0D12] text-white">Draft</option>
            <option value="closed" className="bg-[#0A0D12] text-white">Closed</option>
          </Select>
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-transparent border-none text-sm w-full sm:w-32 text-white">
            <option value="all" className="bg-[#0A0D12] text-white">All Types</option>
            <option value="inclusive" className="bg-[#0A0D12] text-white">Inclusive</option>
            <option value="exclusive" className="bg-[#0A0D12] text-white">Exclusive</option>
          </Select>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-64 rounded-xl bg-white/[0.02]" />)}
        </div>
      ) : filteredCycles.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No cohorts found"
            description="Create your first cohort to start accepting applications."
            icon={<Archive />}
          />
          <div className="flex justify-center mt-4">
            <Button onClick={openCreate}>New Cycle</Button>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCycles.map(c => (
            <div key={c.id} className="group rounded-2xl border border-white/[0.08] bg-[#0A0D12] hover:border-white/[0.15] transition-all overflow-hidden flex flex-col">
              <div className="p-5 border-b border-white/[0.06] flex-1">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${getStatusColor(c.status)}`}>
                    {c.status}
                  </span>
                  <span className="text-xs text-white/40 uppercase tracking-widest font-semibold">{c.cohort_type}</span>
                </div>
                <h3 className="text-lg font-bold text-white leading-tight mb-1">{c.title}</h3>
                <p className="text-sm text-cyan-400/80 font-medium mb-4">{c.domains?.name || 'No Track Assigned'}</p>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2 text-white/40 mb-1">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-[10px] uppercase tracking-wider font-bold">Members</span>
                    </div>
                    <p className="text-lg font-bold text-white">
                      {c.memberCount} <span className="text-sm text-white/30 font-normal">/ {c.seats || '∞'}</span>
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2 text-white/40 mb-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="text-[10px] uppercase tracking-wider font-bold">Applications</span>
                    </div>
                    <p className="text-lg font-bold text-white">{c.applicationCount}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-white/[0.01] border-t border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(c)} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors tooltip-trigger" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  {c.status !== "closed" && (
                    <button onClick={() => archiveCohort(c.id)} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors tooltip-trigger" title="Archive">
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Link href={`/admin/cohorts/${c.id}`} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-2">
                  Manage Workspace <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DRAWER FOR CREATE/EDIT */}
      <Drawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={editId ? "Edit Cohort" : "Create New Cohort"}
      >
        <div className="space-y-6">
          {formErrors.dates && (
            <div className="p-3 rounded-md bg-red-500/10 text-red-400 text-sm border border-red-500/20">
              {formErrors.dates}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-white/60">Cohort Title</label>
              <Input 
                value={form.title} 
                onChange={e => {
                  setForm({ ...form, title: e.target.value, slug: editId ? form.slug : slugify(e.target.value) });
                  setFormErrors(prev => ({ ...prev, title: "" }));
                }} 
                placeholder="e.g. Summer 2024 AI Track"
                className={formErrors.title ? "border-red-500/50" : ""}
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/60">URL Slug</label>
              <Input 
                value={form.slug} 
                onChange={e => setForm({ ...form, slug: slugify(e.target.value) })}
                className={formErrors.slug ? "border-red-500/50" : ""}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/60">Learning Track</label>
              <Select 
                value={form.domain_id} 
                onChange={e => setForm({ ...form, domain_id: e.target.value })}
                className={formErrors.domain_id ? "border-red-500/50" : ""}
              >
                <option value="" className="bg-[#0A0D12] text-white">Select a track...</option>
                {domains.map(d => <option key={d.id} value={d.id} className="bg-[#0A0D12] text-white">{d.name}</option>)}
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/60">Status</label>
              <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="draft" className="bg-[#0A0D12] text-white">Draft</option>
                <option value="active" className="bg-[#0A0D12] text-white">Active</option>
                <option value="upcoming" className="bg-[#0A0D12] text-white">Upcoming</option>
                <option value="closed" className="bg-[#0A0D12] text-white">Closed</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/60">Access Type</label>
              <Select value={form.cohort_type} onChange={e => setForm({ ...form, cohort_type: e.target.value })}>
                <option value="inclusive" className="bg-[#0A0D12] text-white">Inclusive (Open)</option>
                <option value="exclusive" className="bg-[#0A0D12] text-white">Exclusive (Invite/Screening)</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/60">Seats (Optional)</label>
              <Input 
                type="number" 
                value={form.seats} 
                onChange={e => setForm({ ...form, seats: e.target.value })} 
                placeholder="Leave blank for unlimited"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.01] space-y-4">
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><Calendar className="w-4 h-4"/> Schedule</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/60">App Window Starts</label>
                <DateTimePicker value={form.application_start_at} onChange={v => setForm({ ...form, application_start_at: v })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/60">App Window Ends</label>
                <DateTimePicker value={form.application_end_at} onChange={v => setForm({ ...form, application_end_at: v })} minValue={form.application_start_at || undefined} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/60">Screening Starts</label>
                <DateTimePicker value={form.screening_start_at} onChange={v => setForm({ ...form, screening_start_at: v })} minValue={form.application_end_at || undefined} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/60">Screening Ends</label>
                <DateTimePicker value={form.screening_end_at} onChange={v => setForm({ ...form, screening_end_at: v })} minValue={form.screening_start_at || undefined} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/60">Cohort Starts</label>
                <DateTimePicker value={form.cohort_start_at} onChange={v => setForm({ ...form, cohort_start_at: v })} minValue={form.screening_end_at || undefined} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/60">Cohort Ends</label>
                <DateTimePicker value={form.cohort_end_at} onChange={v => setForm({ ...form, cohort_end_at: v })} minValue={form.cohort_start_at || undefined} />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-white/10 gap-3">
            <Button variant="secondary" onClick={() => setShowDrawer(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>Save Cohort</Button>
          </div>
        </div>
      </Drawer>

    </div>
  );
}
