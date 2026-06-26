-- OptCamp Admin Bootstrap Script
-- Run this script directly against your Supabase database to promote an existing user to admin.
-- Replace 'your_admin_email@example.com' with the actual email of the user.

UPDATE public.new_users
SET 
  role = 'admin',
  admin_approval_status = 'approved',
  disabled_at = NULL
WHERE email = 'your_admin_email@example.com';
