import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { generateScreeningPacket } from "@/lib/aiScreening";
import { loadAdminSettings } from "@/lib/adminSettings";

/**
 * POST /api/admin/screening/backfill-packets
 * 
 * Finds all applications that are:
 *   - status = screening_required
 *   - have no existing ai_screening_packet
 *   - have no completed/in-progress screening attempt
 * 
 * And generates AI packets for them.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdminUser();
    const supabase = getSupabaseAdminClient();
    const settings = await loadAdminSettings(supabase);

    if (!settings.ai_screening_enabled) {
      return NextResponse.json({ error: "AI Screening is globally disabled." }, { status: 400 });
    }

    // 1. Find all applications in screening_required
    const { data: candidates, error: candidatesError } = await supabase
      .from("applications")
      .select("id, user_id, cycles(id, domain_id), domains(id, name)")
      .eq("status", "screening_required");

    if (candidatesError) throw candidatesError;
    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ generated: 0, skipped: 0, failed: 0, message: "No screening_required applications found." });
    }

    let generated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: { applicationId: string; reason: string }[] = [];

    for (const app of candidates) {
      const applicationId = app.id;

      try {
        // 2. Check if packet already exists
        const { data: existingPacket } = await supabase
          .from("ai_screening_packets")
          .select("id, generation_status")
          .eq("application_id", applicationId)
          .single();

        if (existingPacket && existingPacket.generation_status === "generated") {
          skipped++;
          continue;
        }

        // 3. Check if any screening attempt exists (in any terminal state)
        const { data: existingAttempt } = await supabase
          .from("screening_attempts")
          .select("id, status")
          .eq("application_id", applicationId)
          .single();

        if (existingAttempt) {
          skipped++;
          continue;
        }

        const cycle = Array.isArray(app.cycles) ? app.cycles[0] : app.cycles;
        const domain = Array.isArray(app.domains) ? app.domains[0] : app.domains;

        if (!cycle || !domain) {
          errors.push({ applicationId, reason: "Missing cycle or domain" });
          failed++;
          continue;
        }

        // 4. Clean up failed packet if any
        if (existingPacket && existingPacket.generation_status !== "generated") {
          await supabase.from("ai_screening_packets").delete().eq("application_id", applicationId);
        }

        // 5. Determine difficulty
        const { data: eligibility } = await supabase
          .from("domain_eligibility")
          .select("last_score, difficulty_level, highest_score, highest_difficulty, expires_at")
          .eq("user_id", app.user_id)
          .eq("domain_id", domain.id)
          .single();

        let targetDifficulty = 1;
        const now = new Date();

        if (eligibility) {
          const highestDiff = eligibility.highest_difficulty || 1;
          const highestScore = eligibility.highest_score || 0;
          const isExpired = eligibility.expires_at ? now > new Date(eligibility.expires_at) : true;

          if (!isExpired) {
            targetDifficulty = highestDiff;
          } else {
            if (highestScore >= 90) {
              targetDifficulty = Math.min(highestDiff + 2, settings.ai_max_difficulty);
            } else if (highestScore >= 80) {
              targetDifficulty = Math.min(highestDiff + 1, settings.ai_max_difficulty);
            } else {
              targetDifficulty = highestDiff;
            }
          }
        }

        // 6. Create lock row
        const { data: packetRow, error: insertError } = await supabase
          .from("ai_screening_packets")
          .insert({
            application_id: applicationId,
            user_id: app.user_id,
            cycle_id: cycle.id,
            domain_id: domain.id,
            difficulty_level: targetDifficulty,
            generation_status: "pending",
          })
          .select("id")
          .single();

        if (insertError || !packetRow) {
          errors.push({ applicationId, reason: "Failed to acquire lock" });
          failed++;
          continue;
        }

        // 7. Generate via Gemini
        try {
          const result = await generateScreeningPacket(
            domain.name,
            targetDifficulty,
            settings.ai_model,
            settings.ai_fallback_model
          );

          const answersJson = result.packet.questions.map((q: any) => ({
            id: q.id,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            evaluation_rubric: q.evaluation_rubric,
            expected_concepts: q.expected_concepts,
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
            generated_at: now.toISOString(),
            difficulty_reason: eligibility ? "Backfill: calculated from domain_eligibility" : "Backfill: first attempt, difficulty 1",
          }).eq("id", packetRow.id);

          generated++;
        } catch (aiError: any) {
          await supabase.from("ai_screening_packets").update({
            generation_status: "failed",
            generation_error: aiError.message,
          }).eq("id", packetRow.id);

          errors.push({ applicationId, reason: aiError.message });
          failed++;
        }
      } catch (err: any) {
        errors.push({ applicationId, reason: err.message });
        failed++;
      }
    }

    return NextResponse.json({
      generated,
      skipped,
      failed,
      total_candidates: candidates.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}
