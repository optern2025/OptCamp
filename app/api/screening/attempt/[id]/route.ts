import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const supabase = getSupabaseAdminClient();

    const { data: attempt, error: attemptError } = await supabase
      .from("screening_attempts")
      .select("*, cycles(title, cohort_type)")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (attemptError || !attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

    if (attempt.status !== "in_progress") {
       return NextResponse.json({ attempt, questions: [] }); // return state but no questions if not active
    }

    const now = new Date();
    const expiresAt = new Date(attempt.expires_at);

    if (now > expiresAt) {
       await supabase.from("screening_attempts").update({ status: "expired" }).eq("id", id);
       attempt.status = "expired";
       return NextResponse.json({ attempt, questions: [] });
    }

    // Fetch the 7 questions
    if (attempt.question_snapshot_json && Array.isArray(attempt.question_snapshot_json) && attempt.question_snapshot_json.length > 0) {
      return NextResponse.json({ attempt, questions: attempt.question_snapshot_json });
    }

    // Fallback for legacy static attempts
    const questionIds = attempt.shuffled_question_order;
    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ error: "Invalid attempt state (missing questions)" }, { status: 500 });
    }

    const { data: questions } = await supabase
      .from("screening_questions")
      .select("id, type, content, options")
      .in("id", questionIds);

    // Sort to match shuffled order then normalize for client
    const sortedRaw = questionIds.map((qid: string) => questions?.find((q: any) => q.id === qid)).filter(Boolean);

    const normalizedQuestions = sortedRaw.map((q: any) => {
      let opts: string[] = [];
      if (q.type === "MCQ") {
        const raw = q.options;
        if (Array.isArray(raw)) {
          opts = raw.map(String);
        } else if (typeof raw === "string") {
          try {
            const parsed = JSON.parse(raw);
            opts = Array.isArray(parsed) ? parsed.map(String) : raw.split(",").map((s: string) => s.trim()).filter(Boolean);
          } catch {
            opts = raw.split(",").map((s: string) => s.trim()).filter(Boolean);
          }
        } else if (raw && typeof raw === "object") {
          opts = Object.values(raw).map(String);
        }
      }
      return { id: q.id, type: q.type, content: q.content, options: opts };
    });

    return NextResponse.json({ attempt, questions: normalizedQuestions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
