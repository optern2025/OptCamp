import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

import { applicationSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = applicationSchema.safeParse(body);

    if (!result.success) {
      const errorMsg = result.error.issues.map(i => i.message).join(", ");
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const {
      cycle_id,
      full_name,
      email,
      mobile_number,
      user_type,
      college,
      graduation_year,
      skills,
      github_url,
      linkedin_url,
      portfolio_url,
      resume_url,
      motivation,
    } = result.data;

    const supabase = getSupabaseAdminClient();

    // Check if user already applied to this cycle
    const { data: existingApp } = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", userId)
      .eq("cycle_id", cycle_id)
      .single();

    if (existingApp) {
      return NextResponse.json(
        { error: "You have already applied to this cohort.", redirect: "/dashboard" },
        { status: 409 }
      );
    }

    // Insert application
    const { data: newApp, error: insertError } = await supabase
      .from("applications")
      .insert({
        user_id: userId,
        cycle_id,
        full_name,
        email,
        mobile_number,
        user_type,
        college,
        graduation_year,
        skills,
        github_url,
        linkedin_url,
        portfolio_url,
        resume_url,
        motivation,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Application insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to submit application." },
        { status: 500 }
      );
    }

    // Insert user notification
    await supabase.from("notifications").insert({
      user_id: userId,
      title: "Application submitted",
      message: `Your application to the cycle has been received and is pending review.`,
      event_type: "application_submitted",
      reference_id: newApp.id
    });

    return NextResponse.json({ application: newApp }, { status: 201 });
  } catch (error) {
    console.error("POST /api/applications error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
