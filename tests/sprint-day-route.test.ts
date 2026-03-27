import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetAuthenticatedClerkUser = vi.fn();
const mockLoadDashboardData = vi.fn();
const mockGetProfileByClerkUserId = vi.fn();
const insertInsert = vi.fn();
const updateEq = vi.fn();
const updateEq2 = vi.fn();

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === "sprint_day_submissions") {
      return {
        insert: insertInsert,
      };
    }

    if (table === "user_cohorts") {
      return {
        update: vi.fn(() => ({
          eq: updateEq,
        })),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  }),
};

updateEq.mockReturnValue({
  eq: updateEq2,
});
updateEq2.mockReturnValue({
  neq: vi.fn().mockResolvedValue({ error: null }),
});

vi.mock("@/lib/clerkServer", () => ({
  getAuthenticatedClerkUser: mockGetAuthenticatedClerkUser,
}));

vi.mock("@/lib/dashboard", () => ({
  loadDashboardData: mockLoadDashboardData,
  getProfileByClerkUserId: mockGetProfileByClerkUserId,
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdminClient: () => mockSupabase,
}));

describe("POST /api/me/sprint-day", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    mockGetAuthenticatedClerkUser.mockResolvedValue(null);

    const { POST } = await import("@/app/api/me/sprint-day/route");
    const response = await POST(
      new Request("http://localhost/api/me/sprint-day", {
        method: "POST",
        body: JSON.stringify({}),
      }) as never,
    );

    expect(response.status).toBe(401);
  });

  it("rejects second submissions for the same sprint day", async () => {
    mockGetAuthenticatedClerkUser.mockResolvedValue({
      userId: "clerk-user-1",
      email: "candidate@example.com",
      name: "Candidate",
    });
    mockLoadDashboardData.mockResolvedValue({
      memberships: [
        {
          cohort: { id: "cohort-1" },
          sprint_days: [
            {
              id: "day-1",
              day_number: 1,
              submission: { id: "submission-1" },
              status: "submitted",
            },
          ],
        },
      ],
    });

    const { POST } = await import("@/app/api/me/sprint-day/route");
    const response = await POST(
      new Request("http://localhost/api/me/sprint-day", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cohortId: "cohort-1",
          sprintDayId: "day-1",
          githubUrl: "https://github.com/example/repo",
        }),
      }) as never,
    );

    expect(response.status).toBe(409);
    expect(insertInsert).not.toHaveBeenCalled();
  });
});
