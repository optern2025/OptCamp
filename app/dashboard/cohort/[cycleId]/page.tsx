import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import Link from "next/link";
import {
  ArrowLeft, Trophy, CheckCircle, Clock, Megaphone, Users,
  GitBranch, BookOpen, Star, FileText, ArrowRight, Zap,
  Target, TrendingUp, Award, ExternalLink, Pin, Search,
  Play, Lock, BarChart3, Medal, ChevronRight, Flame
} from "lucide-react";
import { toISTDisplay } from "@/lib/dateTime";
import AutoRefresh from "@/app/components/AutoRefresh";

export const dynamic = "force-dynamic";

type TabKey = "overview" | "tasks" | "leaderboard" | "members" | "updates" | "resources" | "certificates";

function daysRemaining(end: string | null) {
  if (!end) return null;
  const diff = new Date(end).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
}

function getActiveSprint(sprints: any[], submissionMap: Record<string, any>) {
  const now = new Date();
  for (const s of sprints) {
    const start = s.start_date ? new Date(s.start_date) : null;
    const end = s.end_date ? new Date(s.end_date) : null;
    if (start && end && now >= start && now <= end) return s;
    if (s.status === 'active') return s;
  }
  return sprints.find(s => {
    const tasks = s.tasks ?? [];
    return tasks.some((t: any) => !submissionMap[t.id] || submissionMap[t.id]?.status !== 'approved');
  }) || sprints[0] || null;
}

export default async function CohortHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ cycleId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { cycleId } = await params;
  const { tab: rawTab } = await searchParams;
  const activeTab = (rawTab as TabKey) || "overview";

  const reqHeaders = await headers();
  const userId = reqHeaders.get("x-user-id");
  if (!userId) redirect("/auth");

  const supabase = getSupabaseAdminClient();

  const { data: participant } = await supabase
    .from("cohort_participants")
    .select("id, status, completion_percentage, enrolled_at, certificate_issued")
    .eq("user_id", userId)
    .eq("cycle_id", cycleId)
    .limit(1)
    .maybeSingle();

  const { data: application } = await supabase
    .from("applications")
    .select("id, status")
    .eq("user_id", userId)
    .eq("cycle_id", cycleId)
    .limit(1)
    .maybeSingle();

  const hasAccess =
    participant?.status === "enrolled" ||
    participant?.status === "completed" ||
    participant?.status === "selected" ||
    application?.status === "selected" ||
    application?.status === "enrolled";

  if (!hasAccess) {
    return (
      <main className="min-h-screen bg-[#060810] text-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Access Restricted</h2>
          <p className="text-white/40 text-sm mb-6">You don't have access to this cohort yet. Apply or wait for enrollment confirmation.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const { data: cycle } = await supabase
    .from("cycles")
    .select("id, title, cohort_type, cohort_start_at, cohort_end_at, domains(name, slug)")
    .eq("id", cycleId)
    .single();

  const { data: sprints } = await supabase
    .from("sprints")
    .select(`id, title, description, start_date, end_date, status, tasks(id, title, description, task_type, due_date, points, required_proof)`)
    .eq("cycle_id", cycleId)
    .order("start_date", { ascending: true });

  const { data: mySubmissions } = await supabase
    .from("task_submissions")
    .select("id, task_id, status, score, submitted_at, reviewed_at, admin_feedback, github_link, deployment_link, document_url, video_url")
    .eq("user_id", userId);

  const submissionMap: Record<string, any> = {};
  (mySubmissions ?? []).forEach((s: any) => { submissionMap[s.task_id] = s; });

  const { data: allParticipants } = await supabase
    .from("cohort_participants")
    .select("id, user_id, completion_percentage, status, users:new_users(full_name)")
    .eq("cycle_id", cycleId)
    .in("status", ["enrolled", "completed", "selected"]);

  const { data: approvedSubs } = await supabase
    .from("task_submissions")
    .select("user_id, score, tasks!inner(sprints!inner(cycle_id))")
    .eq("status", "approved")
    .eq("tasks.sprints.cycle_id", cycleId);

  const taskPtsMap: Record<string, number> = {};
  (approvedSubs ?? []).forEach((s: any) => {
    taskPtsMap[s.user_id] = (taskPtsMap[s.user_id] ?? 0) + (s.score ?? 0);
  });

  const leaderboard = (allParticipants ?? [])
    .map((p: any) => ({
      user_id: p.user_id,
      full_name: Array.isArray(p.users) ? p.users[0]?.full_name : (p.users as any)?.full_name,
      task_points: taskPtsMap[p.user_id] ?? 0,
      completion_percentage: p.completion_percentage ?? 0,
      status: p.status,
      is_me: p.user_id === userId,
    }))
    .sort((a: any, b: any) => b.task_points - a.task_points)
    .map((p: any, i: number) => ({ ...p, rank: i + 1 }));

  const myRank = leaderboard.find((p: any) => p.is_me)?.rank ?? "–";
  const participantCount = allParticipants?.length ?? 0;
  const myPoints = taskPtsMap[userId] ?? 0;

  let announcements: any[] | null = null;
  if (activeTab === "overview" || activeTab === "updates") {
    const { data } = await supabase
      .from("platform_announcements")
      .select("id, title, body, pinned, created_at")
      .or(`cycle_id.eq.${cycleId},type.eq.platform`)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);
    announcements = data;
  }

  let resources: any[] | null = null;
  if (activeTab === "resources") {
    const { data } = await supabase
      .from("resources")
      .select("id, title, description, url, resource_type, created_at")
      .or(`cycle_id.eq.${cycleId},cycle_id.is.null`)
      .order("created_at", { ascending: false });
    resources = data;
  }

  // Certificate check
  const { data: myCertificate } = await supabase
    .from("certificates")
    .select("id, issue_date, certificate_number")
    .eq("user_id", userId)
    .eq("cycle_id", cycleId)
    .maybeSingle();

  const allTasks = (sprints ?? []).flatMap((s: any) => s.tasks ?? []);
  const totalTasks = allTasks.length;
  const approvedCount = Object.values(submissionMap).filter((s: any) => s.status === "approved").length;
  const pendingCount = Object.values(submissionMap).filter((s: any) => s.status === "pending").length;
  const needsRevisionCount = Object.values(submissionMap).filter((s: any) => s.status === "needs_revision" || s.status === "rejected").length;

  const now = new Date();
  let nextDue: any = null;
  for (const sprint of (sprints ?? [])) {
    for (const task of (sprint.tasks ?? [])) {
      const sub = submissionMap[task.id];
      if (task.due_date && new Date(task.due_date) > now && !sub) {
        if (!nextDue || new Date(task.due_date) < new Date(nextDue.due_date)) {
          nextDue = { ...task, sprint_title: sprint.title };
        }
      }
    }
  }

  const domainName = Array.isArray(cycle?.domains) ? (cycle?.domains as any)[0]?.name : (cycle?.domains as any)?.name;
  const completionPct = participant?.completion_percentage ?? 0;
  const daysLeft = daysRemaining(cycle?.cohort_end_at ?? null);
  const activeSprint = getActiveSprint(sprints ?? [], submissionMap);

  const TABS = [
    { key: "overview", label: "Overview", icon: BookOpen },
    { key: "tasks", label: "Tasks", icon: GitBranch },
    { key: "leaderboard", label: "Leaderboard", icon: Trophy },
    { key: "members", label: "Members", icon: Users },
    { key: "updates", label: "Updates", icon: Megaphone },
    { key: "resources", label: "Resources", icon: FileText },
    { key: "certificates", label: "Certificates", icon: Award },
  ] as const;

  const getSprintStatus = (sprint: any) => {
    const start = sprint.start_date ? new Date(sprint.start_date) : null;
    const end = sprint.end_date ? new Date(sprint.end_date) : null;
    if (sprint.status === 'completed') return 'completed';
    if (sprint.status === 'active') return 'active';
    if (end && now > end) return 'completed';
    if (start && now >= start && (!end || now <= end)) return 'active';
    return 'upcoming';
  };

  return (
    <main className="min-h-screen bg-[#060810] text-white pb-24">
      <AutoRefresh intervalMs={30000} />

      {/* ── HERO COMMAND CENTER ── */}
      <div className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute -top-40 right-0 w-[800px] h-[600px] bg-violet-600/8 blur-[160px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-cyan-600/6 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 pt-8 pb-0 relative z-10">
          {/* Breadcrumb */}
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-[11px] font-bold text-white/30 hover:text-white/70 transition-colors mb-8 tracking-wider">
            <ArrowLeft size={12} /> Dashboard
          </Link>

          {/* Cohort Identity */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-300/60 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full">
                  {domainName ?? cycle?.cohort_type ?? 'Cohort'}
                </span>
                {participant?.status === 'completed' && (
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/70 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                    ✓ Completed
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">{cycle?.title ?? 'Cohort Workspace'}</h1>
              {activeSprint && (
                <p className="text-sm text-white/40 mt-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {activeSprint.title} · Active Sprint
                </p>
              )}
            </div>

            {/* Metric Cluster */}
            <div className="flex items-end gap-5">
              {[
                { label: "Progress", value: `${completionPct}%`, color: "text-cyan-400" },
                { label: "Rank", value: `#${myRank}`, color: "text-violet-400" },
                { label: "Points", value: myPoints, color: "text-amber-400" },
                ...(daysLeft !== null ? [{ label: "Days Left", value: daysLeft, color: "text-rose-400" }] : []),
              ].map(m => (
                <div key={m.label} className="text-right">
                  <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-0">
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-violet-500 to-purple-500 rounded-full transition-all duration-1000"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex gap-0.5 overflow-x-auto scrollbar-none mt-6 -mx-6 px-6">
            {TABS.map(({ key, label, icon: Icon }) => (
              <Link
                key={key}
                href={`/dashboard/cohort/${cycleId}?tab=${key}`}
                className={`flex items-center gap-2 px-4 py-3 text-[11px] font-bold whitespace-nowrap transition-all rounded-t-xl ${
                  activeTab === key
                    ? 'bg-white/[0.06] text-white border-b-2 border-cyan-400'
                    : 'text-white/30 hover:text-white/60 hover:bg-white/[0.03]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">

        {/* ═══════════════════════════════════════════════
            OVERVIEW TAB
        ════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* LEFT: Journey Timeline */}
            <div className="lg:col-span-2 space-y-8">

              {/* Status Cards Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Tasks Done", value: approvedCount, total: totalTasks, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                  { label: "Awaiting Review", value: pendingCount, total: null, icon: Clock, color: "text-cyan-400", bg: "bg-cyan-500/10" },
                  { label: "Needs Fix", value: needsRevisionCount, total: null, icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10" },
                  { label: "Rank", value: `#${myRank}`, total: null, icon: Trophy, color: "text-violet-400", bg: "bg-violet-500/10" },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl bg-white/[0.025] border border-white/[0.06] p-4">
                    <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                      <s.icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <p className={`text-2xl font-black ${s.color}`}>
                      {s.value}{s.total !== null ? <span className="text-white/20 text-sm font-bold">/{s.total}</span> : ''}
                    </p>
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Next Due Alert */}
              {nextDue && (
                <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                    <Clock className="w-full h-full text-amber-400" />
                  </div>
                  <div className="relative">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300/60 mb-2">⏰ Next Task Due</p>
                    <h3 className="text-xl font-black text-white mb-1">{nextDue.title}</h3>
                    <p className="text-sm text-amber-300/60 mb-4">{nextDue.sprint_title} · Due {toISTDisplay(nextDue.due_date)}</p>
                    <Link href={`/dashboard/cohort/${cycleId}/task/${nextDue.id}`}>
                      <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm px-4 py-2 rounded-xl transition-all">
                        Start Task <ArrowRight size={14} />
                      </button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Sprint Roadmap */}
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/30 mb-5">Learning Journey</h2>
                <div className="relative">
                  {/* Vertical track line */}
                  <div className="absolute left-5 top-5 bottom-5 w-px bg-white/[0.06]" />
                  <div className="space-y-3">
                    {(sprints ?? []).map((sprint: any, i: number) => {
                      const sprintTasks = sprint.tasks ?? [];
                      const sprintApproved = sprintTasks.filter((t: any) => submissionMap[t.id]?.status === "approved").length;
                      const sprintStatus = getSprintStatus(sprint);
                      const isDone = sprintStatus === 'completed' || (sprintTasks.length > 0 && sprintApproved === sprintTasks.length);
                      const isActive = sprintStatus === 'active' && !isDone;
                      const pct = sprintTasks.length > 0 ? Math.round((sprintApproved / sprintTasks.length) * 100) : 0;

                      return (
                        <div key={sprint.id} className={`relative pl-14 pr-5 py-4 rounded-2xl transition-all ${
                          isDone ? 'bg-emerald-500/5 border border-emerald-500/15'
                          : isActive ? 'bg-cyan-500/5 border border-cyan-500/20'
                          : 'bg-white/[0.02] border border-white/[0.04]'
                        }`}>
                          {/* Node */}
                          <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                            isDone ? 'bg-emerald-500 border-emerald-500'
                            : isActive ? 'bg-transparent border-cyan-400'
                            : 'bg-transparent border-white/15'
                          }`}>
                            {isDone
                              ? <CheckCircle size={11} className="text-white" />
                              : isActive
                                ? <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                : <Lock size={9} className="text-white/20" />
                            }
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className={`font-black text-sm ${
                                isDone ? 'text-emerald-300' : isActive ? 'text-white' : 'text-white/30'
                              }`}>{sprint.title}</p>
                              <p className="text-[10px] text-white/20 mt-0.5">{sprintApproved}/{sprintTasks.length} tasks</p>
                            </div>
                            <div className="flex items-center gap-3">
                              {isActive && (
                                <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                              )}
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                                isDone ? 'bg-emerald-500/20 text-emerald-300'
                                : isActive ? 'bg-cyan-500/20 text-cyan-300'
                                : 'bg-white/5 text-white/20'
                              }`}>
                                {isDone ? '✓ Done' : isActive ? 'Active' : 'Upcoming'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {(sprints ?? []).length === 0 && (
                      <div className="pl-14 py-8 text-white/20 text-sm">No sprints configured yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Intelligence Panel */}
            <div className="space-y-5">
              {/* Latest Announcement */}
              {announcements && announcements.length > 0 && (
                <div className="rounded-2xl bg-white/[0.025] border border-white/[0.06] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Megaphone className="w-3.5 h-3.5 text-violet-400" />
                    <p className="text-[11px] font-black uppercase tracking-widest text-white/40">Latest Update</p>
                  </div>
                  {announcements[0].pinned && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 mb-2">
                      <Pin size={9} /> Pinned
                    </div>
                  )}
                  <h3 className="font-black text-white text-sm mb-2">{announcements[0].title}</h3>
                  <p className="text-xs text-white/40 line-clamp-3 leading-relaxed">{announcements[0].body}</p>
                  <Link href={`/dashboard/cohort/${cycleId}?tab=updates`}>
                    <button className="mt-3 text-[11px] font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1">
                      All Updates <ChevronRight size={11} />
                    </button>
                  </Link>
                </div>
              )}

              {/* Mini Leaderboard */}
              <div className="rounded-2xl bg-white/[0.025] border border-white/[0.06] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <p className="text-[11px] font-black uppercase tracking-widest text-white/40">Top Performers</p>
                </div>
                {leaderboard.length === 0 ? (
                  <p className="text-xs text-white/20">No rankings yet.</p>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.slice(0, 5).map((p: any) => (
                      <div key={p.user_id} className={`flex items-center gap-2 p-2 rounded-xl ${
                        p.is_me ? 'bg-cyan-500/10 border border-cyan-500/20' : 'hover:bg-white/[0.03]'
                      }`}>
                        <span className={`text-[11px] font-black w-5 ${
                          p.rank === 1 ? 'text-amber-400' : p.rank === 2 ? 'text-zinc-300' : p.rank === 3 ? 'text-amber-700' : 'text-white/20'
                        }`}>#{p.rank}</span>
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black text-white/60 shrink-0">
                          {(p.full_name ?? 'U').charAt(0)}
                        </div>
                        <span className={`flex-1 text-xs font-bold truncate ${p.is_me ? 'text-cyan-300' : 'text-white/70'}`}>
                          {p.is_me ? 'You' : p.full_name}
                        </span>
                        <span className="text-xs font-black text-white/50">{p.task_points}</span>
                      </div>
                    ))}
                  </div>
                )}
                <Link href={`/dashboard/cohort/${cycleId}?tab=leaderboard`}>
                  <button className="mt-3 w-full text-[11px] font-bold text-white/30 hover:text-white/60 flex items-center justify-center gap-1 transition-all">
                    Full Leaderboard <ChevronRight size={11} />
                  </button>
                </Link>
              </div>

              {/* My Position */}
              <div className="rounded-2xl bg-gradient-to-br from-violet-900/20 to-cyan-900/10 border border-violet-500/20 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-300/50 mb-3">My Position</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Rank', value: `#${myRank}`, color: 'text-violet-300' },
                    { label: 'Points', value: myPoints, color: 'text-amber-300' },
                    { label: 'Tasks Done', value: approvedCount, color: 'text-emerald-300' },
                    { label: 'Progress', value: `${completionPct}%`, color: 'text-cyan-300' },
                  ].map(m => (
                    <div key={m.label}>
                      <p className={`text-xl font-black ${m.color}`}>{m.value}</p>
                      <p className="text-[10px] text-white/25 font-bold uppercase tracking-wider">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            TASKS TAB — Sprint Grouped Workspace
        ════════════════════════════════════════════════ */}
        {activeTab === "tasks" && (
          <div className="space-y-6">
            {/* Summary Bar */}
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'To Do', count: allTasks.length - Object.keys(submissionMap).length, color: 'border-white/10 text-white/40' },
                { label: 'In Review', count: pendingCount, color: 'border-cyan-500/30 text-cyan-300' },
                { label: 'Needs Fix', count: needsRevisionCount, color: 'border-amber-500/30 text-amber-300' },
                { label: 'Approved', count: approvedCount, color: 'border-emerald-500/30 text-emerald-300' },
              ].map(s => (
                <div key={s.label} className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] border ${s.color}`}>
                  <span className="text-lg font-black">{s.count}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">{s.label}</span>
                </div>
              ))}
            </div>

            {(!sprints || sprints.length === 0) ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-16 text-center">
                <GitBranch className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <h3 className="text-lg font-black text-white/30 mb-1">You're all caught up</h3>
                <p className="text-sm text-white/15">New tasks will appear when the next sprint begins.</p>
              </div>
            ) : (
              sprints.map((sprint: any, sprintIdx: number) => {
                const sprintTasks = sprint.tasks ?? [];
                const sprintStatus = getSprintStatus(sprint);
                const sprintApproved = sprintTasks.filter((t: any) => submissionMap[t.id]?.status === "approved").length;

                return (
                  <div key={sprint.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden">
                    {/* Sprint Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/[0.05] bg-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                          sprintStatus === 'completed' ? 'bg-emerald-500 text-white'
                          : sprintStatus === 'active' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                          : 'border border-white/10 text-white/20'
                        }`}>
                          {sprintStatus === 'completed' ? '✓' : sprintIdx + 1}
                        </div>
                        <div>
                          <h3 className="font-black text-white text-sm">{sprint.title}</h3>
                          <p className="text-[10px] text-white/25">{sprintApproved}/{sprintTasks.length} completed</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {sprint.start_date && sprint.end_date && (
                          <span className="text-[10px] text-white/20 font-mono">
                            {toISTDisplay(sprint.start_date)} — {toISTDisplay(sprint.end_date)}
                          </span>
                        )}
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                          sprintStatus === 'completed' ? 'bg-emerald-500/15 text-emerald-300'
                          : sprintStatus === 'active' ? 'bg-cyan-500/15 text-cyan-300'
                          : 'bg-white/5 text-white/20'
                        }`}>{sprintStatus}</span>
                      </div>
                    </div>

                    {sprintTasks.length === 0 ? (
                      <div className="px-6 py-10 text-center">
                        <p className="text-sm text-white/15">No tasks in this sprint yet.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/[0.04]">
                        {sprintTasks.map((task: any) => {
                          const sub = submissionMap[task.id];
                          const st = sub?.status ?? 'not_submitted';
                          const cfg: Record<string, { label: string; color: string; dot: string }> = {
                            not_submitted: { label: 'To Do', color: 'text-white/30 bg-white/5 border-white/10', dot: 'bg-white/20' },
                            pending:       { label: 'In Review', color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20', dot: 'bg-cyan-400' },
                            approved:      { label: 'Approved', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
                            needs_revision:{ label: 'Needs Fix', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
                            rejected:      { label: 'Rejected', color: 'text-red-300 bg-red-500/10 border-red-500/20', dot: 'bg-red-400' },
                          };
                          const c = cfg[st] ?? cfg.not_submitted;
                          const isOverdue = task.due_date && new Date(task.due_date) < now && st === 'not_submitted';

                          return (
                            <div key={task.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors group">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${c.dot}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-bold text-white text-sm">{task.title}</p>
                                    {task.points > 0 && (
                                      <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">{task.points} pts</span>
                                    )}
                                    {isOverdue && (
                                      <span className="text-[10px] font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">Overdue</span>
                                    )}
                                  </div>
                                  {task.description && <p className="text-xs text-white/25 line-clamp-1 mt-0.5">{task.description}</p>}
                                  <div className="flex items-center gap-3 mt-1">
                                    {task.due_date && (
                                      <span className="text-[10px] text-white/20 flex items-center gap-1">
                                        <Clock size={9} /> {toISTDisplay(task.due_date)}
                                      </span>
                                    )}
                                    {sub?.score != null && st === 'approved' && (
                                      <span className="text-[10px] text-emerald-400 font-black">
                                        +{sub.score} pts earned
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${c.color}`}>
                                  {c.label}
                                </span>
                                <Link href={`/dashboard/cohort/${cycleId}/task/${task.id}`}>
                                  <button className="text-[11px] font-bold text-white/30 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl transition-all">
                                    {st === 'approved' ? 'View' : st === 'needs_revision' || st === 'rejected' ? 'Fix & Resubmit' : 'View Task'}
                                  </button>
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            LEADERBOARD
        ════════════════════════════════════════════════ */}
        {activeTab === "leaderboard" && (
          <div className="max-w-3xl space-y-5">
            {/* My Position Banner */}
            {leaderboard.find((p: any) => p.is_me) && (
              <div className="rounded-2xl bg-gradient-to-r from-violet-900/30 to-cyan-900/20 border border-violet-500/20 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-violet-300/50 mb-1">Your Standing</p>
                    <p className="text-3xl font-black text-white">#{myRank}</p>
                    <p className="text-sm text-white/40">of {participantCount} participants</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-300/50 mb-1">Points</p>
                    <p className="text-3xl font-black text-amber-400">{myPoints}</p>
                  </div>
                </div>
              </div>
            )}

            {leaderboard.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.06] p-16 text-center">
                <Trophy className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/30 font-semibold">Rankings appear after task approvals</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden">
                {/* Top 3 Podium */}
                {leaderboard.length >= 3 && (
                  <div className="flex items-end justify-center gap-4 p-8 bg-gradient-to-b from-white/[0.02] to-transparent border-b border-white/[0.05]">
                    {[leaderboard[1], leaderboard[0], leaderboard[2]].map((p: any, i: number) => {
                      const heights = ['h-20', 'h-28', 'h-16'];
                      const medals = ['🥈', '🥇', '🥉'];
                      const colors = ['bg-zinc-500/20', 'bg-amber-500/20', 'bg-amber-700/20'];
                      return (
                        <div key={p.user_id} className="flex flex-col items-center gap-2">
                          <div className={`w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-black text-white ${
                            p.is_me ? 'ring-2 ring-cyan-400' : ''
                          }`}>
                            {(p.full_name ?? 'U').charAt(0)}
                          </div>
                          <span className="text-xs font-bold text-white/60 text-center truncate max-w-[80px]">
                            {p.is_me ? 'You' : p.full_name}
                          </span>
                          <span className="text-[11px] font-black text-amber-400">{p.task_points} pts</span>
                          <div className={`w-16 ${heights[i]} ${colors[i]} rounded-t-xl flex items-center justify-center text-xl`}>
                            {medals[i]}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Full List */}
                <div className="divide-y divide-white/[0.04]">
                  {leaderboard.map((p: any) => (
                    <div key={p.user_id} className={`flex items-center gap-4 px-6 py-3.5 ${
                      p.is_me ? 'bg-cyan-500/5 border-l-2 border-cyan-400' : 'hover:bg-white/[0.02]'
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                        p.rank === 1 ? 'bg-amber-500/30 text-amber-300'
                        : p.rank === 2 ? 'bg-zinc-500/30 text-zinc-300'
                        : p.rank === 3 ? 'bg-amber-800/30 text-amber-600'
                        : 'bg-white/5 text-white/30'
                      }`}>{p.rank}</div>
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-black text-white/60 shrink-0">
                        {(p.full_name ?? 'U').charAt(0)}
                      </div>
                      <span className={`flex-1 font-bold text-sm ${p.is_me ? 'text-cyan-300' : 'text-white/80'}`}>
                        {p.is_me ? `${p.full_name} (You)` : p.full_name}
                      </span>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="text-sm font-black text-white">{p.task_points}</p>
                          <p className="text-[10px] text-white/25">points</p>
                        </div>
                        <div className="w-16">
                          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full" style={{ width: `${p.completion_percentage}%` }} />
                          </div>
                          <p className="text-[10px] text-white/25 mt-0.5 text-right">{p.completion_percentage}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            MEMBERS
        ════════════════════════════════════════════════ */}
        {activeTab === "members" && (
          <div>
            <div className="mb-5">
              <h2 className="text-lg font-black text-white">Cohort Directory</h2>
              <p className="text-white/30 text-xs mt-0.5">{participantCount} participants</p>
            </div>
            {(!allParticipants || allParticipants.length === 0) ? (
              <div className="rounded-2xl border border-white/[0.06] p-16 text-center">
                <Users className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/30">No members yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {allParticipants.map((p: any) => {
                  const name = Array.isArray(p.users) ? p.users[0]?.full_name : (p.users as any)?.full_name;
                  const pts = taskPtsMap[p.user_id] ?? 0;
                  const rank = leaderboard.find((l: any) => l.user_id === p.user_id)?.rank;
                  const isMe = p.user_id === userId;
                  return (
                    <div key={p.id} className={`rounded-2xl border p-5 flex flex-col items-center text-center gap-3 ${
                      isMe ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-white/[0.06] bg-white/[0.015] hover:border-white/10'
                    } transition-all`}>
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-black ${
                        isMe ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/10 text-white/50'
                      }`}>
                        {(name ?? '?').charAt(0)}
                      </div>
                      <div>
                        <p className={`font-black text-sm ${isMe ? 'text-cyan-300' : 'text-white'}`}>
                          {name ?? 'Unknown'} {isMe && <span className="text-[10px]">(You)</span>}
                        </p>
                        <p className="text-[10px] text-white/25 mt-0.5 uppercase tracking-wider">{p.status}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 w-full mt-1">
                        <div className="rounded-xl bg-white/5 border border-white/5 p-2">
                          <p className="text-sm font-black text-amber-400">{pts}</p>
                          <p className="text-[9px] text-white/25 uppercase">pts</p>
                        </div>
                        <div className="rounded-xl bg-white/5 border border-white/5 p-2">
                          <p className="text-sm font-black text-violet-400">{rank ? `#${rank}` : '–'}</p>
                          <p className="text-[9px] text-white/25 uppercase">rank</p>
                        </div>
                      </div>
                      <div className="w-full">
                        <div className="flex justify-between text-[10px] text-white/20 mb-1">
                          <span>Progress</span>
                          <span>{p.completion_percentage}%</span>
                        </div>
                        <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full" style={{ width: `${p.completion_percentage}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            UPDATES
        ════════════════════════════════════════════════ */}
        {activeTab === "updates" && (
          <div className="max-w-3xl space-y-4">
            <div className="mb-5">
              <h2 className="text-lg font-black text-white">Cohort Updates</h2>
              <p className="text-white/30 text-xs mt-0.5">Announcements and important notices</p>
            </div>
            {(!announcements || announcements.length === 0) ? (
              <div className="rounded-2xl border border-white/[0.06] p-16 text-center">
                <Megaphone className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/30 font-semibold">No announcements yet</p>
                <p className="text-white/15 text-sm mt-1">Updates will appear here when your mentors post them.</p>
              </div>
            ) : (
              announcements.map((a: any) => (
                <div key={a.id} className={`rounded-2xl border p-6 ${
                  a.pinned ? 'border-amber-500/25 bg-amber-500/5' : 'border-white/[0.06] bg-white/[0.015]'
                }`}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      {a.pinned && <Pin size={12} className="text-amber-400 shrink-0" />}
                      <h3 className="font-black text-white">{a.title}</h3>
                    </div>
                    <span className="text-[10px] text-white/25 font-mono whitespace-nowrap shrink-0">{toISTDisplay(a.created_at)}</span>
                  </div>
                  <div className="text-sm text-white/50 leading-relaxed space-y-2">
                    {a.body.split('\n').filter(Boolean).map((para: string, i: number) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            RESOURCES
        ════════════════════════════════════════════════ */}
        {activeTab === "resources" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-white">Learning Library</h2>
              <p className="text-white/30 text-xs mt-0.5">Curated resources for your cohort</p>
            </div>
            {(!resources || resources.length === 0) ? (
              <div className="rounded-2xl border border-white/[0.06] p-16 text-center">
                <BookOpen className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/30 font-semibold">Library is being curated</p>
                <p className="text-white/15 text-sm mt-1">Resources will appear here once your mentors add them.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {resources.map((r: any) => {
                  const typeColors: Record<string, string> = {
                    video: 'text-red-400 bg-red-500/10 border-red-500/20',
                    article: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
                    doc: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
                    document: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
                    tool: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                    template: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                  };
                  const tc = typeColors[r.resource_type?.toLowerCase()] ?? 'text-white/40 bg-white/5 border-white/10';
                  return (
                    <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer"
                      className="group rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:border-white/10 hover:bg-white/[0.03] p-5 flex flex-col transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${tc}`}>
                          {r.resource_type ?? 'Resource'}
                        </span>
                        <ExternalLink size={13} className="text-white/20 group-hover:text-white/50 transition-colors" />
                      </div>
                      <h3 className="font-black text-white text-sm mb-2 line-clamp-2 flex-1">{r.title}</h3>
                      {r.description && (
                        <p className="text-xs text-white/30 line-clamp-2 leading-relaxed">{r.description}</p>
                      )}
                      <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center gap-1 text-[11px] font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors">
                        Open Resource <ArrowRight size={11} />
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            CERTIFICATES
        ════════════════════════════════════════════════ */}
        {activeTab === "certificates" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-black text-white">Achievement Vault</h2>
              <p className="text-white/30 text-xs mt-0.5">Your earned credentials</p>
            </div>

            {myCertificate ? (
              <div className="rounded-2xl bg-gradient-to-br from-amber-900/20 via-yellow-900/10 to-transparent border border-amber-500/25 p-8">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300/50 mb-2">Certificate of Completion</p>
                    <h3 className="text-2xl font-black text-white">{cycle?.title}</h3>
                    <p className="text-white/30 text-sm mt-1">{domainName ?? cycle?.cohort_type} · OptCamp</p>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Trophy className="w-8 h-8 text-amber-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-1">Credential ID</p>
                    <p className="text-sm font-mono font-bold text-amber-300">{myCertificate.certificate_number}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-1">Issued On</p>
                    <p className="text-sm font-bold text-white">
                      {myCertificate.issue_date ? toISTDisplay(myCertificate.issue_date) : '—'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <Link href={`/certificate/${myCertificate.id}`}>
                    <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-sm px-5 py-2.5 rounded-xl transition-all">
                      <Trophy size={14} /> View Certificate
                    </button>
                  </Link>
                  <Link href={`/certificate/${myCertificate.id}`} target="_blank">
                    <button className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold text-sm px-5 py-2.5 rounded-xl border border-white/10 transition-all">
                      <ExternalLink size={14} /> Verify
                    </button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-12 text-center">
                <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
                  <Lock className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">Certificate Locked</h3>
                <p className="text-white/30 text-sm max-w-sm mx-auto">
                  Your certificate unlocks when you complete all cohort requirements and an admin issues it.
                </p>
                {approvedCount > 0 && (
                  <p className="text-white/20 text-xs mt-4">
                    {approvedCount}/{totalTasks} tasks completed
                  </p>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
