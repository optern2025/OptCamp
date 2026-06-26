# OptCamp

A modern Cohort Operating System designed to power structured learning cohorts, mentor feedback, and sprint-based progression.

## Tech Stack
- Next.js 16 (App Router)
- Supabase (PostgreSQL, Auth, Edge Functions)
- Tailwind CSS
- TypeScript

## Features
- Cohort and Sprint Management
- Mentor Review and Feedback Workflows
- Automated Screening and Progression
- Certificate Generation
- Fully functional Admin and User Dashboards

## Local Setup
See `docs/SETUP.md` for detailed instructions.

1. Clone the repository
2. Run `npm install`
3. Configure your `.env.local` based on `.env.example`
4. Run the development server with `npm run dev`

## Environment Variables
See `docs/ENVIRONMENT.md` for a complete list of required environment variables. **Never commit your `.env.local` file.**

## Development Commands
- `npm run dev` - Start the local development server
- `npm run build` - Build the application for production
- `npm run start` - Start the production build locally
- `npm run lint` - Run the linter

## Deployment
See `docs/DEPLOYMENT.md` for notes on deploying to Vercel and configuring Supabase.
