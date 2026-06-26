import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const supabase = getSupabaseAdminClient();
    const body = await req.json();
    const { is_active, difficulty_level, version } = body;

    if (is_active === true) {
      // Validate that it has at least 7 questions before activating
      const { data: qCountData, error: qCountError } = await supabase
        .from("screening_questions")
        .select("id", { count: 'exact' })
        .eq("set_id", id);
        
      if (qCountError) throw qCountError;
      
      const count = qCountData ? qCountData.length : 0;
      if (count < 7) {
        return NextResponse.json({ error: `Cannot activate. Question set must have at least 7 questions (currently has ${count}).` }, { status: 400 });
      }
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (is_active !== undefined) updates.is_active = is_active;
    if (difficulty_level !== undefined) updates.difficulty_level = difficulty_level;
    if (version !== undefined) updates.version = version;

    const { data: set, error } = await supabase
      .from("screening_question_sets")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ set });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const supabase = getSupabaseAdminClient();

    const { error } = await supabase.from("screening_question_sets").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}
