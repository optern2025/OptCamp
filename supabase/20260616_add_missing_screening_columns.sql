-- Migration to add missing columns to domains and screening_questions

ALTER TABLE public.domains 
ADD COLUMN IF NOT EXISTS slug text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update existing domains to have slugs if missing
UPDATE public.domains SET slug = lower(regexp_replace(name, '\s+', '-', 'g')) WHERE slug IS NULL;

-- Make slug unique
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'domains_slug_key') THEN
    ALTER TABLE public.domains ADD CONSTRAINT domains_slug_key UNIQUE (slug);
  END IF;
END $$;

ALTER TABLE public.screening_question_sets
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.screening_questions
ADD COLUMN IF NOT EXISTS explanation text;
