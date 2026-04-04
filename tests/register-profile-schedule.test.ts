import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetAuthenticatedClerkUser = vi.fn();
const mockGetProfileByClerkUserId = vi.fn();
const cohortsMaybeSingle = vi.fn();

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === "cohorts") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: cohortsMaybeSingle,
          })),
        })),
      };
    }

    if (table === "users" || table === "user_cohorts") {
      throw new Error(
        `Unexpected table access during schedule rejection: ${table}`,
      );
    }

    throw new Error(`Unexpected table: ${table}`);
  }),
};

vi.mock("@/lib/clerkServer", () => ({
  getAuthenticatedClerkUser: mockGetAuthenticatedClerkUser,
}));

vi.mock("@/lib/dashboard", () => ({
  getProfileByClerkUserId: mockGetProfileByClerkUserId,
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdminClient: () => mockSupabase,
}));

describe("POST /api/register/profile schedule enforcement", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockGetAuthenticatedClerkUser.mockResolvedValue({
      userId: "clerk-user-new",
      email: "candidate@example.com",
      name: "Candidate",
    });
    mockGetProfileByClerkUserId.mockResolvedValue(null);
    cohortsMaybeSingle.mockResolvedValue({
      data: {
        id: "cohort-1",
        application_open_date: "2026-03-26",
        application_close_date: "2026-03-27",
        qualifier_open_date: "2026-03-30",
        qualifier_close_date: "2026-03-31",
        sprint_start_date: "2026-04-01",
        sprint_end_date: "2026-04-04",
        schedule_timezone: "Asia/Kolkata",
      },
      error: null,
    });
  });

  it("rejects applications after the configured application window", async () => {
    const { POST } = await import("@/app/api/register/profile/route");
    const response = await POST(
      new Request("http://localhost/api/register/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          university: "IIT Delhi",
          phone: "+91 9999999999",
          cohortId: "cohort-1",
          stack: "Full Stack",
          github: "https://github.com/example",
          availability: true,
          intent: "Build.",
        }),
      }) as never,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "Applications are only open from 26 & 27th March.",
    });
  });
});
