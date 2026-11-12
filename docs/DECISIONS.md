# Decisions log

Newest first. One line of context, the decision, and why.

- **2026-11-11 · Sprint week instead of 10 weeks.** Tallen chose to build the full MVP as a working demo in one week
  (Nov 11–15) on drafted placeholder content. The 10-week plan in SPEC §12 stays the reference for the production version.
- **2026-11-11 · Accounts under Tallen's personal email for now.** Supabase, Vercel and the AI keys move to Chase's company
  (project transfer) once the partnership agreement is signed. The GitHub repo stays with Tallen (IP terms).
- **2026-11-11 · No Twilio this week.** Phone login runs on Supabase test numbers with placeholder SMS credentials.
  Real texts need Twilio before the pilot.
- **2026-11-11 · Invite-only accounts.** A database trigger copies an `invites` row into the profile on first login;
  numbers without an invite get status `uninvited` and no access (verified by `supabase/tests/rls_smoke.sql`).
- **2026-11-11 · Quiz answers never reach the browser.** `quiz_questions` is staff-only under RLS; reps get questions
  and grading through server code.
- **2026-11-11 · Reflections hidden from leaders.** A restrictive policy keeps reflection tasks visible only to the rep and staff.
- **2026-11-11 · Tailwind v4.** Brand tokens live in `app/globals.css` under `@theme`, not a tailwind config file.
- **2026-11-11 · Fonts by stylesheet link,** not `next/font`, so builds don't depend on fetching fonts at build time.
