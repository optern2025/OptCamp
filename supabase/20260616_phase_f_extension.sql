-- Phase F Extension: Announcements + Sprint Seed + selected=enrolled fix

-- 1. Announcements Table
CREATE TABLE IF NOT EXISTS public.cohort_announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id uuid NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
    author_id uuid REFERENCES public.new_users(id),
    title text NOT NULL,
    body text NOT NULL,
    pinned boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_cycle_id ON public.cohort_announcements(cycle_id);

-- 2. Drop and re-add cohort_participants status check to allow both selected+enrolled
-- (selected now immediately = enrolled, but we keep both for audit trail)
DO $$
BEGIN
  ALTER TABLE public.cohort_participants DROP CONSTRAINT IF EXISTS cohort_participants_status_check;
  ALTER TABLE public.cohort_participants
    ADD CONSTRAINT cohort_participants_status_check
    CHECK (status IN ('selected', 'waitlisted', 'rejected', 'enrolled', 'completed', 'dropped'));
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- 3. Sprint seed data per domain
-- Approach: seed sprints attached to a placeholder cycle_id.
-- In production, admin will attach sprints to real cycles.
-- Here we create a sprint TEMPLATE function style via a stored procedure or just
-- seed against each domain slug. Since cycles link to domains, the admin seeds
-- sprints when creating a cycle. We provide the reference data as a SQL function.

-- Sprint template reference table (domain-agnostic templates)
CREATE TABLE IF NOT EXISTS public.sprint_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_slug text NOT NULL,
    sprint_order int NOT NULL,
    title text NOT NULL,
    description text,
    default_task_count int DEFAULT 3,
    created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sprint_templates_domain_order
  ON public.sprint_templates(domain_slug, sprint_order);

-- Insert domain sprint templates
INSERT INTO public.sprint_templates (domain_slug, sprint_order, title, description) VALUES
  -- Full Stack Development
  ('full-stack-development', 1, 'HTML & CSS Mastery', 'Build semantic, responsive layouts with modern CSS techniques'),
  ('full-stack-development', 2, 'JavaScript Fundamentals', 'DOM manipulation, async/await, ES6+ features'),
  ('full-stack-development', 3, 'React & Component Architecture', 'React hooks, state management, component design patterns'),
  ('full-stack-development', 4, 'Backend APIs & Databases', 'Node.js, Express, REST APIs, PostgreSQL integration'),

  -- Artificial Intelligence
  ('artificial-intelligence', 1, 'Python Foundations for AI', 'Python basics, NumPy, data structures for ML'),
  ('artificial-intelligence', 2, 'Data Analysis & Visualisation', 'Pandas, Matplotlib, exploratory data analysis'),
  ('artificial-intelligence', 3, 'Machine Learning Fundamentals', 'Supervised learning, sklearn, model evaluation'),
  ('artificial-intelligence', 4, 'Deep Learning & Neural Networks', 'TensorFlow/PyTorch, CNNs, model deployment'),

  -- Frontend Development
  ('frontend-development', 1, 'HTML & CSS Foundations', 'Semantic HTML5, Flexbox, Grid, responsive design'),
  ('frontend-development', 2, 'JavaScript & DOM', 'ES6+, async patterns, browser APIs, events'),
  ('frontend-development', 3, 'React & Modern UI', 'React 18, hooks, routing, state management'),
  ('frontend-development', 4, 'Next.js & Production', 'SSR, SSG, API routes, deployment, performance'),

  -- Backend Development
  ('backend-development', 1, 'Node.js Basics', 'Runtime, modules, file system, HTTP server'),
  ('backend-development', 2, 'Express APIs', 'REST design, middleware, authentication, validation'),
  ('backend-development', 3, 'Databases & ORM', 'PostgreSQL, Prisma/Drizzle, migrations, queries'),
  ('backend-development', 4, 'System Design', 'Caching, queues, microservices, deployment'),

  -- Cybersecurity
  ('cybersecurity', 1, 'Networking Fundamentals', 'TCP/IP, DNS, HTTP, packet analysis with Wireshark'),
  ('cybersecurity', 2, 'Linux & Command Line', 'Linux administration, bash scripting, permissions'),
  ('cybersecurity', 3, 'Web Application Security', 'OWASP Top 10, XSS, SQLi, CSRF, burp suite'),
  ('cybersecurity', 4, 'Penetration Testing', 'Recon, exploitation, reporting, ethical hacking'),

  -- Data Science
  ('data-science', 1, 'Python for Data Science', 'Python syntax, Jupyter, NumPy, data types'),
  ('data-science', 2, 'Pandas & Data Wrangling', 'DataFrames, cleaning, merging, feature engineering'),
  ('data-science', 3, 'Statistics & Probability', 'Distributions, hypothesis testing, A/B testing'),
  ('data-science', 4, 'ML Foundations & Projects', 'Regression, classification, model selection, capstone')
ON CONFLICT (domain_slug, sprint_order) DO NOTHING;
