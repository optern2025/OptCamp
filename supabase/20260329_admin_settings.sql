create table if not exists public.admin_settings (
    key text primary key,
    enabled boolean not null default true,
    updated_at timestamptz not null default timezone('utc', now())
);

insert into public.admin_settings (key, enabled)
values ('time_limits_enabled', true)
on conflict (key) do nothing;

create or replace function public.set_admin_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists admin_settings_set_updated_at on public.admin_settings;

create trigger admin_settings_set_updated_at
before update on public.admin_settings
for each row
execute function public.set_admin_settings_updated_at();
