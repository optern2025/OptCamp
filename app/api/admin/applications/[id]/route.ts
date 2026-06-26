import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const VALID_STATUSES = ["pending", "approved", "rejected", "screening_required", "screening_passed", "screening_failed", "selected", "enrolled", "waitlisted"];

async function sendNotification(supabase: any, userId: string, title: string, message: string, eventType: string, referenceId: string) {
  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    event_type: eventType,
    reference_id: referenceId,
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const supabase = getSupabaseAdminClient();

    const { data: application, error } = await supabase
      .from("applications")
      .select("*, cycles(title, cohort_type, domains(name)), new_users(email, role, created_at)")
      .eq("id", id)
      .single();

    if (error || !application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    // Also fetch previous applications for the same user
    const { data: previousApps } = await supabase
      .from("applications")
      .select("id, status, submitted_at, cycles(title)")
      .eq("user_id", application.user_id)
      .neq("id", id)
      .order("submitted_at", { ascending: false });

    // Fetch screening history
    const { data: screeningHistory } = await supabase
      .from("screening_attempts")
      .select("id, score, passed, difficulty_level, submitted_at, status")
      .eq("user_id", application.user_id)
      .order("submitted_at", { ascending: false });

    // Fetch domain eligibility for waiver
    const { data: domainEligibility } = await supabase
      .from("domain_eligibility")
      .select("*")
      .eq("user_id", application.user_id)
      .eq("domain_id", application.cycles?.domain_id);

    // Fetch AI screening packet status for this specific application
    const { data: aiPacket } = await supabase
      .from("ai_screening_packets")
      .select("id, generation_status")
      .eq("application_id", id)
      .maybeSingle();

    // Fetch the screening attempt for this specific application
    const { data: screeningAttempt } = await supabase
      .from("screening_attempts")
      .select("id, status")
      .eq("application_id", id)
      .maybeSingle();

    return NextResponse.json({ 
      application, 
      previousApps: previousApps ?? [], 
      screeningHistory: screeningHistory ?? [],
      domainEligibility: domainEligibility ?? [],
      packetStatus: aiPacket?.generation_status ?? null,   // null | "pending" | "generated" | "failed"
      attemptStatus: screeningAttempt?.status ?? null,      // null | "in_progress" | "submitted" | "passed" | ...
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdminUser();
    const { id } = await params;
    const supabase = getSupabaseAdminClient();
    const body = await req.json();
    const { status, admin_notes } = body;

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
    }

    // Fetch existing application for user_id (must include cycle_id for participant upsert)
    const { data: existing } = await supabase
      .from("applications")
      .select("id, user_id, cycle_id, status, full_name")
      .eq("id", id)
      .single();

    if (!existing) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;

    const { data: application, error } = await supabase
      .from("applications")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Log review
    await supabase.from("application_reviews").insert({
      application_id: id,
      admin_id: admin.id,
      notes: admin_notes || `Status changed to ${status}`,
    });

    // Lifecycle Sync: Cohort Participants
    if (status === "selected" || status === "enrolled") {
      const participantPayload: any = {
        user_id: existing.user_id,
        cycle_id: existing.cycle_id,
        application_id: id,
        status: status,
      };
      
      if (status === "enrolled") {
        participantPayload.enrolled_at = new Date().toISOString();
      }

      // Upsert into cohort_participants based on (cycle_id, user_id) unique constraint
      // But since we can't guarantee constraint logic via raw JS easily without throwing,
      // we'll explicitly query first, then insert or update.
      const { data: existingParticipant } = await supabase
        .from("cohort_participants")
        .select("id")
        .eq("user_id", existing.user_id)
        .eq("cycle_id", existing.cycle_id)
        .maybeSingle();

      if (existingParticipant) {
        await supabase
          .from("cohort_participants")
          .update(participantPayload)
          .eq("id", existingParticipant.id);
      } else {
        await supabase
          .from("cohort_participants")
          .insert(participantPayload);
      }
    }

    // Fire notification based on new status
    if (status && existing.user_id) {
      const notificationMap: Record<string, { title: string; message: string; event: string }> = {
        approved: {
          title: "Application Approved",
          message: `Congratulations! Your application has been approved.`,
          event: "application_approved",
        },
        rejected: {
          title: "Application Update",
          message: `Your application was not selected.`,
          event: "application_rejected",
        },
        screening_required: {
          title: "Screening Test Unlocked",
          message: `Your application was approved. Screening will open during the scheduled window.`,
          event: "screening_opened",
        },
        selected: {
          title: "Cohort Selection",
          message: `Congratulations! You have been selected to join the cohort.`,
          event: "cohort_selected",
        },
        enrolled: {
          title: "Cohort Enrollment",
          message: `You are officially enrolled in the cohort. Welcome aboard!`,
          event: "cohort_enrolled",
        },
      };

      const notif = notificationMap[status];
      if (notif) {
        await sendNotification(supabase, existing.user_id, notif.title, notif.message, notif.event, id);
      }
    }

    return NextResponse.json({ application });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized." ? 401 : 500 });
  }
}
