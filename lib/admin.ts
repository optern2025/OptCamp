import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

/**
 * Server-side admin guard.
 * Reads x-user-id and x-user-role injected by middleware (proxy.ts).
 * Throws if the caller is not an authenticated admin.
 */
export async function requireAdminUser(): Promise<AdminUser> {
  const reqHeaders = await headers();
  const userId = reqHeaders.get("x-user-id");
  const userRole = reqHeaders.get("x-user-role");

  if (!userId || userRole !== "admin") {
    throw new Error("Unauthorized.");
  }

  const supabase = getSupabaseAdminClient();
  const { data: user, error } = await supabase
    .from("new_users")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .eq("role", "admin")
    .single();

  if (error || !user) {
    throw new Error("Unauthorized.");
  }

  return user;
}
