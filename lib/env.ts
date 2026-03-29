function readEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    const normalized = value?.trim();
    if (normalized) {
      return normalized;
    }
  }

  throw new Error(
    `Missing required environment variable: ${names.join(" or ")}`,
  );
}

function assertValidSupabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!/^https:$/.test(parsed.protocol)) {
      throw new Error("Supabase URL must use https.");
    }
  } catch {
    throw new Error(
      "Invalid Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL to the full project URL.",
    );
  }

  return url;
}

function assertValidSupabaseSecret(secret: string): string {
  const normalized = secret.trim();
  const looksLikeLegacyJwt = normalized.split(".").length === 3;
  const looksLikeModernSecret = normalized.startsWith("sb_secret_");

  if (
    normalized.includes("...") ||
    normalized.includes("your-supabase") ||
    normalized.includes("service-role-key") ||
    normalized.includes("YOUR_")
  ) {
    throw new Error(
      "Invalid Supabase secret key. The configured value looks like a placeholder or truncated token.",
    );
  }

  if (!looksLikeLegacyJwt && !looksLikeModernSecret) {
    throw new Error(
      "Invalid Supabase secret key. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY to a full Supabase server secret.",
    );
  }

  return normalized;
}

export function getSupabaseUrl(): string {
  return assertValidSupabaseUrl(
    readEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"),
  );
}

export function getSupabaseServiceRoleKey(): string {
  return assertValidSupabaseSecret(
    readEnv("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"),
  );
}

export function getAppUrl(): string {
  return readEnv("NEXT_PUBLIC_APP_URL");
}
