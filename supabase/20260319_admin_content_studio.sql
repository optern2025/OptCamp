-- Admin-managed qualifier templates and richer question content.

create table if not exists public.cohort_qualifier_templates (
    id uuid primary key default gen_random_uuid(),
    cohort_id uuid not null references public.cohorts(id) on delete cascade unique,
    duration_seconds integer not null default 900,
    questions jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.touch_cohort_qualifier_templates_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists trg_touch_cohort_qualifier_templates_updated_at
    on public.cohort_qualifier_templates;

create trigger trg_touch_cohort_qualifier_templates_updated_at
before update on public.cohort_qualifier_templates
for each row
execute function public.touch_cohort_qualifier_templates_updated_at();

insert into public.cohort_qualifier_templates (cohort_id, duration_seconds, questions)
select
    c.id,
    case
        when upper(c.type) like '%ENGINEER%' then 1200
        else 1080
    end,
    case
        when upper(c.type) like '%ENGINEER%' then
            '[
              {
                "id":"q1",
                "type":"mcq",
                "prompt":"Which rollout strategy is best for validating a risky change with limited blast radius?",
                "guidance":"Choose the safest progressive delivery option.",
                "rubric":"Prefer staged validation over an all-at-once release.",
                "options":[
                  {"id":"blue-green","label":"Blue-green cutover to all users"},
                  {"id":"canary","label":"Canary release with a gradual ramp"},
                  {"id":"big-bang","label":"Single production push after QA sign-off"},
                  {"id":"shadow","label":"Shadow deploy with no live decision impact"}
                ],
                "correctOptionIds":["canary"],
                "allowMultiple":false
              },
              {
                "id":"q2",
                "type":"debug",
                "prompt":"A dependency upgrade caused intermittent latency spikes. Explain your debugging sequence.",
                "guidance":"Cover instrumentation, hypothesis testing, rollback, and communication.",
                "rubric":"Strong answers isolate the change, inspect traces, compare baselines, and define mitigation.",
                "language":"typescript",
                "starterCode":"export async function fetchAccount(id: string) {\n  const profile = await profileClient.get(id);\n  const invoices = await billingClient.listInvoices(id);\n  return { profile, invoices };\n}",
                "expectedOutcome":"Pin down where the regression appears and describe how you would stabilize production."
              },
              {
                "id":"q3",
                "type":"scenario",
                "prompt":"Design the first 48 hours of an engineering sprint for shipping a reliability fix.",
                "guidance":"Break work into milestones, owners, and acceptance criteria.",
                "rubric":"Look for sequencing, practical execution, and stakeholder communication.",
                "deliverable":"Execution plan",
                "constraints":[
                  "One backend engineer and one frontend engineer",
                  "The fix must be observable in production metrics",
                  "A stakeholder update is due at the end of day two"
                ]
              }
            ]'::jsonb
        when upper(c.type) like '%MARKET%' then
            '[
              {
                "id":"q1",
                "type":"mcq",
                "prompt":"Which metric best reflects campaign quality, not just traffic volume?",
                "guidance":"Choose the signal closest to qualified conversion efficiency.",
                "rubric":"Favor quality-adjusted business outcomes over vanity metrics.",
                "options":[
                  {"id":"ctr","label":"Click-through rate"},
                  {"id":"cplq","label":"Cost per qualified lead"},
                  {"id":"reach","label":"Unique reach"},
                  {"id":"impressions","label":"Total impressions"}
                ],
                "correctOptionIds":["cplq"],
                "allowMultiple":false
              },
              {
                "id":"q2",
                "type":"debug",
                "prompt":"Spend is flat but conversions fell 35% week-over-week. Describe your diagnosis flow.",
                "guidance":"Separate audience, creative, landing-page, and attribution causes.",
                "rubric":"Great answers prioritize evidence gathering and fast experiment design.",
                "language":"sql",
                "starterCode":"select channel, week, clicks, conversions, spend\nfrom campaign_performance\nwhere week >= current_date - interval ''14 days'';",
                "expectedOutcome":"Use segmented performance data to isolate the drop and propose next experiments."
              },
              {
                "id":"q3",
                "type":"scenario",
                "prompt":"Create a two-week sprint plan for launching a niche B2B product with a $5,000 budget.",
                "guidance":"Show channel choices, messaging, milestones, and how you will learn quickly.",
                "rubric":"Strong answers balance focus, measurement, and realistic execution.",
                "deliverable":"Launch sprint brief",
                "constraints":[
                  "No paid budget can be committed before day three",
                  "Founder wants daily updates",
                  "Only one marketer and one designer are available"
                ]
              }
            ]'::jsonb
        else
            '[
              {
                "id":"q1",
                "type":"mcq",
                "prompt":"What is the strongest first step when goals are ambiguous and the deadline is close?",
                "guidance":"Choose the action that creates fast alignment and execution clarity.",
                "rubric":"The best answer reduces ambiguity before work expands.",
                "options":[
                  {"id":"wait","label":"Wait for a full written brief"},
                  {"id":"draft","label":"Draft a scoped plan with assumptions and confirm it quickly"},
                  {"id":"delegate","label":"Delegate planning to the whole team immediately"},
                  {"id":"research","label":"Spend two days on background research first"}
                ],
                "correctOptionIds":["draft"],
                "allowMultiple":false
              },
              {
                "id":"q2",
                "type":"debug",
                "prompt":"A cross-functional sprint is slipping because dependencies are unclear. How do you debug the failure?",
                "guidance":"Outline how you identify blockers, owners, and recovery steps.",
                "rubric":"Good answers make dependencies visible and drive decisions quickly.",
                "language":"text",
                "starterCode":"Task A -> Task B -> Task C\nOwner(Task B) = TBD\nDaily status = inconsistent",
                "expectedOutcome":"Clarify dependency ownership and create an actionable recovery plan."
              },
              {
                "id":"q3",
                "type":"scenario",
                "prompt":"Describe how you would execute a four-day sprint when scope, quality, and timeline are all tight.",
                "guidance":"Show how you prioritize, communicate tradeoffs, and keep momentum.",
                "rubric":"Look for judgment, sequencing, and crisp communication.",
                "deliverable":"Sprint operating plan",
                "constraints":[
                  "You must publish one daily stakeholder update",
                  "A visible demo is expected on the final day"
                ]
              }
            ]'::jsonb
    end
from public.cohorts c
on conflict (cohort_id) do update
set duration_seconds = excluded.duration_seconds,
    questions = excluded.questions,
    updated_at = timezone('utc', now());
