"use client";

import { useEffect, useState } from "react";
import { Plus, Megaphone, Pin, Trash2, Edit2, X, Globe, BookOpen, Zap, Calendar, CheckSquare, Square, AlertTriangle, PinOff } from "lucide-react";
import { 
  Drawer, Modal, Input, Textarea, FormField, Select, useToast, EmptyState, Button, PageHeader, Badge, Skeleton, Card
} from "@/app/components/ui/design-system";
import { DateTimePicker } from "@/app/components/ui/DateTimePicker";

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: string;
  pinned: boolean;
  scheduled_for: string | null;
  created_at: string;
  cycle_id?: string | null;
}

const TYPE_ICONS: Record<string, any> = {
  platform: Globe,
  cohort: BookOpen,
  sprint: Zap,
};

export default function AnnouncementManager({ cycleId }: { cycleId?: string }) {
  const { success, error: toastError } = useToast();
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Drawer & Form
  const [showDrawer, setShowDrawer] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", type: "platform", pinned: false, scheduled_for: "", cycle_id: null as string | null });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Bulk Ops
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const [cycles, setCycles] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const url = cycleId ? `/api/admin/announcements?cycle_id=${cycleId}` : "/api/admin/announcements";
      const [annRes, cycleRes] = await Promise.all([
        fetch(url),
        fetch("/api/cycles")
      ]);
      const data = await annRes.json();
      const cycleData = await cycleRes.json();
      setAnns(data.announcements || []);
      setCycles(cycleData.cycles || []);
    } catch {
      toastError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setFormErrors({});
    setForm({ title: "", body: "", type: cycleId ? "cohort" : "platform", pinned: false, scheduled_for: "", cycle_id: cycleId || null });
    setShowDrawer(true);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setFormErrors({});
    // Format datetime-local string properly if it exists
    let formattedDate = "";
    if (a.scheduled_for) {
      const d = new Date(a.scheduled_for);
      formattedDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    
    setForm({ 
      title: a.title, 
      body: a.body, 
      type: a.type || "platform", 
      pinned: a.pinned, 
      scheduled_for: formattedDate,
      cycle_id: a.cycle_id || null
    });
    setShowDrawer(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = "Title is required";
    if (!form.body.trim()) errors.body = "Body content is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const save = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    const payload = { 
      title: form.title, 
      body: form.body, 
      type: form.type, 
      pinned: form.pinned, 
      scheduled_for: form.scheduled_for ? new Date(form.scheduled_for).toISOString() : null,
      cycle_id: form.type === "cohort" ? form.cycle_id : null
    };
    
    try {
      let res;
      if (editing) {
        res = await fetch(`/api/admin/announcements/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      
      if (!res.ok) throw new Error();
      success(editing ? "Announcement updated" : "Announcement published");
      setShowDrawer(false);
      await load();
    } catch {
      toastError("Failed to save announcement");
    } finally {
      setSaving(false);
    }
  };

  const deleteAnn = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      success("Announcement deleted");
      setDeleteId(null);
      setSelectedIds(prev => prev.filter(i => i !== id));
      await load();
    } catch {
      toastError("Failed to delete announcement");
    }
  };

  const togglePin = async (a: Announcement) => {
    try {
      const res = await fetch(`/api/admin/announcements/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !a.pinned }),
      });
      if (!res.ok) throw new Error();
      success(a.pinned ? "Announcement unpinned" : "Announcement pinned");
      await load();
    } catch {
      toastError("Failed to update pin status");
    }
  };

  const handleBulkAction = async (action: 'pin' | 'unpin' | 'delete') => {
    let successCount = 0;
    
    for (const id of selectedIds) {
      try {
        if (action === 'delete') {
          const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
          if (res.ok) successCount++;
        } else {
          const res = await fetch(`/api/admin/announcements/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pinned: action === 'pin' }),
          });
          if (res.ok) successCount++;
        }
      } catch {
        // continue
      }
    }
    
    if (successCount > 0) {
      if (action === 'delete') success(`Deleted ${successCount} announcement(s)`);
      else success(`Updated pin status for ${successCount} announcement(s)`);
    }
    
    setBulkDeleteConfirm(false);
    setSelectedIds([]);
    await load();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === anns.length) setSelectedIds([]);
    else setSelectedIds(anns.map(a => a.id));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Announcements"
          description="Create, schedule and manage platform-wide announcements."
        />
        
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 p-1.5 rounded-[16px] bg-white/5 border border-white/10 animate-in fade-in slide-in-from-right-4">
              <span className="px-3 text-xs font-bold text-white/50">{selectedIds.length} selected</span>
              <div className="w-px h-4 bg-white/10 mx-1" />
              <Button size="sm" variant="ghost" onClick={() => handleBulkAction('pin')}><Pin size={14} className="mr-1.5" /> Pin</Button>
              <Button size="sm" variant="ghost" onClick={() => handleBulkAction('unpin')}><PinOff size={14} className="mr-1.5" /> Unpin</Button>
              <div className="w-px h-4 bg-white/10 mx-1" />
              <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => setBulkDeleteConfirm(true)}>Delete</Button>
            </div>
          )}
          
          <Button variant="primary" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Composer
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-[24px]" />
          <Skeleton className="h-32 w-full rounded-[24px]" />
        </div>
      ) : anns.length === 0 ? (
        <EmptyState 
          title="No Announcements" 
          description="Publish your first announcement to notify users about updates." 
          icon={<Megaphone />} 
          action={<Button variant="primary" onClick={openCreate}>Compose Announcement</Button>}
        />
      ) : (
        <div className="space-y-4">
          {/* Select All Row */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5">
            <button onClick={toggleSelectAll} className="text-white/40 hover:text-white transition-colors">
              {selectedIds.length === anns.length && anns.length > 0 ? <CheckSquare size={16} className="text-cyan-400" /> : <Square size={16} />}
            </button>
            <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">Select All</span>
          </div>
          
          {anns.map(a => {
            const TypeIcon = TYPE_ICONS[a.type] || Globe;
            const isSelected = selectedIds.includes(a.id);
            
            return (
              <Card 
                key={a.id} 
                variant="solid" 
                padding="md" 
                className={`group transition-all cursor-pointer border ${
                  isSelected ? 'border-cyan-500 bg-cyan-500/5' : 
                  a.pinned ? 'border-amber-500/30 bg-amber-500/5' : 
                  'border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                }`}
                onClick={() => toggleSelect(a.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <div className={`p-1 rounded-md transition-colors ${isSelected ? 'text-cyan-400' : 'text-white/20 group-hover:text-white/40'}`}>
                      {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <Badge variant={a.type === "platform" ? "info" : a.type === "cohort" ? "success" : "neutral"} className="uppercase text-[9px] tracking-widest">
                        <TypeIcon className="w-3 h-3 mr-1.5 inline" /> {a.type}
                      </Badge>
                      
                      {a.pinned && (
                        <Badge variant="warning" className="uppercase text-[9px] tracking-widest">
                          <Pin className="w-3 h-3 mr-1.5 inline" /> Pinned
                        </Badge>
                      )}
                      
                      {a.scheduled_for && new Date(a.scheduled_for) > new Date() && (
                        <Badge variant="neutral" className="uppercase text-[9px] tracking-widest border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                          <Calendar className="w-3 h-3 mr-1.5 inline" /> Scheduled
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2">{a.title}</h3>
                    <p className="text-sm text-white/60 line-clamp-3 leading-relaxed max-w-4xl">{a.body}</p>
                    
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5 text-[10px] font-mono text-white/40">
                      <span>Created {new Date(a.created_at).toLocaleString()}</span>
                      {a.scheduled_for && <span>• Scheduled for {new Date(a.scheduled_for).toLocaleString()}</span>}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); togglePin(a); }} 
                      className={a.pinned ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" : "text-white/40"}
                    >
                      {a.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); openEdit(a); }}
                    >
                      <Edit2 size={14} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(a.id); }} 
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Composer Drawer */}
      <Drawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={editing ? "Edit Announcement" : "Composer"}
        description="Draft platform updates, cohort news, or sprint kickoff messages."
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDrawer(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} disabled={saving}>{saving ? "Publishing..." : editing ? "Save Changes" : "Publish"}</Button>
          </>
        }
      >
        <div className="space-y-6">
          <FormField label="Title *" error={formErrors.title}>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              hasError={!!formErrors.title}
              placeholder="e.g. Welcome to the Winter Cohort!"
            />
          </FormField>
          
          <FormField label="Message *" error={formErrors.body}>
            <Textarea
              rows={8}
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              hasError={!!formErrors.body}
              placeholder="Write your announcement message here..."
            />
          </FormField>
          
          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6 mt-2">
            {!cycleId && (
              <>
                <FormField label="Type">
                  <Select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value, cycle_id: e.target.value === 'platform' ? null : f.cycle_id }))}
                  >
                    <option value="platform" className="bg-black">Platform</option>
                    <option value="cohort" className="bg-black">Cohort</option>
                    <option value="sprint" className="bg-black">Sprint</option>
                  </Select>
                </FormField>
                
                {form.type === 'cohort' && (
                  <FormField label="Target Cohort">
                    <Select
                      value={form.cycle_id || ""}
                      onChange={e => setForm(f => ({ ...f, cycle_id: e.target.value }))}
                    >
                      <option value="" className="bg-black">Select Cohort...</option>
                      {cycles.map(c => (
                        <option key={c.id} value={c.id} className="bg-black">{c.title}</option>
                      ))}
                    </Select>
                  </FormField>
                )}
              </>
            )}
            
            <FormField label="Schedule (Optional)">
              <DateTimePicker
                value={form.scheduled_for}
                onChange={v => setForm(f => ({ ...f, scheduled_for: v }))}
                placeholder="Schedule for later..."
              />
            </FormField>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Pin Announcement</p>
              <p className="text-xs text-white/50 mt-1">Keep this at the top of users' feeds.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={form.pinned}
                onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))}
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>
        </div>
      </Drawer>

      {/* Delete Modals */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Announcement?"
        description="This action cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteId && deleteAnn(deleteId)}>Yes, Delete</Button>
          </>
        }
      >
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-sm text-white/70">Are you sure you want to delete this announcement?</p>
        </div>
      </Modal>

      <Modal
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        title="Delete Selected Announcements?"
        description={`You are about to delete ${selectedIds.length} announcement(s).`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setBulkDeleteConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => handleBulkAction('delete')}>Yes, Delete All</Button>
          </>
        }
      >
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-sm text-white/70">Are you sure you want to delete these announcements?</p>
        </div>
      </Modal>
    </div>
  );
}
