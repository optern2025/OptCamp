import { type NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClerkUser } from "@/lib/clerkServer";
import { getProfileByClerkUserId } from "@/lib/dashboard";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { UserCohortStatus } from "@/lib/types";

interface RegisterProfileBody {
  university?: string;
  cohortId?: string;
  stack?: string;
  github?: string;
  availability?: boolean;
  intent?: string;
}

interface ExistingEmailProfile {
  id: string;
  clerk_user_id: string;
}

class ValidationError extends Error {}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} is required.`);
  }

  return value.trim();
}

function isUniqueViolation(error: unknown): error is { code?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

async function insertUserProfile(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  authUser: { userId: string; email: string; name: string },
  profile: {
    university: string;
    stack: string;
    github: string | null;
    availability: boolean;
    intent: string;
  },
) {
  return supabase
    .from("users")
    .insert({
      clerk_user_id: authUser.userId,
      email: authUser.email,
      name: authUser.name,
      university: profile.university,
      stack: profile.stack,
      github: profile.github,
      availability: profile.availability,
      intent: profile.intent,
    })
    .select("id")
    .single();
}

async function getExistingEmailProfile(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  email: string,
) {
  const { data, error } = await supabase
    .from("users")
    .select("id, clerk_user_id")
    .eq("email", email)
    .maybeSingle();

  return {
    data: (data as ExistingEmailProfile | null) ?? null,
    error,
  };
}

async function reclaimStaleEmailProfile(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  authUser: { userId: string; email: string },
  currentUserId?: string | null,
) {
  const { data: existingEmailProfile, error: existingEmailProfileError } =
    await getExistingEmailProfile(supabase, authUser.email);

  if (existingEmailProfileError) {
    return {
      reclaimed: false,
      error: existingEmailProfileError,
    };
  }

  if (
    !existingEmailProfile ||
    existingEmailProfile.clerk_user_id === authUser.userId ||
    existingEmailProfile.id === currentUserId
  ) {
    return {
      reclaimed: false,
      error: null,
    };
  }

  const { error: staleProfileDeleteError } = await supabase
    .from("users")
    .delete()
    .eq("id", existingEmailProfile.id);

  return {
    reclaimed: !staleProfileDeleteError,
    error: staleProfileDeleteError,
  };
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedClerkUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as RegisterProfileBody;

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
    const { data: cohort, error: cohortError } = await supabase
      .from("cohorts")
      .select("id")
      .eq("id", cohortId)
      .maybeSingle();

    if (cohortError || !cohort) {
      return NextResponse.json(
        { error: "Selected cohort could not be found." },
        { status: 400 },
      );
    }

    const existingProfile = await getProfileByClerkUserId(
      supabase,
      authUser.userId,
    );

    let userId = existingProfile?.id ?? null;

    if (userId) {
      let { error: updateError } = await supabase
        .from("users")
        .update({
          email: authUser.email,
          name: authUser.name,
          university,
          stack,
          github: github.length > 0 ? github : null,
          availability: true,
          intent,
        })
        .eq("id", userId);

      if (updateError && isUniqueViolation(updateError)) {
        const reclaimResult = await reclaimStaleEmailProfile(
          supabase,
          authUser,
          userId,
        );

        if (reclaimResult.error) {
          return NextResponse.json(
            { error: "Unable to save your profile." },
            { status: 500 },
          );
        }

        if (reclaimResult.reclaimed) {
          const retryResult = await supabase
            .from("users")
            .update({
              email: authUser.email,
              name: authUser.name,
              university,
              stack,
              github: github.length > 0 ? github : null,
              availability: true,
              intent,
            })
            .eq("id", userId);

          updateError = retryResult.error;
        }
      }

      if (updateError) {
        console.error("[register/profile] update profile failed", updateError);
        return NextResponse.json(
          { error: "Unable to save your profile." },
          { status: 500 },
        );
      }
    } else {
      let { data: insertedProfile, error: insertError } =
        await insertUserProfile(supabase, authUser, {
          university,
          stack,
          github: github.length > 0 ? github : null,
          availability: true,
          intent,
        });

      if (insertError && isUniqueViolation(insertError)) {
        const reclaimResult = await reclaimStaleEmailProfile(
          supabase,
          authUser,
        );

        if (reclaimResult.error) {
          return NextResponse.json(
            { error: "Unable to create your profile." },
            { status: 500 },
          );
        }

        if (reclaimResult.reclaimed) {
          const retryResult = await insertUserProfile(supabase, authUser, {
            university,
            stack,
            github: github.length > 0 ? github : null,
            availability: true,
            intent,
          });

          insertedProfile = retryResult.data;
          insertError = retryResult.error;
        }
      }

      if (insertError || !insertedProfile) {
        console.error("[register/profile] create profile failed", insertError);
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

    const { data: existingLink, error: existingLinkError } = await supabase
      .from("user_cohorts")
      .select(
        "status, applied_at, qualified_at, enrolled_at, completed_at, qualifier_score, qualifier_feedback, qualifier_started_at, qualifier_submitted_at",
      )
      .eq("user_id", userId)
      .eq("cohort_id", cohortId)
      .maybeSingle();

    if (existingLinkError) {
      return NextResponse.json(
        { error: "Unable to check your cohort application." },
        { status: 500 },
      );
    }

    const nextStatus: UserCohortStatus = existingLink
      ? (existingLink.status as UserCohortStatus)
      : "applied";

    const { error: linkError } = await supabase.from("user_cohorts").upsert(
      {
        user_id: userId,
        cohort_id: cohortId,
        status: nextStatus,
        applied_at: existingLink?.applied_at ?? new Date().toISOString(),
        qualifier_score:
          nextStatus === "applied"
            ? null
            : (existingLink?.qualifier_score ?? null),
        qualifier_feedback:
          nextStatus === "applied"
            ? null
            : (existingLink?.qualifier_feedback ?? null),
        qualifier_started_at:
          nextStatus === "applied"
            ? null
            : (existingLink?.qualifier_started_at ?? null),
        qualifier_submitted_at:
          nextStatus === "applied"
            ? null
            : (existingLink?.qualifier_submitted_at ?? null),
        qualified_at:
          nextStatus === "applied"
            ? null
            : (existingLink?.qualified_at ?? null),
        enrolled_at:
          nextStatus === "applied" ? null : (existingLink?.enrolled_at ?? null),
        completed_at:
          nextStatus === "completed"
            ? (existingLink?.completed_at ?? null)
            : null,
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
