-- Add soft delete fields to new_users
ALTER TABLE public.new_users
ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
ADD COLUMN IF NOT EXISTS disabled_at timestamptz,
ADD COLUMN IF NOT EXISTS anonymized_at timestamptz;

-- Create Soft Delete Function
CREATE OR REPLACE FUNCTION public.soft_delete_user(p_user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.new_users
    SET 
        email = 'deleted_user_' || p_user_id || '@deleted.optcamp.local',
        full_name = 'Deleted User',
        mobile_number = null,
        password_hash = null,
        deleted_at = NOW(),
        disabled_at = NOW(),
        anonymized_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Hard Delete Cascade Function (For Dev/Test ONLY)
CREATE OR REPLACE FUNCTION public.delete_user_cascade(p_user_id UUID)
RETURNS void AS $$
BEGIN
    -- 1. Unlink from Audit Logs
    UPDATE public.audit_logs SET admin_id = NULL WHERE admin_id = p_user_id;
    UPDATE public.audit_logs SET target_user_id = NULL WHERE target_user_id = p_user_id;

    -- 2. Unlink from Reviews & Submissions
    UPDATE public.application_reviews SET admin_id = NULL WHERE admin_id = p_user_id;
    UPDATE public.task_submissions SET reviewed_by = NULL WHERE reviewed_by = p_user_id;

    -- 3. Unlink from Content Creation
    UPDATE public.platform_announcements SET created_by = NULL WHERE created_by = p_user_id;
    UPDATE public.resources SET created_by = NULL WHERE created_by = p_user_id;

    -- 4. Delete indirect dependencies via screening_attempts
    DELETE FROM public.screening_answers WHERE attempt_id IN (SELECT id FROM public.screening_attempts WHERE user_id = p_user_id);
    DELETE FROM public.screening_results WHERE attempt_id IN (SELECT id FROM public.screening_attempts WHERE user_id = p_user_id);

    -- 5. Delete direct user dependencies
    DELETE FROM public.certificates WHERE user_id = p_user_id;
    DELETE FROM public.task_submissions WHERE user_id = p_user_id;
    DELETE FROM public.cohort_participants WHERE user_id = p_user_id;
    DELETE FROM public.domain_eligibility WHERE user_id = p_user_id;
    DELETE FROM public.ai_screening_packets WHERE user_id = p_user_id;
    DELETE FROM public.screening_attempts WHERE user_id = p_user_id;
    DELETE FROM public.applications WHERE user_id = p_user_id;
    DELETE FROM public.notifications WHERE user_id = p_user_id;
    DELETE FROM public.sessions WHERE user_id = p_user_id;

    -- 6. Delete root user record
    DELETE FROM public.new_users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

