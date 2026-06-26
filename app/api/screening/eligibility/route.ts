import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const applicationId = req.nextUrl.searchParams.get("applicationId");
    if (!applicationId) return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });

    const supabase = getSupabaseAdminClient();

    // 1. Fetch application and cycle
    const { data: app, error: appError } = await supabase
      .from("applications")
      .select("*, cycles(id, title, screening_start_at, screening_end_at, domain_id)")
      .eq("id", applicationId)
      .eq("user_id", userId)
      .single();

    if (appError || !app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    if (app.status !== "screening_required") {
      return NextResponse.json({ eligible: false, message: "Application is not in screening_required status." });
    }

    const cycle = Array.isArray(app.cycles) ? app.cycles[0] : app.cycles;
    if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 });

    const now = new Date();
    const start = cycle.screening_start_at ? new Date(cycle.screening_start_at) : null;
    const end = cycle.screening_end_at ? new Date(cycle.screening_end_at) : null;

    console.log("[screening/eligibility] application_id:", applicationId, "status:", app.status);
    console.log("[screening/eligibility] cycle_id:", cycle.id, "now:", now.toISOString(), "start:", start?.toISOString(), "end:", end?.toISOString());

    if (!start || !end) {
      return NextResponse.json({ eligible: false, message: "Screening window dates not set." });
    }

    const { isWithinWindow } = await import("@/lib/dateTime");
    
    if (now.getTime() < start.getTime()) {
      console.log("[screening/eligibility] state: BEFORE window");
      return NextResponse.json({ eligible: false, message: "Screening has not opened yet.", start, end });
    }

    if (now.getTime() > end.getTime()) {
      console.log("[screening/eligibility] state: AFTER window (closed)");
      return NextResponse.json({ eligible: false, message: "Screening window has closed.", start, end });
    }

    console.log("[screening/eligibility] state: OPEN");

    // 2. Check for an existing attempt
    const { data: existingAttempt } = await supabase
      .from("screening_attempts")
      .select("id, status, started_at, submitted_at")
      .eq("application_id", applicationId)
      .single();

    if (existingAttempt) {
      if (existingAttempt.status === "in_progress") {
        return NextResponse.json({ eligible: true, resume: true, attemptId: existingAttempt.id, message: "Resume existing attempt." });
      } else {
        return NextResponse.json({ eligible: false, message: `Screening attempt already ${existingAttempt.status}.` });
      }
    }

    // 2.5 Check if AI packet is ready
    const { data: packet } = await supabase
      .from("ai_screening_packets")
      .select("id, generation_status")
      .eq("application_id", applicationId)
      .single();

    if (!packet || packet.generation_status !== "generated") {
      // Check if any attempt already exists for this application
      const { data: anyAttempt } = await supabase
        .from("screening_attempts")
        .select("id, status")
        .eq("application_id", applicationId)
        .single();

      if (anyAttempt) {
        // Attempt already exists but packet is gone — should not happen, but be safe
        return NextResponse.json({
          eligible: false,
          message: `Screening attempt already ${anyAttempt.status}.`,
        });
      }

      // No packet and no attempt: needs generation (legacy application)
      const generationStatus = packet?.generation_status || "missing";
      return NextResponse.json({
        eligible: false,
        needs_packet_generation: true,
        packet_status: generationStatus,
        message: generationStatus === "pending"
          ? "Screening packet generation is in progress. Please wait."
          : generationStatus === "failed"
            ? "Screening packet generation failed. Please contact your admin."
            : "Screening questions are being prepared. Please check back shortly.",
      });
    }

    // 3. Check Domain Eligibility for Waiver
    const { data: domainEligibility } = await supabase
      .from("domain_eligibility")
      .select("waiver_eligible, expires_at")
      .eq("user_id", userId)
      .eq("domain_id", cycle.domain_id)
      .single();

    let hasWaiver = false;
    let waiverMessage = "";

    if (domainEligibility) {
      const expiresAt = domainEligibility.expires_at ? new Date(domainEligibility.expires_at) : null;
      if (domainEligibility.waiver_eligible && expiresAt && now < expiresAt) {
        hasWaiver = true;
        waiverMessage = "You have an active waiver for this domain. Screening is not required.";
      }
    }

    return NextResponse.json({ eligible: true, resume: false, start, end, domain_id: cycle.domain_id, hasWaiver, waiverMessage });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
