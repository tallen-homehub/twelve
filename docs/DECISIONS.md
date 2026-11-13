# Decisions log

Newest first. One line of context, the decision, and why.

- **2026-11-12 · Voice = OpenAI Realtime over WebRTC; text + scoring = Claude.** The week-1 latency spike was skipped for the
  sprint; voice sits behind `/api/roleplay/[id]/token` and `VoiceRoleplay.tsx`, so swapping to ElevenLabs later touches only those.
  The server mints a 2-minute client secret; the OpenAI key never reaches the phone.
- **2026-11-12 · Scoring runs inside the request** (≤ 60 s route) instead of the jobs table, to show results immediately in the
  demo. Recording analysis (longer) will use jobs.
- **2026-11-12 · Hidden homeowner state.** Text mode asks the model to append `[[state trust=… end=… outcome=…]]`, which the
  server strips and stores in `roleplay_sessions.state`; the rep never sees it.
- **2026-11-12 · Task completion from role play.** Any scored run completes a practice task; the end-of-week role play needs
  `weeks.roleplay_threshold` (default 70) and is now part of the week-unlock rule.
- **2026-11-12 · Voice cap** 30 min per rep per Pacific day (staff uncapped); voice seconds are reported by the client and clamped.

- **2026-11-12 · Draft curriculum lives in code.** `supabase/seed/content_draft.py` → `build_seed.py` → migration 0003. Deterministic
  ids make it safe to re-run. Weeks 1–2 of New Setter are full drafts; weeks 3–9 and the other two tracks are outlines.
- **2026-11-12 · Quizzes graded in the database.** `get_quiz_questions` (no answers) and `submit_quiz` are security-definer
  functions, so no service-role key is needed and answers never reach the phone. Short answers count as correct until AI grading lands.
- **2026-11-12 · Week unlocks.** Week 1 is always open; week N opens when week N−1's assessment is passed, or when that week
  has no assessment, or by a staff override (`week_unlocks`). The role-play threshold joins the rule once role play ships.
- **2026-11-12 · Role-play tasks show but don't count yet.** They render as "opens Friday" and are excluded from the day's
  progress until the practice engine exists (`LIVE_KINDS` in `lib/curriculum.ts`).
- **2026-11-12 · Staff preview.** Coaches/admins without a track see New Setter with everything unlocked.
- **2026-11-12 · Default track.** Reps activating without a track get New Setter (setters) or Closer (closers) via trigger.

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

## Env var name fallbacks (2026-11-12)
Vercel locks a variable's name after creation, and secret values can't be read back to re-add them. The keys were first saved as `twelve` (Anthropic) and `Open_Ai_Key` (OpenAI), so the code reads `ANTHROPIC_API_KEY ?? twelve` and `OPENAI_API_KEY ?? Open_Ai_Key`. When keys are next rotated, add them under the standard names and delete the fallbacks.

## Recording pipeline (Day 4, 2026-11-12)
- **Jobs without a queue service.** Each step runs with Next's `after()` (after the response is sent): the upload action starts Deepgram; Deepgram calls `/api/recordings/deepgram` (signed with an HMAC of the recording id); that route stores the transcript and runs triage + coaching in `after()`. A `jobs` row per recording records running/done/failed. Staff can re-run any failed recording from the queue. Swap for a real queue (Supabase Queues or Inngest) if volume needs it.
- **Triage is one call.** Speaker labels, the consent check and the list of homeowner names to mask come from one small-model call (`recording_triage`) on the first 5 minutes, instead of three calls.
- **Redaction** masks the names/places triage finds plus phone numbers and emails, before coaching. Audio is not altered.
- **Upload is a plain Supabase Storage upload**, not resumable (tus) yet. Supabase's free plan caps uploads at 50 MB whatever the bucket says; a 45-minute m4a is usually under that. Pro raises the cap; add resumable uploads then.
- **Not built yet:** Chase's voice memo on a note, waveform, splitting recordings over 60 minutes, release notifications, 90-day audio cleanup job.
- **Reject** marks the recording failed with "Not released: <reason>" so it leaves the queue; the rep sees "Didn't process".

## Help chat and the brain (2026-11-12)
- **One conversation per rep.** The help bot (Haiku, prompt `help_agent`) answers while the thread is `ai`. It escalates on pay/HR/scheduling, safety, broken app, upset reps, anything the brain doesn't cover, or when the rep taps "Talk to a person". Escalated threads go quiet for the bot and show in leadership's Inbox (coach/admin). Leadership replying to a bot thread takes it over; "hand back" returns it to the bot. Leaders (team leads) don't see help chats.
- **Alerts:** in-app badges only for now (Inbox tab count, red dot on the rep's ? button). Text/push alerts later.
- **Live updates by polling** every 4 seconds while a chat is open, instead of Supabase Realtime. Simple and fine at this size.
- **Brain:** chunks in `content_chunks` with OpenAI `text-embedding-3-small` at 1024 dimensions, searched with `match_chunks`. Sources today: the app guide (`lib/brain/app-guide.ts`), published lessons, skills, personas. It builds itself on the first question; Content → "Rebuild the brain" refreshes it. Google Drive "Twelve Brain" folder sync is next (chosen over Notion: no new tool for Chase's team).
- **Google Drive sync** (`lib/brain/drive.ts`): a Google service account with read-only Drive access; the "Twelve Brain" folder is shared with its email. Reads Google Docs/Slides/Sheets (exported as text), PDFs (unpdf), Word (.docx, mammoth), and text/markdown, including subfolders. Only changed files are re-read; removed files leave the brain. Runs daily at 6:17am PT (Vercel cron, `/api/cron/brain-sync`) and from Content → "Sync Google Drive now". The cron accepts `CRON_SECRET` if set, otherwise Vercel's cron user agent (the sync is read-only and safe to repeat).

## Dashboards (2026-11-12)
- **Two dashboards.** Chase/staff: `/dashboard` (team totals vs last week, coaching pulse, needs-you-today across everyone, teams side by side, full team table). Team leaders: `/team` (their reps only: logged-today, needs-you list, rep cards with weekly focus and mark-coached). Staff can open any leader's view at `/team?leader=<id>`. Leaders now land on `/team`; staff land on `/dashboard`.
- **Production numbers are self-logged** daily on the Today screen (`daily_logs`): setters doors/convos/appts, closers sits/closes, self-gen all five. Reps can fix the last two days. A Sunrun/CRM import can replace this later.
- **"Coach here"** = the funnel rate (talk = convos/doors, set = appts/convos, close = closes/sits, last 2 weeks, min 5 in the denominator) furthest below the team median by >10%; otherwise the weakest practice skill (<3.5/5).
- **"Last coached"** = latest of a logged 1:1/ride-along/call (`coaching_touches`), a released coaching note, or a focus set/edited.
- **Weekly focus** (`weekly_focus`, week starts Monday Pacific) is set by staff or the rep's own leader; "✦ Suggest" drafts one with Haiku (`focus_suggest`). Reps see it on Today.
- **Needs-you rules:** red flag this week, no activity 3+ days, failed assessment, practice avg down 10+, no focus, not coached 7+ days, didn't log yesterday.
- Metrics are computed per request from the caller's RLS view (fine for ~250 reps). Move to a nightly rollup if it gets slow.

## Team themes (2026-11-12)
- Nightly at 2:41am PT (`/api/cron/themes`) plus "Refresh now". One snapshot for the whole team and one per team leader, stored in `themes`.
- Numbers are computed, not written by the AI: per skill, each rep's average over the last 7 days of scored role plays and released coaching notes; "weak" = average under 3/5; share = weak reps ÷ reps with scores on that skill (min 2 reps). Ranked by share, then lowest average. Claude (Sonnet, `team_themes`) only writes the headline, why, meeting topic, 3-step drill and the line, and picks examples.
- Spec asked for filters by track and date range; v1 filters by team leader only and always shows the last 7 days.
