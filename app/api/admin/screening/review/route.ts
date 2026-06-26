import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser();
    const supabase = getSupabaseAdminClient();
    
    const { data: reviews, error } = await supabase
      .from("screening_attempts")
      .select("*, applications(id, user_id, full_name, email), cycles(title)")
      .eq("status", "pending_review")
      .order("submitted_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ reviews: reviews || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminUser();
    const body = await req.json();
    const { attemptId, action, score, notes } = body;

    if (!attemptId || !['approve', 'fail', 'override'].includes(action)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    // 1. Fetch Attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("screening_attempts")
      .select("*, applications(id, user_id)")
      .eq("id", attemptId)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.status !== "pending_review") {
       if (action !== "override") {
         return NextResponse.json({ error: "Only pending_review attempts can be simply approved/failed. Use override for submitted attempts." }, { status: 400 });
       }
    }

    let finalScore = attempt.score;
    let finalPassed = attempt.passed;

    if (action === "override") {
      if (typeof score !== "number") {
        return NextResponse.json({ error: "Score is required for override" }, { status: 400 });
      }
      finalScore = score;
      finalPassed = finalScore >= 70; // Hardcoding pass boundary or fetch from settings
    } else if (action === "approve") {
      finalPassed = true;
    } else if (action === "fail") {
      finalPassed = false;
    }

    const now = new Date().toISOString();

    // 2. Update Attempt
    await supabase.from("screening_attempts").update({
      score: finalScore,
      passed: finalPassed,
      status: "submitted",
    }).eq("id", attemptId);

    // 3. Update Application Status
    const newStatus = finalPassed ? "screening_passed" : "screening_failed";
    await supabase.from("applications").update({ status: newStatus }).eq("id", attempt.application_id);

    // 4. Update Domain Eligibility (ONLY IF PASSED)
    if (finalPassed) {
      const { data: currentEligibility } = await supabase
        .from("domain_eligibility")
        .select("highest_score, highest_difficulty, total_attempts")
        .eq("user_id", attempt.user_id)
        .eq("domain_id", attempt.domain_id)
        .single();

      const prevHighestScore = currentEligibility?.highest_score || 0;
      const prevHighestDiff = currentEligibility?.highest_difficulty || 0;
      const prevAttempts = currentEligibility?.total_attempts || 0;

      const newHighestScore = Math.max(prevHighestScore, finalScore);
      const newHighestDiff = Math.max(prevHighestDiff, attempt.difficulty_level);

      const eligibilityPayload: any = {
        user_id: attempt.user_id,
        domain_id: attempt.domain_id,
        last_score: finalScore,
        difficulty_level: attempt.difficulty_level,
        highest_score: newHighestScore,
        highest_difficulty: newHighestDiff,
        total_attempts: prevAttempts + 1,
        last_passed_at: now
      };

      await supabase.from("domain_eligibility").upsert(eligibilityPayload, { onConflict: 'user_id,domain_id' });
    } else if (attempt.status === "pending_review") {
      // If we are failing a pending review, we still need to increment their attempt count since it wasn't incremented during submit
      const { data: currentEligibility } = await supabase
        .from("domain_eligibility")
        .select("highest_score, highest_difficulty, total_attempts")
        .eq("user_id", attempt.user_id)
        .eq("domain_id", attempt.domain_id)
        .single();
        
      if (currentEligibility) {
         await supabase.from("domain_eligibility").update({
           total_attempts: (currentEligibility.total_attempts || 0) + 1,
           last_score: finalScore
         }).eq("user_id", attempt.user_id).eq("domain_id", attempt.domain_id);
      }
    }

    // 5. Audit Logging
    let eventType = "";
    if (action === "override") eventType = "screening_score_overridden";
    else if (action === "approve") eventType = "screening_review_approved";
    else if (action === "fail") eventType = "screening_review_failed";

    await supabase.from("audit_logs").insert({
      admin_id: admin.id,
      target_user_id: attempt.user_id,
      event_type: eventType,
      action_details: {
        attempt_id: attemptId,
        old_score: attempt.score,
        new_score: finalScore,
        notes: notes || ""
      },
      ip_address: req.headers.get("x-forwarded-for") || "unknown"
    });

    // 6. Notifications
    const title = finalPassed ? "Screening Passed" : "Screening Failed";
    const msg = finalPassed 
      ? `Your screening review is complete. Congratulations, you passed with a score of ${finalScore}%.` 
      : `Your screening review is complete. You scored ${finalScore}% and did not pass. Upskill at OptLearn and try again next time.`;
    const event = finalPassed ? "screening_passed" : "screening_failed";

    await supabase.from("notifications").insert({
      user_id: attempt.user_id,
      title,
      message: msg,
      event_type: event,
      reference_id: attemptId,
    });

    return NextResponse.json({ success: true, score: finalScore, passed: finalPassed });
  } catch (error: any) {
    console.error("[admin/screening/review] Error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
