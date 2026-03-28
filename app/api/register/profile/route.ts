import { type NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClerkUser } from "@/lib/clerkServer";
import {
  formatDateRangeLabel,
  getCohortTimelineState,
} from "@/lib/cohortSchedule";
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

interface DebugPayload {
  branch: string;
  details: Record<string, unknown>;
}

class ValidationError extends Error {}

function logRegisterProfileEvent(
  label: string,
  details: Record<string, unknown>,
) {
  console.error(`[register/profile] ${label}`, details);
}

function buildErrorResponse(
  request: NextRequest,
  status: number,
  error: string,
  debugPayload?: DebugPayload,
) {
  const includeDebug =
    request.nextUrl?.searchParams.get("debug") === "1" ||
    new URL(request.url).searchParams.get("debug") === "1";

  return NextResponse.json(
    includeDebug && debugPayload
      ? {
          error,
          debug: debugPayload,
        }
      : { error },
    { status },
  );
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} is required.`);
  }

  return value.trim();
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

interface ExistingUserCohortLink {
  cohort_id: string;
  status: UserCohortStatus;
  applied_at: string;
  qualified_at: string | null;
  enrolled_at: string | null;
  completed_at: string | null;
  qualifier_score: number | null;
  qualifier_feedback: string | null;
  qualifier_started_at: string | null;
  qualifier_submitted_at: string | null;
}

async function listProfilesByEmail(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  email: string,
) {
  const { data, error } = await supabase
    .from("users")
    .select("id, clerk_user_id")
    .eq("email", email);

  return {
    data: (data as ExistingEmailProfile[] | null) ?? [],
    error,
  };
}

async function copyMissingCohortLinks(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  sourceUserId: string,
  targetUserId: string,
) {
  const { data: sourceLinks, error: sourceLinksError } = await supabase
    .from("user_cohorts")
    .select(
      "cohort_id, status, applied_at, qualified_at, enrolled_at, completed_at, qualifier_score, qualifier_feedback, qualifier_started_at, qualifier_submitted_at",
    )
    .eq("user_id", sourceUserId);

  if (sourceLinksError) {
    return sourceLinksError;
  }

  const staleLinks = (sourceLinks as ExistingUserCohortLink[] | null) ?? [];

  if (staleLinks.length === 0) {
    return null;
  }

  const { data: targetLinks, error: targetLinksError } = await supabase
    .from("user_cohorts")
    .select("cohort_id")
    .eq("user_id", targetUserId);

  if (targetLinksError) {
    return targetLinksError;
  }

  const targetCohortIds = new Set(
    ((targetLinks as Array<{ cohort_id: string }> | null) ?? []).map(
      (link) => link.cohort_id,
    ),
  );

  const linksToCopy = staleLinks
    .filter((link) => !targetCohortIds.has(link.cohort_id))
    .map((link) => ({
      user_id: targetUserId,
      cohort_id: link.cohort_id,
      status: link.status,
      applied_at: link.applied_at,
      qualified_at: link.qualified_at,
      enrolled_at: link.enrolled_at,
      completed_at: link.completed_at,
      qualifier_score: link.qualifier_score,
      qualifier_feedback: link.qualifier_feedback,
      qualifier_started_at: link.qualifier_started_at,
      qualifier_submitted_at: link.qualifier_submitted_at,
    }));

  if (linksToCopy.length === 0) {
    return null;
  }

  const { error: upsertError } = await supabase
    .from("user_cohorts")
    .upsert(linksToCopy, { onConflict: "user_id,cohort_id" });

  return upsertError;
}

async function reclaimStaleEmailProfiles(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  authUser: { userId: string; email: string },
  canonicalUserId: string,
) {
  const { data: emailProfiles, error: emailProfilesError } =
    await listProfilesByEmail(supabase, authUser.email);

  if (emailProfilesError) {
    return {
      error: emailProfilesError,
    };
  }

  const staleProfiles = emailProfiles.filter(
    (profile) =>
      profile.id !== canonicalUserId &&
      profile.clerk_user_id !== authUser.userId,
  );

  for (const staleProfile of staleProfiles) {
    const membershipCopyError = await copyMissingCohortLinks(
      supabase,
      staleProfile.id,
      canonicalUserId,
    );

    if (membershipCopyError) {
      return {
        error: membershipCopyError,
      };
    }

    const { error: staleProfileDeleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", staleProfile.id);

    if (staleProfileDeleteError) {
      return {
        error: staleProfileDeleteError,
      };
    }
  }

  return {
    error: null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedClerkUser();
    if (!authUser) {
      return buildErrorResponse(request, 401, "Unauthorized.");
    }

    const body = (await request.json()) as RegisterProfileBody;

    const university = requireNonEmptyString(body.university, "University");
    const stack = requireNonEmptyString(body.stack, "Stack");
    const intent = requireNonEmptyString(body.intent, "Intent");
    const cohortId = requireNonEmptyString(body.cohortId, "Cohort");

    const github = typeof body.github === "string" ? body.github.trim() : "";

    if (body.availability !== true) {
      return buildErrorResponse(
        request,
        400,
        "Sprint availability confirmation is required.",
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data: cohort, error: cohortError } = await supabase
      .from("cohorts")
      .select(
        "id, application_open_date, application_close_date, qualifier_open_date, qualifier_close_date, sprint_start_date, sprint_end_date, schedule_timezone",
      )
      .eq("id", cohortId)
      .maybeSingle();

    if (cohortError || !cohort) {
      return buildErrorResponse(
        request,
        400,
        "Selected cohort could not be found.",
      );
    }

    const timeline = getCohortTimelineState(cohort);
    if (!timeline.isApplicationOpen) {
      return buildErrorResponse(
        request,
        409,
        `Applications are only open from ${formatDateRangeLabel(
          cohort.application_open_date,
          cohort.application_close_date,
        )}.`,
      );
    }

    const existingProfile = await getProfileByClerkUserId(
      supabase,
      authUser.userId,
    );

    let userId = existingProfile?.id ?? null;

    if (userId) {
      const reclaimResult = await reclaimStaleEmailProfiles(
        supabase,
        authUser,
        userId,
      );

      if (reclaimResult.error) {
        const details = {
          clerkUserId: authUser.userId,
          email: authUser.email,
          userId,
          error: reclaimResult.error,
        };
        logRegisterProfileEvent("update reclaim failed", details);
        return buildErrorResponse(
          request,
          500,
          "Unable to save your profile.",
          {
            branch: "update reclaim failed",
            details,
          },
        );
      }

      const { error: updateError } = await supabase
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

      if (updateError) {
        const details = {
          clerkUserId: authUser.userId,
          email: authUser.email,
          userId,
          error: updateError,
        };
        logRegisterProfileEvent("update profile failed", details);
        return buildErrorResponse(
          request,
          500,
          "Unable to save your profile.",
          {
            branch: "update profile failed",
            details,
          },
        );
      }
    } else {
      const { data: emailProfiles, error: emailProfilesError } =
        await listProfilesByEmail(supabase, authUser.email);

      if (emailProfilesError) {
        const details = {
          clerkUserId: authUser.userId,
          email: authUser.email,
          error: emailProfilesError,
        };
        logRegisterProfileEvent("list profiles by email failed", details);
        return buildErrorResponse(
          request,
          500,
          "Unable to create your profile.",
          {
            branch: "list profiles by email failed",
            details,
          },
        );
      }

      const canonicalEmailProfile = emailProfiles[0] ?? null;

      if (canonicalEmailProfile) {
        const reclaimResult = await reclaimStaleEmailProfiles(
          supabase,
          authUser,
          canonicalEmailProfile.id,
        );

        if (reclaimResult.error) {
          const details = {
            clerkUserId: authUser.userId,
            email: authUser.email,
            canonicalUserId: canonicalEmailProfile.id,
            duplicateEmailProfileCount: emailProfiles.length,
            duplicateEmailProfileIds: emailProfiles.map(
              (profile) => profile.id,
            ),
            error: reclaimResult.error,
          };
          logRegisterProfileEvent("create reclaim failed", details);
          return buildErrorResponse(
            request,
            500,
            "Unable to create your profile.",
            {
              branch: "create reclaim failed",
              details,
            },
          );
        }

        const { error: updateError } = await supabase
          .from("users")
          .update({
            clerk_user_id: authUser.userId,
            email: authUser.email,
            name: authUser.name,
            university,
            stack,
            github: github.length > 0 ? github : null,
            availability: true,
            intent,
          })
          .eq("id", canonicalEmailProfile.id);

        if (updateError) {
          const details = {
            clerkUserId: authUser.userId,
            email: authUser.email,
            canonicalUserId: canonicalEmailProfile.id,
            duplicateEmailProfileCount: emailProfiles.length,
            duplicateEmailProfileIds: emailProfiles.map(
              (profile) => profile.id,
            ),
            error: updateError,
          };
          logRegisterProfileEvent("claim profile failed", details);
          return buildErrorResponse(
            request,
            500,
            "Unable to create your profile.",
            {
              branch: "claim profile failed",
              details,
            },
          );
        }

        userId = canonicalEmailProfile.id;
      } else {
        const { data: insertedProfile, error: insertError } =
          await insertUserProfile(supabase, authUser, {
            university,
            stack,
            github: github.length > 0 ? github : null,
            availability: true,
            intent,
          });

        if (insertError || !insertedProfile) {
          const insertedProfileId =
            (insertedProfile as { id?: string } | null | undefined)?.id ?? null;

          const details = {
            clerkUserId: authUser.userId,
            email: authUser.email,
            duplicateEmailProfileCount: emailProfiles.length,
            duplicateEmailProfileIds: emailProfiles.map(
              (profile) => profile.id,
            ),
            insertedProfileId,
            error: insertError,
          };
          logRegisterProfileEvent("create profile failed", details);
          return buildErrorResponse(
            request,
            500,
            "Unable to create your profile.",
            {
              branch: "create profile failed",
              details,
            },
          );
        }

        userId = insertedProfile.id;
      }
    }

    if (!userId) {
      return buildErrorResponse(
        request,
        500,
        "Unable to resolve your profile.",
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
      return buildErrorResponse(
        request,
        500,
        "Unable to check your cohort application.",
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
      return buildErrorResponse(
        request,
        500,
        "Unable to link your cohort application.",
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      return buildErrorResponse(request, 400, error.message);
    }

    return buildErrorResponse(
      request,
      500,
      error instanceof Error ? error.message : "Unexpected server error.",
    );
  }
}
