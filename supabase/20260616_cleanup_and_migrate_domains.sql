-- 1. Ensure columns exist on domains
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Ensure columns exist on screening tables
ALTER TABLE public.screening_question_sets ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.screening_questions ADD COLUMN IF NOT EXISTS explanation text;

-- 2. Populate slug safely
UPDATE public.domains SET slug = lower(regexp_replace(name, '\s+', '-', 'g')) WHERE slug IS NULL;

-- 3. Cleanup duplicates
DO $$ 
DECLARE
    r RECORD;
    primary_id UUID;
    dup RECORD;
BEGIN
    FOR r IN 
        SELECT slug FROM public.domains WHERE slug IS NOT NULL GROUP BY slug HAVING count(*) > 1
    LOOP
        -- Find primary ID (most references)
        SELECT d.id INTO primary_id
        FROM public.domains d
        WHERE d.slug = r.slug
        ORDER BY (
            (SELECT count(*) FROM public.cycles c WHERE c.domain_id = d.id) +
            (SELECT count(*) FROM public.screening_question_sets s WHERE s.domain_id = d.id) +
            (SELECT count(*) FROM public.domain_eligibility e WHERE e.domain_id = d.id) +
            (SELECT count(*) FROM public.screening_attempts a WHERE a.domain_id = d.id)
        ) DESC
        LIMIT 1;

        -- Relink and delete
        FOR dup IN SELECT id FROM public.domains WHERE slug = r.slug AND id != primary_id
        LOOP
            UPDATE public.cycles SET domain_id = primary_id WHERE domain_id = dup.id;
            UPDATE public.screening_question_sets SET domain_id = primary_id WHERE domain_id = dup.id;
            UPDATE public.domain_eligibility SET domain_id = primary_id WHERE domain_id = dup.id;
            UPDATE public.screening_attempts SET domain_id = primary_id WHERE domain_id = dup.id;
            
            DELETE FROM public.domains WHERE id = dup.id;
        END LOOP;
    END LOOP;
END $$;

-- 4. Add unique constraint safely now that duplicates are removed
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'domains_slug_key') THEN
    ALTER TABLE public.domains ADD CONSTRAINT domains_slug_key UNIQUE (slug);
  END IF;
END $$;
