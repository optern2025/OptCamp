"use client";

import { useEffect, useState } from "react";
import { Award, ExternalLink, Trash2, CheckCircle, Users, Clock } from "lucide-react";
import { Badge, Button, Skeleton, EmptyState, useToast, Modal } from "@/app/components/ui/design-system";
import { toISTDisplay } from "@/lib/dateTime";

interface Certificate {
  id: string; certificate_number: string; issue_date: string;
  new_users: { full_name: string; email: string };
}

interface EligibleMember {
  id: string; completion_percentage: number; certificate_issued: boolean;
  new_users: { id: string; full_name: string; email: string };
}

const AVATAR_COLORS = [
  "bg-violet-500/20 text-violet-300",
  "bg-cyan-500/20 text-cyan-300",
  "bg-emerald-500/20 text-emerald-300",
  "bg-amber-500/20 text-amber-300",
  "bg-rose-500/20 text-rose-300",
  "bg-sky-500/20 text-sky-300",
];

function avatarColor(name: string) {
  return AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

function initials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length === 1 ? parts[0].charAt(0).toUpperCase() : (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function CohortCertificates({ cycleId }: { cycleId: string }) {
  const { success, error: toastError } = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [eligible, setEligible] = useState<EligibleMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/cohorts/${cycleId}/certificates`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCertificates(data.certificates || []);
      setEligible(data.eligible || []);
    } catch (e: any) {
      setError(e.message || "Failed to load certificates");
      toastError("Failed to load certificates");
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [cycleId]);

  const getUser = (m?: EligibleMember | null) => {
    if (!m) return null;
    if (Array.isArray(m.new_users)) return (m.new_users as any)[0] ?? null;
    return m.new_users ?? null;
  };

  const getCertUser = (c?: Certificate | null) => {
    if (!c) return null;
    if (Array.isArray(c.new_users)) return (c.new_users as any)[0] ?? null;
    return c.new_users ?? null;
  };

  const issueCert = async (member: EligibleMember) => {
    const user = getUser(member);
    if (!user) { toastError("No user found"); return; }
    setIssuingId(member.id);
    try {
      const res = await fetch(`/api/admin/cohorts/${cycleId}/certificates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, participantId: member.id }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      success("Certificate issued successfully");
      await load();
    } catch (e: any) { toastError(e.message || "Failed to issue certificate"); }
    finally { setIssuingId(null); }
  };

  const revokeCert = async () => {
    if (!revokeId) return;
    setRevoking(true);
    try {
      const res = await fetch(`/api/admin/cohorts/${cycleId}/certificates`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certId: revokeId }),
      });
      if (!res.ok) throw new Error();
      success("Certificate revoked");
      setCertificates(prev => prev.filter(c => c.id !== revokeId));
      setRevokeId(null);
    } catch { toastError("Failed to revoke certificate"); }
    finally { setRevoking(false); }
  };

  const pendingEligible = eligible.filter(e => !e.certificate_issued);

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4"><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-20 rounded-2xl" /></div>
      <Skeleton className="h-6 w-48 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
    </div>
  );

  if (error) return <EmptyState title="Unable to load certificates" description={error} icon={<Award />} />;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white">Certification Center</h2>
        <p className="text-white/35 text-sm mt-1">Issue and manage participant certificates.</p>
      </div>

      {/* Metric chips */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Issued",   value: certificates.length,   icon: Award,       color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
          { label: "Eligible", value: eligible.length,       icon: Users,       color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20" },
          { label: "Pending",  value: pendingEligible.length, icon: Clock,      color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
        ].map(m => (
          <div key={m.label} className={`${m.bg} border ${m.border} rounded-2xl p-4 flex items-center gap-3`}>
            <div className="w-9 h-9 rounded-xl bg-black/20 flex items-center justify-center">
              <m.icon className={`w-4 h-4 ${m.color}`} />
            </div>
            <div>
              <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
              <p className="text-[9px] text-white/35 uppercase tracking-wider mt-0.5">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Issued Certificates */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-black text-white/50 uppercase tracking-widest">Issued Certificates</h3>
          <Badge variant="neutral" className="text-[9px]">{certificates.length}</Badge>
        </div>
        {certificates.length === 0 ? (
          <div className="bg-[#0A0E17] border border-white/[0.07] rounded-2xl p-8 text-center">
            <Award className="w-8 h-8 text-white/15 mx-auto mb-3" />
            <p className="text-sm text-white/30">No certificates issued yet.</p>
            <p className="text-xs text-white/20 mt-1">Issue certificates to members who have completed the cohort.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.map(cert => {
              const user = getCertUser(cert);
              return (
                <div key={cert.id} className="bg-[#0A0E17] border border-emerald-500/15 rounded-2xl p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">{user?.full_name ?? "Unknown"}</p>
                      <p className="text-[11px] text-white/35 truncate">{user?.email ?? ""}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/30">Certificate ID</span>
                      <span className="font-mono text-[10px] text-white/50">{cert.certificate_number}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/30">Issued</span>
                      <span className="text-white/60">{toISTDisplay(cert.issue_date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                    <a
                      href={`/certificate/${cert.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                    >
                      <ExternalLink size={11} /> Verify
                    </a>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto text-red-400/40 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => setRevokeId(cert.id)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ready to Certify */}
      {eligible.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-black text-white/50 uppercase tracking-widest">Ready to Certify</h3>
            <Badge variant="warning" className="text-[9px]">{pendingEligible.length}</Badge>
          </div>
          {pendingEligible.length === 0 ? (
            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-5 text-center">
              <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-white/50">All eligible members have received their certificates.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingEligible.map(member => {
                const user = getUser(member);
                return (
                  <div key={member.id} className="bg-[#0A0E17] border border-white/[0.07] rounded-xl p-4 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${avatarColor(user?.full_name ?? "")}`}>
                      {initials(user?.full_name ?? "")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{user?.full_name ?? "Unknown"}</p>
                      <p className="text-[10px] text-white/30">{member.completion_percentage}% completion</p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => issueCert(member)}
                      disabled={issuingId === member.id}
                      className="shrink-0"
                    >
                      <Award size={12} className="mr-1.5" />
                      {issuingId === member.id ? "Issuing..." : "Issue"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Revoke Confirm Modal */}
      <Modal
        isOpen={!!revokeId}
        onClose={() => setRevokeId(null)}
        title="Revoke Certificate"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRevokeId(null)}>Cancel</Button>
            <Button variant="danger" onClick={revokeCert} disabled={revoking}>
              {revoking ? "Revoking..." : "Revoke Certificate"}
            </Button>
          </>
        }
      >
        <p className="text-white/70">Are you sure you want to revoke this certificate? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
