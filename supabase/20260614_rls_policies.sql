-- Enable Row Level Security (RLS) on all new tables
-- This ensures a default 'deny all' for client-side access (anon/authenticated roles)
alter table public.new_users enable row level security;
alter table public.otp_codes enable row level security;
alter table public.sessions enable row level security;
alter table public.domains enable row level security;
alter table public.cycles enable row level security;
alter table public.applications enable row level security;
alter table public.application_reviews enable row level security;
alter table public.screening_question_sets enable row level security;
alter table public.screening_questions enable row level security;
alter table public.screening_attempts enable row level security;
alter table public.screening_answers enable row level security;
alter table public.screening_results enable row level security;
alter table public.domain_eligibility enable row level security;
alter table public.cohort_participants enable row level security;
alter table public.notifications enable row level security;

-- Drop existing policy if running multiple times
drop policy if exists "Public read access for active/upcoming cycles" on public.cycles;

-- Policy: Allow public read access to active and upcoming cycles only
-- This allows the Next.js frontend or client-side fetch calls to safely read cycle data for the landing page.
create policy "Public read access for active/upcoming cycles"
on public.cycles
for select
to public
using (status in ('active', 'upcoming'));

-- NOTE ON OTHER TABLES:
-- Because no other policies are defined, all other tables (users, otp_codes, sessions, applications, etc.)
-- are strictly blocked from client-side access.
-- The Next.js API routes use the SUPABASE_SERVICE_ROLE_KEY which bypasses RLS,
-- satisfying the requirement that all operations happen securely on the server.
