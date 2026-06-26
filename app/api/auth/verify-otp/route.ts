import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { verifyHash, generateSessionToken, hashValue, hashSessionToken, setSessionCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email, otp, full_name, mobile_number, user_type } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

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

    // Upsert User
    const { data: existingUser } = await supabase
      .from("new_users")
      .select("*")
      .eq("email", email)
      .single();

    let userId = existingUser?.id;

    if (!existingUser) {
      if (!full_name || !user_type) {
        return NextResponse.json({ error: "Full name and user type are required for new users." }, { status: 400 });
      }
      const { data: newUser, error: insertError } = await supabase
        .from("new_users")
        .insert({
          email,
          full_name,
          mobile_number,
          user_type,
          role: "user",
        })
        .select()
        .single();

      if (insertError) {
        console.error("User insert error", insertError);
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
      }
      userId = newUser.id;
    } else {
      // Update missing fields if provided
      const updates: any = {};
      if (full_name && !existingUser.full_name) updates.full_name = full_name;
      if (mobile_number && !existingUser.mobile_number) updates.mobile_number = mobile_number;
      if (user_type && !existingUser.user_type) updates.user_type = user_type;
      
      if (Object.keys(updates).length > 0) {
        await supabase.from("new_users").update(updates).eq("id", userId);
      }
    }

    // Create session
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

    return NextResponse.json({ success: true, redirect: existingUser?.role === 'admin' ? '/admin' : '/dashboard' });
  } catch (error: any) {
    console.error("Verify OTP Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
