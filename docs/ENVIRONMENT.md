# Environment Variables

The OptCamp platform requires several environment variables to function correctly. 
These should be placed in a `.env.local` file in the root of the project. 

> **Important**: Never commit your `.env.local` file. It is ignored by Git by default.

### Application URL
- `NEXT_PUBLIC_APP_URL`: The base URL of the application (e.g., `http://localhost:3000`).

### Supabase Settings
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The public anonymous key for Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: The secret service role key (SERVER ONLY).

### Security
- `JWT_SECRET`: Secret used for signing JWTs (if applicable).
- `SESSION_SECRET`: A secure 32+ character random string for session token validation.

### AI Screening
- `GEMINI_API_KEYS`: A comma-separated list of Google Gemini API keys used for evaluating candidate submissions in the screening flow.

### Email (SMTP)
Required for sending OTP verification emails and notifications in production.
- `SMTP_HOST`: The SMTP server host (e.g., `smtp.resend.com`).
- `SMTP_PORT`: The SMTP server port (usually 465 or 587).
- `SMTP_USER`: The SMTP username.
- `SMTP_PASS`: The SMTP password.
- `SMTP_FROM`: The default sender email address.
