-- Add missing columns to screening_attempts
ALTER TABLE public.screening_attempts
ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE;

-- Ensure screening_questions has explanation
ALTER TABLE public.screening_questions
ADD COLUMN IF NOT EXISTS explanation text;

-- Ensure domain_eligibility has waiver fields
ALTER TABLE public.domain_eligibility
ADD COLUMN IF NOT EXISTS waiver_eligible boolean DEFAULT false;

-- Add updated_at to screening_question_sets
ALTER TABLE public.screening_question_sets
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
