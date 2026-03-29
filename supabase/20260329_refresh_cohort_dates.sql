-- Refresh cohort schedules for the late-March application window and add a
-- dedicated results announcement date.

alter table public.cohorts
    add column if not exists results_on text not null default '',
    add column if not exists results_announcement_date date;

alter table public.cohorts
    drop constraint if exists cohorts_application_before_qualifier_check;

alter table public.cohorts
    add constraint cohorts_application_before_qualifier_check
        check (application_close_date <= qualifier_open_date);

update public.cohorts
set application_open_date = date '2026-03-26',
    application_close_date = date '2026-03-30',
    qualifier_open_date = date '2026-03-30',
    qualifier_close_date = date '2026-03-31',
    results_announcement_date = date '2026-04-10',
    schedule_timezone = coalesce(nullif(schedule_timezone, ''), 'Asia/Kolkata'),
    apply_window = '26th - 30th March',
    qualifier_window = '30 & 31st March',
    apply_by = '30th March',
    results_on = '10th April';

update public.cohorts
set sprint_start_date = date '2026-04-01',
    sprint_end_date = date '2026-04-02',
    sprint_window = '1st & 2nd April'
where slug = 'fullstack-apr-2026';

update public.cohorts
set sprint_start_date = date '2026-04-06',
    sprint_end_date = date '2026-04-07',
    sprint_window = '6th & 7th April'
where slug in ('aiml-mar-2026', 'cyber-security-may-2026');

delete from public.sprint_day_submissions
where sprint_day_id in (
    select id
    from public.sprint_day_tasks
    where day_number > 2
);

delete from public.sprint_day_tasks
where day_number > 2;

alter table public.cohorts
    alter column results_announcement_date set not null;
