import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AdminShell from "./AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const reqHeaders = await headers();
  const role = reqHeaders.get("x-user-role");
  const userId = reqHeaders.get("x-user-id");

  if (!userId || role !== "admin") {
    redirect("/dashboard");
  }

  return <AdminShell />;
}
