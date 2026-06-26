"use client";

import { useEffect, useState } from "react";
import { Users, TrendingUp, CheckCircle, Award, UserX, Search } from "lucide-react";
import { Badge, Button, Skeleton, EmptyState, Drawer, useToast, Modal } from "@/app/components/ui/design-system";
import { toISTDisplay } from "@/lib/dateTime";

const STATUS_COLORS: Record<string, "neutral" | "success" | "info" | "warning" | "danger"> = {
  selected: "info", enrolled: "success", active: "success", completed: "success", dropped: "danger", waitlisted: "neutral",
};

const AVATAR_COLORS = [
  "bg-violet-500/20 text-violet-300",
  "bg-cyan-500/20 text-cyan-300",
  "bg-emerald-500/20 text-emerald-300",
  "bg-amber-500/20 text-amber-300",
  "bg-rose-500/20 text-rose-300",
  "bg-sky-500/20 text-sky-300",
];

function avatarColor(name: string) {
  const code = name?.charCodeAt(0) ?? 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function initials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface Member {
  id: string; status: string; completion_percentage: number;
  enrolled_at: string; last_activity_at: string; certificate_issued: boolean;
  user_id: string;
  application_status?: string | null;
  screening_status?: string | null;
  submissions_count?: number;
  approved_submissions_count?: number;
  has_certificate?: boolean;
  new_users: { id: string; full_name: string; email: string; mobile_number?: string; college?: string; graduation_year?: string } | null;
}

export default function CohortMembers({ cycleId }: { cycleId: string }) {
  const { success, error: toastError } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Member | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Member | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/cohorts/${cycleId}/members`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMembers(data.members || []);
    } catch (e: any) {
      setError(e.message || "Failed to load members");
      toastError("Failed to load members");
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [cycleId]);

  const getUser = (m?: Member | null) => {
    if (!m) return null;
    if (Array.isArray(m.new_users)) return (m.new_users as any)[0] ?? null;
    return m.new_users ?? null;
  };

  const updateStatus = async (participantId: string, status: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/cohorts/${cycleId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, status }),
      });
      if (!res.ok) throw new Error();
      success(`Member marked as ${status}`);
      setMembers(prev => prev.map(m => m.id === participantId ? { ...m, status } : m));
      if (selected?.id === participantId) setSelected(prev => prev ? { ...prev, status } : null);
      setConfirmRemove(null);
    } catch { toastError("Failed to update member"); }
    finally { setActionLoading(false); }
  };

  const issueCertificate = async (member: Member) => {
    const user = getUser(member);
    if (!user) { toastError("No user attached to this member"); return; }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/cohorts/${cycleId}/certificates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, participantId: member.id }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      success("Certificate issued successfully");
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, certificate_issued: true } : m));
      if (selected?.id === member.id) setSelected(prev => prev ? { ...prev, certificate_issued: true } : null);
    } catch (e: any) { toastError(e.message || "Failed to issue certificate"); }
    finally { setActionLoading(false); }
  };

  const filtered = members.filter(m => {
    if (!search) return true;
    const user = getUser(m);
    const s = search.toLowerCase();
    return user?.full_name?.toLowerCase().includes(s) || user?.email?.toLowerCase().includes(s);
  });

  const enrolled = members.filter(m => ["enrolled", "active", "completed"].includes(m.status));
  const avgCompletion = enrolled.length > 0
    ? Math.round(enrolled.reduce((s, m) => s + (m.completion_percentage || 0), 0) / enrolled.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-white">Cohort Roster</h2>
          <Badge variant="neutral" className="text-[10px]">{members.length}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search members..."
              className="bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary-500/40 w-52 transition-colors"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="text-white/40 hover:text-white">
            {loading ? "..." : "↻"}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {!loading && members.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Active",   value: members.filter(m => ["selected", "enrolled", "active", "completed"].includes(m.status)).length, icon: Users,       color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20" },
            { label: "Avg Completion", value: `${avgCompletion}%`, icon: TrendingUp, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
            { label: "Completed",      value: members.filter(m => m.status === "completed").length, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
            { label: "Certified",      value: members.filter(m => m.certificate_issued || m.has_certificate).length, icon: Award, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
          ].map(stat => (
            <div key={stat.label} className={`bg-[#0A0E17] border ${stat.border} rounded-2xl p-4 flex items-center gap-3`}>
              <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xl font-black text-white">{stat.value}</p>
                <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <EmptyState title="Unable to load members" description={error} icon={<Users />} />}

      {/* Member Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        members.length === 0 ? (
          <EmptyState
            title="No members enrolled yet"
            description="Members appear here once applications are approved and enrolled."
            icon={<Users />}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-white/30 text-sm">No members match your search.</p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(member => {
            const user = getUser(member);
            const hasCert = member.certificate_issued || member.has_certificate;
            return (
              <div
                key={member.id}
                onClick={() => setSelected(member)}
                className="bg-[#0A0E17] border border-white/[0.08] rounded-2xl p-5 cursor-pointer hover:border-white/20 hover:bg-[#0D1220] transition-all duration-150 group"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${avatarColor(user?.full_name ?? "")}`}>
                    {initials(user?.full_name ?? "")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{user?.full_name ?? "Unknown"}</p>
                    <p className="text-[11px] text-white/35 truncate">{user?.email ?? ""}</p>
                  </div>
                  {hasCert && <Award size={14} className="text-amber-400 shrink-0" />}
                </div>

                {/* Completion bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-[10px] text-white/35 mb-1.5">
                    <span>Progress</span>
                    <span className="font-bold text-white/60">{member.completion_percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-cyan-400 rounded-full transition-all"
                      style={{ width: `${member.completion_percentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant={STATUS_COLORS[member.status] ?? "neutral"} className="text-[8px] uppercase tracking-wider">
                    {member.status}
                  </Badge>
                  {(member.submissions_count ?? 0) > 0 && (
                    <span className="text-[10px] text-white/30">
                      {member.approved_submissions_count ?? 0}/{member.submissions_count} tasks
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Member Detail Drawer */}
      <Drawer
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Member Profile"
        footer={<Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>}
      >
        {selected && (() => {
          const user = getUser(selected);
          return (
            <div className="space-y-5">
              {/* Profile header */}
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-black shrink-0 ${avatarColor(user?.full_name ?? "")}`}>
                  {initials(user?.full_name ?? "")}
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{user?.full_name ?? "Unknown"}</p>
                  <p className="text-sm text-white/40">{user?.email ?? ""}</p>
                  {user?.college && <p className="text-xs text-white/25 mt-0.5">{user.college} · {user.graduation_year}</p>}
                </div>
              </div>

              {/* Progress */}
              <div className="bg-[#060810] border border-white/[0.07] rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Completion</span>
                  <span className="font-bold text-white">{selected.completion_percentage}%</span>
                </div>
                <div className="w-full h-2 bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary-500 to-cyan-400 rounded-full" style={{ width: `${selected.completion_percentage}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {[
                    { label: "Status", value: selected.status },
                    { label: "Enrolled", value: selected.enrolled_at ? toISTDisplay(selected.enrolled_at) : "—" },
                    { label: "Submissions", value: `${selected.approved_submissions_count ?? 0} / ${selected.submissions_count ?? 0} approved` },
                    { label: "Certificate", value: (selected.certificate_issued || selected.has_certificate) ? "Issued ✓" : "Not issued" },
                  ].map(row => (
                    <div key={row.label}>
                      <p className="text-[9px] text-white/25 uppercase tracking-wider">{row.label}</p>
                      <p className="text-xs font-semibold text-white/70 mt-0.5">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Screening + Application */}
              {(selected.application_status || selected.screening_status) && (
                <div className="bg-[#060810] border border-white/[0.07] rounded-xl p-4 space-y-2">
                  {selected.application_status && (
                    <div className="flex justify-between text-xs">
                      <span className="text-white/35">Application</span>
                      <Badge variant="neutral" className="text-[8px]">{selected.application_status?.replace(/_/g, " ")}</Badge>
                    </div>
                  )}
                  {selected.screening_status && (
                    <div className="flex justify-between text-xs">
                      <span className="text-white/35">Screening</span>
                      <Badge variant="neutral" className="text-[8px]">{selected.screening_status?.replace(/_/g, " ")}</Badge>
                    </div>
                  )}
                </div>
              )}

              {/* Certificate action */}
              {!(selected.certificate_issued || selected.has_certificate) && (
                <Button variant="secondary" className="w-full flex items-center gap-2 justify-center" onClick={() => issueCertificate(selected)} disabled={actionLoading}>
                  <Award size={14} /> Issue Certificate
                </Button>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t border-white/[0.07]">
                <p className="text-[9px] uppercase tracking-widest text-white/25 mb-2">Manage Member</p>
                {selected.status !== "completed" && (
                  <Button variant="secondary" className="w-full flex items-center gap-2 justify-center" onClick={() => updateStatus(selected.id, "completed")} disabled={actionLoading}>
                    <CheckCircle size={14} /> Mark as Completed
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="w-full flex items-center gap-2 justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => setConfirmRemove(selected)}
                  disabled={actionLoading}
                >
                  <UserX size={14} /> Remove from Cohort
                </Button>
              </div>
            </div>
          );
        })()}
      </Drawer>

      {/* Confirm Remove Modal */}
      <Modal isOpen={!!confirmRemove} onClose={() => setConfirmRemove(null)} title="Remove Member"
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmRemove(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => { if (confirmRemove) { updateStatus(confirmRemove.id, "dropped"); setSelected(null); } }} disabled={actionLoading}>
            Remove Member
          </Button>
        </>}
      >
        <p className="text-white/70">Are you sure you want to remove <strong className="text-white">{getUser(confirmRemove as Member)?.full_name}</strong> from this cohort? Their submissions and progress will be retained.</p>
      </Modal>
    </div>
  );
}
