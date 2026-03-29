import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminSettings } from "@/lib/types";

const TIME_LIMITS_ENABLED_KEY = "time_limits_enabled";

interface AdminSettingRow {
  key: string;
  enabled: boolean;
}

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  time_limits_enabled: true,
};

export async function loadAdminSettings(
  supabase: SupabaseClient,
): Promise<AdminSettings> {
  const { data, error } = await supabase
    .from("admin_settings")
    .select("key, enabled")
    .eq("key", TIME_LIMITS_ENABLED_KEY)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load admin settings.");
  }

  const row = (data as AdminSettingRow | null) ?? null;

  return {
    time_limits_enabled: row?.enabled ?? DEFAULT_ADMIN_SETTINGS.time_limits_enabled,
  };
}

export async function saveAdminSettings(
  supabase: SupabaseClient,
  settings: AdminSettings,
): Promise<void> {
  const { error } = await supabase.from("admin_settings").upsert(
    {
      key: TIME_LIMITS_ENABLED_KEY,
      enabled: settings.time_limits_enabled,
    },
    { onConflict: "key" },
  );

  if (error) {
    throw new Error("Unable to save admin settings.");
  }
}
