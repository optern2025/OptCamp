# Local Setup

## Prerequisites
- Node.js 18+
- npm or pnpm
- A Supabase Project (Local or Cloud)

## Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Copy the example environment file and fill in your details:
   ```bash
   cp .env.example .env.local
   ```
   Check `ENVIRONMENT.md` for details on how to fill this out.

3. **Supabase Database Setup**
   Ensure your Supabase project has the correct tables. If you are starting fresh, run the migration scripts found in `supabase/migrations/` in alphabetical order using the Supabase CLI or SQL Editor.

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.
