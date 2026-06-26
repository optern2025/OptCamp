"use client";

import { useEffect, useState } from "react";
import { Megaphone, Pin, Clock, Plus, Trash2, Send } from "lucide-react";
import { Badge, Button, Skeleton, EmptyState, Drawer, Input, Textarea, useToast, Modal } from "@/app/components/ui/design-system";
import { toISTDisplay } from "@/lib/dateTime";

interface Announcement {
  id: string; title: string; body: string; type: string;
  pinned: boolean; created_at: string;
}

export default function CohortUpdates({ cycleId }: { cycleId: string }) {
  const { success, error: toastError } = useToast();
  const [updates, setUpdates] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", pinned: false });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/announcements?cycle_id=${cycleId}`);
      const data = await res.json();
      setUpdates(data.announcements || []);
    } catch { toastError("Failed to load updates"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [cycleId]);

  const handlePost = async () => {
    if (!form.title || !form.body) return toastError("Title and message are required");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, type: "cohort", cycle_id: cycleId }),
      });
      if (!res.ok) throw new Error();
      success("Update broadcasted to cohort");
      setComposerOpen(false);
      setForm({ title: "", body: "", pinned: false });
      await load();
    } catch { toastError("Failed to post update"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this broadcast?")) return;
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      success("Broadcast deleted");
      setUpdates(prev => prev.filter(u => u.id !== id));
    } catch { toastError("Failed to delete broadcast"); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Cohort Broadcasts</h2>
          <p className="text-white/35 text-sm mt-0.5">Send critical updates directly to this cohort's dashboard</p>
        </div>
        <Button variant="primary" onClick={() => setComposerOpen(true)}>
          <Plus size={16} className="mr-1.5" /> Compose Update
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : updates.length === 0 ? (
        <EmptyState title="No broadcasts yet" description="Keep your cohort engaged by posting an update." icon={<Megaphone />} />
      ) : (
        <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-[19px] before:w-px before:bg-white/[0.05]">
          {updates.map(up => (
            <div key={up.id} className="relative pl-12">
              <div className="absolute left-3 top-5 w-3 h-3 rounded-full bg-primary-500/20 border-2 border-primary-500 z-10" />
              <div className="bg-[#0A0E17] border border-white/[0.07] hover:border-white/15 transition-colors rounded-xl p-5 group">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {up.pinned && <Badge variant="warning" className="text-[9px]"><Pin size={8} className="mr-1 inline" /> Pinned</Badge>}
                      <h3 className="text-base font-bold text-white">{up.title}</h3>
                    </div>
                    <p className="text-xs text-white/30 flex items-center gap-1.5"><Clock size={12}/> {toISTDisplay(up.created_at)}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-400/50 hover:text-red-400 opacity-50 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(up.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
                <div className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{up.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Composer Drawer */}
      <Drawer
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="Broadcast Update"
        footer={
          <>
            <Button variant="ghost" onClick={() => setComposerOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handlePost} disabled={saving}>
              <Send size={14} className="mr-1.5" /> {saving ? "Broadcasting..." : "Broadcast Now"}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 flex gap-3">
            <Megaphone className="w-5 h-5 text-primary-400 shrink-0" />
            <p className="text-sm text-white/80">This update will appear immediately on the dashboard for all members of this cohort.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1.5">Headline</label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="E.g., Welcome to Sprint 2!" />
          </div>
          <div>
            <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-1.5">Message</label>
            <Textarea 
              value={form.body} 
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))} 
              rows={8}
              placeholder="Write your announcement..."
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input 
              type="checkbox" 
              id="pin" 
              checked={form.pinned} 
              onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} 
              className="rounded border-white/20 bg-black/50 text-primary-500 focus:ring-primary-500"
            />
            <label htmlFor="pin" className="text-sm text-white/70 cursor-pointer">Pin to top of dashboard</label>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
