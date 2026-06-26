"use client";

import { useEffect, useState } from "react";
import { BarChart2, Users, CheckCircle, TrendingUp, Clock, FileText, ChevronRight, Award, XCircle, AlertTriangle } from "lucide-react";
import { Card, Skeleton, EmptyState, Badge } from "@/app/components/ui/design-system";

interface AnalyticsData {
  // Funnel — real counts
  totalApplications: number;
  screeningRequired: number;
  screeningPassed: number;
  screeningFailed: number;
  selected: number;
  activeMembers: number;
  certified: number;
  rejected: number;
  // Other metrics
  screeningPassRate: number;
  avgCompletion: number;
  totalTasks: number;
  approvedSubmissions: number;
  pendingReview: number;
  rejectedSubmissions: number;
}

const FUNNEL_STAGES = [
  { key: "totalApplications",  label: "Applied",    color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
  { key: "screeningRequired",  label: "Screening",  color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/20" },
  { key: "screeningPassed",    label: "Passed",     color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20" },
  { key: "selected",           label: "Selected",   color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  { key: "activeMembers",      label: "Enrolled",   color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
  { key: "certified",          label: "Certified",  color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/20" },
] as const;

export default function CohortAnalytics({ cycleId }: { cycleId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/cohorts/${cycleId}/analytics`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e: any) => setError(e.message || "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [cycleId]);

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64 rounded-xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    </div>
  );

  if (error || !data) return (
    <EmptyState title="Analytics unavailable" description="Could not load analytics data. Please try again." icon={<BarChart2 />} />
  );

  const totalSubs = data.approvedSubmissions + data.pendingReview + data.rejectedSubmissions;
  const approvedPct = totalSubs > 0 ? Math.round((data.approvedSubmissions / totalSubs) * 100) : 0;
  const pendingPct  = totalSubs > 0 ? Math.round((data.pendingReview / totalSubs) * 100) : 0;
  const rejectedPct = totalSubs > 0 ? Math.round((data.rejectedSubmissions / totalSubs) * 100) : 0;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white">Cohort Intelligence Center</h2>
        <p className="text-white/35 text-sm mt-1">All metrics are sourced directly from live database records.</p>
      </div>

      {/* Application Funnel */}
      <Card variant="solid" padding="md">
        <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-5">Application Funnel</h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {FUNNEL_STAGES.map((stage, idx) => {
            const value = data[stage.key as keyof AnalyticsData] as number;
            return (
              <div key={stage.key} className="flex items-center gap-1 shrink-0">
                <div className={`${stage.bg} border ${stage.border} rounded-xl px-4 py-3 text-center min-w-[90px]`}>
                  <p className={`text-2xl font-black ${stage.color}`}>{value}</p>
                  <p className="text-[9px] text-white/40 uppercase tracking-wider mt-1">{stage.label}</p>
                </div>
                {idx < FUNNEL_STAGES.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
        {data.screeningFailed > 0 && (
          <p className="text-[10px] text-white/25 mt-3">
            {data.screeningFailed} applicant{data.screeningFailed !== 1 ? "s" : ""} did not pass screening ·{" "}
            {data.rejected} rejected
          </p>
        )}
      </Card>

      {/* Submission Insights */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">Submission Insights</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Approved", value: data.approvedSubmissions, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
            { label: "Pending Review", value: data.pendingReview, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
            { label: "Needs Revision / Rejected", value: data.rejectedSubmissions, icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
          ].map(m => (
            <div key={m.label} className={`${m.bg} border ${m.border} rounded-2xl p-4 flex items-center gap-3`}>
              <div className={`w-9 h-9 rounded-xl bg-black/20 flex items-center justify-center`}>
                <m.icon className={`w-4 h-4 ${m.color}`} />
              </div>
              <div>
                <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
                <p className="text-[9px] text-white/35 uppercase tracking-wider mt-0.5 leading-tight">{m.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Submission ratio bars */}
        {totalSubs > 0 && (
          <div className="mt-4 bg-[#0A0E17] border border-white/[0.07] rounded-2xl p-4 space-y-3">
            {[
              { label: "Approved", pct: approvedPct, color: "bg-emerald-400" },
              { label: "Pending",  pct: pendingPct,  color: "bg-amber-400" },
              { label: "Rejected", pct: rejectedPct, color: "bg-rose-400" },
            ].map(row => (
              <div key={row.label}>
                <div className="flex justify-between text-[10px] text-white/40 mb-1">
                  <span>{row.label}</span>
                  <span className="font-bold text-white/60">{row.pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
                  <div className={`h-full ${row.color} rounded-full transition-all duration-700`} style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Member + Task Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active Members",   value: data.activeMembers,  icon: Users,       color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20" },
          { label: "Avg Completion",   value: `${data.avgCompletion}%`, icon: TrendingUp, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
          { label: "Total Tasks",      value: data.totalTasks,     icon: FileText,    color: "text-white/50",    bg: "bg-white/5",        border: "border-white/10" },
          { label: "Certified",        value: data.certified,      icon: Award,       color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
        ].map(m => (
          <div key={m.label} className={`bg-[#0A0E17] border ${m.border} rounded-2xl p-4 flex items-center gap-3`}>
            <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center shrink-0`}>
              <m.icon className={`w-4 h-4 ${m.color}`} />
            </div>
            <div>
              <p className="text-xl font-black text-white">{m.value}</p>
              <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5 leading-tight">{m.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
