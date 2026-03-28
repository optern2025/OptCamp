import type { WebhookEvent } from "@clerk/nextjs/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

async function handleUserDeleted(event: WebhookEvent) {
  if (event.type !== "user.deleted" || !event.data.id) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("users")
    .delete()
    .eq("clerk_user_id", event.data.id);

  if (error) {
    throw new Error(`Failed to delete Supabase user data: ${error.message}`);
  }
}

export async function POST(request: Request) {
  try {
    const event = await verifyWebhook(request);

    try {
      await handleUserDeleted(event);

      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Unexpected server error.",
        },
        { status: 500 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Webhook verification failed." },
      { status: 400 },
    );
  }
}
