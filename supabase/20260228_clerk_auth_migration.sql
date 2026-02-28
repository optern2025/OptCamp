-- Decouple public.users from Supabase Auth and add Clerk identity mapping.

alter table public.users
    alter column id set default gen_random_uuid();

do $$
begin
    if exists (
        select 1
        from information_schema.table_constraints
        where table_schema = 'public'
          and table_name = 'users'
          and constraint_type = 'FOREIGN KEY'
          and constraint_name = 'users_id_fkey'
    ) then
        alter table public.users drop constraint users_id_fkey;
    end if;
end;
$$;

alter table public.users
    add column if not exists clerk_user_id text;

create unique index if not exists users_clerk_user_id_unique
    on public.users (clerk_user_id)
    where clerk_user_id is not null;

-- Optional backfill marker for existing records that predate Clerk migration.
update public.users
set clerk_user_id = coalesce(clerk_user_id, id::text)
where clerk_user_id is null;
