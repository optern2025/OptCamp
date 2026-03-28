-- Remove obsolete users trigger left over from the old qualifier-email workflow.
-- The referenced columns were dropped, so any update against public.users fails
-- while this trigger/function still exists in a deployed database.

drop trigger if exists users_prevent_qualifier_field_changes on public.users;
drop function if exists public.prevent_qualifier_field_changes();
