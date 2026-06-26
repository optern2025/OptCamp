import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    await requireAdminUser();
    const supabase = getSupabaseAdminClient();

    const [
      { data: sets },
      { count: generatedScreenings },
      { data: attempts }
    ] = await Promise.all([
      supabase.from("screening_question_sets")
        .select("*, domains(name), screening_questions(id, type, content, options, correct_answer, explanation)")
        .order("created_at", { ascending: false }),
      supabase.from("ai_screening_packets").select("*", { count: "exact", head: true }).eq("generation_status", "generated"),
      supabase.from("screening_attempts").select("id, status, passed")
    ]);

    const stats = {
      activeSets: 0,
      totalQuestions: 0,
      generatedScreenings: generatedScreenings || 0,
      screeningAttempts: attempts?.length || 0,
      passRate: 0,
      pendingReviews: 0,
    };

    let passedAttempts = 0;
    (attempts || []).forEach(a => {
      if (a.status === "submitted" || a.status === "pending_review") stats.pendingReviews++;
      if (a.passed) passedAttempts++;
    });

    if (stats.screeningAttempts > 0) {
      stats.passRate = Math.round((passedAttempts / stats.screeningAttempts) * 100);
    }

    (sets || []).forEach(s => {
      if (s.is_active) stats.activeSets++;
      stats.totalQuestions += s.screening_questions?.length || 0;
    });

    return NextResponse.json({ sets: sets ?? [], stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser();
    const supabase = getSupabaseAdminClient();
    const body = await req.json();
    const { domain_id, difficulty_level, version } = body;

    if (!domain_id) {
      return NextResponse.json({ error: "domain_id is required." }, { status: 400 });
    }

    const { data: set, error } = await supabase
      .from("screening_question_sets")
      .insert({ domain_id, difficulty_level: difficulty_level || 1, version: version || 1, is_active: false })
      .select("*, domains(name)")
      .single();

    if (error) throw error;
    return NextResponse.json({ set }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}
