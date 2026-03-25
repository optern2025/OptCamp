-- Refresh the cohort lineup to remove backend/mobile and add cyber security.

delete from public.cohorts
where slug in ('backend-mar-2026', 'mobile-apr-2026');

insert into public.cohorts (slug, type, apply_window, sprint_window, apply_by, qualifier_test_url, is_active)
values
    ('aiml-mar-2026', 'AI / ML', 'Mar 23-24', 'Mar 25-28', 'Mar 24', 'https://opt-camp.vercel.app/qualifier/aiml-mar-2026', true),
    ('fullstack-apr-2026', 'Full Stack', 'Apr 6-7', 'Apr 8-11', 'Apr 7', 'https://opt-camp.vercel.app/qualifier/fullstack-apr-2026', true),
    ('cyber-security-may-2026', 'Cyber Security', 'May 4-5', 'May 6-9', 'May 5', 'https://opt-camp.vercel.app/qualifier/cyber-security-may-2026', true)
on conflict (slug) do update
set type = excluded.type,
    apply_window = excluded.apply_window,
    sprint_window = excluded.sprint_window,
    apply_by = excluded.apply_by,
    qualifier_test_url = excluded.qualifier_test_url,
    is_active = excluded.is_active;

insert into public.cohort_stages (cohort_id, stage_number, title, description, duration_minutes, questions)
select
    cohort_id,
    stage_number,
    title,
    description,
    duration_minutes,
    questions::jsonb
from (
    select
        c.id as cohort_id,
        1 as stage_number,
        'System Decomposition' as title,
        'Break the sprint problem into an execution plan with milestones, owners, and acceptance criteria.' as description,
        40 as duration_minutes,
        '[
          {"id":"q1","prompt":"Outline the first 24 hours of this sprint. What gets done first and why?","guidance":"Prioritize sequencing, ownership, and risk control."},
          {"id":"q2","prompt":"Define the artifacts or deliverables you would produce by the halfway mark.","guidance":"Be concrete about documents, code, or checkpoints."}
        ]' as questions
    from public.cohorts c

    union all

    select
        c.id as cohort_id,
        2 as stage_number,
        'Execution Under Constraint' as title,
        'Respond to blockers, conflicting priorities, and tight timelines with a practical recovery plan.' as description,
        45 as duration_minutes,
        '[
          {"id":"q1","prompt":"A critical dependency slips by 12 hours. How do you protect the sprint outcome?","guidance":"Explain the fallback plan and communication strategy."},
          {"id":"q2","prompt":"Choose one metric you would use to judge whether the sprint is on track and justify it.","guidance":"Tie it to the cohort domain and sprint goals."}
        ]' as questions
    from public.cohorts c

    union all

    select
        c.id as cohort_id,
        3 as stage_number,
        'Founder Readout' as title,
        'Present a concise, high-signal summary of the work, tradeoffs, and next steps.' as description,
        30 as duration_minutes,
        '[
          {"id":"q1","prompt":"Write the final update you would send to founders after this sprint.","guidance":"Cover outcome, tradeoffs, risks, and next steps."},
          {"id":"q2","prompt":"What would you improve in the next sprint cycle after reviewing your own execution?","guidance":"Reflect on process, not just output."}
        ]' as questions
    from public.cohorts c
) seeded
on conflict (cohort_id, stage_number) do update
set title = excluded.title,
    description = excluded.description,
    duration_minutes = excluded.duration_minutes,
    questions = excluded.questions;

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
        when upper(c.type) like '%SECUR%' or upper(c.type) like '%CYBER%' then
            '[
              {
                "id":"q1",
                "type":"mcq",
                "prompt":"What is the safest first step when credentials may have been exposed?",
                "guidance":"Choose the option that lowers risk and preserves evidence.",
                "rubric":"Containment and secret rotation should come before public communication.",
                "options":[
                  {"id":"ignore","label":"Wait for more evidence before taking action"},
                  {"id":"rotate","label":"Rotate exposed secrets and isolate the affected surface"},
                  {"id":"redeploy","label":"Redeploy the app immediately without investigation"},
                  {"id":"announce","label":"Publish a notice before confirming scope"}
                ],
                "correctOptionIds":["rotate"],
                "allowMultiple":false
              },
              {
                "id":"q2",
                "type":"debug",
                "prompt":"A dashboard is leaking data outside the intended role scope. Explain how you would debug the authorization issue.",
                "guidance":"Cover identity, access checks, logging, and validation of the fix.",
                "rubric":"Look for least-privilege thinking, systematic checks, and safe rollout planning.",
                "language":"typescript",
                "starterCode":"export async function loadCustomerReport(userId: string) {\n  const user = await authClient.currentUser(userId);\n  const report = await reportService.fetchAll();\n  return { user, report };\n}",
                "expectedOutcome":"Identify the missing access control and how you would confirm the fix prevents leakage."
              },
              {
                "id":"q3",
                "type":"scenario",
                "prompt":"Design the first 48 hours of a cyber security sprint for hardening a product after a risk review.",
                "guidance":"Break the plan into priorities, owners, validation, and communication checkpoints.",
                "rubric":"Look for practical triage, clear sequencing, and measurable security outcomes.",
                "deliverable":"Incident response plan",
                "constraints":[
                  "One engineer and one security reviewer are available",
                  "Production traffic must stay online",
                  "A risk update is due at the end of day two"
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
