import type {
  AssessmentChoice,
  AssessmentQuestion,
  AssessmentQuestionType,
  CohortStage,
  QualifierTemplate,
} from "@/lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeText(item))
    .filter((item) => item.length > 0);
}

function normalizeChoices(value: unknown): AssessmentChoice[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const choices: AssessmentChoice[] = [];

  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) {
      continue;
    }

    const label = normalizeText(item.label) || normalizeText(item.text) || "";
    if (!label) {
      continue;
    }

    choices.push({
      id: normalizeText(item.id) || `option-${index + 1}`,
      label,
      detail: normalizeText(item.detail) || undefined,
    });
  }

  return choices;
}

function normalizeQuestionType(value: unknown): AssessmentQuestionType {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "mcq" || normalized === "debug") {
    return normalized;
  }

  return "scenario";
}

export function normalizeAssessmentQuestions(
  raw: unknown,
): AssessmentQuestion[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const questions: AssessmentQuestion[] = [];

  for (const [index, item] of raw.entries()) {
    if (!isRecord(item)) {
      continue;
    }

    const prompt = normalizeText(item.prompt);
    if (!prompt) {
      continue;
    }

    const type = normalizeQuestionType(item.type);
    const base = {
      id: normalizeText(item.id) || `q${index + 1}`,
      prompt,
      guidance: normalizeText(item.guidance),
      rubric: normalizeText(item.rubric) || undefined,
      solution: normalizeText(item.solution) || undefined,
    };

    if (type === "mcq") {
      questions.push({
        ...base,
        type: "mcq",
        options: normalizeChoices(item.options),
        correctOptionIds: normalizeStringArray(item.correctOptionIds),
        allowMultiple:
          typeof item.allowMultiple === "boolean" ? item.allowMultiple : false,
      });
      continue;
    }

    if (type === "debug") {
      questions.push({
        ...base,
        type: "debug",
        language: normalizeText(item.language) || undefined,
        starterCode:
          normalizeText(item.starterCode) ||
          normalizeText(item.code) ||
          undefined,
        expectedOutcome: normalizeText(item.expectedOutcome) || undefined,
      });
      continue;
    }

    questions.push({
      ...base,
      type: "scenario",
      deliverable: normalizeText(item.deliverable) || undefined,
      constraints: normalizeStringArray(item.constraints),
    });
  }

  return questions;
}

export function buildDefaultQualifierTemplate(
  cohortId: string,
  cohortSlug: string,
  cohortType: string,
): QualifierTemplate {
  const normalizedType = cohortType.trim().toUpperCase();
  const sharedId = `default-${cohortSlug}`;

  if (normalizedType.includes("ENGINEER")) {
    return {
      id: sharedId,
      cohort_id: cohortId,
      duration_seconds: 20 * 60,
      updated_at: new Date(0).toISOString(),
      questions: [
        {
          id: "q1",
          type: "mcq",
          prompt:
            "Which release pattern is best for validating a risky API change against a small slice of live traffic first?",
          guidance: "Choose the safest progressive delivery approach.",
          rubric:
            "Prefer techniques that limit blast radius before full rollout.",
          options: [
            { id: "blue-green", label: "Blue-green cutover to all users" },
            {
              id: "canary",
              label: "Canary release with staged percentage ramp",
            },
            {
              id: "big-bang",
              label: "Single production deploy during off-hours",
            },
            { id: "shadow", label: "Shadow deploy without user-facing reads" },
          ],
          correctOptionIds: ["canary"],
          allowMultiple: false,
        },
        {
          id: "q2",
          type: "debug",
          prompt:
            "A service shows intermittent p95 latency spikes after a dependency upgrade. Walk through your debugging sequence.",
          guidance:
            "Explain hypotheses, telemetry, reproduction strategy, and rollback criteria.",
          rubric:
            "Strong answers isolate the change, inspect traces, compare baselines, and define mitigation steps.",
          language: "typescript",
          starterCode: [
            "export async function fetchAccount(id: string) {",
            "  const profile = await profileClient.get(id);",
            "  const invoices = await billingClient.listInvoices(id);",
            "  return { profile, invoices };",
            "}",
          ].join("\n"),
          expectedOutcome:
            "Identify where to instrument, what to compare pre/post upgrade, and how to restore stability.",
        },
        {
          id: "q3",
          type: "scenario",
          prompt:
            "Design the first 48 hours of an engineering sprint for shipping a customer-facing reliability fix.",
          guidance:
            "Break down milestones, owners, acceptance criteria, and risk controls.",
          rubric:
            "Look for sequencing, practical execution, and stakeholder communication.",
          deliverable: "Execution plan",
          constraints: [
            "One backend engineer and one frontend engineer",
            "Fix must be observable in production metrics",
            "Stakeholder update due end of day two",
          ],
        },
      ],
    };
  }

  if (normalizedType.includes("MARKET")) {
    return {
      id: sharedId,
      cohort_id: cohortId,
      duration_seconds: 18 * 60,
      updated_at: new Date(0).toISOString(),
      questions: [
        {
          id: "q1",
          type: "mcq",
          prompt:
            "Which metric best reflects whether a paid campaign is attracting qualified signups rather than low-intent traffic?",
          guidance: "Pick the signal closest to quality-adjusted conversion.",
          rubric: "Favor outcome metrics over vanity traffic metrics.",
          options: [
            { id: "ctr", label: "Click-through rate" },
            { id: "cplq", label: "Cost per qualified lead" },
            { id: "impressions", label: "Total impressions" },
            { id: "reach", label: "Unique reach" },
          ],
          correctOptionIds: ["cplq"],
          allowMultiple: false,
        },
        {
          id: "q2",
          type: "debug",
          prompt:
            "Campaign spend is flat but conversions fell 35% week-over-week. Describe your diagnosis flow.",
          guidance:
            "Separate audience, creative, landing-page, and attribution causes.",
          rubric:
            "Great answers prioritize evidence gathering and fast experiment design.",
          language: "sql",
          starterCode: [
            "select channel, week, clicks, conversions, spend",
            "from campaign_performance",
            "where week >= current_date - interval '14 days';",
          ].join("\n"),
          expectedOutcome:
            "Use performance segments to isolate the drop and propose the next experiments.",
        },
        {
          id: "q3",
          type: "scenario",
          prompt:
            "Create a two-week sprint plan for launching a niche B2B product with a $5,000 budget.",
          guidance:
            "Show channel choices, messaging, milestones, and how you’ll learn quickly.",
          rubric:
            "Strong answers balance focus, measurement, and realistic execution.",
          deliverable: "Launch sprint brief",
          constraints: [
            "No paid budget can be committed before day three",
            "Founder wants daily updates",
            "Only one marketer and one designer available",
          ],
        },
      ],
    };
  }

  if (normalizedType.includes("SECUR") || normalizedType.includes("CYBER")) {
    return {
      id: sharedId,
      cohort_id: cohortId,
      duration_seconds: 18 * 60,
      updated_at: new Date(0).toISOString(),
      questions: [
        {
          id: "q1",
          type: "mcq",
          prompt:
            "What is the best first move when a new web app is suspected to have exposed credentials?",
          guidance:
            "Choose the action that reduces risk fastest while preserving evidence.",
          rubric:
            "Strong answers contain the breach, rotate secrets, and keep investigation evidence intact.",
          options: [
            {
              id: "ignore",
              label: "Ignore it until logs confirm a compromise",
            },
            {
              id: "rotate",
              label: "Rotate exposed secrets and isolate the affected surface",
            },
            {
              id: "redeploy",
              label: "Redeploy the app immediately without any investigation",
            },
            {
              id: "announce",
              label: "Publish a public notice before confirming scope",
            },
          ],
          correctOptionIds: ["rotate"],
          allowMultiple: false,
        },
        {
          id: "q2",
          type: "debug",
          prompt:
            "An internal dashboard is leaking more data than the role should allow. Describe how you would debug the authorization issue.",
          guidance:
            "Cover identity, authorization checks, logging, and validation of the fix.",
          rubric:
            "Look for least-privilege thinking, step-by-step verification, and safe rollback planning.",
          language: "typescript",
          starterCode: [
            "export async function loadCustomerReport(userId: string) {",
            "  const user = await authClient.currentUser(userId);",
            "  const report = await reportService.fetchAll();",
            "  return { user, report };",
            "}",
          ].join("\n"),
          expectedOutcome:
            "Identify where the access check is missing and how to confirm the fix prevents data leakage.",
        },
        {
          id: "q3",
          type: "scenario",
          prompt:
            "Design the first 48 hours of a cyber security sprint for hardening a product after a risk review.",
          guidance:
            "Break the plan into priorities, owners, validation, and communication checkpoints.",
          rubric:
            "Look for practical triage, clear sequencing, and measurable security outcomes.",
          deliverable: "Incident response plan",
          constraints: [
            "One engineer and one security reviewer are available",
            "Production traffic must stay online",
            "A risk update is due at the end of day two",
          ],
        },
      ],
    };
  }

  return {
    id: sharedId,
    cohort_id: cohortId,
    duration_seconds: 18 * 60,
    updated_at: new Date(0).toISOString(),
    questions: [
      {
        id: "q1",
        type: "mcq",
        prompt:
          "What is the strongest first step when goals are ambiguous and the deadline is close?",
        guidance:
          "Choose the answer that creates fast alignment and execution clarity.",
        rubric: "The best answer reduces ambiguity before work expands.",
        options: [
          {
            id: "wait",
            label: "Wait for a full written brief from leadership",
          },
          {
            id: "draft",
            label:
              "Draft a scoped plan with assumptions and confirm it quickly",
          },
          {
            id: "delegate",
            label: "Delegate planning to the whole team immediately",
          },
          {
            id: "research",
            label: "Collect background research for two days first",
          },
        ],
        correctOptionIds: ["draft"],
        allowMultiple: false,
      },
      {
        id: "q2",
        type: "debug",
        prompt:
          "A cross-functional sprint is slipping because dependencies are unclear. How do you debug the execution failure?",
        guidance:
          "Outline your sequence for identifying blockers, owners, and recovery steps.",
        rubric:
          "Good answers make dependencies visible and drive decisions quickly.",
        starterCode: [
          "Task A -> Task B -> Task C",
          "Owner(Task B) = TBD",
          "Daily status = inconsistent",
        ].join("\n"),
        expectedOutcome:
          "Clarify dependency ownership and create an actionable recovery plan.",
      },
      {
        id: "q3",
        type: "scenario",
        prompt:
          "Describe how you would execute a four-day sprint when scope, quality, and timeline are all tight.",
        guidance:
          "Show how you prioritize, communicate tradeoffs, and keep momentum.",
        rubric: "Look for judgment, sequencing, and crisp communication.",
        deliverable: "Sprint operating plan",
        constraints: [
          "You must publish one daily stakeholder update",
          "A visible demo is expected on the final day",
        ],
      },
    ],
  };
}

export function buildEmptyQualifierTemplate(
  cohortId: string,
): QualifierTemplate {
  return {
    id: "",
    cohort_id: cohortId,
    duration_seconds: 15 * 60,
    updated_at: "",
    questions: [],
  };
}

export function buildEmptyStage(
  cohortId: string,
  stageNumber: number,
): CohortStage {
  return {
    id: "",
    cohort_id: cohortId,
    stage_number: stageNumber,
    title: "",
    description: "",
    duration_minutes: 45,
    questions: [],
    created_at: "",
  };
}
