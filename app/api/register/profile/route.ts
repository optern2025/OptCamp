import { type NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClerkUser } from "@/lib/clerkServer";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface RegisterProfileBody {
  name?: string;
  university?: string;
  cohortId?: string;
  stack?: string;
  github?: string;
  availability?: boolean;
  intent?: string;
}

class ValidationError extends Error {}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} is required.`);
  }

  return value.trim();
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedClerkUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as RegisterProfileBody;

    const name = requireNonEmptyString(body.name, "Name");
    const university = requireNonEmptyString(body.university, "University");
    const stack = requireNonEmptyString(body.stack, "Stack");
    const intent = requireNonEmptyString(body.intent, "Intent");
    const cohortId = requireNonEmptyString(body.cohortId, "Cohort");

    const github = typeof body.github === "string" ? body.github.trim() : "";

    if (body.availability !== true) {
      return NextResponse.json(
        { error: "Sprint availability confirmation is required." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data: existingProfile } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", authUser.userId)
      .maybeSingle();

    let userId = existingProfile?.id ?? null;

    if (userId) {
      const { error: updateError } = await supabase
        .from("users")
        .update({
          email: authUser.email,
          name,
          university,
          stack,
          github: github.length > 0 ? github : null,
          availability: true,
          intent,
        })
        .eq("id", userId);

      if (updateError) {
        return NextResponse.json(
          { error: "Unable to save your profile." },
          { status: 500 },
        );
      }
    } else {
      const { data: insertedProfile, error: insertError } = await supabase
        .from("users")
        .insert({
          clerk_user_id: authUser.userId,
          email: authUser.email,
          name,
          university,
          stack,
          github: github.length > 0 ? github : null,
          availability: true,
          intent,
        })
        .select("id")
        .single();

      if (insertError || !insertedProfile) {
        return NextResponse.json(
          { error: "Unable to create your profile." },
          { status: 500 },
        );
      }

      userId = insertedProfile.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Unable to resolve your profile." },
        { status: 500 },
      );
    }

    const { error: linkError } = await supabase.from("user_cohorts").upsert(
      {
        user_id: userId,
        cohort_id: cohortId,
        status: "active",
        applied_at: new Date().toISOString(),
      },
      { onConflict: "user_id,cohort_id" },
    );

    if (linkError) {
      return NextResponse.json(
        { error: "Unable to link your cohort application." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected server error.",
      },
      { status: 500 },
    );
  }
}
