import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { verifyHash, generateSessionToken, hashSessionToken, setSessionCookie } from "@/lib/session";

import { loginSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      const errorMsg = result.error.issues.map(i => i.message).join(", ");
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { email, password } = result.data;

    const supabase = getSupabaseAdminClient();

    const { data: user } = await supabase
      .from("new_users")
      .select("*")
      .eq("email", email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 400 });
    }

    if (user.disabled_at) {
      return NextResponse.json({ error: "Account disabled. Please contact support." }, { status: 403 });
    }

    if (!user.password_hash) {
      return NextResponse.json({ 
        error: "Password not set. Please set a password using email OTP.",
        needs_setup: true 
      }, { status: 400 });
    }

    const isValid = await verifyHash(user.password_hash, password);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 400 });
    }

    if (user.role === 'admin') {
      if (user.admin_approval_status === 'pending') {
         return NextResponse.json({ error: "Admin approval pending." }, { status: 403 });
      }
      if (user.admin_approval_status === 'rejected') {
         return NextResponse.json({ error: "Admin access rejected." }, { status: 403 });
      }
    }

    // Create session
    const sessionToken = generateSessionToken();
    const sessionTokenHash = hashSessionToken(sessionToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const { error: sessionError } = await supabase.from("sessions").insert({
      user_id: user.id,
      session_token_hash: sessionTokenHash,
      expires_at: expiresAt.toISOString(),
    });

    if (sessionError) {
      console.error("Session insert error", sessionError);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    await setSessionCookie(sessionToken, expiresAt);

    return NextResponse.json({ 
      success: true, 
      redirect: (user.role === 'admin' && user.admin_approval_status === 'approved') ? '/admin' : '/dashboard' 
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
