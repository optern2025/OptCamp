import { beforeEach, describe, expect, it, vi } from "vitest";

const mockVerifyWebhook = vi.fn();
const deleteEq = vi.fn();

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table !== "users") {
      throw new Error(`Unexpected table: ${table}`);
    }

    return {
      delete: vi.fn(() => ({
        eq: deleteEq,
      })),
    };
  }),
};

vi.mock("@clerk/nextjs/webhooks", () => ({
  verifyWebhook: mockVerifyWebhook,
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdminClient: () => mockSupabase,
}));

describe("POST /api/webhooks/clerk", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    deleteEq.mockResolvedValue({ error: null });
  });

  it("deletes the Supabase user profile for user.deleted webhooks", async () => {
    mockVerifyWebhook.mockResolvedValue({
      type: "user.deleted",
      data: {
        id: "clerk-user-1",
      },
    });

    const { POST } = await import("@/app/api/webhooks/clerk/route");
    const response = await POST(
      new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
      }),
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true });
    expect(mockSupabase.from).toHaveBeenCalledWith("users");
    expect(deleteEq).toHaveBeenCalledWith("clerk_user_id", "clerk-user-1");
  });

  it("ignores webhook events that are not user deletions", async () => {
    mockVerifyWebhook.mockResolvedValue({
      type: "user.created",
      data: {
        id: "clerk-user-1",
      },
    });

    const { POST } = await import("@/app/api/webhooks/clerk/route");
    const response = await POST(
      new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("returns 400 when Clerk webhook verification fails", async () => {
    mockVerifyWebhook.mockRejectedValue(new Error("Webhook signature invalid"));

    const { POST } = await import("@/app/api/webhooks/clerk/route");
    const response = await POST(
      new Request("http://localhost/api/webhooks/clerk", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(400);
  });
});
