import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Users, CheckCircle, Clock, Zap, BookOpen, Award, Target, ChevronRight } from "lucide-react";
import { Badge } from "@/app/components/ui/design-system";
import { toISTDisplay } from "@/lib/dateTime";
import { getSessionCookie, hashSessionToken } from "@/lib/session";


export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase.from("cycles").select("title").or(`slug.eq.${slug},id.eq.${slug}`).single();
  return {
    title: data ? `${data.title} | OptCamp Cohort` : "Cohort | OptCamp",
    description: `Apply to the ${data?.title} cohort on OptCamp and accelerate your career.`,
  };
}

export default async function CohortPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = getSupabaseAdminClient();

  const { data: cycle } = await supabase
    .from("cycles")
    .select("*, domains(name, slug)")
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .single();

  if (!cycle) notFound();

  const token = await getSessionCookie();
  let userId = null;
  if (token) {
    const hash = hashSessionToken(token);
    const { data: session } = await supabase.from("sessions").select("user_id").eq("session_token_hash", hash).single();
    if (session) userId = session.user_id;
  }

  let hasApplied = false;
  if (userId) {
    const { data: app } = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", userId)
      .eq("cycle_id", cycle.id)
      .single();
    if (app) hasApplied = true;
  }

  const { data: sprints } = await supabase
    .from("sprints")
    .select("id, title, description, start_date, end_date, tasks(id)")
    .eq("cycle_id", cycle.id)
    .order("start_date", { ascending: true });

  const { count: participantCount } = await supabase
    .from("cohort_participants")
    .select("id", { count: "exact" })
    .eq("cycle_id", cycle.id);

  const domainName = Array.isArray(cycle.domains) ? cycle.domains[0]?.name : cycle.domains?.name;
  const totalTasks = (sprints || []).reduce((sum: number, s: any) => sum + (s.tasks?.length || 0), 0);

  const deadline = cycle.application_deadline ? new Date(cycle.application_deadline) : null;
  const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="relative border-b border-surface-800 overflow-hidden bg-surface-900/50">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-primary-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 py-16 relative z-10">
          <Link href="/cohorts" className="inline-flex items-center gap-2 text-sm text-surface-400 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> All Cohorts
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="info">{domainName || cycle.cohort_type}</Badge>
                {daysLeft !== null && daysLeft > 0 && <Badge variant="warning">{daysLeft} days left to apply</Badge>}
                {daysLeft !== null && daysLeft <= 0 && <Badge variant="neutral">Applications Closed</Badge>}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">{cycle.title}</h1>
              <div className="flex flex-wrap gap-6 text-sm text-surface-400">
                {cycle.cohort_start_at && (
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Starts {toISTDisplay(cycle.cohort_start_at)}
                  </span>
                )}
                {participantCount !== null && (
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" /> {participantCount} cohort members enrolled
                  </span>
                )}
                {sprints && (
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4" /> {sprints.length} sprints · {totalTasks} tasks
                  </span>
                )}
              </div>
            </div>

            {/* Apply CTA Card */}
            <div className="lg:w-80 shrink-0">
              <div className="bg-surface-800/80 border border-surface-700 rounded-2xl p-6 backdrop-blur-sm">
                <p className="text-sm text-surface-400 mb-1">Applications {daysLeft && daysLeft > 0 ? "close" : "closed"}</p>
                <p className="text-xl font-bold text-white mb-4">
                  {deadline ? deadline.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Open"}
                </p>
                <div className="space-y-3 mb-6">
                  {[
                    "Free to apply",
                    "Merit-based selection",
                    "Verified certificate",
                    "Expert mentorship",
                  ].map((point) => (
                    <div key={point} className="flex items-center gap-2 text-sm text-surface-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      {point}
                    </div>
                  ))}
                </div>
                {hasApplied ? (
                  <Link
                    href="/dashboard"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-surface-700 hover:bg-surface-600 border border-surface-600 text-white font-semibold text-sm transition-all"
                  >
                    View Application Status <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : daysLeft !== null && daysLeft > 0 ? (
                  <Link
                    href={userId ? `/?apply=1&cohortId=${cycle.id}` : `/auth?redirect=/?apply=1%26cohortId=${cycle.id}`}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-400 text-white font-semibold text-sm transition-all"
                  >
                    Apply Now <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <div className="w-full py-3 rounded-xl bg-surface-700 text-surface-400 text-sm text-center font-medium">
                    Applications Closed
                  </div>
                )}
                {!userId && (
                  <p className="text-xs text-surface-500 text-center mt-3">Already have an account? <Link href="/auth" className="text-primary-400 hover:text-primary-300">Sign in</Link></p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">

            {/* Sprint Structure */}
            {sprints && sprints.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <Zap className="w-6 h-6 text-primary-400" /> Sprint Structure
                </h2>
                <div className="space-y-3">
                  {sprints.map((sprint: any, i: number) => (
                    <div key={sprint.id} className="flex gap-4 p-4 rounded-xl border border-surface-800 bg-surface-900/40 hover:border-surface-700 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-sm font-bold text-primary-400 shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{sprint.title}</h3>
                        {sprint.description && <p className="text-sm text-surface-400 mt-1">{sprint.description}</p>}
                        <div className="flex gap-4 mt-2 text-xs text-surface-500">
                          {sprint.start_date && (
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {toISTDisplay(sprint.start_date)}</span>
                          )}
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {sprint.tasks?.length || 0} tasks</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Eligibility */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Target className="w-6 h-6 text-primary-400" /> Eligibility
              </h2>
              <div className="p-6 rounded-xl border border-surface-800 bg-surface-900/40 space-y-3">
                {[
                  "Any undergraduate or graduate student",
                  "Working professionals seeking upskilling",
                  "Must pass our domain screening assessment",
                  "Time commitment: 8–10 hours per week",
                ].map((e) => (
                  <div key={e} className="flex items-start gap-3 text-sm text-surface-300">
                    <CheckCircle className="w-4 h-4 text-primary-400 mt-0.5 shrink-0" /> {e}
                  </div>
                ))}
              </div>
            </section>

            {/* Timeline */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Calendar className="w-6 h-6 text-primary-400" /> Timeline
              </h2>
              <div className="relative pl-4 border-l border-surface-700 space-y-6">
                {[
                  { label: "Applications Open", date: cycle.created_at, done: true },
                  { label: "Application Deadline", date: cycle.application_deadline, done: daysLeft !== null && daysLeft <= 0 },
                  { label: "Cohort Starts", date: cycle.cohort_start_at, done: false },
                  { label: "Cohort Ends", date: cycle.cohort_end_at, done: false },
                ].filter(t => t.date).map((t, i) => (
                  <div key={i} className="relative flex gap-4 items-start">
                    <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 ${t.done ? "bg-primary-500 border-primary-500" : "bg-background border-surface-600"}`} />
                    <div>
                      <p className="text-sm font-semibold text-white">{t.label}</p>
                      <p className="text-xs text-surface-400">{toISTDisplay(t.date!)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar Summary */}
          <div className="space-y-6">
            <div className="p-5 rounded-xl border border-surface-800 bg-surface-900/40 space-y-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Cohort Overview</h3>
              {[
                { label: "Domain", value: domainName || cycle.cohort_type },
                { label: "Format", value: "Online, Self-paced" },
                { label: "Duration", value: cycle.cohort_start_at && cycle.cohort_end_at ? `${Math.ceil((new Date(cycle.cohort_end_at).getTime() - new Date(cycle.cohort_start_at).getTime()) / (1000 * 60 * 60 * 24 * 7))} weeks` : "TBD" },
                { label: "Sprints", value: `${sprints?.length || 0} sprints` },
                { label: "Total Tasks", value: `${totalTasks} tasks` },
                { label: "Certificate", value: "Yes, on completion" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-surface-400">{label}</span>
                  <span className="text-white font-medium">{value}</span>
                </div>
              ))}
            </div>

            <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-emerald-400">Certificate Included</h3>
              </div>
              <p className="text-xs text-surface-400 leading-relaxed">
                Earn a verifiable OptCamp Certificate of Completion shared on your portfolio and LinkedIn.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
