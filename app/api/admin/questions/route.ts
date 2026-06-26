import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    await requireAdminUser();
    const supabase = getSupabaseAdminClient();

    const { data: sets, error } = await supabase
      .from("screening_question_sets")
      .select("*, domains(name), screening_questions(id, type, content)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ sets: sets ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser();
    const supabase = getSupabaseAdminClient();
    const body = await req.json();
    const { set_id, type, content, options, correct_answer, explanation } = body;

    if (!set_id || !type || !content) {
      return NextResponse.json({ error: "set_id, type, and content are required." }, { status: 400 });
    }

    if (!["MCQ", "practical"].includes(type)) {
      return NextResponse.json({ error: "Invalid question type. Must be MCQ or practical." }, { status: 400 });
    }

    // Normalize & validate options
    let normalizedOptions: string[] | null = null;
    if (type === "MCQ") {
      if (!options) {
        return NextResponse.json({ error: "MCQ questions require options." }, { status: 400 });
      }
      // Accept array or parse JSON/comma string
      let parsedOpts: string[] = [];
      if (Array.isArray(options)) {
        parsedOpts = options.map(String).filter(Boolean);
      } else if (typeof options === "string") {
        try {
          const p = JSON.parse(options);
          parsedOpts = Array.isArray(p) ? p.map(String).filter(Boolean) : options.split(",").map((s: string) => s.trim()).filter(Boolean);
        } catch {
          parsedOpts = options.split(",").map((s: string) => s.trim()).filter(Boolean);
        }
      }
      if (parsedOpts.length < 2) {
        return NextResponse.json({ error: "MCQ questions must have at least 2 options." }, { status: 400 });
      }
      if (!correct_answer) {
        return NextResponse.json({ error: "MCQ questions require a correct_answer." }, { status: 400 });
      }
      if (!parsedOpts.includes(correct_answer)) {
        return NextResponse.json({ error: "correct_answer must match one of the provided options exactly." }, { status: 400 });
      }
      normalizedOptions = parsedOpts;
    }

    const { data: question, error } = await supabase
      .from("screening_questions")
      .insert({ set_id, type, content, options: normalizedOptions, correct_answer, explanation })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ question }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}
