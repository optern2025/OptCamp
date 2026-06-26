import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { notFound } from "next/navigation";
import PrintButton from "./PrintButton";
import { toISTDisplay } from "@/lib/dateTime";


export const dynamic = "force-dynamic";

export default async function CertificateViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdminClient();

  const { data: cert } = await supabase
    .from("certificates")
    .select("*, new_users(full_name), cycles(title, cohort_type, domains(name))")
    .eq("id", id)
    .single();

  if (!cert) notFound();

  const studentName = Array.isArray(cert.new_users) ? cert.new_users[0]?.full_name : cert.new_users?.full_name;
  const domainName = Array.isArray(cert.cycles?.domains) ? cert.cycles?.domains[0]?.name : cert.cycles?.domains?.name;

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-4xl mb-6 flex justify-between items-center">
        <a href="/dashboard/certificates" className="text-white/50 hover:text-white transition-colors text-sm font-medium">
          ← Back to Dashboard
        </a>
        <PrintButton />
      </div>

      <div id="certificate-container" className="w-full max-w-4xl aspect-[1.414/1] bg-white text-black p-[4%] relative overflow-hidden shadow-2xl flex flex-col justify-between items-center text-center">
        {/* Certificate Border */}
        <div className="absolute inset-4 border-[12px] border-[#0a192f] opacity-10 pointer-events-none" />
        <div className="absolute inset-6 border-[2px] border-[#0a192f] opacity-20 pointer-events-none" />
        
        {/* Ornaments */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="mt-8 z-10">
          <h1 className="text-5xl font-black tracking-[0.2em] uppercase text-[#0a192f] mb-2 font-serif">Certificate of Completion</h1>
          <div className="h-1 w-24 bg-cyan-500 mx-auto mb-6" />
          <p className="text-lg text-gray-500 font-medium tracking-widest uppercase">This is to certify that</p>
        </div>

        <div className="z-10">
          <h2 className="text-6xl font-bold text-[#0a192f] mb-6 font-serif italic">{studentName}</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Has successfully completed the rigorous requirements of the OptCamp cohort program, demonstrating exceptional proficiency and dedication.
          </p>
        </div>

        <div className="z-10">
          <p className="text-2xl font-bold text-[#0a192f] uppercase tracking-wider mb-1">{cert.cycles?.title}</p>
          <p className="text-sm font-bold text-cyan-600 uppercase tracking-widest">{domainName || cert.cycles?.cohort_type}</p>
        </div>

        <div className="w-full flex justify-between items-end px-12 z-10 mb-8">
          <div className="text-left">
            <div className="border-b border-gray-400 w-48 mb-2" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Date of Issue</p>
            <p className="text-sm font-bold text-[#0a192f]">{toISTDisplay(cert.issue_date)}</p>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full border-4 border-cyan-500 flex items-center justify-center bg-[#0a192f] mb-4 shadow-lg shadow-cyan-500/20">
              <span className="text-2xl font-black text-white italic">OC</span>
            </div>
          </div>

          <div className="text-right">
            <div className="border-b border-gray-400 w-48 mb-2 ml-auto" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Certificate Number</p>
            <p className="text-xs font-mono text-[#0a192f]">{cert.certificate_number}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
