-- Incremental migration for cohort assignment and qualifier email delivery.

create table if not exists public.cohorts (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    type text not null,
    apply_window text not null,
    sprint_window text not null,
    apply_by text not null,
    qualifier_test_url text,
    is_active boolean not null default false,
    created_at timestamptz not null default timezone('utc', now())
);

alter table public.users
    add column if not exists cohort_id uuid references public.cohorts(id),
    add column if not exists qualifier_email_sent_at timestamptz,
    add column if not exists qualifier_email_message_id text;

create table if not exists public.qualifier_email_logs (
    id bigint generated always as identity primary key,
    user_id uuid not null references public.users(id) on delete cascade,
    cohort_id uuid references public.cohorts(id) on delete set null,
    recipient_email text not null,
    resend_message_id text,
    status text not null default 'sent',
    sent_at timestamptz not null default timezone('utc', now())
);

create or replace function public.sync_auth_user_to_public_users()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    metadata_cohort_id uuid;
begin
    metadata_cohort_id := nullif(new.raw_user_meta_data ->> 'cohort_id', '')::uuid;

    insert into public.users (
        id,
        email,
        name,
        university,
        stack,
        github,
        availability,
        intent,
        email_verified,
        cohort_id
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
        new.email_confirmed_at is not null,
        metadata_cohort_id
    )
    on conflict (id) do update
    set email = excluded.email,
        name = excluded.name,
        university = excluded.university,
        stack = excluded.stack,
        github = excluded.github,
        availability = excluded.availability,
        intent = excluded.intent,
        email_verified = excluded.email_verified,
        cohort_id = coalesce(excluded.cohort_id, public.users.cohort_id);

    return new;
end;
$$;

alter table public.cohorts enable row level security;
alter table public.qualifier_email_logs enable row level security;

drop policy if exists "Authenticated users can view cohorts" on public.cohorts;
create policy "Authenticated users can view cohorts"
on public.cohorts
for select
to authenticated
using (true);

grant select on public.cohorts to authenticated;

drop policy if exists "Users can insert own row" on public.users;
create policy "Users can insert own row"
on public.users
for insert
to authenticated
with check (auth.uid() = id);

create or replace function public.prevent_qualifier_field_changes()
returns trigger
language plpgsql
as $$
begin
    if auth.role() = 'authenticated' and (
        new.qualifier_email_sent_at is distinct from old.qualifier_email_sent_at
        or new.qualifier_email_message_id is distinct from old.qualifier_email_message_id
    ) then
        raise exception 'qualifier_email fields are restricted';
    end if;

    return new;
end;
$$;

drop trigger if exists users_prevent_qualifier_field_changes on public.users;
create trigger users_prevent_qualifier_field_changes
before update on public.users
for each row
execute function public.prevent_qualifier_field_changes();

insert into public.cohorts (slug, type, apply_window, sprint_window, apply_by, qualifier_test_url, is_active)
values
    ('backend-mar-2026', 'Backend', 'Mar 9-10', 'Mar 11-14', 'Mar 10', 'https://example.com/qualifier/backend-mar-2026', true),
    ('aiml-mar-2026', 'AI / ML', 'Mar 23-24', 'Mar 25-28', 'Mar 24', 'https://example.com/qualifier/aiml-mar-2026', false),
    ('fullstack-apr-2026', 'Full Stack', 'Apr 6-7', 'Apr 8-11', 'Apr 7', 'https://example.com/qualifier/fullstack-apr-2026', false),
    ('mobile-apr-2026', 'Mobile Dev', 'Apr 20-21', 'Apr 22-25', 'Apr 21', 'https://example.com/qualifier/mobile-apr-2026', false)
on conflict (slug) do update
set type = excluded.type,
    apply_window = excluded.apply_window,
    sprint_window = excluded.sprint_window,
    apply_by = excluded.apply_by,
    qualifier_test_url = excluded.qualifier_test_url,
    is_active = excluded.is_active;
