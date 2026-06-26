-- OptCamp Cycles Seed Data (For Testing Phase B)

-- 1. Create a dummy domain if one doesn't exist to satisfy the foreign key constraint
INSERT INTO public.domains (id, name, description)
VALUES 
    ('d1111111-1111-1111-1111-111111111111', 'Full Stack Development', 'Full Stack track covering frontend and backend')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert test cycles into the cycles table
INSERT INTO public.cycles (
    title, 
    slug, 
    domain_id, 
    cohort_type, 
    status, 
    seats, 
    application_start_at, 
    application_end_at, 
    screening_start_at, 
    screening_end_at, 
    cohort_start_at, 
    cohort_end_at
)
VALUES 
    -- 🟢 ACTIVE CYCLE (Should show on landing page)
    (
        'Full Stack Sprint - April 2026',
        'fullstack-apr-2026',
        'd1111111-1111-1111-1111-111111111111',
        'inclusive',
        'active',
        40,
        '2026-03-26T00:00:00Z',
        '2026-03-30T23:59:59Z',
        '2026-03-30T00:00:00Z',
        '2026-03-31T23:59:59Z',
        '2026-04-01T00:00:00Z',
        '2026-04-02T23:59:59Z'
    ),
    
    -- 🟡 UPCOMING CYCLE (Should show on landing page)
    (
        'AI / ML Sprint - May 2026',
        'aiml-may-2026',
        'd1111111-1111-1111-1111-111111111111',
        'exclusive',
        'upcoming',
        30,
        '2026-04-20T00:00:00Z',
        '2026-04-25T23:59:59Z',
        '2026-04-26T00:00:00Z',
        '2026-04-27T23:59:59Z',
        '2026-05-01T00:00:00Z',
        '2026-05-03T23:59:59Z'
    ),

    -- 🔴 DRAFT CYCLE (Should NOT show on landing page)
    (
        'Cyber Security - June 2026',
        'cyber-jun-2026',
        'd1111111-1111-1111-1111-111111111111',
        'inclusive',
        'draft',
        50,
        '2026-05-20T00:00:00Z',
        '2026-05-25T23:59:59Z',
        '2026-05-26T00:00:00Z',
        '2026-05-27T23:59:59Z',
        '2026-06-01T00:00:00Z',
        '2026-06-03T23:59:59Z'
    ),
    
    -- ⚫ CLOSED CYCLE (Should NOT show on landing page)
    (
        'Backend Systems - Jan 2026',
        'backend-jan-2026',
        'd1111111-1111-1111-1111-111111111111',
        'inclusive',
        'closed',
        40,
        '2025-12-20T00:00:00Z',
        '2025-12-25T23:59:59Z',
        '2025-12-26T00:00:00Z',
        '2025-12-27T23:59:59Z',
        '2026-01-01T00:00:00Z',
        '2026-01-03T23:59:59Z'
    );
