"use client";

import { useEffect, useState } from "react";
import { FolderGit2, FileText, Link as LinkIcon, Youtube, Plus, Trash2, ExternalLink, Globe } from "lucide-react";
import { Badge, Button, Skeleton, EmptyState, Drawer, Input, Textarea, Select, useToast } from "@/app/components/ui/design-system";
import { toISTDisplay } from "@/lib/dateTime";

interface Resource {
  id: string; title: string; description: string; url: string;
  resource_type: string; cycle_id: string | null; created_at: string;
}

const TYPE_ICONS: Record<string, any> = {
  document: FileText,
  video: Youtube,
  link: LinkIcon,
  default: FolderGit2,
};

export default function CohortResources({ cycleId }: { cycleId: string }) {
  const { success, error: toastError } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", url: "", resource_type: "document" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/resources?cycle_id=${cycleId}`);
      const data = await res.json();
      setResources(data.resources || []);
    } catch { toastError("Failed to load resources"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [cycleId]);

  const handlePost = async () => {
    if (!form.title || !form.url || !form.resource_type) return toastError("Title, URL, and type are required");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, cycle_id: cycleId }),
      });
      if (!res.ok) throw new Error();
      success("Resource added successfully");
      setComposerOpen(false);
      setForm({ title: "", description: "", url: "", resource_type: "document" });
      await load();
    } catch { toastError("Failed to add resource"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this resource?")) return;
    try {
      const res = await fetch(`/api/admin/resources?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      success("Resource removed");
      setResources(prev => prev.filter(r => r.id !== id));
    } catch { toastError("Failed to remove resource"); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Resource Hub</h2>
          <p className="text-white/35 text-sm mt-0.5">Manage materials available to this cohort</p>
        </div>
        <Button variant="primary" onClick={() => setComposerOpen(true)}>
          <Plus size={16} className="mr-1.5" /> Add Resource
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : resources.length === 0 ? (
        <EmptyState title="No resources yet" description="Add documents, links, or videos for your cohort to reference." icon={<FolderGit2 />} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map(r => {
            const Icon = TYPE_ICONS[r.resource_type] || TYPE_ICONS.default;
            return (
              <div key={r.id} className="bg-[#0A0E17] border border-white/[0.07] hover:border-white/15 transition-all rounded-2xl p-5 flex flex-col h-full group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary-400" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={r.cycle_id ? "success" : "info"} className="text-[9px] uppercase tracking-wider">
                      {r.cycle_id ? "Cohort Only" : <><Globe size={8} className="mr-1 inline"/> Global</>}
                    </Badge>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-base leading-snug mb-1">{r.title}</h3>
                  {r.description && <p className="text-xs text-white/40 line-clamp-2">{r.description}</p>}
                </div>
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/[0.05]">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest">{toISTDisplay(r.created_at)}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="text-red-400/50 hover:text-red-400 opacity-50 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(r.id)}>
                      <Trash2 size={14} />
                    </Button>
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="secondary" className="hover:text-primary-300">
                        <ExternalLink size={14} />
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Composer Drawer */}
      <Drawer
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="Add Resource"
        footer={
          <>
            <Button variant="ghost" onClick={() => setComposerOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handlePost} disabled={saving}>
              <Plus size={14} className="mr-1.5" /> {saving ? "Adding..." : "Add Resource"}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1.5">Resource Type</label>
            <Select value={form.resource_type} onChange={e => setForm(f => ({ ...f, resource_type: e.target.value }))}>
              <option value="document">Document / PDF</option>
              <option value="video">Video URL</option>
              <option value="link">External Link</option>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1.5">Title</label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="E.g., Getting Started Guide" />
          </div>
          <div>
            <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1.5">URL / Link</label>
            <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1.5">Description (Optional)</label>
            <Textarea 
              value={form.description} 
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
              rows={4}
              placeholder="Briefly describe what this resource is..."
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
