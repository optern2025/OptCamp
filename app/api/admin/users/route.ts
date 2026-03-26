import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin";
import { loadAdminUserDashboard } from "@/lib/adminDashboard";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    await requireAdminUser();
    const payload = await loadAdminUserDashboard(getSupabaseAdminClient());
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized." ? 401 : 403 },
    );
  }
}
