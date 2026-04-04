import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetAuthenticatedClerkUser = vi.fn();
const mockGetProfileByClerkUserId = vi.fn();

const cohortsMaybeSingle = vi.fn();
const insertSingle = vi.fn();
const emailEq = vi.fn();
const deleteEq = vi.fn();
const updateEq = vi.fn();
const userCohortsByUserEq = vi.fn();
const userCohortsByTargetEq = vi.fn();
const userCohortsMaybeSingle = vi.fn();
const upsertUserCohorts = vi.fn();

const insertSelect = vi.fn(() => ({
  single: insertSingle,
}));

const usersDelete = vi.fn(() => ({
  eq: deleteEq,
}));

const usersUpdate = vi.fn(() => ({
  eq: updateEq,
}));

const usersSelect = vi.fn((query: string) => {
  if (query === "id, clerk_user_id") {
    return {
      eq: emailEq,
    };
  }

  throw new Error(`Unexpected users select query: ${query}`);
});

const userCohortsSelect = vi.fn((query: string) => {
  if (
    query ===
    "cohort_id, status, applied_at, qualified_at, enrolled_at, completed_at, qualifier_score, qualifier_feedback, qualifier_started_at, qualifier_submitted_at"
  ) {
    return {
      eq: userCohortsByUserEq,
    };
  }

  if (query === "cohort_id") {
    return {
      eq: userCohortsByTargetEq,
    };
  }

  return {
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: userCohortsMaybeSingle,
      })),
    })),
  };
});

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

    if (table === "users") {
      return {
        insert: vi.fn(() => ({
          select: insertSelect,
        })),
        update: usersUpdate,
        select: usersSelect,
        delete: usersDelete,
      };
    }

    if (table === "user_cohorts") {
      return {
        select: userCohortsSelect,
        upsert: upsertUserCohorts,
      };
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

describe("POST /api/register/profile", () => {
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
        application_open_date: "2026-04-01",
        application_close_date: "2026-04-10",
        qualifier_open_date: "2026-04-11",
        qualifier_close_date: "2026-04-12",
        sprint_start_date: "2026-04-13",
        sprint_end_date: "2026-04-16",
        schedule_timezone: "Asia/Kolkata",
      },
      error: null,
    });
    userCohortsMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });
    emailEq.mockResolvedValue({
      data: [],
      error: null,
    });
    userCohortsByUserEq.mockResolvedValue({
      data: [],
      error: null,
    });
    userCohortsByTargetEq.mockResolvedValue({
      data: [],
      error: null,
    });
    upsertUserCohorts.mockResolvedValue({ error: null });
    deleteEq.mockResolvedValue({ error: null });
    updateEq.mockResolvedValue({ error: null });
  });

  it("claims an existing email profile and deletes duplicate stale rows before linking the cohort", async () => {
    emailEq.mockResolvedValue({
      data: [
        { id: "user-old", clerk_user_id: "clerk-user-old" },
        { id: "user-older", clerk_user_id: "clerk-user-older" },
      ],
      error: null,
    });

    userCohortsByUserEq.mockResolvedValue({
      data: [
        {
          cohort_id: "cohort-old",
          status: "applied",
          applied_at: "2026-03-01T00:00:00.000Z",
          qualified_at: null,
          enrolled_at: null,
          completed_at: null,
          qualifier_score: null,
          qualifier_feedback: null,
          qualifier_started_at: null,
          qualifier_submitted_at: null,
        },
      ],
      error: null,
    });

    userCohortsByTargetEq.mockResolvedValue({
      data: [],
      error: null,
    });

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

    expect(response.status).toBe(200);
    expect(insertSingle).not.toHaveBeenCalled();
    expect(usersUpdate).toHaveBeenCalledTimes(1);
    expect(deleteEq).toHaveBeenCalledWith("id", "user-older");
    expect(upsertUserCohorts).toHaveBeenCalled();
  });

  it("reclaims stale duplicate-email rows during profile update before saving", async () => {
    mockGetProfileByClerkUserId.mockResolvedValue({
      id: "user-current",
      email: "old@example.com",
      name: "Candidate",
      university: "IIT Delhi",
      phone: null,
      stack: "Full Stack",
      github: null,
      availability: true,
      intent: "Build.",
      created_at: "2026-03-01T00:00:00.000Z",
      updated_at: "2026-03-01T00:00:00.000Z",
    });

    emailEq.mockResolvedValue({
      data: [
        { id: "user-current", clerk_user_id: "clerk-user-new" },
        { id: "user-stale", clerk_user_id: "clerk-user-old" },
      ],
      error: null,
    });

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

    expect(response.status).toBe(200);
    expect(usersUpdate).toHaveBeenCalledTimes(1);
    expect(deleteEq).toHaveBeenCalledWith("id", "user-stale");
    expect(upsertUserCohorts).toHaveBeenCalled();
  });
});
