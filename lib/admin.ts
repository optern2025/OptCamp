import { canAccessAdmin } from "@/lib/adminAccess";
import { getAuthenticatedClerkUser } from "@/lib/clerkServer";

export async function requireAdminUser() {
  const user = await getAuthenticatedClerkUser();

  if (!user) {
    throw new Error("Unauthorized.");
  }

  if (!canAccessAdmin(user.email)) {
    throw new Error("Admin access is restricted for this account.");
  }

  return user;
}
