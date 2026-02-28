-- Run this in Supabase SQL Editor.
-- Creates the application users table for Clerk-authenticated users.

create table if not exists public.users (
    id uuid primary key default gen_random_uuid(),
    clerk_user_id text not null unique,
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
