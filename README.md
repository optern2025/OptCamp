# OptCamp

OptCamp is the application and qualifier orchestration app for Optern cohorts.

It handles:
- Candidate registration with Clerk Auth
- Profile persistence in Supabase
- Cohort application tracking + cohort test dashboard

## Product Flow
1. Candidate applies from landing page (`/`) with profile + cohort selection.
2. App creates a Clerk account and session.
3. App persists profile data to `public.users` and links the cohort via `public.user_cohorts`.
4. Candidate uses `/cohort-test` to view their active cohorts and start the qualifier.

## Architecture
```mermaid
flowchart LR
  A["Landing + Registration UI"] --> B["Clerk sign-up"]
  B --> C["POST /api/register/profile"]
  C --> D["Supabase (users + cohorts + user_cohorts)"]
  E["/cohort-test"] --> F["GET /api/me/cohort-test"]
  F --> D
  I["Registration form"] --> J["GET /api/cohorts"]
  J --> D
```

## Tech Stack
- Next.js 16 (App Router)
- React 19 + TypeScript
- Clerk Auth
- Supabase Postgres (database only)
- Tailwind CSS v4
- Biome

## Data Model

### `public.users`
Important columns:
- `id uuid` (app user id)
- `clerk_user_id text unique`
- `email text`
- `name text`
- `university text`
- `stack text`
- `github text`
- `availability boolean`
- `intent text`

### `public.user_cohorts`
- `user_id uuid` (references `public.users.id`)
- `cohort_id uuid` (references `public.cohorts.id`)
- `status text` (default `active`)
- `applied_at timestamptz`

### `public.cohorts`
- `id uuid`
- `slug text unique`
- `type text`
- `apply_window text`
- `sprint_window text`
- `apply_by text`
- `qualifier_test_url text`
- `is_active boolean`
- `created_at timestamptz`

## API Contracts

### `GET /api/cohorts`
Purpose:
- Fetch cohort list for registration dropdown and landing cards.

Response:
- `200 { cohorts: Cohort[] }`
- `500 { error: string }`

### `POST /api/register/profile`
Auth:
- Clerk session cookie

Purpose:
- Persist or update candidate profile after Clerk signup.

Response:
- `200 { ok: true }`
- `400 { error: string }`
- `401 { error: "Unauthorized." }`
- `500 { error: string }`

### `GET /api/me/cohort-test`
Auth:
- Clerk session cookie

Purpose:
- Return current user profile, active cohorts, and full cohort list.

Response:
- `200 { user: UserProfile, pursuingCohorts: Cohort[], cohorts: Cohort[] }`
- `401 { error: "Unauthorized." }`
- `500 { error: string }`

## Environment Variables
Copy `.env.example` to `.env.local` and fill values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server only; never expose client-side)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_APP_URL` (example: `http://localhost:3000`)

## Local Setup
1. Install dependencies:
```bash
npm install
```

2. Configure env vars:
```bash
cp .env.example .env.local
```

3. In Supabase SQL Editor, run in order:
- `supabase/users_setup.sql`
- `supabase/20260228_qualifier_flow.sql`
- `supabase/20260228_clerk_auth_migration.sql` (only for existing deployments migrating from Supabase Auth)

4. Start dev server:
```bash
npm run dev
```

5. Open app:
- Landing and apply: `http://localhost:3000`
- Cohort test dashboard: `http://localhost:3000/cohort-test`

## Core File Map
- `proxy.ts`: Clerk middleware (`clerkMiddleware`) for App Router + APIs.
- `app/layout.tsx`: App shell with `ClerkProvider` and auth controls.
- `app/page.tsx`: Landing page + apply entry + cohort cards (API-backed).
- `app/components/RegistrationPage.tsx`: Clerk sign-up + profile sync.
- `app/cohort-test/page.tsx`: Authenticated cohort dashboard with Clerk session.
- `app/api/register/profile/route.ts`: Profile persistence endpoint.
- `app/api/cohorts/route.ts`: Cohort list endpoint.
- `app/api/me/cohort-test/route.ts`: User cohort dashboard payload endpoint.
- `lib/clerkServer.ts`: Clerk server-side auth/user helper.
- `lib/supabaseAdmin.ts`: Server service-role Supabase client.
- `lib/env.ts`: Runtime env validation helpers.
- `lib/types.ts`: Shared `Cohort` and `UserProfile` types.

## Operational Notes
- Registration uses Clerk auth and then writes profile data to Supabase.
- Supabase Auth is no longer used in runtime flow.

## Known Limitations / Next Steps
- Cohort dates are currently stored as display strings, not normalized date columns.
- No admin panel yet for managing cohorts and qualifier URLs.
- Add e2e tests for signup, profile sync, and cohort tracking.
