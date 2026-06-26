import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { generateOTP, hashValue } from "@/lib/session";
import { sendOtpEmail } from "@/lib/email";
import { signupSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      const errorMsg = result.error.issues.map(i => i.message).join(", ");
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { email, password, full_name, mobile_number, user_type, is_admin_request } = result.data;

    const supabase = getSupabaseAdminClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("new_users")
      .select("id, password_hash")
      .eq("email", email)
      .single();

    if (existingUser && existingUser.password_hash) {
      return NextResponse.json({ error: "User already exists with this email. Please login." }, { status: 400 });
    }

    // Check rate limit (1 min cooldown)
    const { data: existingOtp } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email)
      .eq("purpose", is_admin_request ? "admin_signup" : "signup")
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

    // Invalidate previous OTPs for this email and purpose
    await supabase
      .from("otp_codes")
      .update({ verified_at: new Date().toISOString() })
      .eq("email", email)
      .eq("purpose", is_admin_request ? "admin_signup" : "signup")
      .is("verified_at", null);

    const otp = generateOTP(6);
    const otpHash = await hashValue(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    const resendAvailableAt = new Date(Date.now() + 60 * 1000); // 60s

    const { error } = await supabase.from("otp_codes").insert({
      email,
      otp_hash: otpHash,
      purpose: is_admin_request ? "admin_signup" : "signup",
      expires_at: expiresAt.toISOString(),
      resend_available_at: resendAvailableAt.toISOString(),
    });

    if (error) {
      console.error("DB Insert error", error);
      throw new Error("Database error");
    }

    await sendOtpEmail(email, otp, is_admin_request ? "admin_signup" : "signup");

    return NextResponse.json({ success: true, message: "OTP sent" });
  } catch (error: any) {
    console.error("Send OTP Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
