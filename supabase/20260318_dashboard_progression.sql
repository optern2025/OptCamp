-- Dashboard progression, qualifier persistence, and staged cohort tests.

alter table public.user_cohorts
    alter column status set default 'applied';

update public.user_cohorts
set status = 'applied'
where status = 'active';

alter table public.user_cohorts
    add column if not exists qualifier_score integer,
    add column if not exists qualifier_feedback text,
    add column if not exists qualifier_started_at timestamptz,
    add column if not exists qualifier_submitted_at timestamptz,
    add column if not exists qualified_at timestamptz,
    add column if not exists enrolled_at timestamptz,
    add column if not exists completed_at timestamptz;

create table if not exists public.qualifier_attempts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    cohort_id uuid not null references public.cohorts(id) on delete cascade,
    exam_id text not null,
    subject text not null,
    cohort_type text not null,
    answers jsonb not null default '[]'::jsonb,
    score integer not null,
    feedback text not null,
    passed boolean not null default false,
    started_at timestamptz,
    submitted_at timestamptz not null default timezone('utc', now())
);

create index if not exists qualifier_attempts_user_cohort_idx
    on public.qualifier_attempts (user_id, cohort_id, submitted_at desc);

create table if not exists public.cohort_stages (
    id uuid primary key default gen_random_uuid(),
    cohort_id uuid not null references public.cohorts(id) on delete cascade,
    stage_number integer not null,
    title text not null,
    description text not null,
    duration_minutes integer not null default 45,
    questions jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    unique (cohort_id, stage_number)
);

create table if not exists public.user_cohort_stage_attempts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    cohort_id uuid not null references public.cohorts(id) on delete cascade,
    stage_id uuid not null references public.cohort_stages(id) on delete cascade,
    answers jsonb not null default '[]'::jsonb,
    score integer not null,
    feedback text not null,
    passed boolean not null default false,
    submitted_at timestamptz not null default timezone('utc', now()),
    unique (user_id, stage_id)
);

create index if not exists user_cohort_stage_attempts_user_cohort_idx
    on public.user_cohort_stage_attempts (user_id, cohort_id, submitted_at desc);

insert into public.cohort_stages (cohort_id, stage_number, title, description, duration_minutes, questions)
select
    cohort_id,
    stage_number,
    title,
    description,
    duration_minutes,
    questions::jsonb
from (
    select
        c.id as cohort_id,
        1 as stage_number,
        'System Decomposition' as title,
        'Break the sprint problem into an execution plan with milestones, owners, and acceptance criteria.' as description,
        40 as duration_minutes,
        '[
          {"id":"q1","prompt":"Outline the first 24 hours of this sprint. What gets done first and why?","guidance":"Prioritize sequencing, ownership, and risk control."},
          {"id":"q2","prompt":"Define the artifacts or deliverables you would produce by the halfway mark.","guidance":"Be concrete about documents, code, or checkpoints."}
        ]' as questions
    from public.cohorts c

    union all

    select
        c.id as cohort_id,
        2 as stage_number,
        'Execution Under Constraint' as title,
        'Respond to blockers, conflicting priorities, and tight timelines with a practical recovery plan.' as description,
        45 as duration_minutes,
        '[
          {"id":"q1","prompt":"A critical dependency slips by 12 hours. How do you protect the sprint outcome?","guidance":"Explain the fallback plan and communication strategy."},
          {"id":"q2","prompt":"Choose one metric you would use to judge whether the sprint is on track and justify it.","guidance":"Tie it to the cohort domain and sprint goals."}
        ]' as questions
    from public.cohorts c

    union all

    select
        c.id as cohort_id,
        3 as stage_number,
        'Founder Readout' as title,
        'Present a concise, high-signal summary of the work, tradeoffs, and next steps.' as description,
        30 as duration_minutes,
        '[
          {"id":"q1","prompt":"Write the final update you would send to founders after this sprint.","guidance":"Cover outcome, tradeoffs, risks, and next steps."},
          {"id":"q2","prompt":"What would you improve in the next sprint cycle after reviewing your own execution?","guidance":"Reflect on process, not just output."}
        ]' as questions
    from public.cohorts c
) seeded
on conflict (cohort_id, stage_number) do update
set title = excluded.title,
    description = excluded.description,
    duration_minutes = excluded.duration_minutes,
    questions = excluded.questions;
