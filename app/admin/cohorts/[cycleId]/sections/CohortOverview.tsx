"use client";

import { useEffect, useState } from "react";
import {
  Users, FileText, CheckCircle, TrendingUp, GitBranch,
  Zap, Upload, Award, Calendar
} from "lucide-react";
import { Card, Badge, Skeleton, EmptyState } from "@/app/components/ui/design-system";
import { toISTDisplay } from "@/lib/dateTime";

const STATUS_COLORS: Record<string, "neutral" | "success" | "info" | "warning" | "danger"> = {
  pending: "warning", approved: "success", screening_passed: "success", selected: "success",
  enrolled: "success", completed: "success", rejected: "danger", screening_failed: "danger",
  screening_required: "info", waitlisted: "neutral", under_review: "warning",
};

const SUB_STATUS: Record<string, "neutral" | "success" | "info" | "warning" | "danger"> = {
  pending: "info", approved: "success", needs_revision: "warning", rejected: "danger",
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

function daysRemaining(end: string | null) {
  if (!end) return null;
  const diff = new Date(end).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function CohortOverview({ cycleId }: { cycleId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/cohorts/${cycleId}/overview`)
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, [cycleId]);

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-20 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
      </div>
      <Skeleton className="h-36 rounded-2xl" />
    </div>
  );

  if (data?.error || !data?.cycle || Object.keys(data.cycle).length === 0) {
    return <EmptyState title="Unable to load overview" description={data?.error || "Could not load cohort data."} icon={<FileText />} />;
  }

  const { metrics, recentApplications, recentSubmissions, sprints } = data;
  const activeSprint = sprints?.find((s: any) => s.status === "active");
  const daysLeft = activeSprint ? daysRemaining(activeSprint.end_date) : null;

  const metricCards = [
    { label: "Applications",    value: metrics.totalApps,             icon: FileText,    color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
    { label: "Selected",        value: metrics.selected,              icon: CheckCircle, color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20" },
    { label: "Enrolled",        value: metrics.enrolled,              icon: Users,       color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/20" },
    { label: "Avg Completion",  value: `${metrics.avgCompletion}%`,   icon: TrendingUp,  color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
    { label: "Sprints",         value: metrics.sprintCount ?? sprints?.length ?? 0, icon: Zap, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { label: "Total Tasks",     value: metrics.taskCount ?? 0,        icon: GitBranch,   color: "text-white/50",    bg: "bg-white/5",        border: "border-white/10" },
    { label: "Submissions",     value: metrics.submittedCount ?? 0,   icon: Upload,      color: "text-sky-400",     bg: "bg-sky-500/10",     border: "border-sky-500/20" },
    { label: "Approved",        value: metrics.approvedCount ?? 0,    icon: Award,       color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  ];

  return (
    <div className="space-y-6">

      {/* 8-metric Health Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metricCards.map(m => (
          <div
            key={m.label}
            className={`bg-[#0A0E17] border ${m.border} rounded-2xl p-4 flex items-center gap-3 hover:bg-[#0D1220] transition-colors`}
          >
            <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center shrink-0`}>
              <m.icon className={`w-4 h-4 ${m.color}`} />
            </div>
            <div>
              <p className="text-xl font-black text-white leading-none">{m.value}</p>
              <p className="text-[9px] text-white/35 uppercase tracking-wider mt-1 leading-tight">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active Sprint Banner */}
      {activeSprint && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 ring-1 ring-emerald-500/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-emerald-400/70 font-bold mb-0.5">Active Sprint</p>
                <p className="font-bold text-white text-sm">{activeSprint.title}</p>
                <p className="text-[10px] text-white/35 mt-0.5">
                  {toISTDisplay(activeSprint.start_date)} → {toISTDisplay(activeSprint.end_date)}
                </p>
              </div>
            </div>
            {daysLeft !== null && (
              <div className="text-right">
                <p className="text-2xl font-black text-emerald-400">{Math.max(0, daysLeft)}</p>
                <p className="text-[9px] text-white/30 uppercase tracking-wider">days left</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Applications */}
        <Card variant="solid" padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Recent Applications</h3>
            <Badge variant="neutral" className="text-[9px]">{recentApplications?.length ?? 0}</Badge>
          </div>
          {(!recentApplications || recentApplications.length === 0) ? (
            <p className="text-sm text-white/25 text-center py-4">No applications yet.</p>
          ) : (
            <div className="space-y-3">
              {recentApplications.map((app: any) => (
                <div key={app.id} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${avatarColor(app.full_name)}`}>
                    {initials(app.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{app.full_name}</p>
                    <p className="text-[10px] text-white/30">{toISTDisplay(app.submitted_at)}</p>
                  </div>
                  <Badge variant={STATUS_COLORS[app.status] ?? "neutral"} className="text-[8px] uppercase tracking-wider shrink-0">
                    {app.status?.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Submissions */}
        <Card variant="solid" padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Recent Submissions</h3>
            <Badge variant="neutral" className="text-[9px]">{recentSubmissions?.length ?? 0}</Badge>
          </div>
          {(!recentSubmissions || recentSubmissions.length === 0) ? (
            <p className="text-sm text-white/25 text-center py-4">No submissions yet.</p>
          ) : (
            <div className="space-y-3">
              {recentSubmissions.map((sub: any) => {
                const user = Array.isArray(sub.new_users) ? sub.new_users[0] : sub.new_users;
                const task = Array.isArray(sub.tasks) ? sub.tasks[0] : sub.tasks;
                return (
                  <div key={sub.id} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${avatarColor(user?.full_name ?? "")}`}>
                      {initials(user?.full_name ?? "")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{user?.full_name ?? "Unknown"}</p>
                      <p className="text-[10px] text-white/30 truncate">{task?.title ?? "Unknown task"}</p>
                    </div>
                    <Badge variant={SUB_STATUS[sub.status] ?? "neutral"} className="text-[8px] uppercase tracking-wider shrink-0">
                      {sub.status?.replace(/_/g, " ")}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Sprint Roadmap */}
      {sprints && sprints.length > 0 ? (
        <Card variant="solid" padding="md">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Sprint Roadmap</h3>
            <Badge variant="neutral" className="text-[9px]">{sprints.length} sprints</Badge>
          </div>
          <div className="flex items-start gap-0 overflow-x-auto pb-2">
            {sprints.map((sprint: any, idx: number) => {
              const isActive = sprint.status === "active";
              const isCompleted = sprint.status === "completed";
              return (
                <div key={sprint.id} className="flex items-start shrink-0">
                  <div className="flex flex-col items-center w-32">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black border-2 transition-colors ${
                      isActive ? "border-emerald-400 bg-emerald-400/15 text-emerald-400" :
                      isCompleted ? "border-white/30 bg-white/10 text-white/60" :
                      "border-white/15 bg-white/5 text-white/30"
                    }`}>
                      {idx + 1}
                    </div>
                    <p className="text-[10px] font-semibold text-white/70 text-center mt-2 line-clamp-2 leading-tight">{sprint.title}</p>
                    <Badge
                      variant={isActive ? "success" : isCompleted ? "neutral" : "info"}
                      className="text-[7px] uppercase tracking-wider mt-1"
                    >
                      {sprint.status ?? "upcoming"}
                    </Badge>
                  </div>
                  {idx < sprints.length - 1 && (
                    <div className={`w-8 h-0.5 mt-4 ${isCompleted ? "bg-white/25" : "bg-white/8"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card variant="solid" padding="md">
          <div className="text-center py-4">
            <Calendar className="w-6 h-6 text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/30">No sprints created yet.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
