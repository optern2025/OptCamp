import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, ShieldCheck, Bell, Trophy, Target, CheckCircle2,
  Zap, BookOpen, Users, Award, Clock, ChevronRight, Calendar,
  TrendingUp, Star, LayoutDashboard
} from "lucide-react";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { Badge, Button } from "@/app/components/ui/design-system";
import LogoutButton from "@/app/components/LogoutButton";
import { toISTDisplay } from "@/lib/dateTime";

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────
   STATUS HELPERS
────────────────────────────────────────────────────────── */
const STATUS_MAP: Record<string, { label: string; color: string; ring: string }> = {
  pending:          { label: "Applied",              color: "bg-blue-500/20 text-blue-300",    ring: "ring-blue-500/40" },
  under_review:     { label: "Under Review",         color: "bg-amber-500/20 text-amber-300",  ring: "ring-amber-500/40" },
  approved:         { label: "Under Review",         color: "bg-amber-500/20 text-amber-300",  ring: "ring-amber-500/40" },
  screening_required:{ label: "Screening Available", color: "bg-violet-500/20 text-violet-300",ring: "ring-violet-500/40" },
  screening_passed: { label: "Screening Cleared",    color: "bg-emerald-500/20 text-emerald-300", ring: "ring-emerald-500/40" },
  screening_failed: { label: "Screening Not Cleared",color: "bg-red-500/20 text-red-300",     ring: "ring-red-500/40" },
  selected:         { label: "Selected",             color: "bg-cyan-500/20 text-cyan-300",   ring: "ring-cyan-500/40" },
  enrolled:         { label: "Enrolled",             color: "bg-green-500/20 text-green-300", ring: "ring-green-500/40" },
  completed:        { label: "Completed",            color: "bg-teal-500/20 text-teal-300",   ring: "ring-teal-500/40" },
  rejected:         { label: "Not Selected",         color: "bg-red-500/20 text-red-400",     ring: "ring-red-500/40" },
  waitlisted:       { label: "Waitlisted",           color: "bg-zinc-500/20 text-zinc-400",   ring: "ring-zinc-500/40" },
};

const getStatusMeta = (status: string) =>
  STATUS_MAP[status] ?? { label: status.replace(/_/g, " "), color: "bg-zinc-500/20 text-zinc-300", ring: "ring-zinc-500/40" };

/* Timeline steps */
const PIPELINE = ["applied", "review", "screening", "cleared", "cohort", "completed"] as const;
const STEP_LABELS: Record<string, string> = {
  applied: "Applied", review: "Review", screening: "Screening",
  cleared: "Cleared", cohort: "Cohort", completed: "Done"
};

function getPipelineState(status: string) {
  const order = ["pending", "approved", "screening_required", "screening_passed", "selected", "enrolled", "completed"];
  const stepMap: Record<string, number> = {
    pending: 1, under_review: 1, approved: 1,
    screening_required: 2, screening_passed: 3, screening_failed: 2,
    selected: 4, enrolled: 4, completed: 5, rejected: -1, waitlisted: -1,
  };
  return stepMap[status] ?? 0;
}

/* Time-based greeting */
function getGreeting(name: string) {
  const hour = new Date().getUTCHours() + 5.5; // IST approx
  const h = Math.floor(hour) % 24;
  if (h < 12) return `Good Morning, ${name}`;
  if (h < 17) return `Good Afternoon, ${name}`;
  return `Good Evening, ${name}`;
}

/* Next action logic */
function getNextAction(applications: any[], cohorts: any[], certificates: any[]) {
  // Priority 1: Screening available
  const screeningApp = applications?.find(a => a.status === "screening_required");
  if (screeningApp) return { label: "Take Screening Test", href: `/screening/${screeningApp.id}`, urgent: true, icon: "zap" };

  // Priority 2: Enrolled cohort to enter
  const enrolledCohort = cohorts?.find(c => ["enrolled", "active", "selected"].includes(c.status));
  if (enrolledCohort) return { label: "Continue Cohort", href: `/dashboard/cohort/${enrolledCohort.cycle_id}`, urgent: false, icon: "play" };

  // Priority 3: Apply
  return { label: "Apply to a Cohort", href: "/cohorts", urgent: false, icon: "rocket" };
}

/* ──────────────────────────────────────────────────────────
   PAGE
────────────────────────────────────────────────────────── */
export default async function DashboardPage() {
  const reqHeaders = await headers();
  const userId = reqHeaders.get("x-user-id");
  if (!userId) redirect("/auth");

  const supabase = getSupabaseAdminClient();

  const [
    { data: user },
    { data: applications },
    { data: notifications },
    { data: trackCerts },
    { data: cohorts },
    { data: rawCertificates },
    { data: openCycles },
  ] = await Promise.all([
    supabase.from("new_users").select("id, full_name, email, created_at").eq("id", userId).maybeSingle(),
    supabase.from("applications").select("id, status, submitted_at, cycle_id, cycles(id, title, slug, cohort_type)").eq("user_id", userId).order("submitted_at", { ascending: false }),
    supabase.from("notifications").select("id, title, message, event_type, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
    supabase.from("domain_eligibility").select("id, highest_score, waiver_eligible, last_passed_at, domains(name)").eq("user_id", userId),
    // Include ALL statuses — completed participants still count
    supabase.from("cohort_participants").select("id, status, completion_percentage, enrolled_at, cycle_id, cycles(id, title, slug)").eq("user_id", userId).in("status", ["selected", "enrolled", "active", "completed"]),
    // BUG FIX: column is `issue_date` not `issued_at`. Also fetch certificate_number.
    supabase.from("certificates").select("id, issue_date, certificate_number, cycle_id").eq("user_id", userId),
    supabase.from("cycles").select("id, title, application_start_at, application_end_at").eq("is_active", true).gte("application_end_at", new Date().toISOString()).limit(3),
  ]);

  if (!user) redirect("/auth");

  // Manually resolve cycle titles for certificates (avoids FK join ambiguity)
  let cohortCerts: any[] = [];
  if (rawCertificates && rawCertificates.length > 0) {
    const certCycleIds = [...new Set(rawCertificates.map((c: any) => c.cycle_id).filter(Boolean))];
    const { data: certCycles } = await supabase
      .from("cycles")
      .select("id, title")
      .in("id", certCycleIds);
    const cycleMap = Object.fromEntries((certCycles || []).map((c: any) => [c.id, c.title]));
    cohortCerts = rawCertificates.map((c: any) => ({
      ...c,
      cycleTitle: cycleMap[c.cycle_id] ?? "Cohort",
    }));
  }

  const firstName = user.full_name?.split(" ")[0] ?? "there";

  // BUG FIX: Active Cohorts = all participants (selected/enrolled/active/completed)
  // A user who completed and earned a cert should NOT show as 0
  const allMyCohorts = cohorts || [];
  const activeCohorts = allMyCohorts.filter(c => ["selected", "enrolled", "active"].includes(c.status));
  const completedCohorts = allMyCohorts.filter(c => c.status === "completed");

  // BUG FIX: Track Certifications count = only waiver_eligible=true (actually certified)
  // Failed screenings (last_passed_at=null, waiver_eligible=false) must NOT count
  const passedTracks = trackCerts?.filter(c => c.waiver_eligible === true) || [];

  // BUG FIX: Certificates Earned = actual rows in certificates table
  const certsEarnedCount = cohortCerts.length;

  // BUG FIX: My Cohorts metric = active + completed (not just active)
  const myCohortCount = allMyCohorts.length;

  const hasOpenCycles = (openCycles?.length ?? 0) > 0;
  const nextAction = getNextAction(applications || [], allMyCohorts, cohortCerts);

  // Activity feed — high-level events only, no screening scores
  // Use title-based matching as a fallback if event_type is null
  const SKIP_KEYWORDS = ["score", "grading", "ai", "attempt", "question", "answer"];
  const activityFeed = (notifications || []).filter(n => {
    const lowerTitle = (n.title ?? "").toLowerCase();
    const lowerMsg = (n.message ?? "").toLowerCase();
    // Skip notifications that contain score/grading details
    const hasSkipWord = SKIP_KEYWORDS.some(k => lowerTitle.includes(k) || lowerMsg.includes(k));
    return !hasSkipWord;
  });

  return (
    <main className="min-h-screen bg-[#060810] text-white pb-24">

      {/* ── HERO ───────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/[0.06]">
        {/* Ambient glow */}
        <div className="absolute -top-32 -right-32 w-[700px] h-[500px] rounded-full bg-violet-600/10 blur-[140px] pointer-events-none" />
        <div className="absolute -top-16 -left-16 w-[400px] h-[400px] rounded-full bg-cyan-600/8 blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 pt-12 pb-10 relative z-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/30 font-bold mb-2 flex items-center gap-2">
                <LayoutDashboard size={11} /> Career Control Center
              </p>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-1">
                {getGreeting(firstName)}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">.</span>
              </h1>
              <p className="text-white/40 text-sm mt-2 font-medium">Your complete overview — applications, cohorts, and certifications.</p>
            </div>
            <div className="flex items-center gap-3">
              <LogoutButton />
            </div>
          </div>

          {/* ── HERO STATS ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10">
            {[
              { label: "Total Applications", value: applications?.length ?? 0,  icon: Target, color: "text-cyan-400", bg: "bg-cyan-500/10" },
              { label: "My Cohorts",          value: myCohortCount,              icon: Users,  color: "text-violet-400", bg: "bg-violet-500/10" },
              { label: "Certificates Earned", value: certsEarnedCount,           icon: Trophy, color: "text-amber-400", bg: "bg-amber-500/10" },
              { label: "Track Certifications",value: passedTracks.length,        icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            ].map(s => (
              <div key={s.label} className="relative rounded-2xl bg-white/[0.03] border border-white/[0.07] p-5 hover:border-white/15 transition-all group">
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-white/30 uppercase tracking-widest font-bold mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* ── MAIN COLUMN ─────────────────────────────── */}
          <div className="lg:col-span-2 space-y-8">

            {/* NEXT ACTION CARD */}
            <div className={`relative rounded-2xl border p-6 overflow-hidden ${nextAction.urgent ? "border-violet-500/40 bg-violet-600/10" : "border-cyan-500/30 bg-cyan-600/8"}`}>
              <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] ${nextAction.urgent ? "bg-violet-500/20" : "bg-cyan-500/15"} pointer-events-none`} />
              <div className="relative flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${nextAction.urgent ? "text-violet-300/60" : "text-cyan-300/60"}`}>
                    {nextAction.urgent ? "⚡ Action Required" : "What's Next"}
                  </p>
                  <p className="text-xl font-black text-white">{nextAction.label}</p>
                </div>
                <Link href={nextAction.href}>
                  <button className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${nextAction.urgent ? "bg-violet-500 hover:bg-violet-400 text-white" : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30"}`}>
                    {nextAction.label} <ArrowRight size={15} />
                  </button>
                </Link>
              </div>
            </div>

            {/* ── APPLICATIONS HUB ── */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-black text-white">Applications Hub</h2>
                  <p className="text-white/30 text-xs mt-0.5">Your complete cohort application history</p>
                </div>
                {hasOpenCycles && (
                  <Link href="/cohorts">
                    <button className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/50 rounded-xl px-3 py-1.5 transition-all">
                      + Apply to Cohort
                    </button>
                  </Link>
                )}
              </div>

              {(!applications || applications.length === 0) ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center bg-white/[0.01]">
                  <Target className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-white/40 font-semibold mb-1">No applications yet</p>
                  <p className="text-white/20 text-sm mb-4">Start your journey by applying to an open cohort.</p>
                  {hasOpenCycles ? (
                    <Link href="/cohorts">
                      <button className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm px-5 py-2.5 rounded-xl transition-all">
                        Browse Open Cohorts
                      </button>
                    </Link>
                  ) : (
                    <p className="text-white/20 text-xs">No cohorts are accepting applications right now. Check back soon.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((app: any) => {
                    const meta = getStatusMeta(app.status);
                    const step = getPipelineState(app.status);
                    const isRejected = app.status === "rejected" || app.status === "screening_failed";
                    return (
                      <div key={app.id} className={`relative rounded-2xl bg-white/[0.025] border ${meta.ring} ring-1 ring-inset border-white/[0.06] p-6 hover:bg-white/[0.04] transition-all`}>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4 mb-5">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-1">
                              {(app.cycles as any)?.cohort_type ?? "Cohort"}
                            </p>
                            <h3 className="text-lg font-black text-white">{(app.cycles as any)?.title ?? "Unknown Cohort"}</h3>
                            <p className="text-[11px] text-white/30 mt-1 flex items-center gap-1.5">
                              <Calendar size={10} /> Applied {toISTDisplay(app.submitted_at)}
                            </p>
                          </div>
                          <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${meta.color}`}>
                            {meta.label}
                          </span>
                        </div>

                        {/* Pipeline Tracker */}
                        {!isRejected && (
                          <div className="mb-5">
                            <div className="relative flex items-center justify-between">
                              {/* Track line */}
                              <div className="absolute top-2 left-0 right-0 h-0.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-700"
                                  style={{ width: `${Math.min((step / 5) * 100, 100)}%` }}
                                />
                              </div>
                              {["Applied", "Review", "Screening", "Cleared", "Cohort", "Done"].map((lbl, idx) => {
                                const done = idx < step;
                                const active = idx === step;
                                return (
                                  <div key={lbl} className="flex flex-col items-center gap-2 relative">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${done ? "bg-cyan-500 border-cyan-500" : active ? "bg-transparent border-cyan-400 ring-2 ring-cyan-400/30" : "bg-transparent border-white/15"}`}>
                                      {done && <CheckCircle2 size={9} className="text-white" />}
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase tracking-wider hidden sm:block ${done || active ? "text-white/70" : "text-white/20"}`}>{lbl}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {isRejected && (
                          <p className="text-red-400/60 text-xs mb-4">This application was not selected. You can apply to another cohort.</p>
                        )}

                        {/* CTA */}
                        <div className="flex justify-end gap-2">
                          {app.status === "screening_required" && (
                            <Link href={`/screening/${app.id}`}>
                              <button className="flex items-center gap-2 text-sm font-bold bg-violet-500 hover:bg-violet-400 text-white px-4 py-2 rounded-xl transition-all">
                                <Zap size={14} /> Take Screening Test
                              </button>
                            </Link>
                          )}
                          {(app.status === "selected" || app.status === "enrolled") && (
                            <Link href={`/dashboard/cohort/${app.cycle_id}`}>
                              <button className="flex items-center gap-2 text-sm font-bold bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 rounded-xl transition-all">
                                Enter Cohort Workspace <ArrowRight size={14} />
                              </button>
                            </Link>
                          )}
                          {app.status === "completed" && (
                            <Link href={`/dashboard/cohort/${app.cycle_id}`}>
                              <button className="flex items-center gap-2 text-sm font-bold bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-xl transition-all">
                                View Cohort <ChevronRight size={14} />
                              </button>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── ACTIVE COHORTS ── */}
            {activeCohorts.length > 0 && (
              <section>
                <div className="mb-5">
                  <h2 className="text-lg font-black text-white">My Active Cohorts</h2>
                  <p className="text-white/30 text-xs mt-0.5">Your enrolled learning environments</p>
                </div>
                <div className="space-y-4">
                  {activeCohorts.map((cohort: any) => (
                    <div key={cohort.id} className="rounded-2xl bg-gradient-to-br from-cyan-950/40 to-violet-950/30 border border-cyan-500/20 p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-cyan-300/50 font-bold mb-1">Active Cohort</p>
                          <h3 className="text-lg font-black text-white">{(cohort.cycles as any)?.title ?? "Cohort"}</h3>
                        </div>
                        <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-cyan-500/20 text-cyan-300">
                          {cohort.status}
                        </span>
                      </div>

                      {/* Progress */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-white/40 mb-1.5">
                          <span>Sprint Progress</span>
                          <span>{cohort.completion_percentage ?? 0}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all"
                            style={{ width: `${cohort.completion_percentage ?? 0}%` }}
                          />
                        </div>
                      </div>

                      <Link href={`/dashboard/cohort/${cohort.cycle_id}`}>
                        <button className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm py-3 rounded-xl transition-all">
                          Enter Cohort Workspace <ArrowRight size={15} />
                        </button>
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── APPLY CTA (if no open applications and cohorts exist) ── */}
            {hasOpenCycles && activeCohorts.length === 0 && (applications?.every(a => ["rejected","screening_failed","completed"].includes(a.status)) ?? true) && (
              <section>
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-8 text-center">
                  <Star className="w-10 h-10 text-amber-400/40 mx-auto mb-3" />
                  <h3 className="text-lg font-black text-white mb-1">New Cohorts Are Open</h3>
                  <p className="text-white/30 text-sm mb-5">Applications are currently being accepted. Secure your spot today.</p>
                  <Link href="/cohorts">
                    <button className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm px-6 py-3 rounded-xl transition-all">
                      Apply Now
                    </button>
                  </Link>
                </div>
              </section>
            )}

            {!hasOpenCycles && activeCohorts.length === 0 && (applications?.length ?? 0) === 0 && (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-8 text-center">
                <Clock className="w-8 h-8 text-white/10 mx-auto mb-3" />
                <p className="text-white/40 font-semibold">No Cohorts Open Right Now</p>
                <p className="text-white/20 text-sm mt-1">We'll notify you when the next cohort opens. Stay tuned.</p>
              </div>
            )}
          </div>

          {/* ── SIDEBAR ─────────────────────────────────── */}
          <div className="space-y-6">

            {/* CERTIFICATES */}
            <div className="rounded-2xl bg-white/[0.025] border border-white/[0.06] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-white">Cohort Certificates</h3>
              </div>
              {cohortCerts.length === 0 ? (
                <div className="text-center py-6">
                  <Trophy className="w-8 h-8 text-white/10 mx-auto mb-2" />
                  <p className="text-xs text-white/30">Complete a cohort to earn your certificate.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cohortCerts.map((cert: any) => (
                    <div key={cert.id} className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-sm font-black text-white">{cert.cycleTitle}</p>
                          <p className="text-[10px] text-amber-400/60 font-mono mt-0.5">{cert.certificate_number}</p>
                          <p className="text-[10px] text-white/30 mt-1">
                            Issued {cert.issue_date ? toISTDisplay(cert.issue_date) : toISTDisplay(cert.created_at)}
                          </p>
                        </div>
                        <Trophy className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/certificate/${cert.id}`}>
                          <button className="flex-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg px-3 py-1.5 flex items-center justify-center gap-1.5 transition-all">
                            View Certificate <ExternalLinkIcon />
                          </button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TRACK CERTIFICATIONS */}
            <div className="rounded-2xl bg-white/[0.025] border border-white/[0.06] p-5">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-black text-white">Track Certifications</h3>
              </div>
              <p className="text-[10px] text-white/20 mb-4">Earned by clearing the Screening Test for a learning track.</p>
              {(!trackCerts || trackCerts.length === 0) ? (
                <div className="text-center py-4">
                  <p className="text-xs text-white/30">No track certifications yet.</p>
                  <p className="text-[10px] text-white/20 mt-1">Clear a Screening Test to earn one.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {trackCerts.map((cert: any) => {
                    // FIXED: earned ONLY when waiver_eligible=true
                    // Failed screenings show In Progress even if last_passed_at set but waiver not earned
                    const earned = cert.waiver_eligible === true;
                    return (
                      <div key={cert.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${earned ? "bg-emerald-500/20" : "bg-white/5"}`}>
                            <ShieldCheck className={`w-3.5 h-3.5 ${earned ? "text-emerald-400" : "text-white/20"}`} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{(cert.domains as any)?.name ?? "Track"}</p>
                            {cert.highest_score != null && (
                              <p className="text-[10px] text-white/30">Best: {cert.highest_score}%</p>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${earned ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-white/30"}`}>
                          {earned ? "Verified" : "In Progress"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ACTIVITY FEED */}
            <div className="rounded-2xl bg-white/[0.025] border border-white/[0.06] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-black text-white">Activity Feed</h3>
              </div>
              {activityFeed.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-4">No recent activity.</p>
              ) : (
                <div className="space-y-3">
                  {activityFeed.slice(0, 6).map((note: any) => (
                    <div key={note.id} className="flex gap-3 pb-3 border-b border-white/[0.04] last:border-0 last:pb-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white leading-snug">{note.title}</p>
                        <p className="text-[11px] text-white/30 mt-1 leading-relaxed line-clamp-2">{note.message}</p>
                        <p className="text-[10px] text-white/20 mt-1.5">{toISTDisplay(note.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}

// Tiny inline icon to avoid import clutter
function ExternalLinkIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
