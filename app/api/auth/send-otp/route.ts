import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { generateOTP, hashValue } from "@/lib/session";
import { sendOtpEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    // Check rate limit (1 min cooldown)
    const { data: existingOtp } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email)
      .eq("purpose", "login")
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingOtp && existingOtp.resend_available_at) {
      const resendAt = new Date(existingOtp.resend_available_at);
      if (resendAt > new Date()) {
        return NextResponse.json(
          { error: "Please wait before requesting a new OTP." },
          { status: 429 }
        );
      }
    }

    // Invalidate previous OTPs for this email
    await supabase
      .from("otp_codes")
      .update({ verified_at: new Date().toISOString() }) // mark verified or just ignore them. Actually best to delete or update
      .eq("email", email)
      .is("verified_at", null);

    const otp = generateOTP(6);
    const otpHash = await hashValue(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    const resendAvailableAt = new Date(Date.now() + 60 * 1000); // 60s

    const { error } = await supabase.from("otp_codes").insert({
      email,
      otp_hash: otpHash,
      purpose: "login",
      expires_at: expiresAt.toISOString(),
      resend_available_at: resendAvailableAt.toISOString(),
    });

    if (error) {
      console.error("DB Insert error", error);
      throw new Error("Database error");
    }

    await sendOtpEmail(email, otp, "login");

    const { data: existingUser } = await supabase
      .from("new_users")
      .select("id")
      .eq("email", email)
      .single();

    return NextResponse.json({ success: true, message: "OTP sent", exists: !!existingUser });
  } catch (error: any) {
    console.error("Send OTP Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
