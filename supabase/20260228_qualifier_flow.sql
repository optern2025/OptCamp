-- Incremental migration for cohort setup and application tracking.

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
    drop column if exists cohort_id,
    drop column if exists qualifier_email_sent_at,
    drop column if exists qualifier_email_message_id;

drop table if exists public.qualifier_email_logs;

create table if not exists public.user_cohorts (
    user_id uuid not null references public.users(id) on delete cascade,
    cohort_id uuid not null references public.cohorts(id) on delete cascade,
    status text not null default 'active',
    applied_at timestamptz not null default timezone('utc', now()),
    primary key (user_id, cohort_id)
);

delete from public.cohorts
where slug in ('backend-mar-2026', 'mobile-apr-2026');

insert into public.cohorts (slug, type, apply_window, sprint_window, apply_by, qualifier_test_url, is_active)
values
    ('aiml-mar-2026', 'AI / ML', 'Mar 23-24', 'Mar 25-28', 'Mar 24', 'https://opt-camp.vercel.app/qualifier/aiml-mar-2026', true),
    ('fullstack-apr-2026', 'Full Stack', 'Apr 6-7', 'Apr 8-11', 'Apr 7', 'https://opt-camp.vercel.app/qualifier/fullstack-apr-2026', true),
    ('cyber-security-may-2026', 'Cyber Security', 'May 4-5', 'May 6-9', 'May 5', 'https://opt-camp.vercel.app/qualifier/cyber-security-may-2026', true)
on conflict (slug) do update
set type = excluded.type,
    apply_window = excluded.apply_window,
    sprint_window = excluded.sprint_window,
    apply_by = excluded.apply_by,
    qualifier_test_url = excluded.qualifier_test_url,
    is_active = excluded.is_active;
