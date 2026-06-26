import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { generateScreeningPacket } from "@/lib/aiScreening";
import { loadAdminSettings } from "@/lib/adminSettings";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: applicationId } = await params;
    const supabase = getSupabaseAdminClient();

    // 1. Load Admin Settings to ensure AI screening is enabled
    // Note: loadAdminSettings is now resilient and returns defaults if query fails.
    const settings = await loadAdminSettings(supabase);
    if (!settings.ai_screening_enabled) {
      return NextResponse.json({ error: "AI Screening is globally disabled." }, { status: 400 });
    }

    // Validate Gemini environment
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEYS;
    if (!geminiKey) {
      return NextResponse.json({ 
        error: "Gemini API key is missing. Add GEMINI_API_KEY or GEMINI_API_KEYS to .env.local" 
      }, { status: 500 });
    }

    // 2. Fetch Application & Cycle & Domain
    console.log(`[generate-screening] Received request. Application ID: ${applicationId}`);
    const { data: app, error: appError } = await supabase
      .from("applications")
      .select("id, user_id, status, cycle_id, cycles(id, domain_id, screening_start_at, screening_end_at, domains(id, name))")
      .eq("id", applicationId)
      .single();

    if (appError) {
      console.error("[generate-screening] Application lookup error:", appError);
      return NextResponse.json({ error: `Application not found: ${appError.message}` }, { status: 404 });
    }
    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    console.log(`[generate-screening] Found application. Status: ${app.status}, User ID: ${app.user_id}, Cycle ID: ${app.cycle_id}`);

    const cycle = Array.isArray(app.cycles) ? app.cycles[0] : app.cycles;
    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found for this application" }, { status: 400 });
    }

    const domain = Array.isArray(cycle.domains) ? cycle.domains[0] : cycle.domains;
    if (!domain) {
      return NextResponse.json({ error: "Domain not found for this cycle" }, { status: 400 });
    }

    console.log(`[generate-screening] Cycle & Domain resolved. Domain ID: ${domain.id}`);

    // Check application status — only block for truly terminal statuses
    const BLOCKED_STATUSES = ["screening_passed", "screening_failed", "selected", "enrolled", "completed", "rejected"];
    if (BLOCKED_STATUSES.includes(app.status)) {
       return NextResponse.json({ error: `Application status '${app.status}' does not allow screening generation.` }, { status: 400 });
    }

    // 2.5 Check if an active screening attempt already exists
    const LOCKED_ATTEMPT_STATUSES = ["in_progress", "submitted", "passed", "failed", "pending_review", "completed"];

    const { data: existingAttempt } = await supabase
      .from("screening_attempts")
      .select("id, status")
      .eq("application_id", applicationId)
      .maybeSingle();

    if (existingAttempt && LOCKED_ATTEMPT_STATUSES.includes(existingAttempt.status)) {
      return NextResponse.json({
        error: `Screening cannot be regenerated. Candidate has already ${existingAttempt.status === "in_progress" ? "started" : "submitted"} the screening test.`,
        attemptStatus: existingAttempt.status,
      }, { status: 400 });
    }

    // 3. Check if an existing (unused) packet exists — delete it before regenerating
    const { data: existingPacket } = await supabase
      .from("ai_screening_packets")
      .select("id, generation_status")
      .eq("application_id", applicationId)
      .maybeSingle();

    const isRegeneration = !!existingPacket;

    if (existingPacket) {
      console.log(`[generate-screening] Deleting old packet ${existingPacket.id} for regeneration.`);
      await supabase.from("ai_screening_packets").delete().eq("id", existingPacket.id);
    }

    // 4. Create placeholder packet to lock generation
    const { data: packetRow, error: insertError } = await supabase
      .from("ai_screening_packets")
      .insert({
        application_id: applicationId,
        user_id: app.user_id,
        cycle_id: cycle.id,
        domain_id: domain.id,
        difficulty_level: 1, // temporary placeholder, will update below
        generation_status: "pending"
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[generate-screening] insertError", insertError);
      return NextResponse.json({ error: "Failed to acquire generation lock." }, { status: 409 });
    }

    // 5. Determine Difficulty
    const { data: eligibility } = await supabase
      .from("domain_eligibility")
      .select("last_score, difficulty_level, highest_score, highest_difficulty, expires_at")
      .eq("user_id", app.user_id)
      .eq("domain_id", domain.id)
      .single();

    let targetDifficulty = 1;
    let difficultyReason = "First attempt in domain. Defaulting to difficulty 1.";
    const now = new Date();

    if (eligibility) {
      const highestDiff = eligibility.highest_difficulty || 1;
      const highestScore = eligibility.highest_score || 0;
      const isExpired = eligibility.expires_at ? now > new Date(eligibility.expires_at) : true;

      if (!isExpired) {
        targetDifficulty = highestDiff;
        difficultyReason = `Previous eligibility not expired. Using highest reached difficulty: ${highestDiff}.`;
      } else {
        if (highestScore >= 90) {
          targetDifficulty = Math.min(highestDiff + 2, settings.ai_max_difficulty);
          difficultyReason = `Previous score ${highestScore} >= 90. Increased difficulty to ${targetDifficulty}.`;
        } else if (highestScore >= 80) {
          targetDifficulty = Math.min(highestDiff + 1, settings.ai_max_difficulty);
          difficultyReason = `Previous score ${highestScore} >= 80. Increased difficulty to ${targetDifficulty}.`;
        } else {
          targetDifficulty = highestDiff;
          difficultyReason = `Previous score ${highestScore} < 80. Maintained difficulty at ${targetDifficulty}.`;
        }
      }
    }

    // Update lock with correct difficulty
    await supabase.from("ai_screening_packets").update({ difficulty_level: targetDifficulty }).eq("id", packetRow.id);

    // 6. Generate Questions via Gemini
    try {
      const result = await generateScreeningPacket(
        domain.name,
        targetDifficulty,
        settings.ai_model,
        settings.ai_fallback_model
      );

      // Extract answers to hide from users
      const answersJson = result.packet.questions.map(q => ({
        id: q.id,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        evaluation_rubric: q.evaluation_rubric,
        expected_concepts: q.expected_concepts
      }));

      // Sanitize questions for user viewing (remove answer/rubric)
      const scrubbedQuestions = result.packet.questions.map(q => {
        const { correct_answer, explanation, evaluation_rubric, expected_concepts, ...rest } = q;
        return rest;
      });

      // 7. Update Packet to Generated
      await supabase.from("ai_screening_packets").update({
        questions_json: scrubbedQuestions,
        answers_json: answersJson,
        model_used: result.modelUsed,
        fallback_used: result.fallbackUsed,
        prompt_version: result.promptVersion,
        generation_time_ms: result.timeMs,
        difficulty_reason: difficultyReason,
        generation_status: "generated",
        generated_at: now.toISOString()
      }).eq("id", packetRow.id);

      // 8. Update Application Status to 'screening_required'
      await supabase.from("applications").update({ status: "screening_required" }).eq("id", applicationId);

      const message = isRegeneration
        ? "AI screening regenerated successfully."
        : "AI screening generated successfully.";

      return NextResponse.json({ success: true, packetId: packetRow.id, isRegeneration, message });
    } catch (aiError: any) {
      console.error("[generate-screening] AI Failure", aiError);
      
      // Update packet status to failed
      await supabase.from("ai_screening_packets").update({
        generation_status: "failed",
        generation_error: aiError.message
      }).eq("id", packetRow.id);

      return NextResponse.json({ 
        error: "gemini_generation_failed", 
        message: `AI generation failed: ${aiError.message}` 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Generate screening route error:", error);
    const errorCode = error.message.includes("Unable to load admin settings") ? "admin_settings_missing" : "internal_error";
    return NextResponse.json({ 
      error: errorCode, 
      message: error.message || "Internal server error" 
    }, { status: 500 });
  }
}
