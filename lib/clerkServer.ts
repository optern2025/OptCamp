import { auth, clerkClient } from "@clerk/nextjs/server";

interface AuthenticatedClerkUser {
  userId: string;
  email: string;
  isEmailVerified: boolean;
}

export async function getAuthenticatedClerkUser(): Promise<AuthenticatedClerkUser | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  const primaryEmail =
    user.emailAddresses.find(
      (emailAddress) => emailAddress.id === user.primaryEmailAddressId,
    ) ?? user.emailAddresses[0];

  const email = primaryEmail?.emailAddress?.trim();
  if (!email) {
    throw new Error("Authenticated Clerk user does not have an email address.");
  }

  return {
    userId,
    email,
    isEmailVerified: primaryEmail.verification?.status === "verified",
  };
}
