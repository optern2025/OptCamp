import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import CohortAdminShell from "./CohortAdminShell";

export const dynamic = "force-dynamic";

export default async function CohortAdminPage({
  params,
}: {
  params: Promise<{ cycleId: string }>;
}) {
  const { cycleId } = await params;
  const reqHeaders = await headers();
  const role = reqHeaders.get("x-user-role");
  const userId = reqHeaders.get("x-user-id");

  if (!userId || role !== "admin") {
    redirect("/dashboard");
  }

  const supabase = getSupabaseAdminClient();
  const { data: cycle } = await supabase
    .from("cycles")
    .select("*, domains(name)")
    .eq("id", cycleId)
    .single();

  if (!cycle) {
    notFound();
  }

  return <CohortAdminShell cycle={cycle} />;
}
