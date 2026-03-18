import { NextResponse } from "next/server";
import { getAuthenticatedClerkUser } from "@/lib/clerkServer";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface ProctorQuestion {
  id: number;
  text: string;
}

const QUESTION_BANK: Record<string, ProctorQuestion[]> = {
  ENGINEERING: [
    {
      id: 1,
      text: "Design a fault-tolerant service rollout plan for a production API used by 1M daily users.",
    },
    {
      id: 2,
      text: "Given intermittent latency spikes, explain your debugging sequence, tooling, and escalation criteria.",
    },
    {
      id: 3,
      text: "Describe how you would decompose a 4-day sprint into milestones, owners, and measurable acceptance criteria.",
    },
    {
      id: 4,
      text: "A candidate PR improves performance but reduces readability. Explain your review decision and rationale.",
    },
    {
      id: 5,
      text: "Outline an incident communication template for engineers, founders, and external stakeholders.",
    },
  ],
  MARKETING: [
    {
      id: 1,
      text: "Create a launch strategy for a new product with a $5,000 budget and a 2-week timeline.",
    },
    {
      id: 2,
      text: "How would you diagnose underperforming ad campaigns and decide between creative, audience, or channel changes?",
    },
    {
      id: 3,
      text: "Define a metric framework for top-of-funnel to conversion for a high-intent B2B offering.",
    },
    {
      id: 4,
      text: "Write a concise messaging narrative for skeptical users comparing your product against incumbents.",
    },
    {
      id: 5,
      text: "Explain your approach to balancing short-term performance growth with long-term brand trust.",
    },
  ],
  GENERAL: [
    {
      id: 1,
      text: "Describe a high-pressure project where scope, deadline, and quality were all constrained. What did you prioritize?",
    },
    {
      id: 2,
      text: "How do you translate ambiguous goals from leadership into executable work within 24 hours?",
    },
    {
      id: 3,
      text: "Explain your strategy for handling blockers when dependencies are owned by other teams.",
    },
    {
      id: 4,
      text: "What makes written updates effective for stakeholders who are not involved day-to-day?",
    },
    {
      id: 5,
      text: "Define your personal quality bar for shipping work under strict time pressure.",
    },
  ],
};

function getQuestionsByCohortType(cohortType: string): ProctorQuestion[] {
  const normalized = cohortType.trim().toUpperCase();

  if (normalized.includes("ENGINEER")) {
    return QUESTION_BANK.ENGINEERING;
  }

  if (normalized.includes("MARKET")) {
    return QUESTION_BANK.MARKETING;
  }

  return QUESTION_BANK.GENERAL;
}

export async function GET() {
  try {
    const authUser = await getAuthenticatedClerkUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", authUser.userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Unable to load your profile." },
        { status: 500 },
      );
    }

    const { data: activeCohortLink, error: activeCohortError } = await supabase
      .from("user_cohorts")
      .select("cohorts (id, slug, type, is_active)")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .order("applied_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeCohortError) {
      return NextResponse.json(
        { error: "Unable to load your active cohort." },
        { status: 500 },
      );
    }

    const cohort = activeCohortLink?.cohorts ?? null;

    if (!cohort) {
      return NextResponse.json(
        { error: "No active cohort is assigned to your profile." },
        { status: 409 },
      );
    }

    const questions = getQuestionsByCohortType(cohort.type);

    return NextResponse.json({
      examId: `QLF-${cohort.slug.toUpperCase()}`,
      subject: `${cohort.type} Qualifier`,
      cohortType: cohort.type,
      durationSeconds: 15 * 60,
      questions,
      cohortActive: cohort.is_active,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected server error.",
      },
      { status: 500 },
    );
  }
}
