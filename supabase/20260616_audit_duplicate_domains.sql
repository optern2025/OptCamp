-- Find all domains and count their references
-- This will highlight which domains are duplicates and which one has the most references.

SELECT 
    d.id, 
    d.name,
    lower(regexp_replace(d.name, '\s+', '-', 'g')) as generated_slug,
    (SELECT count(*) FROM public.cycles c WHERE c.domain_id = d.id) as cycle_count,
    (SELECT count(*) FROM public.screening_question_sets s WHERE s.domain_id = d.id) as question_set_count,
    (SELECT count(*) FROM public.domain_eligibility e WHERE e.domain_id = d.id) as eligibility_count,
    (SELECT count(*) FROM public.screening_attempts a WHERE a.domain_id = d.id) as attempt_count,
    (
        (SELECT count(*) FROM public.cycles c WHERE c.domain_id = d.id) +
        (SELECT count(*) FROM public.screening_question_sets s WHERE s.domain_id = d.id) +
        (SELECT count(*) FROM public.domain_eligibility e WHERE e.domain_id = d.id) +
        (SELECT count(*) FROM public.screening_attempts a WHERE a.domain_id = d.id)
    ) as total_references
FROM public.domains d
ORDER BY generated_slug, total_references DESC;
