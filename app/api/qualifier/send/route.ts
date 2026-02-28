import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getAuthenticatedClerkUser } from "@/lib/clerkServer";
import { getAppUrl, getQualifierFromEmail, getResendApiKey } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function POST() {
  try {
    const authUser = await getAuthenticatedClerkUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!authUser.isEmailVerified) {
      return NextResponse.json(
        { error: "Email is not verified yet." },
        { status: 409 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select(
        "id, email, name, cohort_id, qualifier_email_sent_at, qualifier_email_message_id",
      )
      .eq("clerk_user_id", authUser.userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Unable to load your profile." },
        { status: 500 },
      );
    }

    if (profile.qualifier_email_sent_at) {
      return NextResponse.json({
        ok: true,
        alreadySent: true,
        sentAt: profile.qualifier_email_sent_at,
      });
    }

    if (!profile.cohort_id) {
      return NextResponse.json(
        { error: "No cohort assigned to your profile." },
        { status: 409 },
      );
    }

    const { data: cohort, error: cohortError } = await supabase
      .from("cohorts")
      .select("id, slug, type, qualifier_test_url")
      .eq("id", profile.cohort_id)
      .single();

    if (cohortError || !cohort) {
      return NextResponse.json(
        { error: "Assigned cohort could not be found." },
        { status: 500 },
      );
    }

    if (!cohort.qualifier_test_url) {
      return NextResponse.json(
        { error: "Qualifier link is not configured for this cohort." },
        { status: 409 },
      );
    }

    const resend = new Resend(getResendApiKey());
    const from = getQualifierFromEmail();
    const appUrl = getAppUrl();

    const recipientName = profile.name?.trim() || "Candidate";
    const subject = `Optern Qualifier Test Link - ${cohort.type}`;

    const emailResponse = await resend.emails.send({
      from,
      to: [authUser.email],
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111; max-width: 640px; margin: 0 auto;">
          <h2>Qualifier Test Access Granted</h2>
          <p>Hi ${recipientName},</p>
          <p>Your email has been verified for the <strong>${cohort.type}</strong> cohort.</p>
          <p>Use the link below to start your qualifier test:</p>
          <p><a href="${cohort.qualifier_test_url}">Start Qualifier Test</a></p>
          <p>If the button does not work, copy this URL:</p>
          <p>${cohort.qualifier_test_url}</p>
          <p>You can also view your assigned cohort details here:</p>
          <p><a href="${appUrl}/cohort-test">${appUrl}/cohort-test</a></p>
          <p>Best of luck,<br/>Optern Team</p>
        </div>
      `,
      text: [
        "Qualifier Test Access Granted",
        `Hi ${recipientName},`,
        `Your email has been verified for the ${cohort.type} cohort.`,
        "Start your qualifier test:",
        cohort.qualifier_test_url,
        "View cohort details:",
        `${appUrl}/cohort-test`,
      ].join("\n"),
    });

    if (emailResponse.error) {
      return NextResponse.json(
        {
          error:
            emailResponse.error.message || "Failed to send qualifier email.",
        },
        { status: 502 },
      );
    }

    const sentAt = new Date().toISOString();
    const messageId = emailResponse.data?.id ?? null;

    const { error: updateError } = await supabase
      .from("users")
      .update({
        email: authUser.email,
        email_verified: authUser.isEmailVerified,
        qualifier_email_sent_at: sentAt,
        qualifier_email_message_id: messageId,
      })
      .eq("id", profile.id);

    if (updateError) {
      return NextResponse.json(
        {
          error:
            "Qualifier email was sent but we could not persist send state. Please contact support.",
        },
        { status: 500 },
      );
    }

    await supabase.from("qualifier_email_logs").insert({
      user_id: profile.id,
      cohort_id: cohort.id,
      recipient_email: authUser.email,
      resend_message_id: messageId,
      sent_at: sentAt,
      status: "sent",
    });

    return NextResponse.json({
      ok: true,
      alreadySent: false,
      sentAt,
      messageId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected server error.",
      },
      { status: 500 },
    );
  }
}
