# Deployment

OptCamp is optimized for deployment on Vercel with a Supabase backend.

## 1. Supabase Preparation
Before deploying the frontend, ensure your Supabase production database is fully migrated and seeded if necessary. Run the scripts in `supabase/migrations/` in order.

## 2. Vercel Deployment
1. Connect your GitHub repository to Vercel.
2. In the Vercel dashboard, configure the following Environment Variables before triggering the first build:
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET` / `SESSION_SECRET`
   - `GEMINI_API_KEYS`
   - All `SMTP_*` variables for email functionality.
3. Deploy!

## 3. Post-Deployment
- Ensure that the Auth Redirect URIs in your Supabase dashboard match your new Vercel production URL.
- Verify that emails are sending correctly and the AI Screening integration is fully operational in the production environment.
