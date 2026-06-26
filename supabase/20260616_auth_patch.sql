-- Patch for new_users to support password and admin approval workflows
ALTER TABLE public.new_users
ADD COLUMN IF NOT EXISTS password_hash text,
ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
ADD COLUMN IF NOT EXISTS admin_approval_status text default 'not_required' check (admin_approval_status in ('not_required', 'pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_by uuid references public.new_users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS disabled_at timestamptz;

-- Ensure existing admins are not locked out
UPDATE public.new_users
SET 
  admin_approval_status = 'approved',
  email_verified_at = COALESCE(email_verified_at, now())
WHERE role = 'admin' AND (admin_approval_status IS NULL OR admin_approval_status != 'approved');

-- Set existing normal users to not_required
UPDATE public.new_users
SET 
  admin_approval_status = 'not_required'
WHERE role = 'user' AND (admin_approval_status IS NULL OR admin_approval_status != 'not_required');
