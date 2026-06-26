-- Phase F Schema: Cohort Operations Engine

-- 1. Upgrade cohort_participants
ALTER TABLE public.cohort_participants 
ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES public.applications(id),
ADD COLUMN IF NOT EXISTS enrolled_at timestamptz,
ADD COLUMN IF NOT EXISTS completion_percentage int DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS certificate_issued boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Drop old status constraints if they exist and apply new strict constraint
DO $$ 
BEGIN
  ALTER TABLE public.cohort_participants DROP CONSTRAINT IF EXISTS cohort_participants_status_check;
  ALTER TABLE public.cohort_participants 
  ADD CONSTRAINT cohort_participants_status_check 
  CHECK (status IN ('selected', 'waitlisted', 'rejected', 'enrolled', 'completed', 'dropped'));

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cohort_participants_user_cycle_key') THEN
    ALTER TABLE public.cohort_participants ADD CONSTRAINT cohort_participants_user_cycle_key UNIQUE (user_id, cycle_id);
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- 2. Create Sprints Table
CREATE TABLE IF NOT EXISTS public.sprints (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id uuid NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    start_date timestamptz NOT NULL,
    end_date timestamptz NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Create Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sprint_id uuid NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text NOT NULL,
    task_type text CHECK (task_type IN ('github', 'project', 'assignment', 'document', 'video', 'custom')),
    due_date timestamptz,
    points int DEFAULT 10,
    required_proof jsonb NOT NULL DEFAULT '["github", "deployment"]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 4. Create Task Submissions Table
CREATE TABLE IF NOT EXISTS public.task_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.new_users(id) ON DELETE CASCADE,
    cohort_participant_id uuid NOT NULL REFERENCES public.cohort_participants(id) ON DELETE CASCADE,
    github_link text,
    deployment_link text,
    document_url text,
    video_url text,
    explanation text,
    custom_proof jsonb,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'needs_revision', 'rejected')),
    score int DEFAULT 0,
    admin_feedback text,
    submitted_at timestamptz DEFAULT now(),
    reviewed_at timestamptz,
    reviewed_by uuid REFERENCES public.new_users(id),
    UNIQUE (user_id, task_id) -- One active submission per task per user
);

-- 5. Create Certificates Table
CREATE TABLE IF NOT EXISTS public.certificates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.new_users(id) ON DELETE CASCADE,
    cycle_id uuid NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
    certificate_number text UNIQUE NOT NULL,
    issue_date timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- Update notifications table (ensure we can track new events)
-- (No schema change required for notifications as it just uses type and metadata)

-- Add Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_sprints_cycle_id ON public.sprints(cycle_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id ON public.tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_task_id ON public.task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_id ON public.task_submissions(user_id);
