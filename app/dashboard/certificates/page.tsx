import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { PageHeader, Card, Button, EmptyState, Badge } from "@/app/components/ui/design-system";
import { Trophy, Download, Award, Clock } from "lucide-react";
import Link from "next/link";
import { toISTDisplay } from "@/lib/dateTime";


export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  const reqHeaders = await headers();
  const userId = reqHeaders.get("x-user-id");

  if (!userId) redirect("/auth");

  const supabase = getSupabaseAdminClient();

  const { data: certificates } = await supabase
    .from("certificates")
    .select("*, cycles(title, cohort_type, domains(name))")
    .eq("user_id", userId)
    .order("issue_date", { ascending: false });

  return (
    <main className="min-h-screen bg-background text-foreground pb-24">
      <div className="relative border-b border-surface-800 bg-surface-900/50 pt-16 pb-12 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[400px] h-[300px] bg-yellow-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-surface-400 hover:text-white mb-6 transition-colors">
            ← Back to Dashboard
          </Link>
          <PageHeader 
            title="My Certificates" 
            description="View and download your earned OptCamp certifications." 
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        {(!certificates || certificates.length === 0) ? (
          <EmptyState 
            title="No Certificates Yet" 
            description="You haven't earned any certificates yet. Complete a cohort to earn your first certification!" 
            icon={<Trophy className="w-8 h-8" />}
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {certificates.map((cert: any) => {
              const domainName = Array.isArray(cert.cycles?.domains) ? cert.cycles?.domains[0]?.name : cert.cycles?.domains?.name;
              return (
                <Card key={cert.id} variant="solid" padding="md" className="group flex flex-col hover:border-yellow-500/50 transition-colors">
                  <div className="mb-4">
                    <Badge variant="warning" className="mb-3 text-yellow-500 bg-yellow-500/10 border-yellow-500/20 uppercase tracking-widest text-[10px]">
                      {domainName || cert.cycles?.cohort_type}
                    </Badge>
                    <h3 className="text-xl font-bold text-white mb-1">{cert.cycles?.title}</h3>
                    <p className="text-xs text-surface-400 flex items-center gap-1.5 font-medium">
                      <Clock className="w-3 h-3" /> Issued {toISTDisplay(cert.issue_date)}
                    </p>
                  </div>
                  
                  <div className="mt-auto pt-6 border-t border-surface-800">
                    <p className="text-[10px] text-surface-500 font-mono mb-4 uppercase tracking-wider">ID: {cert.certificate_number}</p>
                    <div className="flex gap-3">
                      <Button href={`/certificate/${cert.id}`} variant="primary" className="flex-1 text-xs py-2 bg-yellow-500 hover:bg-yellow-400 text-black">
                        View Certificate
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
