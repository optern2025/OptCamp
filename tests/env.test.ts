import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

async function importEnvModule() {
  vi.resetModules();
  return import("@/lib/env");
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("env helpers", () => {
  it("accepts a legacy JWT service role key", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://wrxmogicnnobovczkrcp.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      "header.payload.signature";

    const { getSupabaseServiceRoleKey, getSupabaseUrl } =
      await importEnvModule();

    expect(getSupabaseUrl()).toBe(
      "https://wrxmogicnnobovczkrcp.supabase.co",
    );
    expect(getSupabaseServiceRoleKey()).toBe("header.payload.signature");
  });

  it("accepts a modern sb_secret key alias", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://wrxmogicnnobovczkrcp.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_example";

    const { getSupabaseServiceRoleKey } = await importEnvModule();

    expect(getSupabaseServiceRoleKey()).toBe("sb_secret_example");
  });

  it("rejects truncated placeholder secrets", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://wrxmogicnnobovczkrcp.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

    const { getSupabaseServiceRoleKey } = await importEnvModule();

    expect(() => getSupabaseServiceRoleKey()).toThrow(
      /placeholder or truncated token/i,
    );
  });

  it("rejects invalid URLs", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-url";

    const { getSupabaseUrl } = await importEnvModule();

    expect(() => getSupabaseUrl()).toThrow(/invalid supabase url/i);
  });
});
