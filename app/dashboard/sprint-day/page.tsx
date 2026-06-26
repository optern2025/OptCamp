import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SprintDayPage({
  searchParams,
}: {
  searchParams: Promise<{ cohortId?: string }>;
}) {
  const { cohortId } = await searchParams;

  // 1. Authenticate
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("optcamp_session")?.value;

  if (!sessionToken) {
    redirect("/auth");
  }

  const supabase = getSupabaseAdminClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("user_id")
    .eq("id", sessionToken)
    .single();

  if (!session) {
    redirect("/auth");
  }

  const userId = session.user_id;

  // 2. Validate cohortId
  if (!cohortId) {
    return <StateScreen title="Missing Cohort" message="You are not enrolled in a cohort." />;
  }

  // 3. Fetch Participant Status
  const { data: participant } = await supabase
    .from("cohort_participants")
    .select("status")
    .eq("user_id", userId)
    .eq("cycle_id", cohortId)
    .single();

  if (!participant) {
    // If no participant record, check application status just in case they are screening_passed
    const { data: app } = await supabase
      .from("applications")
      .select("status")
      .eq("user_id", userId)
      .eq("cycle_id", cohortId)
      .single();

    if (app) {
      if (app.status === "screening_passed") {
        return <StateScreen title="Awaiting Admin Review" message="Your screening was successful. Please wait for an administrator to review your application." />;
      }
    }
    return <StateScreen title="Access Denied" message="You are not enrolled in a cohort." />;
  }

  // 4. Validate Status
  if (participant.status === "screening_passed") {
    return <StateScreen title="Awaiting Admin Review" message="Your screening was successful. Please wait for an administrator to review your application." />;
  }
  
  if (participant.status === "selected") {
    return <StateScreen title="Awaiting Enrollment" message="You have been selected! Please wait for final enrollment processing." />;
  }

  if (participant.status !== "enrolled") {
    return <StateScreen title="Access Denied" message={`Your current status is: ${participant.status.replace("_", " ")}`} />;
  }

  // 5. Success -> Load Sprints
  const { data: sprints } = await supabase
    .from("sprints")
    .select("*, tasks(*, task_submissions(*))")
    .eq("cycle_id", cohortId)
    .order("start_date", { ascending: true });

  return (
    <main className="min-h-screen bg-[#071018] px-4 py-10 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-cyan-300/75">
              Cohort Access
            </p>
            <h1 className="mt-2 text-4xl font-black uppercase italic tracking-tight">
              Active Sprints
            </h1>
          </div>
          <Link
            href="/dashboard"
            className="border border-cyan-400 px-5 py-3 text-xs font-black uppercase tracking-[0.24em] text-cyan-300 transition-colors hover:bg-cyan-400 hover:text-black flex items-center gap-2"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
        </div>

        {(!sprints || sprints.length === 0) ? (
          <section className="rounded-[24px] border border-dashed border-white/10 bg-black/30 p-8 text-center">
             <p className="text-sm font-bold uppercase tracking-[0.22em] text-white/55">
                No sprints available yet.
             </p>
          </section>
        ) : (
          <div className="grid gap-6">
            {sprints.map((sprint: any) => (
              <section key={sprint.id} className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-8">
                <h2 className="text-2xl font-black uppercase tracking-tight">
                  {sprint.title}
                </h2>
                <p className="mt-2 text-sm text-white/70">
                  {sprint.description}
                </p>
                
                <div className="mt-6 space-y-4">
                  {sprint.tasks?.map((task: any) => {
                    const submission = task.task_submissions?.find((s: any) => s.user_id === userId);
                    return (
                      <div key={task.id} className="rounded-[20px] border border-white/5 bg-black/20 p-5 flex items-center justify-between">
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
                             Points: {task.points}
                           </p>
                           <h3 className="text-lg font-bold mt-1">{task.title}</h3>
                        </div>
                        <div>
                          {submission ? (
                             <span className="rounded-full border border-emerald-400/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300 bg-emerald-400/10">
                               {submission.status}
                             </span>
                          ) : (
                             <span className="rounded-full border border-amber-400/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300 bg-amber-400/10">
                               Pending Submission
                             </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function StateScreen({ title, message }: { title: string, message: string }) {
  return (
    <main className="min-h-screen bg-[#071018] flex items-center justify-center px-4 py-10 text-white">
      <section className="mx-auto max-w-lg w-full text-center rounded-[24px] border border-amber-400/20 bg-amber-400/5 p-10">
        <h1 className="text-2xl font-black uppercase tracking-tight text-amber-300">
          {title}
        </h1>
        <p className="mt-4 text-sm font-bold uppercase tracking-[0.16em] text-white/65">
          {message}
        </p>
        <div className="mt-8">
           <Link
             href="/dashboard"
             className="inline-flex items-center gap-2 border border-cyan-400 px-5 py-3 text-xs font-black uppercase tracking-[0.24em] text-cyan-300 transition-colors hover:bg-cyan-400 hover:text-black"
           >
             Return to Dashboard
           </Link>
        </div>
      </section>
    </main>
  );
}
