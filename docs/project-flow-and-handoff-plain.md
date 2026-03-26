# OptCamp Project Flow

This note is for anyone joining the project now. You should be able to read this once and understand what the app does today, where the flow starts and ends, and what still needs work.

Right now, OptCamp already covers the main path for a candidate. A student lands on the website, signs in, applies to a cohort, opens the dashboard, takes the qualifier, and if they pass, moves into the cohort flow. The app also has an admin area where you can manage qualifier and stage content.

The codebase uses Next.js (Typescript), Clerk, Supabase, and Tailwind. The main user pages are the landing page at `/`, the dashboard at `/dashboard`, the qualifier page at `/cohort-test/proctor`, and the stage page at `/dashboard/stage`. The admin content page lives at `/admin`.

So here’s the flow in plain terms. A user visits the site and picks a cohort. Then they sign in and fill out the application form. The app saves their profile in the `users` table and links them to the cohort in `user_cohorts`. After that, they go to the dashboard and see their current status and next step. Contact Nishith for credentials for loggging into vercel and supabase.

If they haven’t passed the qualifier yet, the dashboard sends them to the qualifier flow. The backend starts the attempt, marks the user as `qualifier_in_progress`, and loads the right questions for that cohort. When the user submits, the backend grades the attempt, saves the result, and updates the cohort status. If the score is 70 or higher, the user moves into the cohort. If not, the status changes to `qualifier_failed`.

Once the user gets into a cohort, each stage is unlocked one by one. The qualifier runs for three hours. The sprint should expect six hours of work per day, and all qualifiers have 48 hours availability. Right now we haven't built these timed avialability rules.

That said, the sprint side of the product still needs to catch up with the latest plan. The current product copy talks about a multi day gauntlet, but our plan is to have:
- Four days in total, with the first day being an intro and setup day, and the last day being a submission day. 
- On Day 1, users set up their editor, get their build ready, and finish one task. 
- On Day 2 and Day 3, they keep building in groups, ideally in person. 
- On Day 4, they refine the work and submit the final version. Results should go out within the next two days.

Also, users need to submit GitHub links for everything they make. If they miss the deadline, the system should disqualify them from that cohort. We need proper admin pages for correction and evaluation.

Notifications are also still pending. We should start with website notifications inside the app. That gives us a clean way to remind users about qualifier start times, sprint days, submission deadlines, and result announcements. Nishith and me were considering whatsapp for sending notifications, so we might add this depending on the circumstances.

The mobile leaderboard on the landing page needs to be made responsive for mobile devices. Same for test screens as well.

The best next steps are straightforward. First, verify the existing qualifier and stage flow end to end. Then build the sprint data model and the GitHub submission flow. After that, add deadline enforcement and disqualification. Then add in app notifications. Finally, clean up the mobile leaderboard and any weak spots in the dashboard. I'll take care of making the app responsive part.