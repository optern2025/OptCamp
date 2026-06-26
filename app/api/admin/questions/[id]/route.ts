import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const supabase = getSupabaseAdminClient();
    const body = await req.json();
    const { content, options, correct_answer, type, explanation } = body;

    const updates: Record<string, any> = {};
    if (content !== undefined) updates.content = content;
    if (correct_answer !== undefined) updates.correct_answer = correct_answer;
    if (type !== undefined) updates.type = type;
    if (explanation !== undefined) updates.explanation = explanation;

    // Normalize options to string[] before storing
    if (options !== undefined) {
      let parsedOpts: string[] | null = null;
      if (Array.isArray(options)) {
        parsedOpts = options.map(String).filter(Boolean);
      } else if (typeof options === "string" && options.trim()) {
        try {
          const p = JSON.parse(options);
          parsedOpts = Array.isArray(p) ? p.map(String).filter(Boolean) : options.split(",").map((s: string) => s.trim()).filter(Boolean);
        } catch {
          parsedOpts = options.split(",").map((s: string) => s.trim()).filter(Boolean);
        }
      } else if (options === null) {
        parsedOpts = null;
      }
      updates.options = parsedOpts;
    }

    const { data: question, error } = await supabase
      .from("screening_questions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ question });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const supabase = getSupabaseAdminClient();

    const { error } = await supabase.from("screening_questions").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}
