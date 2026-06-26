import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { loadAdminSettings } from "@/lib/adminSettings";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { applicationId } = body;
    if (!applicationId) return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });

    const supabase = getSupabaseAdminClient();
    const settings = await loadAdminSettings(supabase);

    // 1. Fetch Application & Cycle
    const { data: app, error: appError } = await supabase
      .from("applications")
      .select("*, cycles(id, screening_start_at, screening_end_at, domain_id)")
      .eq("id", applicationId)
      .eq("user_id", userId)
      .single();

    if (appError || !app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    if (app.status !== "screening_required") {
      return NextResponse.json({ error: "Application is not in screening_required status." }, { status: 403 });
    }

    const cycle = Array.isArray(app.cycles) ? app.cycles[0] : app.cycles;
    
    // Time check
    const now = new Date();
    const { isWithinWindow } = await import("@/lib/dateTime");

    if (!isWithinWindow(now, cycle.screening_start_at, cycle.screening_end_at)) {
      return NextResponse.json({ error: "Not within the screening window." }, { status: 403 });
    }
    
    const end = new Date(cycle.screening_end_at);

    // Check duplicate attempt
    const { data: existingAttempt } = await supabase
      .from("screening_attempts")
      .select("id")
      .eq("application_id", applicationId)
      .single();

    if (existingAttempt) {
      return NextResponse.json({ error: "Attempt already exists. Use the resume endpoint if in progress." }, { status: 400 });
    }

    let targetDifficulty = 1;
    let questionsSnapshot = [];
    let packetId = null;
    let questionSetId = null;

    if (settings.ai_screening_enabled) {
      // 2. Load Pre-generated AI Packet
      let { data: packet } = await supabase
        .from("ai_screening_packets")
        .select("id, questions_json, difficulty_level, generation_status")
        .eq("application_id", applicationId)
        .single();

      // Auto-recovery: if no generated packet, attempt on-the-fly generation (once)
      if (!packet || packet.generation_status !== "generated" || !packet.questions_json) {
        console.log(`[screening/start] Packet missing for application ${applicationId}. Attempting auto-generation.`);

        // Do not generate if there's already a pending lock row (another request may be generating)
        if (packet?.generation_status === "pending") {
          return NextResponse.json({ error: "Screening packet generation is still in progress. Please wait a moment and try again." }, { status: 400 });
        }

        // Clean up failed packet if any
        if (packet && packet.generation_status === "failed") {
          await supabase.from("ai_screening_packets").delete().eq("application_id", applicationId);
        }

        // Determine difficulty from domain_eligibility
        let autoDifficulty = 1;
        const { data: eligibility } = await supabase
          .from("domain_eligibility")
          .select("highest_score, highest_difficulty, expires_at")
          .eq("user_id", userId)
          .eq("domain_id", cycle.domain_id)
          .single();

        if (eligibility) {
          const highestDiff = eligibility.highest_difficulty || 1;
          const highestScore = eligibility.highest_score || 0;
          const isExpired = eligibility.expires_at ? new Date() > new Date(eligibility.expires_at) : true;
          if (!isExpired) {
            autoDifficulty = highestDiff;
          } else {
            if (highestScore >= 90) autoDifficulty = Math.min(highestDiff + 2, settings.ai_max_difficulty);
            else if (highestScore >= 80) autoDifficulty = Math.min(highestDiff + 1, settings.ai_max_difficulty);
            else autoDifficulty = highestDiff;
          }
        }

        // Acquire lock
        const { data: lockRow, error: lockError } = await supabase
          .from("ai_screening_packets")
          .insert({
            application_id: applicationId,
            user_id: userId,
            cycle_id: cycle.id,
            domain_id: cycle.domain_id,
            difficulty_level: autoDifficulty,
            generation_status: "pending",
            difficulty_reason: "Auto-generated at screening start (backfill)",
          })
          .select("id")
          .single();

        if (lockError || !lockRow) {
          return NextResponse.json({ error: "Unable to prepare screening. Please contact support." }, { status: 500 });
        }

        try {
          const { generateScreeningPacket } = await import("@/lib/aiScreening");
          // Fetch domain name
          const { data: domainRow } = await supabase.from("domains").select("name").eq("id", cycle.domain_id).single();
          const domainName = domainRow?.name || "General";

          const result = await generateScreeningPacket(domainName, autoDifficulty, settings.ai_model, settings.ai_fallback_model);

          const answersJson = result.packet.questions.map((q: any) => ({
            id: q.id, correct_answer: q.correct_answer, explanation: q.explanation,
            evaluation_rubric: q.evaluation_rubric, expected_concepts: q.expected_concepts,
          }));
          const scrubbedQuestions = result.packet.questions.map((q: any) => {
            const { correct_answer, explanation, evaluation_rubric, expected_concepts, ...rest } = q;
            return rest;
          });

          await supabase.from("ai_screening_packets").update({
            questions_json: scrubbedQuestions,
            answers_json: answersJson,
            model_used: result.modelUsed,
            fallback_used: result.fallbackUsed,
            prompt_version: result.promptVersion,
            generation_time_ms: result.timeMs,
            generation_status: "generated",
            generated_at: new Date().toISOString(),
          }).eq("id", lockRow.id);

          // Re-fetch to get the full packet
          const { data: freshPacket } = await supabase
            .from("ai_screening_packets")
            .select("id, questions_json, difficulty_level, generation_status")
            .eq("id", lockRow.id)
            .single();
          packet = freshPacket;
          console.log(`[screening/start] Auto-generation successful for application ${applicationId}`);
        } catch (genError: any) {
          await supabase.from("ai_screening_packets").update({
            generation_status: "failed",
            generation_error: genError.message,
          }).eq("id", lockRow.id);
          console.error(`[screening/start] Auto-generation failed for application ${applicationId}:`, genError.message);
          return NextResponse.json({ error: "Unable to prepare screening. Please contact support." }, { status: 500 });
        }
      }

      if (!packet || packet.generation_status !== "generated" || !packet.questions_json) {
        return NextResponse.json({ error: "Unable to prepare screening. Please contact support." }, { status: 500 });
      }

      packetId = packet.id;
      targetDifficulty = packet.difficulty_level;
      questionsSnapshot = packet.questions_json;
    } else {
      // 3. Fallback: Static Question Bank Mode
      const { data: eligibility } = await supabase
        .from("domain_eligibility")
        .select("highest_score, highest_difficulty, expires_at")
        .eq("user_id", userId)
        .eq("domain_id", cycle.domain_id)
        .single();

      if (eligibility) {
        const highestDiff = eligibility.highest_difficulty || 1;
        const highestScore = eligibility.highest_score || 0;
        const isExpired = eligibility.expires_at ? now > new Date(eligibility.expires_at) : true;
        
        if (!isExpired) {
          targetDifficulty = highestDiff;
        } else {
          if (highestScore >= 90) targetDifficulty = highestDiff + 2;
          else if (highestScore >= 80) targetDifficulty = highestDiff + 1;
          else targetDifficulty = highestDiff;
        }
      }

      let { data: questionSets } = await supabase
        .from("screening_question_sets")
        .select("id, difficulty_level")
        .eq("domain_id", cycle.domain_id)
        .eq("difficulty_level", targetDifficulty)
        .eq("is_active", true);

      if (!questionSets || questionSets.length === 0) {
        const { data: fallbackSets } = await supabase
          .from("screening_question_sets")
          .select("id, difficulty_level")
          .eq("domain_id", cycle.domain_id)
          .eq("is_active", true)
          .order("difficulty_level", { ascending: false });
        
        if (!fallbackSets || fallbackSets.length === 0) {
          return NextResponse.json({ error: "No active question sets found for this domain." }, { status: 400 });
        }
        
        const maxAvailableDiff = fallbackSets[0].difficulty_level;
        questionSets = fallbackSets.filter(s => s.difficulty_level === maxAvailableDiff);
        targetDifficulty = maxAvailableDiff;
      }

      const questionSet = questionSets[Math.floor(Math.random() * questionSets.length)];
      questionSetId = questionSet.id;

      const { data: questions, error: qError } = await supabase
        .from("screening_questions")
        .select("id, type, content, options")
        .eq("set_id", questionSet.id);

      if (qError || !questions || questions.length < 7) {
        return NextResponse.json({ error: "Configuration error: The selected question set does not have enough questions (minimum 7)." }, { status: 500 });
      }

      const shuffled = questions.sort(() => 0.5 - Math.random()).slice(0, 7);
      
      // Normalize options for snapshot
      questionsSnapshot = shuffled.map(q => {
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
        return {
          id: q.id,
          type: q.type,
          content: q.content,
          options: opts,
        };
      });
    }

    // 4. Create Attempt
    const attemptExpiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour or cycle end
    const finalExpiresAt = attemptExpiresAt > end ? end : attemptExpiresAt;

    const { data: attempt, error: insertError } = await supabase
      .from("screening_attempts")
      .insert({
        application_id: applicationId,
        user_id: userId,
        cycle_id: cycle.id,
        domain_id: cycle.domain_id,
        question_set_id: questionSetId,
        ai_screening_packet_id: packetId,
        difficulty_level: targetDifficulty,
        started_at: now.toISOString(),
        expires_at: finalExpiresAt.toISOString(),
        status: "in_progress",
        question_snapshot_json: questionsSnapshot
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ attempt, questions: questionsSnapshot });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
