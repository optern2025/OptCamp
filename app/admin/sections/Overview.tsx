"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, FileText, Activity, Award, CheckCircle2, AlertTriangle, 
  ChevronRight, Calendar, UserCheck, ShieldCheck, Clock, CheckSquare, Search, Filter
} from "lucide-react";
import { toISTDisplay } from "@/lib/dateTime";
import { Skeleton } from "@/app/components/ui/design-system";

export default function OverviewSection() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load dashboard data.");
        return r.json();
      })
      .then((d) => {
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <Skeleton className="h-20 w-full rounded-2xl bg-white/[0.02]" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl bg-white/[0.02]" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] rounded-2xl bg-white/[0.02]" />
          <Skeleton className="h-[400px] rounded-2xl bg-white/[0.02]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-400 font-bold flex items-center gap-3">
        <AlertTriangle className="w-5 h-5" /> {error}
      </div>
    );
  }

  if (!data) return null;

  const { metrics, actionRequired, activeCohorts, recentApplications, recentActivity } = data;

  const totalActionsNeeded = Object.values(actionRequired).reduce((a: any, b: any) => Number(a) + Number(b), 0) as number;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-20 font-sans">
      
      {/* ── SECTION 1: ADMIN HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">OptCamp OS</h1>
          <p className="text-sm text-white/50 mt-1 flex items-center gap-2">
            Good Morning, Admin 
            <span className="text-white/20">•</span> 
            {metrics.activeCohorts} active cohorts 
            <span className="text-white/20">•</span>
            {totalActionsNeeded === 0 ? (
              <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> System healthy</span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Attention required</span>
            )}
          </p>
        </div>
        <div className="text-sm text-white/40 font-medium bg-white/[0.03] border border-white/[0.08] px-3 py-1.5 rounded-lg flex items-center gap-2">
          <Calendar className="w-4 h-4 text-white/30" />
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* ── SECTION 2: KEY METRICS ROW ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Users", value: metrics.totalUsers, icon: Users },
          { label: "Applications", value: metrics.totalApplications, icon: FileText },
          { label: "Active Cohorts", value: metrics.activeCohorts, icon: Activity },
          { label: "Enrolled Members", value: metrics.enrolledMembers, icon: UserCheck },
          { label: "Certificates", value: metrics.certificatesIssued, icon: Award },
        ].map((m, i) => (
          <div key={i} className="rounded-xl border border-white/[0.08] bg-[#0A0D12] p-5 hover:border-white/[0.15] transition-colors">
            <div className="flex items-center gap-2 mb-3 text-white/40">
              <m.icon className="w-4 h-4" />
              <span className="text-xs font-semibold">{m.label}</span>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">{m.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* ── SECTION 3: ACTION REQUIRED ── */}
        <div className="lg:col-span-1 rounded-xl border border-white/[0.08] bg-[#0A0D12] flex flex-col h-[400px]">
          <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Action Required</h3>
            {totalActionsNeeded > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {totalActionsNeeded} Items
              </span>
            )}
          </div>
          <div className="p-4 flex-1 flex flex-col gap-3 overflow-y-auto no-scrollbar">
            {totalActionsNeeded === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-white/40 space-y-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
                <p className="text-sm font-medium">All caught up.<br/>No pending actions.</p>
              </div>
            ) : (
              <>
                {[
                  { label: "Pending Applications", value: actionRequired.pendingApplications, icon: FileText, color: "text-blue-400", bg: "bg-blue-500/10" },
                  { label: "Screening Reviews Needed", value: actionRequired.screeningReviewsNeeded, icon: ShieldCheck, color: "text-amber-400", bg: "bg-amber-500/10" },
                  { label: "Tasks Awaiting Review", value: actionRequired.tasksAwaitingReview, icon: CheckSquare, color: "text-violet-400", bg: "bg-violet-500/10" },
                  { label: "Cohorts Near Capacity", value: actionRequired.cohortsNearCapacity, icon: Activity, color: "text-rose-400", bg: "bg-rose-500/10" },
                ].map(action => (
                  action.value > 0 && (
                    <div key={action.label} className="flex items-center justify-between p-3 rounded-lg border border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.03] transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-md ${action.bg}`}>
                          <action.icon className={`w-4 h-4 ${action.color}`} />
                        </div>
                        <span className="text-sm font-medium text-white/80">{action.label}</span>
                      </div>
                      <span className="text-base font-bold text-white">{action.value}</span>
                    </div>
                  )
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── SECTION 4: ACTIVE COHORTS ── */}
        <div className="lg:col-span-2 rounded-xl border border-white/[0.08] bg-[#0A0D12] flex flex-col h-[400px]">
          <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Active Cohorts</h3>
            <Link href="/admin/cycles" className="text-xs font-medium text-white/40 hover:text-white transition-colors">
              View All
            </Link>
          </div>
          <div className="p-4 overflow-y-auto no-scrollbar grid gap-3">
            {activeCohorts.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-white/40 text-sm">
                No active cohorts.
              </div>
            ) : (
              activeCohorts.map((cohort: any) => (
                <div key={cohort.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex w-10 h-10 rounded-lg bg-white/5 border border-white/10 items-center justify-center">
                      <Activity className="w-5 h-5 text-white/40" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white leading-tight">{cohort.title}</h4>
                      <p className="text-xs text-white/40 mt-0.5">{cohort.track}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 sm:ml-auto">
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{cohort.activeMembers} <span className="text-white/40 font-normal">/ {cohort.seats || '∞'}</span></p>
                      <p className="text-[10px] uppercase text-white/30 font-semibold tracking-wider">Members</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{cohort.progress}%</p>
                      <p className="text-[10px] uppercase text-white/30 font-semibold tracking-wider">Progress</p>
                    </div>
                    <Link href={`/admin/cohorts/${cohort.id}`} className="p-2 rounded-md bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors border border-white/10">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* ── SECTION 5: RECENT ACTIVITY ── */}
        <div className="lg:col-span-1 rounded-xl border border-white/[0.08] bg-[#0A0D12] flex flex-col h-[500px]">
          <div className="p-4 border-b border-white/[0.08]">
            <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
          </div>
          <div className="p-5 overflow-y-auto no-scrollbar flex-1">
            {recentActivity.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-white/30 text-sm">
                No recent activity recorded.
              </div>
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-white/10 before:to-transparent">
                {recentActivity.map((log: any, i: number) => (
                  <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white/10 bg-[#0A0D12] text-white/50 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/50" />
                    </div>
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] pl-3 md:pl-0">
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] group-hover:border-white/[0.1] transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                            {log.event_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[9px] text-white/30 font-mono">
                            {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-xs text-white/60 leading-snug">
                          <span className="font-semibold text-white/90">{log.admin?.full_name || 'System'}</span> action
                          {log.target_user && <span> on <span className="font-semibold text-white/90">{log.target_user.full_name}</span></span>}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── SECTION 6: RECENT APPLICATIONS ── */}
        <div className="lg:col-span-2 rounded-xl border border-white/[0.08] bg-[#0A0D12] flex flex-col h-[500px]">
          <div className="p-4 border-b border-white/[0.08] flex items-center justify-between shrink-0">
            <h3 className="text-sm font-semibold text-white">Recent Applications</h3>
            <div className="flex items-center gap-2">
              <button className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto no-scrollbar flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#0A0D12] sticky top-0 border-b border-white/[0.06] z-10">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Applicant</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Cohort</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Score</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {recentApplications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-white/30">No recent applications.</td>
                  </tr>
                ) : (
                  recentApplications.map((app: any) => (
                    <tr key={app.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-white font-medium">
                        {app.full_name}
                      </td>
                      <td className="px-5 py-3 text-white/60">
                        {app.cycles?.title || '—'}
                      </td>
                      <td className="px-5 py-3">
                        {app.screening_score != null ? (
                          <span className="text-xs font-semibold text-white/80">{app.screening_score}%</span>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[10px] font-medium text-white/60 bg-white/5 px-2 py-1 rounded">
                          {app.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-white/40 font-mono">
                        {new Date(app.submitted_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
