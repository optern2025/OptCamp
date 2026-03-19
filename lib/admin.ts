import { getAuthenticatedClerkUser } from "@/lib/clerkServer";

function getConfiguredAdminEmails(): string[] {
  const raw = process.env.OPTERN_ADMIN_EMAILS ?? "";

  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

export function canAccessAdmin(email: string): boolean {
  const configuredEmails = getConfiguredAdminEmails();

  if (configuredEmails.length === 0) {
    return true;
  }

  return configuredEmails.includes(email.trim().toLowerCase());
}

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
