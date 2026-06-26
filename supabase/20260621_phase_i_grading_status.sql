-- Update the status check constraint for screening_attempts to include pending_review
ALTER TABLE public.screening_attempts DROP CONSTRAINT IF EXISTS screening_attempts_status_check;

ALTER TABLE public.screening_attempts 
ADD CONSTRAINT screening_attempts_status_check 
CHECK (status in ('not_started', 'in_progress', 'submitted', 'pending_review', 'expired'));

-- Update applications status check constraint if it exists
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE public.applications 
ADD CONSTRAINT applications_status_check 
CHECK (status in ('pending', 'under_review', 'approved', 'rejected', 'screening_required', 'screening_passed', 'screening_failed', 'selected', 'enrolled', 'waitlisted'));
