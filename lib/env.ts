function readEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseUrl(): string {
  return readEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabaseServiceRoleKey(): string {
  return readEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function getResendApiKey(): string {
  return readEnv("RESEND_API_KEY");
}

export function getQualifierFromEmail(): string {
  return readEnv("QUALIFIER_FROM_EMAIL");
}

export function getAppUrl(): string {
  return readEnv("NEXT_PUBLIC_APP_URL");
}
