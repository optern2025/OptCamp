-- Phase C Schema Patches

DO $$ 
DECLARE 
    const_name text;
BEGIN
    -- Drop old status constraint for cycles
    SELECT constraint_name INTO const_name
    FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%cycles_status_check%' OR constraint_name IN (
        SELECT constraint_name 
        FROM information_schema.constraint_column_usage 
        WHERE table_name = 'cycles' AND column_name = 'status'
    ) LIMIT 1;
    
    IF const_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.cycles DROP CONSTRAINT ' || const_name;
    END IF;

    -- Drop old status constraint for cohort_participants (if any exists)
    SELECT constraint_name INTO const_name
    FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%cohort_participants_status_check%' OR constraint_name IN (
        SELECT constraint_name 
        FROM information_schema.constraint_column_usage 
        WHERE table_name = 'cohort_participants' AND column_name = 'status'
    ) LIMIT 1;
    
    IF const_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.cohort_participants DROP CONSTRAINT ' || const_name;
    END IF;
END $$;

-- 1. Add 'archived' to cycle status
ALTER TABLE public.cycles ADD CONSTRAINT cycles_status_check CHECK (status IN ('draft', 'active', 'upcoming', 'closed', 'archived'));

-- 2. Add strict participant status constraint
ALTER TABLE public.cohort_participants ADD CONSTRAINT cohort_participants_status_check CHECK (status IN ('active', 'completed', 'dropped', 'expelled'));

-- 3. Add columns to notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS event_type text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reference_id uuid;

-- 4. Add enrolled_at to cohort_participants
ALTER TABLE public.cohort_participants ADD COLUMN IF NOT EXISTS enrolled_at timestamptz DEFAULT now();
