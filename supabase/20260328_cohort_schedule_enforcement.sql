-- Add structured cohort schedule fields so the app can enforce timeline rules.

alter table public.cohorts
    add column if not exists qualifier_window text not null default '',
    add column if not exists application_open_date date,
    add column if not exists application_close_date date,
    add column if not exists qualifier_open_date date,
    add column if not exists qualifier_close_date date,
    add column if not exists sprint_start_date date,
    add column if not exists sprint_end_date date,
    add column if not exists schedule_timezone text not null default 'Asia/Kolkata';

update public.cohorts
set application_open_date = coalesce(application_open_date, date '2026-03-26'),
    application_close_date = coalesce(application_close_date, date '2026-03-29'),
    qualifier_open_date = coalesce(qualifier_open_date, date '2026-03-30'),
    qualifier_close_date = coalesce(qualifier_close_date, date '2026-03-31'),
    sprint_start_date = coalesce(sprint_start_date, date '2026-04-01'),
    sprint_end_date = coalesce(sprint_end_date, date '2026-04-04'),
    schedule_timezone = coalesce(nullif(schedule_timezone, ''), 'Asia/Kolkata'),
    apply_window = '26th - 29th March',
    qualifier_window = '30 & 31st March',
    sprint_window = '1st - 4th April',
    apply_by = '29th March';

alter table public.cohorts
    alter column application_open_date set not null,
    alter column application_close_date set not null,
    alter column qualifier_open_date set not null,
    alter column qualifier_close_date set not null,
    alter column sprint_start_date set not null,
    alter column sprint_end_date set not null;

alter table public.cohorts
    add constraint cohorts_application_window_check
        check (application_open_date <= application_close_date),
    add constraint cohorts_qualifier_window_check
        check (qualifier_open_date <= qualifier_close_date),
    add constraint cohorts_sprint_window_check
        check (sprint_start_date <= sprint_end_date),
    add constraint cohorts_application_before_qualifier_check
        check (application_close_date < qualifier_open_date),
    add constraint cohorts_qualifier_before_sprint_check
        check (qualifier_close_date < sprint_start_date);
