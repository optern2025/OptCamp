import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminSettings } from "@/lib/types";

const TIME_LIMITS_ENABLED_KEY = "time_limits_enabled";

interface AdminSettingRow {
  key: string;
  enabled: boolean;
}

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  time_limits_enabled: true,
  ai_screening_enabled: true,
  ai_model: "gemini-2.5-flash",
  ai_fallback_model: "gemini-2.5-flash-lite",
  ai_pass_percentage: 70,
  ai_max_difficulty: 5,
  // Centralized grading config (weights are 1 = inactive until future release)
  pass_threshold: 70,
  confidence_threshold: 60,
  practical_weight: 1,
  mcq_weight: 1,
};

export async function loadAdminSettings(
  supabase: SupabaseClient,
): Promise<AdminSettings> {
  const { data, error } = await supabase
    .from("admin_settings")
    .select("key, enabled, value"); // assuming we add a value column if needed, but since it's only enabled, we'll use enabled as a flag or string.

  if (error) {
    if (error.code !== "PGRST116") { // Ignore 'not found' errors
      console.error("loadAdminSettings error:", error);
    }
    // We will not throw here, we'll fall back to defaults
  }

  const rows = data || [];
  
  const getBool = (key: string, def: boolean) => {
    const row = rows.find(r => r.key === key);
    return row ? !!row.enabled : def;
  };

  const getString = (key: string, def: string) => {
    const row = rows.find(r => r.key === key);
    return (row && row.value) ? String(row.value) : def;
  };

  const getNumber = (key: string, def: number) => {
    const row = rows.find(r => r.key === key);
    if (row && row.value !== null && row.value !== undefined) {
      const parsed = parseInt(String(row.value), 10);
      if (!isNaN(parsed)) return parsed;
    }
    return def;
  };
  
  const passThreshold = getNumber("screening_pass_percentage", DEFAULT_ADMIN_SETTINGS.pass_threshold);

  return {
    time_limits_enabled: getBool("time_limits_enabled", DEFAULT_ADMIN_SETTINGS.time_limits_enabled),
    ai_screening_enabled: getBool("ai_screening_enabled", DEFAULT_ADMIN_SETTINGS.ai_screening_enabled),
    ai_model: getString("gemini_primary_model", process.env.GEMINI_PRIMARY_MODEL || DEFAULT_ADMIN_SETTINGS.ai_model),
    ai_fallback_model: getString("gemini_fallback_model", process.env.GEMINI_FALLBACK_MODEL || DEFAULT_ADMIN_SETTINGS.ai_fallback_model),
    ai_pass_percentage: passThreshold,
    ai_max_difficulty: getNumber("screening_max_difficulty", DEFAULT_ADMIN_SETTINGS.ai_max_difficulty),
    // Grading config — configurable from DB, defaulting to safe values
    pass_threshold: passThreshold,
    confidence_threshold: getNumber("grading_confidence_threshold", DEFAULT_ADMIN_SETTINGS.confidence_threshold),
    practical_weight: getNumber("grading_practical_weight", DEFAULT_ADMIN_SETTINGS.practical_weight),
    mcq_weight: getNumber("grading_mcq_weight", DEFAULT_ADMIN_SETTINGS.mcq_weight),
  };
}

export async function saveAdminSettings(
  supabase: SupabaseClient,
  settings: Partial<AdminSettings>,
): Promise<void> {
  const rows = [];
  if (settings.time_limits_enabled !== undefined) rows.push({ key: "time_limits_enabled", enabled: settings.time_limits_enabled });
  if (settings.ai_screening_enabled !== undefined) rows.push({ key: "ai_screening_enabled", enabled: settings.ai_screening_enabled });
  
  if (rows.length === 0) return;

  const { error } = await supabase.from("admin_settings").upsert(rows, { onConflict: "key" });

  if (error) {
    throw new Error("Unable to save admin settings.");
  }
}
