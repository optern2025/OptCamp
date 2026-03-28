import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetAuthenticatedClerkUser = vi.fn();
const mockGetProfileByClerkUserId = vi.fn();

const cohortsMaybeSingle = vi.fn();
const insertSingle = vi.fn();
const emailMaybeSingle = vi.fn();
const deleteEq = vi.fn();
const userCohortsMaybeSingle = vi.fn();
const upsertUserCohorts = vi.fn();

const insertSelect = vi.fn(() => ({
  single: insertSingle,
}));

const usersDelete = vi.fn(() => ({
  eq: deleteEq,
}));

const usersSelect = vi.fn((query: string) => {
  if (query === "id, clerk_user_id") {
    return {
      eq: vi.fn(() => ({
        maybeSingle: emailMaybeSingle,
      })),
    };
  }

  throw new Error(`Unexpected users select query: ${query}`);
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
        select: usersSelect,
        delete: usersDelete,
      };
    }

    if (table === "user_cohorts") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: userCohortsMaybeSingle,
            })),
          })),
        })),
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
      data: { id: "cohort-1" },
      error: null,
    });
    userCohortsMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });
    upsertUserCohorts.mockResolvedValue({ error: null });
    deleteEq.mockResolvedValue({ error: null });
  });

  it("reclaims a stale deleted-account row by email and retries the insert", async () => {
    insertSingle
      .mockResolvedValueOnce({
        data: null,
        error: { code: "23505", message: "duplicate key value" },
      })
      .mockResolvedValueOnce({
        data: { id: "user-new" },
        error: null,
      });

    emailMaybeSingle.mockResolvedValue({
      data: { id: "user-old", clerk_user_id: "clerk-user-old" },
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
          cohortId: "cohort-1",
          stack: "Full Stack",
          github: "https://github.com/example",
          availability: true,
          intent: "Build.",
        }),
      }) as never,
    );

    expect(response.status).toBe(200);
    expect(usersDelete).toHaveBeenCalled();
    expect(deleteEq).toHaveBeenCalledWith("id", "user-old");
    expect(insertSingle).toHaveBeenCalledTimes(2);
    expect(upsertUserCohorts).toHaveBeenCalled();
  });
});
