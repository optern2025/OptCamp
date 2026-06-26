import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    await requireAdminUser();
    const supabase = getSupabaseAdminClient();

    const { data: cycles, error } = await supabase
      .from("cycles")
      .select("*, domains(name), applications(id), cohort_participants(id, status)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const stats = {
      active: 0,
      upcoming: 0,
      closed: 0,
      totalSeats: 0,
      filledSeats: 0,
    };

    const enrichedCycles = (cycles ?? []).map((c: any) => {
      if (c.status === "active") stats.active++;
      if (c.status === "upcoming") stats.upcoming++;
      if (c.status === "closed") stats.closed++;
      
      const seats = c.seats || 0;
      stats.totalSeats += seats;

      const members = c.cohort_participants?.filter((p: any) => ["enrolled", "active", "completed"].includes(p.status)) || [];
      const memberCount = members.length;
      stats.filledSeats += memberCount;

      return {
        ...c,
        memberCount,
        applicationCount: c.applications?.length || 0,
      };
    });

    return NextResponse.json({ cycles: enrichedCycles, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminUser();
    const supabase = getSupabaseAdminClient();
    const body = await req.json();

    const {
      title, slug, domain_id, cohort_type, status, seats, description,
      requirements, outcomes, application_start_at, application_end_at,
      screening_start_at, screening_end_at, cohort_start_at, cohort_end_at,
    } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: "Title and slug are required." }, { status: 400 });
    }

    if (!domain_id) {
      return NextResponse.json({ error: "Please select a domain." }, { status: 400 });
    }

    const { data: cycle, error } = await supabase
      .from("cycles")
      .insert({
        title, slug, domain_id, cohort_type,
        status: status || "draft",
        seats, description, requirements, outcomes,
        application_start_at, application_end_at,
        screening_start_at, screening_end_at,
        cohort_start_at, cohort_end_at,
        created_by: admin.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ cycle }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}
