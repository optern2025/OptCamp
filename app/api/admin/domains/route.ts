import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    await requireAdminUser();
    const supabase = getSupabaseAdminClient();

    const [
      { data: domains },
      { data: cycles },
      { data: attempts }
    ] = await Promise.all([
      supabase.from("domains").select("id, name, description").order("name", { ascending: true }),
      supabase.from("cycles").select("id, domain_id, status, applications(id), cohort_participants(id, status)"),
      supabase.from("screening_attempts").select("id, domain_id")
    ]);

    if (!domains) throw new Error("Failed to fetch domains");

    const stats = {
      totalTracks: domains.length,
      activeTracks: 0,
      cohortsUsingTracks: 0,
      totalMembers: 0
    };

    const enrichedDomains = domains.map(d => {
      const trackCycles = (cycles || []).filter(c => c.domain_id === d.id);
      const cohortCount = trackCycles.length;
      
      let memberCount = 0;
      let appCount = 0;

      trackCycles.forEach(c => {
        appCount += c.applications?.length || 0;
        const activeMems = c.cohort_participants?.filter((p: any) => ["enrolled", "active", "completed"].includes(p.status)) || [];
        memberCount += activeMems.length;
      });

      const attemptCount = (attempts || []).filter(a => a.domain_id === d.id).length;

      if (cohortCount > 0) stats.activeTracks++;
      stats.cohortsUsingTracks += cohortCount;
      stats.totalMembers += memberCount;

      return {
        ...d,
        cohortCount,
        memberCount,
        applicationCount: appCount,
        attemptCount,
        isActive: cohortCount > 0
      };
    });

    return NextResponse.json({ domains: enrichedDomains, stats });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === "Unauthorized." ? 401 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser();
    const supabase = getSupabaseAdminClient();
    const { name, description } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const { data: domain, error } = await supabase
      .from("domains")
      .insert({ name: name.trim(), description: description || null })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ domain }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === "Unauthorized." ? 401 : 500 }
    );
  }
}
