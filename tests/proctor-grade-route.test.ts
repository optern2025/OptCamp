import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetAuthenticatedClerkUser = vi.fn();
const mockGetProfileByClerkUserId = vi.fn();
const mockGetQualifierTiming = vi.fn();
const mockBuildFallbackGrade = vi.fn();

const membershipMaybeSingle = vi.fn();
const insertInsert = vi.fn();
const updateEq = vi.fn();
const updateEq2 = vi.fn();

vi.mock("@/lib/clerkServer", () => ({
  getAuthenticatedClerkUser: mockGetAuthenticatedClerkUser,
}));

vi.mock("@/lib/dashboard", () => ({
  getProfileByClerkUserId: mockGetProfileByClerkUserId,
}));

vi.mock("@/lib/qualifierTiming", () => ({
  QUALIFIER_DURATION_SECONDS: 3 * 60 * 60,
  getQualifierTiming: mockGetQualifierTiming,
}));

vi.mock("@/lib/grading", () => ({
  buildFallbackGrade: mockBuildFallbackGrade,
  gradeWithGemini: vi.fn(),
}));

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === "user_cohorts") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: membershipMaybeSingle,
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: updateEq,
        })),
      };
    }

    if (table === "qualifier_attempts") {
      return {
        insert: insertInsert,
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  }),
};

updateEq.mockReturnValue({
  eq: updateEq2,
});
updateEq2.mockResolvedValue({ error: null });

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdminClient: () => mockSupabase,
}));

describe("POST /api/proctor/grade", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockGetAuthenticatedClerkUser.mockResolvedValue({
      userId: "clerk-user-1",
      email: "candidate@example.com",
      name: "Candidate",
    });
    mockGetProfileByClerkUserId.mockResolvedValue({ id: "user-1" });
    membershipMaybeSingle.mockResolvedValue({
      data: {
        status: "qualifier_in_progress",
        applied_at: "2026-03-27T09:00:00.000Z",
        qualifier_started_at: "2026-03-27T10:00:00.000Z",
        qualifier_submitted_at: null,
      },
      error: null,
    });
    mockGetQualifierTiming.mockReturnValue({
      hasStarted: true,
      attemptExpired: false,
      canResume: true,
    });
    mockBuildFallbackGrade.mockReturnValue({
      score: 88,
      feedback: "Internal only feedback",
      passed: true,
    });
    insertInsert.mockResolvedValue({ error: null });
  });

  it("returns candidate-safe submission status without score or feedback", async () => {
    const { POST } = await import("@/app/api/proctor/grade/route");
    const request = new Request("http://localhost/api/proctor/grade", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cohortId: "cohort-1",
        examId: "QLF-1",
        subject: "Qualifier",
        cohortType: "AI / ML",
        answers: [
          {
            questionId: "q1",
            question: "Prompt",
            answer: "Answer",
          },
        ],
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.status).toBe("passed");
    expect(payload).not.toHaveProperty("score");
    expect(payload).not.toHaveProperty("feedback");
  });
});
