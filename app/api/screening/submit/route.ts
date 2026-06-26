import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { gradePracticalSubmission } from "@/lib/aiGrading";
import { loadAdminSettings } from "@/lib/adminSettings";

async function sendNotification(supabase: any, userId: string, title: string, message: string, eventType: string, referenceId: string) {
  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    event_type: eventType,
    reference_id: referenceId,
  });
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { attemptId, answers } = body; // answers: { [question_id]: string }

    if (!attemptId || !answers) return NextResponse.json({ error: "Missing attemptId or answers" }, { status: 400 });

    const supabase = getSupabaseAdminClient();
    const settings = await loadAdminSettings(supabase);

    // 1. Fetch Attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("screening_attempts")
      .select("*, ai_screening_packets(answers_json, model_used)")
      .eq("id", attemptId)
      .eq("user_id", userId)
      .single();

    if (attemptError || !attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    if (attempt.status !== "in_progress") {
      return NextResponse.json({ error: `Attempt is already ${attempt.status}` }, { status: 400 });
    }

    const now = new Date();
    if (now > new Date(attempt.expires_at)) {
      await supabase.from("screening_attempts").update({ status: "expired" }).eq("id", attemptId);
      return NextResponse.json({ error: "Attempt has expired" }, { status: 400 });
    }

    // Re-validate screening window
    const { data: cycle } = await supabase
      .from("cycles")
      .select("id, screening_end_at")
      .eq("id", attempt.cycle_id)
      .single();

    if (cycle && cycle.screening_end_at && now.getTime() > new Date(cycle.screening_end_at).getTime()) {
      return NextResponse.json({ error: "Screening window has closed." }, { status: 403 });
    }

    // 2. Fetch Questions (from snapshot or fallback to DB)
    let questions = [];
    let isAIPacket = false;
    let answersJson = [];

    if (attempt.ai_screening_packet_id && attempt.ai_screening_packets) {
      isAIPacket = true;
      questions = attempt.question_snapshot_json || [];
      answersJson = attempt.ai_screening_packets.answers_json || [];
    } else {
      const questionIds = attempt.shuffled_question_order;
      const { data: dbQuestions } = await supabase
        .from("screening_questions")
        .select("id, type, correct_answer")
        .in("id", questionIds);
      questions = dbQuestions || [];
    }

    if (!questions || questions.length === 0) return NextResponse.json({ error: "Questions not found" }, { status: 500 });

    // ─── Grading Configuration (from centralized admin settings) ─────────────
    const confidenceThreshold = settings.confidence_threshold ?? 60;
    const passThreshold = settings.pass_threshold ?? settings.ai_pass_percentage ?? 70;

    // 3. Grade Answers
    let totalScoreSum = 0;
    const totalCount = questions.length || 1; // Prevent division by zero
    const answerInserts: any[] = [];
    let needsAdminReview = false;

    // gradingLog stores full audit trail per question for DB storage and debugging
    const gradingLog: Record<string, {
      question: string;
      user_answer: string;
      expected_answer: string;
      type: string;
      score: number;
      isCorrect: boolean;
      confidence?: number;
      reasoning?: string;
    }> = {};

    for (const q of questions) {
      const userAnswer = answers[q.id] || "";
      let questionScore = 0;
      let isCorrect = false;

      // Extract metadata if it's an AI packet
      const ansMetadata = isAIPacket ? answersJson.find((a: any) => a.id === q.id) : null;
      const expectedAnswerStr = ansMetadata?.correct_answer || q.correct_answer || "";

      if (q.type === "MCQ") {
        isCorrect = userAnswer.trim() === expectedAnswerStr;
        questionScore = isCorrect ? 100 : 0;

        gradingLog[q.id] = {
          question: q.content?.substring(0, 200) || "",
          user_answer: userAnswer,
          expected_answer: expectedAnswerStr,
          type: "MCQ",
          score: questionScore,
          isCorrect,
        };
      } else {
        // AI grading for ALL practical questions (AI packet or fallback DB)
        const rubric = ansMetadata?.evaluation_rubric || q.explanation || expectedAnswerStr;
        const concepts = ansMetadata?.expected_concepts || [];
        
        const result = await gradePracticalSubmission(
          q.content,
          userAnswer,
          rubric,
          concepts,
          settings.ai_model,
          settings.ai_fallback_model
        );
        
        // Flag for admin review if AI failed or confidence is too low
        if (result.error || result.confidence < confidenceThreshold) {
          needsAdminReview = true;
          console.warn(`[Screening Eval] Q ${q.id}: Flagged for review. Error=${result.error}, Confidence=${result.confidence} < ${confidenceThreshold}`);
        }
        
        questionScore = result.score;
        isCorrect = result.isCorrect;

        // Store in audit log (also replaces old aiGradingResponses)
        gradingLog[q.id] = {
          question: q.content?.substring(0, 200) || "",
          user_answer: userAnswer,
          expected_answer: expectedAnswerStr.substring(0, 200),
          type: "practical",
          score: questionScore,
          isCorrect,
          confidence: result.confidence,
          reasoning: result.reasoning,
        };
      }

      totalScoreSum += questionScore;

      // Structured debug log per question
      console.log(
        `[Screening Eval] Q:${q.id} (${q.type}) | Score:${questionScore} | Correct:${isCorrect}` +
        (q.type !== "MCQ" ? ` | Confidence:${gradingLog[q.id].confidence}` : "")
      );

      if (!isAIPacket) {
        answerInserts.push({
          attempt_id: attemptId,
          question_id: q.id,
          user_answer: userAnswer,
          is_correct: isCorrect
        });
      }
    }

    const score = Math.round(totalScoreSum / totalCount);
    
    // Strict pass logic: average score must meet centralized pass_threshold.
    const passed = score >= passThreshold && !needsAdminReview;
    const finalStatus = needsAdminReview ? "pending_review" : "submitted";
    
    console.log(`[Screening Eval] ─── FINAL RESULT ───`);
    console.log(`[Screening Eval] Score: ${score} | Threshold: ${passThreshold} | Passed: ${passed} | Needs Review: ${needsAdminReview}`);

    // 4. Save Answers & Update Attempt
    if (!isAIPacket && answerInserts.length > 0) {
      await supabase.from("screening_answers").insert(answerInserts);
    }
    
    // Save full grading audit trail to generated_answers for all attempts
    const updatePayload: any = {
      score,
      passed: needsAdminReview ? null : passed,
      status: finalStatus,
      submitted_at: now.toISOString(),
      generated_answers: {
        grading_log: gradingLog,        // Full per-question audit trail
        final_score: score,
        pass_threshold: passThreshold,
        passed: needsAdminReview ? null : passed,
        needs_admin_review: needsAdminReview,
      }
    };

    await supabase.from("screening_attempts").update(updatePayload).eq("id", attemptId);

    // 5. Update Application
    let newStatus = "screening_failed";
    if (needsAdminReview) newStatus = "under_review";
    else if (passed) newStatus = "screening_passed";

    await supabase.from("applications").update({ status: newStatus }).eq("id", attempt.application_id);

    // 6. Update Domain Eligibility (ONLY IF PASSED)
    if (passed && !needsAdminReview) {
      const { data: currentEligibility } = await supabase
        .from("domain_eligibility")
        .select("highest_score, highest_difficulty, total_attempts")
        .eq("user_id", userId)
        .eq("domain_id", attempt.domain_id)
        .single();

      const prevHighestScore = currentEligibility?.highest_score || 0;
      const prevHighestDiff = currentEligibility?.highest_difficulty || 0;
      const prevAttempts = currentEligibility?.total_attempts || 0;

      const newHighestScore = Math.max(prevHighestScore, score);
      const newHighestDiff = passed ? Math.max(prevHighestDiff, attempt.difficulty_level) : prevHighestDiff;
      
      const eligibilityPayload: any = {
        user_id: userId,
        domain_id: attempt.domain_id,
        last_score: score,
        difficulty_level: attempt.difficulty_level,
        highest_score: newHighestScore,
        highest_difficulty: newHighestDiff,
        total_attempts: prevAttempts + 1,
        last_passed_at: now.toISOString()
      };

      await supabase.from("domain_eligibility").upsert(eligibilityPayload, { onConflict: 'user_id,domain_id' });
    }

    // 7. Notify
    if (needsAdminReview) {
      await sendNotification(
        supabase, 
        userId, 
        "Screening Under Review", 
        "Your practical answers are being reviewed by our team. We will notify you once graded.", 
        "screening_under_review", 
        attemptId
      );
    } else {
      const title = passed ? "Screening Passed" : "Screening Failed";
      const msg = passed ? `Congratulations! You passed the screening with a score of ${score}%.` : `You scored ${score}% and did not pass. Upskill at OptLearn and try again next time.`;
      const event = passed ? "screening_passed" : "screening_failed";
      await sendNotification(supabase, userId, title, msg, event, attemptId);
    }

    return NextResponse.json({ score, passed: needsAdminReview ? null : passed, status: newStatus, submittedAt: now.toISOString(), needsAdminReview });
  } catch (error: any) {
    console.error("[screening/submit] error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
