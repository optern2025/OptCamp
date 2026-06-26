"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Archive, Globe, Search, Users, Activity, FileText, CheckCircle2, ChevronRight, Layers } from "lucide-react";
import { 
  Drawer, Input, Textarea, useToast, EmptyState, Button, Skeleton
} from "@/app/components/ui/design-system";

interface Domain {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  cohortCount: number;
  memberCount: number;
  applicationCount: number;
  attemptCount: number;
  isActive: boolean;
}

const BLANK_FORM = { name: "", description: "" };

export default function DomainManager() {
  const { success, error: toastError } = useToast();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Drawer & Form State
  const [showDrawer, setShowDrawer] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filter State
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/domains");
      const data = await res.json();
      setDomains(data.domains || []);
      setStats(data.stats || null);
    } catch (err) {
      toastError("Failed to load domains");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredDomains = domains.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchActive = filterActive === "all" || (filterActive === "active" ? d.isActive : !d.isActive);
    return matchSearch && matchActive;
  });

  const openCreate = () => {
    setForm({ ...BLANK_FORM });
    setEditId(null);
    setFormErrors({});
    setShowDrawer(true);
  };

  const openEdit = (d: Domain) => {
    setForm({ name: d.name, description: d.description || "" });
    setEditId(d.id);
    setFormErrors({});
    setShowDrawer(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormErrors({ name: "Domain name is required." });
      return;
    }
    
    setSaving(true);
    setFormErrors({});
    try {
      const url = editId ? `/api/admin/domains/${editId}` : "/api/admin/domains";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      
      success(editId ? "Track updated" : "Track created", form.name);
      setShowDrawer(false);
      setEditId(null);
      await load();
    } catch (e: any) {
      toastError("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/domains/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      
      success("Track archived");
      await load();
    } catch (e: any) {
      toastError("Archive failed", e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Learning Tracks</h1>
          <p className="text-sm text-white/50 mt-1">Manage platform domains, technical tracks, and skill categories.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> New Track
        </Button>
      </div>

      {/* STATS ROW */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Tracks", value: stats.totalTracks, icon: Layers },
            { label: "Active Tracks", value: stats.activeTracks, icon: Activity },
            { label: "Cohorts Using Tracks", value: stats.cohortsUsingTracks, icon: Globe },
            { label: "Total Members Across Tracks", value: stats.totalMembers, icon: Users },
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
            placeholder="Search learning tracks..."
            className="pl-9 bg-transparent border-none outline-none focus:ring-0 text-sm w-full"
          />
        </div>
        <div className="w-px h-6 bg-white/10 hidden sm:block" />
        <div className="flex items-center gap-2 w-full sm:w-auto px-2">
          <select 
            value={filterActive} 
            onChange={(e) => setFilterActive(e.target.value)} 
            className="bg-transparent border-none text-sm text-white/80 focus:ring-0"
          >
            <option value="all" className="bg-black text-white">All Status</option>
            <option value="active" className="bg-black text-white">Active (In Use)</option>
            <option value="inactive" className="bg-black text-white">Inactive (Unused)</option>
          </select>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-xl bg-white/[0.02]" />)}
        </div>
      ) : filteredDomains.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No learning tracks created yet"
            description="Create your first track to assign to cohorts."
            icon={<Globe />}
          />
          <div className="flex justify-center mt-4">
            <Button onClick={openCreate}>Create Learning Track</Button>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDomains.map(d => (
            <div key={d.id} className="group rounded-2xl border border-white/[0.08] bg-[#0A0D12] hover:border-white/[0.15] transition-all overflow-hidden flex flex-col">
              <div className="p-5 border-b border-white/[0.06] flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-cyan-400" />
                  </div>
                  {d.isActive ? (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border bg-white/5 text-white/40 border-white/10">
                      Unused
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white leading-tight mb-2">{d.name}</h3>
                <p className="text-sm text-white/40 line-clamp-2 min-h-[40px]">{d.description || "No description provided."}</p>
                
                <div className="grid grid-cols-3 gap-3 mt-5">
                  <div>
                    <p className="text-base font-bold text-white">{d.cohortCount}</p>
                    <p className="text-[9px] uppercase text-white/30 font-bold tracking-wider">Cohorts</p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-white">{d.applicationCount}</p>
                    <p className="text-[9px] uppercase text-white/30 font-bold tracking-wider">Apps</p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-white">{d.memberCount}</p>
                    <p className="text-[9px] uppercase text-white/30 font-bold tracking-wider">Members</p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-white/[0.01] border-t border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(d)} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors tooltip-trigger" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(d.id)} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors tooltip-trigger" title="Archive">
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DRAWER FOR CREATE/EDIT */}
      <Drawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={editId ? "Edit Track" : "Create Learning Track"}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/60">Track Name</label>
            <Input 
              value={form.name} 
              onChange={e => {
                setForm({ ...form, name: e.target.value });
                setFormErrors(prev => ({ ...prev, name: "" }));
              }} 
              placeholder="e.g. Artificial Intelligence"
              className={formErrors.name ? "border-red-500/50" : ""}
            />
            {formErrors.name && <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>}
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/60">Description (Optional)</label>
            <Textarea 
              value={form.description} 
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of what this track covers..."
              rows={4}
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-white/10 gap-3">
            <Button variant="secondary" onClick={() => setShowDrawer(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>Save Track</Button>
          </div>
        </div>
      </Drawer>

    </div>
  );
}
