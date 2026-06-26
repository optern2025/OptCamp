import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { hashValue } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    // Verify OTP
    const { data: otpRecord } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email)
      .eq("purpose", "login")
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!otpRecord) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: "Code has expired" }, { status: 400 });
    }

    // Verify OTP hash
    // We generated the OTP in send-otp and hashed it. We need to verify it.
    // In our system, verifyHash compares plain vs hash.
    const { verifyHash } = await import("@/lib/session");
    const isValid = await verifyHash(otpRecord.otp_hash, otp);

    if (!isValid) {
      return NextResponse.json({ error: "Incorrect code" }, { status: 400 });
    }

    // Mark OTP as verified
    await supabase
      .from("otp_codes")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", otpRecord.id);

    // Update password
    const newPasswordHash = await hashValue(newPassword);
    const { error: updateError } = await supabase
      .from("new_users")
      .update({ password_hash: newPasswordHash })
      .eq("email", email);

    if (updateError) {
      console.error("Password update error:", updateError);
      throw new Error("Failed to update password");
    }

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
