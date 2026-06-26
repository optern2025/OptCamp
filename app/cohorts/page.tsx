import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import Link from "next/link";
import { ArrowRight, Calendar, Users, Zap, Target, LayoutDashboard, Compass } from "lucide-react";
import { Badge } from "@/app/components/ui/design-system";
import { toISTDisplay } from "@/lib/dateTime";
import { getSessionCookie, hashSessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cohorts | OptCamp",
  description: "Browse active OptCamp cohorts and apply to accelerate your career in tech.",
};

export default async function CohortsPage() {
  const supabase = getSupabaseAdminClient();

  const now = new Date().toISOString();
  const { data: rawCycles } = await supabase
    .from("cycles")
    .select("id, title, slug, cohort_type, cohort_start_at, cohort_end_at, application_deadline, application_start_at, application_end_at, seats, domains(name, slug)")
    .eq("status", "active")
    .lte("application_start_at", now)
    .gte("application_end_at", now)
    .order("cohort_start_at", { ascending: true });

  const token = await getSessionCookie();
  let userId = null;
  if (token) {
    const hash = hashSessionToken(token);
    const { data: session } = await supabase.from("sessions").select("user_id").eq("session_token_hash", hash).single();
    if (session) userId = session.user_id;
  }

  let cycles = rawCycles || [];

  if (cycles.length > 0) {
    // 1. Filter out cycles that have reached their seat limit
    const cycleIds = cycles.map(c => c.id);
    const { data: participants } = await supabase
      .from("cohort_participants")
      .select("cycle_id")
      .in("cycle_id", cycleIds)
      .in("status", ["selected", "enrolled", "active", "completed"]);
      
    if (participants) {
      const seatCounts = participants.reduce((acc: Record<string, number>, p) => {
        acc[p.cycle_id] = (acc[p.cycle_id] || 0) + 1;
        return acc;
      }, {});
      
      cycles = cycles.filter(c => !c.seats || (seatCounts[c.id] || 0) < c.seats);
    }

    // 2. Exclude cycles the user has already applied to
    if (userId) {
      const { data: applications } = await supabase
        .from("applications")
        .select("cycle_id")
        .eq("user_id", userId);
        
      if (applications) {
        const appliedCycleIds = new Set(applications.map(a => a.cycle_id));
        cycles = cycles.filter(c => !appliedCycleIds.has(c.id));
      }
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <div className="relative border-b border-surface-800 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-900/30 via-background to-background pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 py-24 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary-500/30 bg-primary-500/10 text-primary-400 text-sm font-medium mb-8">
            <Zap className="w-3.5 h-3.5" /> Active Cohorts Now Open
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight leading-tight">
            Find Your <span className="text-primary-400">Cohort</span>
          </h1>
          <p className="text-xl text-surface-300 max-w-2xl mx-auto leading-relaxed">
            Join a structured learning cohort with real mentors, sprint-based projects, and a network of ambitious peers. Earn a verified certificate upon completion.
          </p>
        </div>
      </div>

      {/* Active Cohorts */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Active Cohorts</h2>
          <span className="text-sm text-surface-400">{cycles?.length || 0} open</span>
        </div>

        {(!cycles || cycles.length === 0) ? (
          userId ? (
            <div className="text-center py-24 border border-surface-800 rounded-3xl bg-surface-900/50 shadow-xl max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary-500/20">
                <Target className="w-8 h-8 text-primary-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">You're All Caught Up</h2>
              <p className="text-surface-400 text-lg mb-8 max-w-md mx-auto">You've already applied to all currently available cohorts.</p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/dashboard" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-400 text-white font-semibold transition-all">
                  <LayoutDashboard className="w-4 h-4" /> View Dashboard
                </Link>
                <Link href="/" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-surface-800 hover:bg-surface-700 text-white font-semibold transition-all border border-surface-700">
                  <Compass className="w-4 h-4" /> Explore Active Cohorts
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-24 border border-dashed border-surface-700 rounded-2xl">
              <p className="text-surface-400 text-lg">No cohorts are currently open for applications.</p>
              <p className="text-surface-500 text-sm mt-2">Check back soon or follow us for updates.</p>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cycles.map((cycle: any) => {
              const domainName = Array.isArray(cycle.domains)
                ? cycle.domains[0]?.name
                : cycle.domains?.name;
              const slug = cycle.slug || cycle.id;
              const deadline = cycle.application_deadline
                ? new Date(cycle.application_deadline)
                : null;
              const daysLeft = deadline
                ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <div
                  key={cycle.id}
                  className="group relative bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden hover:border-primary-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/10 flex flex-col"
                >
                  {/* Top accent */}
                  <div className="h-0.5 w-full bg-gradient-to-r from-primary-500 to-primary-600" />

                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <Badge variant="info" className="text-[10px] uppercase tracking-wider">
                        {domainName || cycle.cohort_type}
                      </Badge>
                      {daysLeft !== null && daysLeft > 0 && daysLeft <= 14 && (
                        <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">
                          {daysLeft}d left
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary-300 transition-colors">
                      {cycle.title}
                    </h3>

                    <div className="space-y-2 mb-6">
                      {cycle.cohort_start_at && (
                        <div className="flex items-center gap-2 text-sm text-surface-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Starts {toISTDisplay(cycle.cohort_start_at)}</span>
                        </div>
                      )}
                      {deadline && (
                        <div className="flex items-center gap-2 text-sm text-surface-400">
                          <Target className="w-3.5 h-3.5" />
                          <span>Apply by {deadline.toLocaleDateString("en-US", { month: "long", day: "numeric" })}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto">
                      <Link
                        href={`/cohorts/${slug}`}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-surface-800 border border-surface-700 text-sm font-medium text-white hover:bg-primary-500 hover:border-primary-500 transition-all duration-200"
                      >
                        View Details <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
