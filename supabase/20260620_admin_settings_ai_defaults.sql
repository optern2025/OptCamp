-- Add value column if it doesn't exist to support text/number configurations
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS value text;

-- Seed required AI settings
INSERT INTO public.admin_settings (key, enabled, value)
VALUES 
  ('ai_screening_enabled', true, null),
  ('gemini_primary_model', true, 'gemini-2.5-flash'),
  ('gemini_fallback_model', true, 'gemini-2.5-flash-lite'),
  ('screening_pass_percentage', true, '70'),
  ('screening_max_difficulty', true, '5')
ON CONFLICT (key) DO UPDATE SET 
  enabled = EXCLUDED.enabled,
  value = EXCLUDED.value;
