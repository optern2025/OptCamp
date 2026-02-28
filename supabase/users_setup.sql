-- Run this in Supabase SQL Editor.
-- It creates a public users table and syncs it from auth.users.

create table if not exists public.users (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null unique,
    name text not null default '',
    university text not null default '',
    stack text not null default '',
    github text,
    availability boolean not null default false,
    intent text not null default '',
    email_verified boolean not null default false,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

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

create or replace function public.sync_auth_user_to_public_users()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.users (
        id,
        email,
        name,
        university,
        stack,
        github,
        availability,
        intent,
        email_verified
    )
    values (
        new.id,
        coalesce(new.email, ''),
        coalesce(new.raw_user_meta_data ->> 'name', ''),
        coalesce(new.raw_user_meta_data ->> 'university', ''),
        coalesce(new.raw_user_meta_data ->> 'stack', ''),
        nullif(new.raw_user_meta_data ->> 'github', ''),
        coalesce((new.raw_user_meta_data ->> 'availability')::boolean, false),
        coalesce(new.raw_user_meta_data ->> 'intent', ''),
        new.email_confirmed_at is not null
    )
    on conflict (id) do update
    set email = excluded.email,
        name = excluded.name,
        university = excluded.university,
        stack = excluded.stack,
        github = excluded.github,
        availability = excluded.availability,
        intent = excluded.intent,
        email_verified = excluded.email_verified;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.sync_auth_user_to_public_users();

drop trigger if exists on_auth_user_updated on auth.users;

create trigger on_auth_user_updated
after update of email, raw_user_meta_data, email_confirmed_at on auth.users
for each row
execute function public.sync_auth_user_to_public_users();

alter table public.users enable row level security;

drop policy if exists "Users can view own row" on public.users;

create policy "Users can view own row"
on public.users
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update own row" on public.users;

create policy "Users can update own row"
on public.users
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

grant select, update on public.users to authenticated;
