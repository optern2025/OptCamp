-- Phase E.5 Schema Updates for Domain Eligibility and Difficulty Progression

-- Ensure domain_eligibility has necessary columns
ALTER TABLE public.domain_eligibility
ADD COLUMN IF NOT EXISTS highest_score int,
ADD COLUMN IF NOT EXISTS highest_difficulty int,
ADD COLUMN IF NOT EXISTS total_attempts int DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add a unique constraint to (user_id, domain_id)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'domain_eligibility_user_domain_key') THEN
    ALTER TABLE public.domain_eligibility
    ADD CONSTRAINT domain_eligibility_user_domain_key UNIQUE (user_id, domain_id);
  END IF;
END $$;
