-- New OptCamp Schema (Draft)
-- Safe to run, does not drop existing tables immediately.

-- users
create table if not exists public.new_users (
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    full_name text not null,
    mobile_number text,
    user_type text check (user_type in ('student', 'graduate')),
    role text default 'user' check (role in ('user', 'admin')),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- otp_codes
create table if not exists public.otp_codes (
    id uuid primary key default gen_random_uuid(),
    email text not null,
    otp_hash text not null,
    purpose text default 'login',
    expires_at timestamptz not null,
    verified_at timestamptz,
    attempts int default 0,
    max_attempts int default 5,
    resend_available_at timestamptz,
    created_at timestamptz default now()
);

-- sessions
create table if not exists public.sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.new_users(id) on delete cascade,
    session_token_hash text unique not null,
    expires_at timestamptz not null,
    revoked_at timestamptz,
    created_at timestamptz default now(),
    last_seen_at timestamptz default now()
);

-- domains
create table if not exists public.domains (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text
);

-- cycles
create table if not exists public.cycles (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    slug text unique not null,
    domain_id uuid references public.domains(id),
    cohort_type text check (cohort_type in ('inclusive', 'exclusive')),
    status text check (status in ('draft', 'active', 'upcoming', 'closed')),
    seats int,
    description text,
    requirements text,
    outcomes text,
    application_start_at timestamptz,
    application_end_at timestamptz,
    screening_start_at timestamptz,
    screening_end_at timestamptz,
    cohort_start_at timestamptz,
    cohort_end_at timestamptz,
    created_by uuid references public.new_users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- applications
create table if not exists public.applications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.new_users(id),
    cycle_id uuid references public.cycles(id),
    full_name text not null,
    email text not null,
    mobile_number text,
    user_type text,
    college text,
    graduation_year text,
    skills text,
    github_url text,
    linkedin_url text,
    portfolio_url text,
    resume_url text,
    motivation text,
    status text check (status in ('pending', 'approved', 'rejected', 'screening_required', 'screening_passed', 'screening_failed', 'selected', 'waitlisted')),
    admin_notes text,
    submitted_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- application_reviews
create table if not exists public.application_reviews (
    id uuid primary key default gen_random_uuid(),
    application_id uuid references public.applications(id) on delete cascade,
    admin_id uuid references public.new_users(id),
    notes text,
    created_at timestamptz default now()
);

-- screening_question_sets
create table if not exists public.screening_question_sets (
    id uuid primary key default gen_random_uuid(),
    domain_id uuid references public.domains(id),
    difficulty_level int default 1,
    version int default 1,
    is_active boolean default true,
    created_at timestamptz default now()
);

-- screening_questions
create table if not exists public.screening_questions (
    id uuid primary key default gen_random_uuid(),
    set_id uuid references public.screening_question_sets(id) on delete cascade,
    type text check (type in ('MCQ', 'practical')),
    content text not null,
    options jsonb,
    correct_answer text
);

-- screening_attempts
create table if not exists public.screening_attempts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.new_users(id),
    cycle_id uuid references public.cycles(id),
    domain_id uuid references public.domains(id),
    question_set_id uuid references public.screening_question_sets(id),
    score int,
    passed boolean,
    difficulty_level int,
    started_at timestamptz,
    submitted_at timestamptz,
    expires_at timestamptz,
    status text check (status in ('not_started', 'in_progress', 'submitted', 'expired')),
    shuffled_question_order jsonb
);

-- screening_answers
create table if not exists public.screening_answers (
    id uuid primary key default gen_random_uuid(),
    attempt_id uuid references public.screening_attempts(id) on delete cascade,
    question_id uuid references public.screening_questions(id),
    user_answer text,
    is_correct boolean
);

-- screening_results
create table if not exists public.screening_results (
    id uuid primary key default gen_random_uuid(),
    attempt_id uuid references public.screening_attempts(id) on delete cascade,
    final_score int,
    feedback text
);

-- domain_eligibility
create table if not exists public.domain_eligibility (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.new_users(id) on delete cascade,
    domain_id uuid references public.domains(id) on delete cascade,
    last_passed_at timestamptz,
    expires_at timestamptz,
    last_score int,
    difficulty_level int,
    waiver_eligible boolean default false
);

-- cohort_participants
create table if not exists public.cohort_participants (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.new_users(id),
    cycle_id uuid references public.cycles(id),
    status text default 'active'
);

-- notifications
create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.new_users(id) on delete cascade,
    title text not null,
    message text,
    read boolean default false,
    created_at timestamptz default now()
);
