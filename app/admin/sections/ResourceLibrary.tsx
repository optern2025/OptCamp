"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Filter, Trash2, ExternalLink, BookOpen, Video, FileText, Github, Globe, Link2, CheckSquare, Square, AlertTriangle } from "lucide-react";
import { toISTDisplay } from "@/lib/dateTime";

import { 
  Drawer, Modal, Input, Textarea, FormField, Select, useToast, EmptyState, Button, PageHeader, Badge, Skeleton, Card
} from "@/app/components/ui/design-system";

interface Resource {
  id: string;
  title: string;
  description: string;
  resource_type: string;
  url: string;
  created_at: string;
  domains: { name: string } | null;
  cycles: { title: string } | null;
}

const RESOURCE_TYPES = ["PDF", "Video", "Documentation", "Website", "GitHub"];

const TYPE_ICON: Record<string, any> = {
  PDF: FileText,
  Video: Video,
  Documentation: BookOpen,
  Website: Globe,
  GitHub: Github,
};

export default function ResourceLibrary({ cycleId }: { cycleId?: string }) {
  const { success, error: toastError } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  
  // Drawer & Form
  const [showDrawer, setShowDrawer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", resource_type: "Documentation", url: "", scope: cycleId ? "cohort" : "platform", cycle_id: cycleId || null });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [cycles, setCycles] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterType) params.set("type", filterType);
      if (cycleId) params.set("cycle_id", cycleId);

      const [resRes, cycleRes] = await Promise.all([
        fetch(`/api/admin/resources?${params}`),
        fetch("/api/cycles")
      ]);
      const data = await resRes.json();
      const cycleData = await cycleRes.json();
      setResources(data.resources || []);
      setCycles(cycleData.cycles || []);
    } catch {
      toastError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search, filterType]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = "Title is required";
    if (!form.url.trim()) errors.url = "URL is required";
    else if (!form.url.startsWith("http")) errors.url = "Must be a valid URL starting with http:// or https://";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      const res = await fetch("/api/admin/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      success("Resource added successfully");
      setShowDrawer(false);
      setForm({ title: "", description: "", resource_type: "Documentation", url: "", scope: cycleId ? "cohort" : "platform", cycle_id: cycleId || null });
      await load();
    } catch {
      toastError("Failed to add resource");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/resources?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      success("Resource deleted");
      setDeleteId(null);
      setSelectedIds(prev => prev.filter(i => i !== id));
      await load();
    } catch {
      toastError("Failed to delete resource");
    }
  };

  const handleBulkDelete = async () => {
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/admin/resources?id=${id}`, { method: "DELETE" });
        if (res.ok) successCount++;
      } catch {
        // continue
      }
    }
    if (successCount > 0) success(`Deleted ${successCount} resource(s)`);
    setBulkDeleteConfirm(false);
    setSelectedIds([]);
    await load();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Resource Library"
          description="Curate and manage learning resources for cohorts, domains, and tasks."
        />
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <Button variant="danger" onClick={() => setBulkDeleteConfirm(true)}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete Selected ({selectedIds.length})
            </Button>
          )}
          <Button 
            variant="primary" 
            className="flex items-center gap-2" 
            onClick={() => {
              setFormErrors({});
              setForm({ title: "", description: "", resource_type: "Documentation", url: "", scope: cycleId ? "cohort" : "platform", cycle_id: cycleId || null });
              setShowDrawer(true);
            }}
          >
            <Plus size={16} /> Add Resource
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-[#0B0F14] p-4 rounded-[24px] border border-white/10">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input 
            placeholder="Search resources..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-white/40" />
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-48"
          >
            <option value="" className="bg-black">All Types</option>
            {RESOURCE_TYPES.map(t => <option key={t} value={t} className="bg-black">{t}</option>)}
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 rounded-[24px]" />
          <Skeleton className="h-48 rounded-[24px]" />
          <Skeleton className="h-48 rounded-[24px]" />
        </div>
      ) : resources.length === 0 ? (
        <EmptyState 
          title="No Resources Found" 
          description="Add your first resource to the library to help participants learn." 
          icon={<BookOpen />} 
          action={<Button variant="primary" onClick={() => setShowDrawer(true)}>Add Resource</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map(r => {
            const Icon = TYPE_ICON[r.resource_type] || Link2;
            const isSelected = selectedIds.includes(r.id);
            return (
              <Card 
                key={r.id} 
                variant="solid" 
                padding="md" 
                className={`group flex flex-col transition-all cursor-pointer border ${isSelected ? 'border-cyan-500 bg-cyan-500/5' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.04]'}`}
                onClick={() => toggleSelect(r.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0B0F14] border border-white/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <Badge variant="info" className="uppercase text-[9px] tracking-widest">{r.resource_type}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }} 
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className={`p-1 rounded-md transition-colors ${isSelected ? 'text-cyan-400' : 'text-white/20 group-hover:text-white/40'}`}>
                      {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                    </div>
                  </div>
                </div>
                
                <h3 className="font-bold text-white mb-2 line-clamp-2 leading-tight">{r.title}</h3>
                {r.description && <p className="text-xs text-white/50 mb-6 line-clamp-2 leading-relaxed">{r.description}</p>}
                
                <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
                  <p className="text-[10px] text-white/30 font-mono">{toISTDisplay(r.created_at)}</p>
                  <a 
                    href={r.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Open Link <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Drawer */}
      <Drawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title="Add Resource"
        description="Share links to documentation, videos, or tools."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDrawer(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Add Resource"}</Button>
          </>
        }
      >
        <div className="space-y-5">
          <FormField label="Title *" error={formErrors.title}>
            <Input 
              value={form.title} 
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              hasError={!!formErrors.title}
              placeholder="e.g. Next.js App Router Documentation"
            />
          </FormField>
          
          <FormField label="Description">
            <Textarea 
              value={form.description} 
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief overview of this resource..."
            />
          </FormField>
          
          <FormField label="Resource Type">
            <Select 
              value={form.resource_type} 
              onChange={e => setForm(f => ({ ...f, resource_type: e.target.value }))}
            >
              {RESOURCE_TYPES.map(t => <option key={t} value={t} className="bg-black">{t}</option>)}
            </Select>
          </FormField>
          
          {!cycleId && (
            <>
              <FormField label="Scope">
                <Select 
                  value={form.scope} 
                  onChange={e => setForm(f => ({ ...f, scope: e.target.value, cycle_id: e.target.value === "platform" ? null : f.cycle_id }))}
                >
                  <option value="platform" className="bg-black">Platform-wide</option>
                  <option value="cohort" className="bg-black">Cohort-specific</option>
                </Select>
              </FormField>
              
              {form.scope === "cohort" && (
                <FormField label="Target Cohort">
                  <Select 
                    value={form.cycle_id || ""} 
                    onChange={e => setForm(f => ({ ...f, cycle_id: e.target.value }))}
                  >
                    <option value="" className="bg-black">Select Cohort...</option>
                    {cycles.map(c => <option key={c.id} value={c.id} className="bg-black">{c.title}</option>)}
                  </Select>
                </FormField>
              )}
            </>
          )}
          
          <FormField label="External URL *" error={formErrors.url}>
            <Input 
              value={form.url} 
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              hasError={!!formErrors.url}
              placeholder="https://..."
            />
          </FormField>
        </div>
      </Drawer>

      {/* Modals */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Resource?"
        description="This action cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteId && handleDelete(deleteId)}>Yes, Delete</Button>
          </>
        }
      >
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-sm text-white/70">Are you sure you want to delete this resource?</p>
        </div>
      </Modal>

      <Modal
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        title="Delete Selected Resources?"
        description={`You are about to delete ${selectedIds.length} resource(s).`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setBulkDeleteConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleBulkDelete}>Yes, Delete All</Button>
          </>
        }
      >
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-sm text-white/70">Are you sure you want to delete these resources?</p>
        </div>
      </Modal>
    </div>
  );
}
