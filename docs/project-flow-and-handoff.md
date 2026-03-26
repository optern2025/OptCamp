# OptCamp Project Flow And Handoff

## Purpose

This document is the working handoff for new collaborators joining the OptCamp project. It explains:

- what the product currently does
- how the candidate flow works end to end
- what is already implemented in the codebase
- what still needs to be built
- the business rules collaborators should preserve while adding features

This should be treated as the current operating spec until a more formal product requirements document is written.

## Project Summary

OptCamp is a cohort application, qualifier, and progression platform for Optern cohorts. Candidates apply to a cohort, complete a timed qualifier, and if they pass, move into a sprint-style cohort workflow with stage-based progression.

The app currently includes:

- landing page and cohort discovery
- candidate registration and profile creation
- cohort application flow
- dashboard for candidate progress
- admin content management for qualifiers and stage questions
- qualifier test runner and grading flow
- progressive stage unlocking for cohort stages

## Current Stack

- Next.js 16 with App Router
- React 19 + TypeScript
- Clerk for authentication
- Supabase for database storage
- Tailwind CSS v4

## Current Product Areas In The Codebase

### Public / Candidate Experience

- `/`
  Landing page, cohort overview, registration entry, leaderboard section
- `/dashboard`
  Candidate dashboard showing applications, statuses, and next actions
- `/cohort-test/proctor`
  Timed qualifier runner
- `/dashboard/stage`
  Stage-based sprint workflow for enrolled candidates

### Admin Experience

- `/admin`
  Admin content management for qualifier questions and cohort stages

### Active Backend Routes

- `GET /api/cohorts`
- `POST /api/register/profile`
- `GET /api/me/dashboard`
- `GET /api/me/proctor-exam`
- `POST /api/proctor/grade`
- `GET /api/me/cohort-stage`
- `POST /api/me/cohort-stage`
- `GET /api/admin/content`
- `POST /api/admin/content`
- `POST /api/admin/content/import-questions`

## Current End-To-End Candidate Flow

### 1. Candidate lands on the website

The user visits the landing page and reviews available cohorts. The landing page already presents core messaging, timeline cards, and a leaderboard section.

### 2. Candidate signs in and applies

The user signs in using Clerk and completes the application form. The form saves or updates the user profile and creates the cohort application record.

Current database behavior:

- user profile is stored in `public.users`
- cohort application is stored in `public.user_cohorts`
- a user can apply to one or more cohorts

### 3. Candidate opens the dashboard

After applying, the user views `/dashboard` to see:

- their profile summary
- all applied cohorts
- current application status
- available next action for each cohort

Supported status values in the system today:

- `applied`
- `qualifier_in_progress`
- `qualifier_failed`
- `qualifier_passed`
- `enrolled`
- `completed`

### 4. Candidate starts the qualifier

If the candidate has applied to a cohort and has not yet passed it, they can open the qualifier from the dashboard.

Current behavior:

- `GET /api/me/proctor-exam` initializes the qualifier attempt
- the candidate status is moved to `qualifier_in_progress`
- the system loads cohort-specific qualifier content from Supabase
- if no custom qualifier exists, fallback qualifier content is used

### 5. Candidate submits the qualifier

The qualifier is graded through `POST /api/proctor/grade`.

Current backend behavior:

- stores the attempt in `public.qualifier_attempts`
- stores score and feedback
- if the score is high enough, the candidate is enrolled in the cohort
- if the candidate does not pass, the status becomes `qualifier_failed`

Current pass rule in the existing README:

- score `>= 70` results in cohort enrollment

### 6. Candidate enters the cohort sprint flow

Once enrolled, the candidate can access stage-based cohort content.

Current behavior:

- stage content is fetched from `GET /api/me/cohort-stage`
- stage submissions are handled through `POST /api/me/cohort-stage`
- stages unlock progressively
- if the final stage is passed, the cohort status becomes `completed`

## Current Sprint Structure In Product Messaging

The landing page currently presents a multi-day gauntlet style experience. Existing copy references:

- spec + architecture
- core build
- curveball requirement
- optimization + submission
- public ranking

This should be reconciled with the updated sprint design below so the website copy, dashboard logic, and admin content all align.

## Planned / Updated Cohort Operating Flow

The following points come from the latest working notes and should be treated as the target product behavior to implement next.

### Time Structure

- cohort sprint should be designed around `6 hours per day`
- qualifier duration should be `3 hours`
- exam time should be `3 hours`
- participants should have `48 hours availability`

Open clarification still needed:

- whether "exam time 3 hours" refers to the existing qualifier only, or to an additional assessment later in the sprint
- whether "48 hours availability" means overall response window, allowed participation window, or support expectation

Until clarified, collaborators should treat this as:

- qualifier: 3-hour timed assessment
- sprint participation expectation: 6 hours per day
- candidates must remain available across the sprint window and result period

### Sprint Schedule

Target sprint flow:

- Day 1: editor setup, build setup, complete 1 task
- Day 2: continue building in groups, ideally in person
- Day 3: continue building in groups, ideally in person
- Day 4: refinement and final submission
- Results should be published within the next 2 days after submission

### Submission Rules

- candidates must submit GitHub links for all required work
- submissions received after the time limit should be disqualified from that cohort

This should become an explicit backend-enforced rule, not only a manual admin rule.

## Features Still To Be Implemented

### 1. Website Notifications

Requested idea:

- website notifications
- explore WhatsApp API if it is free or cost-feasible

Recommended implementation direction:

- start with in-app website notifications first
- support reminders for:
  - qualifier start
  - qualifier deadline
  - sprint day reminders
  - submission deadline
  - result announcement
- only evaluate WhatsApp integration after pricing, policy, and approval constraints are confirmed

Important note:

- WhatsApp API is usually not a simple free integration at production scale, so this should be treated as a separate integration investigation, not assumed as free

Suggested implementation breakdown:

- add a notifications data model
- add candidate notification preferences
- add admin-triggered and system-triggered notification events
- add UI surface on dashboard for unread notifications
- later evaluate external channels such as WhatsApp or email

### 2. Backend Verification For Test Results

Pending requirement:

- verify test results end to end

This likely means validating the full grading and persistence flow from:

- test start
- answer submission
- grading
- score persistence
- dashboard status updates
- enrollment or failure outcome

Current implementation exists, but it needs proper verification and testing.

Recommended work:

- add end-to-end test coverage for qualifier flow
- verify failed qualifier path
- verify passed qualifier path
- verify stage unlocking after enrollment
- verify final stage completion path
- verify duplicate submission and retry behavior

### 3. Sprint Implementation

The sprint concept exists in product copy and the stage system exists technically, but the exact sprint operating model from the latest notes is not fully implemented yet.

What needs to be aligned:

- sprint day structure
- day-wise tasks and deliverables
- group-based work flow
- submission checkpoints
- disqualification rules
- result publication flow

Recommended implementation direction:

- map each sprint day to a structured stage or sprint task entity
- store deadlines and submission windows in the backend
- make cohort dashboard show current day, due items, and final submission state
- support admin review and result publishing flow

### 4. Mobile Leaderboard Responsive Design

Current leaderboard exists on the landing page, but this still needs a mobile-first review and polish pass.

Focus areas:

- tab switching on small screens
- podium layout on mobile
- overflow handling for long college names
- spacing, readability, and rank hierarchy
- filter dropdown usability on mobile

### 5. GitHub Submission Collection

Required product rule:

- candidates must submit GitHub links for everything they build

Implementation needs:

- submission form for GitHub repository links
- validation for one or more repository URLs
- admin visibility into submitted repos
- deadline-aware submission status
- locked submission state after deadline

### 6. Automatic Disqualification After Deadline

Required rule:

- if a participant does not submit within the time limit, they are disqualified from that cohort

Implementation needs:

- define deadline source of truth per cohort or sprint stage
- add explicit status for disqualification
- enforce submission lock after deadline
- surface disqualification clearly in dashboard and admin panel

Suggested new status:

- `disqualified`

If this status is introduced, all dashboard and admin logic must be updated to support it cleanly.

## Recommended Data / Backend Changes

The following additions are likely needed to support the planned work.

### Candidate Submission Tracking

Potential table or fields for sprint submissions:

- submission id
- user id
- cohort id
- sprint day or task id
- github repository url
- optional demo url
- submitted at
- deadline at
- status
- reviewer notes

### Notification Tracking

Potential notification fields:

- id
- user id
- cohort id
- type
- title
- message
- read at
- created at
- delivery channel

### Cohort Timeline / Sprint Metadata

Potential fields:

- qualifier duration
- sprint start date
- sprint end date
- per-day expected hours
- results publish date
- submission deadline
- disqualification rule enabled

## Recommended Workstreams For New Collaborators

To parallelize work for new human collaborators, split ownership like this:

### Workstream 1: Candidate Experience

- dashboard improvements
- notifications UI
- GitHub submission UI
- status and deadline messaging

### Workstream 2: Admin And Operations

- sprint configuration
- deadline controls
- result publishing controls
- submission review tooling

### Workstream 3: Backend And Data

- submission schema
- notification schema
- deadline enforcement
- disqualification logic
- end-to-end result verification

### Workstream 4: Frontend Polish

- mobile leaderboard redesign
- responsive QA on landing and dashboard

## Immediate Priority List

Suggested order of execution:

1. verify qualifier and stage result flow end to end
2. define sprint data model and submission rules
3. implement GitHub link submission flow
4. implement deadline enforcement and disqualification
5. implement website notifications
6. improve mobile leaderboard responsiveness

## Open Questions That Need Product Confirmation

- Is the qualifier the same thing as the "exam", or are those separate steps?
- What exactly does "48 hours availability" mean operationally?
- Should group-based work on Day 2 and Day 3 be tracked inside the product or only communicated externally?
- Are late submissions always disqualified automatically, or is there an admin override?
- Should result publication happen cohort-wide on one date, or per user after review is completed?
- Do we want email notifications before WhatsApp, or is WhatsApp a strict requirement?

## Implementation Notes For Collaborators

- Do not assume landing-page sprint copy is the final source of truth.
- Preserve the current application -> qualifier -> enrollment -> stage progression flow while extending sprint features.
- Keep business rules enforceable in the backend, not just in the UI.
- When adding statuses, update dashboard rendering, admin rendering, and API logic together.
- Add tests for all deadline-driven and grading-driven transitions.

## Summary

The current app already handles the core application, qualifier, enrollment, and stage progression flow. The next phase is to make the sprint operationally complete by adding submission collection, deadline enforcement, notifications, result verification, and mobile polish.
