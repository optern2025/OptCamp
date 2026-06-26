-- Verification SQL

-- 1. Check if we have exactly 6 domains
SELECT count(*) as total_domains FROM public.domains;

-- 2. List the 6 domains to ensure they match our expectation
SELECT name, slug, is_active FROM public.domains ORDER BY name;

-- 3. Check question sets count (Should be 18 active sets)
SELECT count(*) as total_active_sets FROM public.screening_question_sets WHERE is_active = true;

-- 4. Ensure each domain has exactly one active Difficulty 1, one Difficulty 2, and one Difficulty 3 set
SELECT 
    d.name,
    s.difficulty_level,
    count(*) as active_sets_count,
    (SELECT count(*) FROM public.screening_questions sq WHERE sq.set_id = s.id) as question_count
FROM public.domains d
JOIN public.screening_question_sets s ON s.domain_id = d.id
WHERE s.is_active = true
GROUP BY d.name, s.difficulty_level, s.id
ORDER BY d.name, s.difficulty_level;

-- 5. Ensure NO duplicate active sets exist for the same domain+difficulty
SELECT d.name, s.difficulty_level, count(*)
FROM public.domains d
JOIN public.screening_question_sets s ON s.domain_id = d.id
WHERE s.is_active = true
GROUP BY d.name, s.difficulty_level
HAVING count(*) > 1;
