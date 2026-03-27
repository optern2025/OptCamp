-- Sprint-day workflow, admin review persistence, and seeded 4-day tasks.

create table if not exists public.sprint_day_tasks (
    id uuid primary key default gen_random_uuid(),
    cohort_id uuid not null references public.cohorts(id) on delete cascade,
    day_number integer not null,
    title text not null,
    description text not null default '',
    brief text not null default '',
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    unique (cohort_id, day_number)
);

create or replace function public.touch_sprint_day_tasks_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists trg_touch_sprint_day_tasks_updated_at
    on public.sprint_day_tasks;

create trigger trg_touch_sprint_day_tasks_updated_at
before update on public.sprint_day_tasks
for each row
execute function public.touch_sprint_day_tasks_updated_at();

create table if not exists public.sprint_day_submissions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    cohort_id uuid not null references public.cohorts(id) on delete cascade,
    sprint_day_id uuid not null references public.sprint_day_tasks(id) on delete cascade,
    github_url text not null,
    submitted_at timestamptz not null default timezone('utc', now()),
    score integer,
    evaluator_notes text,
    reviewed_at timestamptz,
    unique (user_id, sprint_day_id)
);

create index if not exists sprint_day_submissions_user_cohort_idx
    on public.sprint_day_submissions (user_id, cohort_id, submitted_at desc);

insert into public.sprint_day_tasks (cohort_id, day_number, title, description, brief)
select
    c.id as cohort_id,
    seeded.day_number,
    seeded.title,
    seeded.description,
    seeded.brief
from public.cohorts c
cross join (
    values
        (
            1,
            'Environment Setup',
            'Set up the repository, local environment, and initial app shell.',
            'Create a working project scaffold, verify the build runs locally, and commit the initial setup with a short README note on how to run it.'
        ),
        (
            2,
            'Core Feature Build',
            'Implement the primary feature for the sprint challenge.',
            'Build the main user flow for the assigned problem, commit incremental progress, and keep the repository in a runnable state.'
        ),
        (
            3,
            'Refinement and Quality',
            'Improve reliability, polish the implementation, and cover edge cases.',
            'Strengthen the project with validation, better UX, or tests where appropriate, and document the tradeoffs you chose not to address.'
        ),
        (
            4,
            'Final Submission',
            'Prepare the final repository state and delivery notes.',
            'Submit the final GitHub repository link with a concise summary of what works, what is incomplete, and any setup steps for reviewers.'
        )
) as seeded(day_number, title, description, brief)
on conflict (cohort_id, day_number) do update
set title = excluded.title,
    description = excluded.description,
    brief = excluded.brief,
    updated_at = timezone('utc', now());
