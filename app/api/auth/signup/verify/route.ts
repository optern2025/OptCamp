import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { verifyHash, generateSessionToken, hashValue, hashSessionToken, setSessionCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email, otp, password, full_name, mobile_number, user_type, is_admin_request } = await req.json();

    if (!email || !otp || !password) {
      return NextResponse.json({ error: "Email, OTP, and password are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const purpose = is_admin_request ? "admin_signup" : "signup";

    const { data: otpRecord } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email)
      .eq("purpose", purpose)
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!otpRecord) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }

    if (otpRecord.attempts >= otpRecord.max_attempts) {
      return NextResponse.json({ error: "Max attempts reached. Please request a new OTP." }, { status: 400 });
    }

    const isValid = await verifyHash(otpRecord.otp_hash, otp);

    if (!isValid) {
      await supabase
        .from("otp_codes")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    // Mark verified
    await supabase.from("otp_codes").update({ verified_at: new Date().toISOString() }).eq("id", otpRecord.id);

    // Hash password
    const passwordHash = await hashValue(password);

    // Upsert User
    const { data: existingUser } = await supabase
      .from("new_users")
      .select("*")
      .eq("email", email)
      .single();

    let userId = existingUser?.id;

    if (!existingUser) {
      if (!full_name || (!user_type && !is_admin_request)) {
        return NextResponse.json({ error: "Missing required fields for new user." }, { status: 400 });
      }
      
      const role = is_admin_request ? 'admin' : 'user';
      const admin_approval_status = is_admin_request ? 'pending' : 'not_required';
      
      const { data: newUser, error: insertError } = await supabase
        .from("new_users")
        .insert({
          email,
          full_name,
          mobile_number,
          user_type: is_admin_request ? null : user_type,
          role,
          password_hash: passwordHash,
          email_verified_at: new Date().toISOString(),
          admin_approval_status,
        })
        .select()
        .single();

      if (insertError) {
        console.error("User insert error", insertError);
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
      }
      userId = newUser.id;
    } else {
      // It's a legacy user setting a password, or a user who didn't finish signup properly
      const updates: any = { 
        password_hash: passwordHash,
        email_verified_at: new Date().toISOString()
      };
      if (full_name && !existingUser.full_name) updates.full_name = full_name;
      if (mobile_number && !existingUser.mobile_number) updates.mobile_number = mobile_number;
      if (user_type && !existingUser.user_type) updates.user_type = user_type;
      
      if (is_admin_request && existingUser.role !== 'admin') {
         updates.role = 'admin';
         updates.admin_approval_status = 'pending';
      }

      await supabase.from("new_users").update(updates).eq("id", userId);
    }

    if (is_admin_request) {
      return NextResponse.json({ success: true, message: "Admin request submitted. Existing admin approval is required.", redirect: "/auth?status=pending" });
    }

    // Normal User Session
    const sessionToken = generateSessionToken();
    const sessionTokenHash = hashSessionToken(sessionToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const { error: sessionError } = await supabase.from("sessions").insert({
      user_id: userId,
      session_token_hash: sessionTokenHash,
      expires_at: expiresAt.toISOString(),
    });

    if (sessionError) {
      console.error("Session insert error", sessionError);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    await setSessionCookie(sessionToken, expiresAt);

    return NextResponse.json({ success: true, redirect: existingUser?.role === 'admin' && existingUser?.admin_approval_status === 'approved' ? '/admin' : '/dashboard' });
  } catch (error: any) {
    console.error("Verify OTP Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
