import { NextResponse } from "next/server";
import { getSessionCookie, clearSessionCookie, hashSessionToken } from "@/lib/session";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  return handleLogout(req);
}

export async function GET(req: Request) {
  return handleLogout(req);
}

async function handleLogout(req: Request) {
  try {
    const token = await getSessionCookie();
    if (token) {
      const tokenHash = hashSessionToken(token);
      const supabase = getSupabaseAdminClient();
      await supabase
        .from("sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("session_token_hash", tokenHash);
      
      await clearSessionCookie();
    }
    
    // Check if it's an admin logout or user logout by referrer, but defaulting to / is fine.
    return NextResponse.redirect(new URL("/", req.url));
  } catch (error) {
    console.error("Logout Error:", error);
    return NextResponse.redirect(new URL("/", req.url));
  }
}
