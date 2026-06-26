-- Create ai_screening_packets table
CREATE TABLE IF NOT EXISTS public.ai_screening_packets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE UNIQUE NOT NULL,
    user_id UUID REFERENCES public.new_users(id) NOT NULL,
    cycle_id UUID REFERENCES public.cycles(id) NOT NULL,
    domain_id UUID REFERENCES public.domains(id) NOT NULL,
    difficulty_level INT NOT NULL,
    questions_json JSONB,
    answers_json JSONB,
    model_used TEXT,
    fallback_used BOOLEAN DEFAULT false,
    prompt_version TEXT,
    generation_time_ms INT,
    difficulty_reason TEXT,
    generation_status TEXT CHECK (generation_status IN ('pending', 'generated', 'failed')) DEFAULT 'pending',
    generation_error TEXT,
    generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_screening_packets ENABLE ROW LEVEL SECURITY;

-- Add ai_screening_packet_id and question_snapshot_json to screening_attempts
ALTER TABLE public.screening_attempts
ADD COLUMN IF NOT EXISTS ai_screening_packet_id UUID REFERENCES public.ai_screening_packets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS question_snapshot_json JSONB;

-- Make question_set_id nullable in screening_attempts (it might already be, but ensuring)
ALTER TABLE public.screening_attempts
ALTER COLUMN question_set_id DROP NOT NULL;

-- Add AI settings to admin_settings if needed (just storing new keys like ai_screening_enabled)
-- Since admin_settings uses key/value or key/enabled structure, we can insert default rows.
INSERT INTO public.admin_settings (key, enabled)
VALUES 
  ('ai_screening_enabled', true),
  ('ai_screening_fallback_enabled', true)
ON CONFLICT (key) DO NOTHING;
