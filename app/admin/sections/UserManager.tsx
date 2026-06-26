"use client";

import { useEffect, useState } from "react";
import { Search, Filter, ChevronRight, Shield, ShieldOff, UserX, UserCheck, History, CheckSquare, Square, Mail, Phone, Clock } from "lucide-react";
import { toISTDisplay } from "@/lib/dateTime";

import { 
  Drawer, Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
  Input, Select, useToast, EmptyState, Button, PageHeader, Badge, Skeleton, Timeline
} from "@/app/components/ui/design-system";

interface User {
  id: string; email: string; full_name: string; mobile_number: string;
  user_type: string; role: string; created_at: string;
  admin_approval_status: string; disabled_at: string | null; deleted_at: string | null;
}

interface UserDetail {
  user: User;
  applications: { id: string; status: string; submitted_at: string; cycles: { title: string } | null }[];
  screeningHistory: { id: string; score: number; passed: boolean; difficulty_level: number; submitted_at: string; status: string; domains: { name: string } | null }[];
  cohortParticipation: { id: string; status: string; cycles: { title: string } | null }[];
  eligibility: { id: string; last_passed_at: string | null; expires_at: string | null; last_score: number | null; highest_score: number | null; highest_difficulty: number | null; total_attempts: number; waiver_eligible: boolean; domains: { name: string } | null }[];
}

export default function UserManager() {
  const { success, error: toastError } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Drawer State
  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);

  // Bulk State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      toastError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const openDetail = async (id: string) => {
    setDetailLoading(true); 
    setSelected(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      const data = await res.json();
      setSelected(data);
    } catch (err) {
      toastError("Failed to load user details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAction = async (action: string, idToUpdate?: string) => {
    const targetId = idToUpdate || selected?.user.id;
    if (!targetId) return;
    
    setUpdatingRole(true);
    try {
      const res = await fetch(`/api/admin/users/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      success("User updated successfully");
      
      if (selected && targetId === selected.user.id) {
        setSelected(prev => prev ? { 
          ...prev, 
          user: { 
            ...prev.user, 
            role: data.user.role, 
            admin_approval_status: data.user.admin_approval_status, 
            disabled_at: data.user.disabled_at 
          } 
        } : null);
      }
      await load();
    } catch (err: any) {
      toastError("Action failed", err.message);
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleBulkAction = async (action: string) => {
    setBulkActionLoading(true);
    let sCount = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/admin/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (res.ok) sCount++;
      } catch {
        // Continue
      }
    }
    if (sCount > 0) success(`Updated ${sCount} user(s)`);
    setSelectedIds([]);
    await load();
    setBulkActionLoading(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredUsers.length) setSelectedIds([]);
    else setSelectedIds(filteredUsers.map(u => u.id));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const getTimelineEvents = (detail: UserDetail) => {
    const events = [];
    events.push({
      id: "signup",
      title: "Account Created",
      date: toISTDisplay(detail.user.created_at),
      status: "success" as const
    });

    if (detail.applications.length > 0) {
      events.push({
        id: "app",
        title: `Applied to ${detail.applications.length} Cohort(s)`,
        date: toISTDisplay(detail.applications[0].submitted_at),
        status: "active" as const
      });
    }

    if (detail.screeningHistory.length > 0) {
      const latest = detail.screeningHistory[0];
      events.push({
        id: "screen",
        title: "Screening Completed",
        description: `Scored ${latest.score}% on ${latest.domains?.name}`,
        date: toISTDisplay(latest.submitted_at),
        status: latest.passed ? "success" as const : "error" as const
      });
    }

    if (detail.cohortParticipation.length > 0) {
      events.push({
        id: "cohort",
        title: "Joined Cohort",
        description: detail.cohortParticipation[0].cycles?.title,
        status: "success" as const
      });
    }

    return events;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Users" 
          description="Manage accounts, roles, and administrative access." 
        />
        
        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 p-1.5 rounded-[16px] bg-white/5 border border-white/10 animate-in fade-in slide-in-from-right-4">
            <span className="px-3 text-xs font-bold text-white/50">{selectedIds.length} selected</span>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <Button size="sm" variant="ghost" onClick={() => handleBulkAction('enable')} disabled={bulkActionLoading}>Enable</Button>
            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleBulkAction('disable')} disabled={bulkActionLoading}>Disable</Button>
            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => { if (confirm("Are you sure you want to soft delete the selected users? This action will anonymize their PII.")) handleBulkAction('soft_delete'); }} disabled={bulkActionLoading}>Delete</Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 bg-[#0B0F14] p-4 rounded-[24px] border border-white/10">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input 
            placeholder="Search name or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-[14px]" />
          <Skeleton className="h-12 w-full rounded-[14px]" />
          <Skeleton className="h-12 w-full rounded-[14px]" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState 
          title="No users found" 
          description="There are no users matching your criteria."
          icon={<UserX />}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <button onClick={toggleSelectAll} className="text-white/40 hover:text-white">
                  {selectedIds.length === filteredUsers.length && filteredUsers.length > 0 ? <CheckSquare size={16} className="text-cyan-400" /> : <Square size={16} />}
                </button>
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead>Role & Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Command Center</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map(u => {
              const isSelected = selectedIds.includes(u.id);
              return (
                <TableRow key={u.id} data-state={isSelected ? "selected" : undefined}>
                  <TableCell>
                    <button onClick={() => toggleSelect(u.id)} className="text-white/40 hover:text-white">
                      {isSelected ? <CheckSquare size={16} className="text-cyan-400" /> : <Square size={16} />}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => openDetail(u.id)}>
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-black text-white text-xs">
                        {u.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-white hover:text-cyan-400 transition-colors">{u.full_name}</p>
                        <p className="text-[10px] text-white/40">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {u.admin_approval_status === 'pending' && (
                        <Badge variant="warning" className="text-[9px] uppercase tracking-widest">Pending Admin</Badge>
                      )}
                      <Badge variant={u.disabled_at ? "danger" : u.role === 'admin' ? "info" : "neutral"} className="text-[9px] uppercase tracking-widest">
                        {u.disabled_at ? "Disabled" : u.role}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-white/40 text-xs font-mono">
                    {toISTDisplay(u.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {u.role === 'admin' && u.admin_approval_status === 'pending' && (
                        <>
                          <Button size="sm" variant="ghost" className="text-emerald-400" onClick={() => handleAction("approve_admin", u.id)}>Approve Admin</Button>
                        </>
                      )}
                      {u.disabled_at ? (
                        <Button size="sm" variant="ghost" className="text-emerald-400" onClick={() => handleAction("enable", u.id)}>Enable</Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => handleAction("disable", u.id)}>Disable</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openDetail(u.id)}>Review</Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      {/* User Drawer */}
      <Drawer
        isOpen={!!selected || detailLoading}
        onClose={() => setSelected(null)}
        title="User Profile"
        description={selected ? `Joined ${toISTDisplay(selected.user.created_at)}` : "Loading..."}
        width="xl"
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
                <h2 className="text-3xl font-black text-white">{selected.user.full_name}</h2>
                <div className="flex gap-4 mt-2 text-sm font-bold text-white/50">
                  <span className="flex items-center gap-1.5"><Mail size={14} /> {selected.user.email}</span>
                  {selected.user.mobile_number && <span className="flex items-center gap-1.5"><Phone size={14} /> {selected.user.mobile_number}</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {selected.user.admin_approval_status === 'pending' && (
                  <Badge variant="warning" className="text-xs px-3 py-1 uppercase tracking-widest">Pending Admin</Badge>
                )}
                <Badge variant={selected.user.disabled_at ? "danger" : selected.user.role === 'admin' ? "info" : "neutral"} className="text-xs px-3 py-1 uppercase tracking-widest">
                  {selected.user.disabled_at ? "Disabled" : selected.user.role}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="col-span-2 space-y-6">
                
                {/* Cohorts & Applications */}
                <div className="bg-white/[0.02] border border-white/5 rounded-[24px] p-6 space-y-4">
                  <h3 className="text-[10px] font-black tracking-widest text-white/50 uppercase">Applications & Cohorts</h3>
                  {selected.applications.length === 0 && selected.cohortParticipation.length === 0 ? (
                    <p className="text-xs text-white/40">No applications or cohorts yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {selected.cohortParticipation.map(c => (
                        <div key={c.id} className="flex justify-between items-center p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-[12px]">
                          <span className="text-sm font-bold text-white">{c.cycles?.title}</span>
                          <Badge variant="success">Enrolled</Badge>
                        </div>
                      ))}
                      {selected.applications.map(app => (
                        <div key={app.id} className="flex justify-between items-center p-3 bg-white/5 rounded-[12px]">
                          <div>
                            <p className="text-sm font-bold text-white/90">{app.cycles?.title}</p>
                            <p className="text-[10px] text-white/40 mt-0.5">{toISTDisplay(app.submitted_at)}</p>
                          </div>
                          <Badge variant="neutral" className="uppercase text-[9px] tracking-wider">{app.status.replace(/_/g, " ")}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Screening & Eligibility */}
                <div className="bg-white/[0.02] border border-white/5 rounded-[24px] p-6 space-y-4">
                  <h3 className="text-[10px] font-black tracking-widest text-white/50 uppercase">Screening & Certifications</h3>
                  {selected.eligibility.length === 0 && selected.screeningHistory.length === 0 ? (
                    <p className="text-xs text-white/40">No screening history yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {selected.eligibility.map(e => (
                        <div key={e.id} className="p-4 bg-white/5 border border-white/10 rounded-[12px]">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-bold text-white/90">{e.domains?.name}</span>
                            <Badge variant={e.waiver_eligible ? "success" : "warning"}>
                              {e.waiver_eligible ? "Screening Already Cleared" : "Screening Test Available"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-white/40 font-bold">
                            <p>Attempts: <span className="text-white/80">{e.total_attempts}</span></p>
                            <p>Best Score: <span className="text-white/80">{e.highest_score ?? "—"}</span></p>
                            <p>Difficulty Reached: <span className="text-white/80">{e.highest_difficulty ?? "—"}</span></p>
                            <p>Valid Until: <span className="text-white/80">{e.expires_at ? toISTDisplay(e.expires_at) : "—"}</span></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Sidebar Action Center */}
              <div className="space-y-6">
                <div className="bg-[#0B0F14] border border-white/10 rounded-[24px] p-6">
                  <h3 className="text-[10px] font-black tracking-widest text-cyan-400 uppercase mb-4 flex items-center gap-2">
                    <Shield size={14} /> Account Actions
                  </h3>
                  <div className="space-y-3">
                    {selected.user.role === 'admin' && selected.user.admin_approval_status === 'pending' && (
                      <div className="flex flex-col gap-2 w-full">
                        <Button variant="primary" onClick={() => handleAction("approve_admin")} disabled={updatingRole} className="w-full">
                          Approve Admin
                        </Button>
                        <Button variant="danger" onClick={() => handleAction("reject_admin")} disabled={updatingRole} className="w-full">
                          Reject Admin
                        </Button>
                      </div>
                    )}
                    
                    {selected.user.role === 'admin' && selected.user.admin_approval_status !== 'pending' ? (
                      <Button variant="ghost" onClick={() => handleAction("remove_admin")} disabled={updatingRole} className="w-full text-amber-400 hover:text-amber-300">
                        Revoke Admin
                      </Button>
                    ) : selected.user.role !== 'admin' ? (
                      <Button variant="ghost" onClick={() => handleAction("promote_admin")} disabled={updatingRole} className="w-full text-violet-400 hover:text-violet-300">
                        Promote to Admin
                      </Button>
                    ) : null}
                    
                    {selected.user.disabled_at ? (
                      <Button variant="ghost" onClick={() => handleAction("enable")} disabled={updatingRole} className="w-full text-emerald-400 hover:text-emerald-300">
                        Enable Account
                      </Button>
                    ) : (
                      <Button variant="ghost" onClick={() => handleAction("disable")} disabled={updatingRole} className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
                        Disable Account
                      </Button>
                    )}
                    
                    {!selected.user.deleted_at && (
                      <div className="pt-2 mt-2 border-t border-white/5">
                        <Button variant="ghost" onClick={() => { if (confirm("Are you sure you want to soft delete this user? Their PII will be anonymized and they will not be able to log in.")) handleAction("soft_delete"); }} disabled={updatingRole} className="w-full text-red-500 hover:text-red-400 hover:bg-red-500/10 border border-red-500/20">
                          Soft Delete Account
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#0B0F14] border border-white/10 rounded-[24px] p-6">
                  <h3 className="text-[10px] font-black tracking-widest text-white/50 uppercase mb-4">User Journey</h3>
                  <Timeline events={getTimelineEvents(selected)} />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
