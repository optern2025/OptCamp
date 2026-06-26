import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import crypto from "crypto";
import AdminAuthForm from "./AdminAuthForm";

async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default async function AdminAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  
  const sp = await searchParams;
  const statusParam = typeof sp.status === "string" ? sp.status : "";

  if (token) {
    let shouldRedirectTo = "";
    try {
      const tokenHash = await sha256(token);
      const supabase = getSupabaseAdminClient();
      
      const { data: session } = await supabase
        .from("sessions")
        .select("id, expires_at, revoked_at, new_users(role, admin_approval_status)")
        .eq("session_token_hash", tokenHash)
        .single();

      if (session && !session.revoked_at && new Date(session.expires_at) > new Date()) {
        const user = Array.isArray(session.new_users) ? session.new_users[0] : session.new_users;
        if (user) {
          if (user.role === 'admin') {
            if (user.admin_approval_status === 'approved') {
              shouldRedirectTo = '/admin';
            }
          } else {
            shouldRedirectTo = '/dashboard';
          }
        }
      }
    } catch (e) {
      console.error("Admin Auth check failed", e);
    }

    if (shouldRedirectTo) {
      redirect(shouldRedirectTo);
    }
  }

  return <AdminAuthForm />;
}
