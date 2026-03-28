-- Fix the users updated_at trigger function after qualifier email columns were removed.
-- Older deployments may still have a stale trigger body that references
-- qualifier_email_sent_at / qualifier_email_message_id, which breaks any update.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;

create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();
