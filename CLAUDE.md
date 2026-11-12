# Twelve LMS

Mobile-first training app for Chase Hermansen's Sunrun D2D solar team (RUN XII / Twelve).
The full spec is `docs/SPEC.md`. Read the section for the current task before writing code.
Setup steps for a fresh environment are in `docs/SETUP.md`. Decisions not covered by the spec go in `docs/DECISIONS.md`.

## Stack
Next.js 15 App Router + TypeScript (strict), Tailwind CSS v4, Supabase (Postgres, Auth phone OTP, Storage, RLS,
pgvector, Edge Functions), Mux, Deepgram, Anthropic Claude API, realtime voice provider behind `lib/voice/`,
PostHog, Sentry, Vercel.

## Layout
- `app/(auth)` login, intake, not-invited · `app/(rep)` rep tabs · `app/(coach)` Chase/admin tabs
- `lib/supabase/*` clients (server, browser, middleware) · `lib/auth.ts` profile + role guards
- `supabase/migrations` SQL, one file per change · `supabase/tests` RLS smoke test runnable on plain Postgres 16
- `components/ui.tsx` shared primitives · brand tokens in `app/globals.css` (`@theme`)

## Rules
- Mobile first. Test every screen at 390px wide. Tap targets >= 48px.
- Every table has RLS. Never use the service-role key in client code.
- Schema changes only through new files in `supabase/migrations/`. Never edit an applied migration.
- Every page calls `requireProfile()` (with `roles` for coach screens) before reading data.
- Every AI call: prompt loaded from `prompt_versions` by key, output validated with Zod, `prompt_version_id` stored with the result.
- Long work (transcription, coaching, scoring, themes) runs as a job, never inside a request.
- Use the brand tokens (`bg-ink`, `text-bone`, `bg-tan`, `bg-charcoal`, `font-display`…); no stray hex values.
- "Today" means America/Los_Angeles (`lib/dates.ts`).
- User-facing copy that should sound like Chase is marked `TODO-VOICE` until the voice profile exists.
- Placeholder curriculum is flagged `is_draft_content = true` so Chase's real content can replace it cleanly.
- Server components by default; client components only for interaction.
- Before saying a task is done: `npx tsc --noEmit`, `npm run lint`, `npm run build`, and list what to check by hand on a phone.
