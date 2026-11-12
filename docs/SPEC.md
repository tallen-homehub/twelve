# Twelve LMS — MVP Build Spec

Exported from the Twelve LMS build spec doc, Nov 11, 2026. The doc is the editable source; re-export after changes.

## 1. Goal, success criteria and scope

**Goal:** ship a mobile-first training app that proves Chase Hermansen's coaching can scale. By the end of the build, a rep gets a daily 60-day plan, practices on an AI homeowner, uploads real appointments, and gets timestamped feedback that sounds like Chase. Chase sees exactly where each rep is struggling. Build window: Dec 7, 2026 to Feb 13, 2027, at \~15 hours a week (\~150 hours).

### The "wow" acceptance test

The MVP is done when Chase can do all four of these on his phone in 15 minutes, using real data:

1. Run a voice role play against "Not interested" at the door, then get a score that uses his own stage names.
2. Upload one of his own recorded closes and get timestamped feedback he'd sign his name to.
3. Open a pilot rep's profile and hear the exact moment that rep keeps losing the door.
4. Open Team Themes and see the top three skills to train on Tuesday.

### Success metrics for the pilot (10–15 reps, Jan 25 – Feb 13)

| Metric | Target |
| --- | --- |
| Pilot reps who finish weeks 1–2 of their track | ≥ 70% |
| Role plays per active rep per week | ≥ 3 |
| Recordings uploaded per active rep per week | ≥ 1 |
| AI coaching notes Chase approves without a rewrite | ≥ 60% by week 3 of the pilot |
| Time from upload to feedback ready for Chase's review | ≤ 10 minutes |

### Scope

| Area | In the MVP | Out (later phases) |
| --- | --- | --- |
| Platform | Installable mobile-first web app (PWA), phone-number login | Native iOS/Android, offline mode |
| Tracks | New Setter: full 60-day map, weeks 1–2 fully produced. Experienced Setter and Closer: structure + week 1 | Full content for every track |
| Content types | Video, written lesson, downloadable workbook (PDF), quiz, weekly assessment, practice task, field task | Live classes, certificates |
| Extra modules | One sample lesson each: EQ, Leadership, Values, Self-Development, Recruiting | Full modules |
| Role play | 5 personas (3 door, 2 table), voice and text, rubric scoring | Persona builder, leaderboards |
| Recordings | Upload a file (phone or Plaud export), consent attestation, transcript with speakers | In-app live recording, direct Plaud sync |
| AI coaching | Timestamped notes in Chase's voice; Chase approves before reps see them | Fully automatic release |
| Dashboards | Chase: coaching queue, rep detail, team themes, content admin. Leaders: read-only rep list | Full leader dashboards, payroll or deal data |
| Rep profile | Intake form: photo, birthday, interests, role, start date, manager | Full Rep Management, birthday automation |
| Messaging | In-app notifications only | SMS cadence, Chase AI chat |

## 2. Users, roles and permissions

Four roles. Every permission is enforced in the database with row-level security, not just hidden in the UI.

| Capability | Rep | Leader | Coach (Chase) | Admin (Tallen) |
| --- | --- | --- | --- | --- |
| See own Today plan, lessons, quizzes, role play | Yes | Yes | Yes | Yes |
| Upload own recordings | Yes | Yes | Yes | Yes |
| See own approved coaching notes | Yes | Yes | Yes | Yes |
| See reps on own team (progress, scores) | No | Yes | All reps | All reps |
| Listen to other reps' recordings | No | Own team | All | All |
| Review, edit, approve AI coaching notes | No | No (MVP) | Yes | Yes |
| Team Themes dashboard | No | Own team | All | All |
| Create and edit content, tracks, quizzes, personas | No | No | Yes | Yes |
| Invite users, assign roles, tracks and leaders | No | No | Yes | Yes |
| System settings, AI prompt versions, exports | No | No | No | Yes |

**Rep sub-types:** `setter`, `closer`, `self_gen`. A rep has one active track; the admin can reassign it.

**Team structure:** each rep has one `leader_id`. Leaders see only reps whose `leader_id` is theirs. Chase and admins see everyone.

## 3. Tech stack, accounts, repo and environment

The stack uses mainstream, well-documented tools so Chase (or Claude Code under his own account) can maintain it later. Every paid account is opened under Chase's company, with Tallen as admin.

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 15 (App Router), TypeScript, React Server Components | One codebase for phone and desktop |
| UI | Tailwind CSS + shadcn/ui | Themed to the RUN XII brand (section 10) |
| PWA | next-pwa or a hand-written service worker + web manifest | "Add to Home Screen" install prompt |
| Database, auth, storage | Supabase: Postgres, Auth (phone OTP via Twilio Verify), Storage, Row-Level Security, pgvector, Edge Functions, Cron | Single back end |
| Background jobs | Supabase Edge Functions + a `jobs` table polled by a cron, or Inngest | Transcription and coaching run asynchronously |
| Video | Mux (upload from admin, signed playback) | Viewing analytics per rep |
| Transcription | Deepgram (pre-recorded, `diarize=true`, `utterances=true`, `smart_format=true`) | AssemblyAI is the fallback |
| LLM | Anthropic Claude API: Sonnet for coaching, scoring and text role play; Haiku for cheap classification | All prompts versioned in the DB (section 9) |
| Voice role play | OpenAI Realtime API or ElevenLabs Agents | Chosen in week 1 by a latency spike test; wrapped behind one interface |
| Hosting | Vercel | Preview deploy per branch for Chase's reviews |
| Analytics | PostHog | Events listed in section 11 |
| Errors | Sentry | Front end and edge functions |
| Code | GitHub repo, private, under Tallen's org; Chase added as collaborator | See the IP terms in the partnership plan |

### Repo structure

```
twelve/
  app/
    (auth)/login, verify, intake
    (rep)/today, track, lesson/[id], quiz/[id], roleplay, roleplay/[sessionId], recordings, recordings/[id], profile
    (coach)/queue, queue/[noteId], reps, reps/[id], themes, content, content/[...], personas, users
    api/roleplay/token, api/webhooks/mux, api/webhooks/deepgram
  components/      ui primitives, brand, players
  lib/             supabase clients, ai/, voice/, scoring/, transcripts/
  supabase/
    migrations/    SQL, one file per change
    functions/     process-recording, generate-coaching, score-roleplay, nightly-themes
    seed/          tracks, personas, rubric, sample lessons
  prompts/         markdown copies of every prompt (source of truth = DB)
  docs/            this spec, decisions log
```

### Environment variables

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY`, `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_WEBHOOK_SECRET`, `OPENAI_API_KEY` or `ELEVENLABS_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SID`, `NEXT_PUBLIC_POSTHOG_KEY`, `SENTRY_DSN`.

### Accounts to open in Phase 0 (all under Chase's company)

- [ ] GitHub repo
- [ ] Supabase project (Pro plan; daily backups)
- [ ] Vercel team
- [ ] Mux
- [ ] Deepgram
- [ ] Anthropic API
- [ ] OpenAI or ElevenLabs
- [ ] Twilio (Verify for login)
- [ ] PostHog
- [ ] Sentry
- [ ] Domain, e.g. `app.[twelve domain]`

## 4. Data model

Postgres on Supabase. Every table has `id uuid primary key default gen_random_uuid()` and `created_at timestamptz default now()` unless noted, and RLS is enabled on every table. A curriculum is **track → week → day → task**, and each task points at a lesson, quiz, role play persona, or field task. The same lesson can be reused across tracks.

```sql
-- People
create type user_role as enum ('rep','leader','coach','admin');
create type rep_type  as enum ('setter','closer','self_gen');
create table profiles (
  id uuid primary key references auth.users,
  role user_role not null default 'rep',
  rep_type rep_type,
  full_name text not null, phone text unique not null, email text,
  photo_path text, birthday date, interests text[], goals text,
  start_date date, leader_id uuid references profiles,
  track_id uuid references tracks, track_started_on date,
  status text not null default 'invited' -- invited | active | paused | left
);
create table intake_responses (profile_id uuid primary key references profiles, answers jsonb not null, completed_at timestamptz);

-- Curriculum
create table tracks (slug text unique, name text, rep_type rep_type, description text, total_days int default 60, published bool default false);
create table weeks (track_id uuid references tracks, number int, title text, goal text, assessment_quiz_id uuid references quizzes, unique(track_id, number));
create table days (week_id uuid references weeks, day_number int, title text, unique(week_id, day_number)); -- day_number 1-60 within the track
create type task_kind as enum ('lesson','quiz','roleplay','field_task','reflection','workbook');
create table tasks (day_id uuid references days, position int, kind task_kind, ref_id uuid, title text, instructions text, est_minutes int, required bool default true);
create type module_kind as enum ('core','eq','leadership','values','self_dev','recruiting');
create table lessons (title text, summary text, body_md text, mux_asset_id text, mux_playback_id text, duration_s int,
  workbook_path text, module module_kind default 'core', skill_slugs text[], published bool default false);
create table quizzes (title text, kind text default 'quiz', pass_pct int default 80); -- kind: quiz | assessment
create table quiz_questions (quiz_id uuid references quizzes, position int, prompt text, qtype text, -- single | multi | short
  options jsonb, correct jsonb, explanation text, skill_slug text);

-- Progress
create table task_progress (profile_id uuid references profiles, task_id uuid references tasks, status text default 'todo', -- todo | done | skipped
  completed_at timestamptz, data jsonb, primary key (profile_id, task_id));
create table lesson_views (profile_id uuid, lesson_id uuid, watched_pct int, last_position_s int, primary key (profile_id, lesson_id));
create table quiz_attempts (quiz_id uuid references quizzes, profile_id uuid references profiles, answers jsonb, score_pct int, passed bool);

-- Chase's rubric
create table skills (slug text unique, name text, stage text, description text, what_good_sounds_like text, position int); -- stage: door | table | mindset

-- Role play
create table personas (slug text unique, name text, setting text, difficulty int, backstory text, opening_line text,
  objections jsonb, success_condition text, voice_id text, prompt_version_id uuid references prompt_versions, published bool);
create table roleplay_sessions (profile_id uuid references profiles, persona_id uuid references personas, mode text, -- voice | text
  started_at timestamptz, ended_at timestamptz, turns jsonb, audio_path text, status text, outcome text); -- outcome: set | closed | lost | abandoned
create table roleplay_scores (session_id uuid primary key references roleplay_sessions, overall int, per_skill jsonb,
  top_fix text, chase_line text, highlights jsonb, prompt_version_id uuid);

-- Field recordings and coaching
create table recordings (profile_id uuid references profiles, setting text, recorded_at timestamptz, storage_path text, duration_s int,
  source text, -- phone | plaud | other
  consent_attested bool not null, consent_at_seconds numeric, -- where on the audio consent is given
  label text, -- no homeowner names
  status text default 'uploaded', -- uploaded | transcribing | analyzing | awaiting_review | released | failed
  error text, delete_audio_after date);
create table transcripts (recording_id uuid primary key references recordings, provider text, raw jsonb,
  utterances jsonb, -- [{start, end, speaker, text}]
  speaker_map jsonb); -- {"rep": 0, "homeowner": 1}
create table coaching_notes (recording_id uuid references recordings, profile_id uuid references profiles,
  status text default 'draft', -- draft | approved | rejected | released
  ai_output jsonb, final_output jsonb, overall_score int, reviewed_by uuid, reviewed_at timestamptz,
  edit_distance numeric, prompt_version_id uuid);
create table flags (profile_id uuid references profiles, source_type text, source_id uuid, t_start numeric, t_end numeric,
  skill_slug text, severity text, note text); -- severity: red | yellow. Red = "run to the red" moment
create table themes (scope text, leader_id uuid, period_start date, period_end date, data jsonb);

-- AI plumbing
create table prompt_versions (key text, version int, body text, model text, temperature numeric, active bool, notes text, unique(key, version));
create table voice_examples (situation text, text text, source text, approved bool default true); -- Chase's golden examples
create table content_chunks (source_type text, source_id uuid, text text, embedding vector(1024)); -- for retrieving Chase's content
create table jobs (type text, payload jsonb, status text default 'queued', attempts int default 0, run_after timestamptz default now(), last_error text);
create table audit_log (actor uuid, action text, target_type text, target_id uuid, detail jsonb);
```

**Derived values (computed, not stored):** a rep's current day = days since `track_started_on` + 1, capped at 60; a week unlocks when the previous week's assessment is passed. Skill scores per rep come from a view over `roleplay_scores.per_skill` and `coaching_notes.final_output`, weighting the last 14 days.

## 5. Feature specs: core learning

Each feature lists what it does and how to know it's done. Acceptance criteria are written so they can be tested by hand on a phone.

### 5.1 Invite, login and intake

- An admin or Chase invites a rep by name, phone, role, rep type, leader and track. The rep gets a text with a link (Twilio).
- Login is a phone number plus a 6-digit code (Supabase Auth with Twilio Verify). No passwords. Sessions last 90 days.
- First login opens the **intake form**, one question per screen, under 5 minutes total: photo (camera or library), preferred name, birthday, interests (chips plus free text), "why are you here / what's your goal this year," T-shirt size, shipping address (stored for later gifting; optional now).
- On submit: profile status → `active`, `track_started_on` = today, and the rep lands on Today.
- **Done when:** a new rep goes from text link to Today in under 5 minutes, and a skipped intake can't be bypassed.

### 5.2 Today screen (rep home)

- Header: "Day 12 of 60," the week's name and goal, a progress ring for the day, and a streak count (consecutive days with every required task done).
- The day's tasks in order, each with kind icon, title, estimated minutes and a check state. Tapping opens the task.
- Unfinished required tasks from earlier days show in a "Catch up" list above today's tasks (max 5).
- A card for the newest released coaching note, if any.
- A big **Practice** button that opens role play.
- **Done when:** completing every task fills the ring and increments the streak, and the day's content changes at local midnight (America/Los\_Angeles).

### 5.3 Track map

- The 60 days grouped by week, as a vertical scroll. Completed days are filled, today is highlighted, future weeks show as locked until the previous week's assessment is passed.
- Chase or an admin can override a lock for one rep.
- **Done when:** a rep can see the whole journey and exactly why a week is locked.

### 5.4 Lessons

- Mux video player with resume position, playback speed (1×, 1.25×, 1.5×, 2×) and captions.
- Written concept below the video (markdown), and a workbook PDF download if one exists.
- The task is marked done at 90% watched (or on "Mark complete" for text-only lessons).
- **Done when:** watch progress persists across devices and shows in Chase's rep detail.

### 5.5 Quizzes and weekly assessments

- Single choice, multiple choice and short answer. Short answers are graded by Claude against a model answer plus rubric, and return a score with one sentence of feedback.
- After submit: score, the right answer and an explanation for each miss, and the skill it tests. Quizzes can be retaken without limit; the best score counts.
- **Weekly assessment** = a quiz (pass mark default 80%) plus one required role play scoring ≥ the week's threshold. Passing unlocks the next week.
- Each missed question writes to the rep's skill picture (section 8).
- **Done when:** a failed assessment blocks the next week and tells the rep exactly what to redo.

### 5.6 Field tasks and reflections

- **Field task:** an instruction ("Knock 60 doors and get 3 bills") with a self-report form: numbers plus an optional note. Feeds the rep's activity history.
- **Reflection:** 1–3 prompts with free text (EQ, mindset, values). Private to the rep and Chase.
- **Done when:** both save, count toward the day, and show in rep detail.

### 5.7 Notifications (in-app and web push)

- Morning nudge with the day's task count, a note when coaching is released, and a reminder when a week's assessment opens.
- Rep can set quiet hours. Web push needs the PWA installed on iOS; the in-app inbox works everywhere.
- **Done when:** a released coaching note reaches the rep within 1 minute.

## 6. Role play engine

The rep practices against an AI homeowner who behaves like a real one: short at the door, guarded, and only softening when the rep earns it. Every session ends with a score on Chase's rubric, the one thing to fix, and the line Chase would have used.

### 6.1 Launch personas (draft; Chase replaces the details)

| Persona | Setting | Difficulty (1–5) | Main smoke screen | Wins when the rep… |
| --- | --- | --- | --- | --- |
| Busy Brenda, mom mid-dinner | Door | 1 | "Not interested, I'm busy" | Earns 60 more seconds and gets a bill |
| Diane, "my husband handles that" | Door | 2 | Spouse not home | Sets an appointment with both decision-makers |
| Skeptic Steve, neighbor "got burned" | Door | 3 | "Solar's a scam" | Gets curiosity and a bill without arguing |
| Tom and Maria, "we need to think about it" | Table | 3 | Think it over, get other quotes | Uncovers the real objection and closes or books a firm follow-up |
| Numbers Nate, engineer | Table | 4 | Savings math, escalator, moving in 5 years | Answers with facts and gets the go-ahead |

### 6.2 Session flow

1. Rep picks a persona (or the day's task picks it) and a mode: **voice** (default) or **text**.
2. Pre-brief card: setting, what the rep knows, the goal, and the skill being drilled.
3. **Voice:** the browser asks `/api/roleplay/token` for a short-lived session token; the client connects straight to the realtime voice provider (WebRTC) with the persona's system prompt. **Text:** messages stream from Claude through a server route.
4. The persona keeps hidden state the rep never sees: a **trust meter** (0–10, starts at the persona's level), the remaining objection stack, and a mood. Trust rises only on behaviors in the rubric (e.g., pattern interrupt, a real question, empathy before rebuttal). It falls on pushiness, talking over, or misleading claims.
5. **Ends when:** the persona shuts the door or leaves the table; the goal is reached; the rep taps End; or the time cap hits (door 6 minutes, table 20 minutes).
6. The transcript is saved as turns with timestamps; voice sessions also save the audio.
7. A scoring job runs (section 9, prompt `roleplay_score`) and the results screen appears in under 20 seconds.

### 6.3 Results screen

- Overall score 0–100 and the outcome (set, closed, lost).
- Score per rubric skill (1–5) with a one-line reason each.
- **One thing to fix**, with the turn it came from (tap to see it in the transcript).
- **What Chase would have said** at that moment.
- Up to 2 highlights the rep did well.
- Buttons: "Run it again" and "Try a harder homeowner."

### 6.4 Rules and limits

- Personas never break character, never coach the rep, and never invent facts about Sunrun pricing; when asked specifics they ask questions back like a real homeowner would.
- The scorer flags compliance problems (claiming to be from the utility, pressure tactics, false promises) as a red flag regardless of outcome.
- Cost guard: 30 voice minutes per rep per day; text mode is unlimited. Chase and admins are uncapped.
- **Done when:** five pilot reps rate the homeowner "realistic" (4+ of 5) and Chase agrees with the score on 8 of 10 sessions he reviews.

## 7. Recording pipeline and AI coaching

A rep uploads a real appointment, and within 10 minutes Chase has a draft coaching note to approve. Nothing reaches the rep until Chase (or an admin) approves it. A recording with no consent on it is never analyzed.

&#91;embedded content: Recording pipeline · upload to released coaching note\]

A recording with no consent stops at the first check; every approved note also makes the next AI draft sound more like Chase.

### 7.1 Upload screen

- Accepts m4a, mp3, wav, aac, mp4 and mov, up to 500 MB / 2.5 hours. Resumable upload (tus) to a **private** Supabase Storage bucket, so a weak signal in the field doesn't lose the file.
- Fields: setting (door or table), date, short label (no homeowner names, e.g., "Corona table, Tue"), and a required checkbox: *"The homeowner agreed to be recorded, and that agreement is on this recording."* Optional: the minute the consent is given.
- Plaud users export the audio from the Plaud app and upload it here. A direct Plaud connection comes later.

### 7.2 Processing steps (job `process-recording`)

1. **Transcribe:** send a signed URL to Deepgram with speaker labels and timestamps; its webhook stores the transcript. Status → `analyzing`.
2. **Who's who:** a small model call labels each speaker as rep, homeowner, or other, and writes `speaker_map`.
3. **Consent check:** a small model call looks for consent language in the first 5 minutes. Not found → status `needs_consent_review`, the admin is notified, and nothing else runs.
4. **Redact:** homeowner names, phone numbers, addresses and emails are masked in the stored transcript.
5. **Coach:** the `coaching_note` prompt (section 9) gets the timestamped transcript, Chase's rubric, his voice profile and 5–10 of his approved examples closest to this situation. Recordings over 60 minutes are split by sales stage, analyzed in parts, then merged.
6. **Validate:** the output must match the JSON schema (section 9); one automatic retry, then `failed` with the error shown to the admin.
7. **Store:** a `coaching_notes` row as `draft`, plus a `flags` row for every red or yellow moment. Status → `awaiting_review`, and Chase gets a notification.

### 7.3 What the rep sees after release

- A score and a 2–3 sentence summary in Chase's voice.
- A timeline of moments: each with a timestamp, the skill, what happened, what Chase would have said, and why. Tapping a moment plays the audio from 5 seconds before it.
- "Practice this" on any moment opens a role play built around that objection.

### 7.4 Retention

- Audio is deleted 90 days after upload by a nightly job, unless Chase marks it as a training example. Redacted transcripts and coaching notes are kept.
- **Done when:** a 45-minute table recording goes from upload to a draft note in ≤ 10 minutes, and a recording without consent never reaches the coaching step.

## 8. Chase's dashboards

Chase's side of the app has four screens. All of them work on his phone first.

### 8.1 Coaching queue

- A list of draft coaching notes, oldest first, each showing rep, setting, length, AI score and number of red flags.
- **Review screen:** audio player with a waveform; transcript with speakers, scrolling in sync with playback; the AI's summary and moments, each editable inline.
- Per moment: keep, edit, delete, or add a new moment at the current playback time. Per note: approve and release, or reject with a reason.
- Record a 30-second voice memo to attach to the note. The rep hears Chase himself.
- Every edit stores both the AI version and the final one. The difference feeds the voice-improvement loop (section 9.4).
- **Done when:** Chase can review and release a typical note in under 3 minutes.

### 8.2 Rep list and rep detail (1:1 prep)

- **Rep list:** search and filter by leader, track, status and "needs attention" (no activity in 3 days, failed assessment, falling scores). Columns: day of track, tasks done %, role plays this week, latest score trend.
- **Rep detail** (the screen Chase opens before a 1:1):
  - Header: photo, name, role, day 18 of 60, leader, birthday and interests (so Chase can open personally).
  - **Biggest struggle areas:** the 3 weakest skills from role plays, coaching notes and missed quiz questions over the last 14 days, each with its trend.
  - **Run to the red:** the latest red flags with one-tap audio playback.
  - **Suggested 1:1 topics:** three talking points written by AI from the above, in Chase's voice.
  - Activity: lessons watched, quizzes, role plays, field task numbers, reflections.
- **Done when:** Chase can prep a 1:1 in 2 minutes without asking the rep anything.

### 8.3 Team Themes

- A nightly job (`nightly-themes`) aggregates the last 7 days of flags and skill scores by team and by leader.
- Shows the top 3 weak skills with the share of reps affected ("62% of setters lose the door at the price question"), 2 example clips for each, and a suggested training topic for the next team meeting.
- Filter by leader, track and date range.
- **Done when:** Chase can name Tuesday's training topic from this screen alone.

### 8.4 Content admin

- Build tracks: add, reorder and remove weeks, days and tasks by drag and drop; link each task to a lesson, quiz, persona or field task.
- Lesson editor: title, markdown body, video upload (direct to Mux), workbook PDF upload, module, skill tags, publish switch.
- Quiz editor: questions, options, correct answers, explanations, skill tag, pass mark.
- Persona editor: backstory, opening line, objections, success condition, difficulty, voice, test-play button.
- Rubric editor: skills, stage, description, "what good sounds like."
- Users: invite, assign role, rep type, leader and track; reset a rep's track; unlock a week.
- **Done when:** Chase can add a new lesson with video and a quiz to Day 14 without a developer.

## 9. AI prompts and JSON schemas

Every prompt lives in `prompt_versions` with a key and a version number, and every AI output stores the version that produced it. Changing a prompt means adding a version, never editing in place. Placeholders in `{{double braces}}` are filled at run time. The drafts below are starting points; Chase's voice profile and rubric get dropped in once Phase 0 captures them.

### 9.1 Prompt list

| Key | Model | Input | Output |
| --- | --- | --- | --- |
| `persona_homeowner` | Realtime voice model or Claude Sonnet (text) | Persona fields | Live conversation |
| `roleplay_score` | Claude Sonnet | Transcript, persona, rubric, voice profile | `RoleplayScore` JSON |
| `speaker_label` | Claude Haiku | First 40 utterances | `{"rep": n, "homeowner": n, "other": [n]}` |
| `consent_check` | Claude Haiku | First 5 minutes of transcript | `{"found": bool, "t": seconds, "quote": string}` |
| `redact` | Claude Haiku | Utterances | Same utterances with PII masked |
| `coaching_note` | Claude Sonnet | Transcript, setting, rubric, voice profile, examples | `CoachingNote` JSON |
| `short_answer_grade` | Claude Haiku | Question, model answer, rep answer | `{"score": 0-100, "feedback": string}` |
| `one_on_one_topics` | Claude Sonnet | Rep's skill picture, flags, recent activity | 3 talking points |
| `team_themes` | Claude Sonnet | 7 days of flags and skill scores | Themes JSON |

### 9.2 Draft: `persona_homeowner`

```text
You are {{name}}, a homeowner in Southern California. Setting: {{setting}}.
Backstory: {{backstory}}
You open with: "{{opening_line}}"
Your objections, in the order you raise them: {{objections}}
You are not trying to help the salesperson. Stay in character the whole time.

How you behave:
- At the door you give short answers, you are busy, and you look for a reason to close the door.
- You keep a private trust level from 0 to 10, starting at {{start_trust}}. Raise it only when the rep earns it:
  a real question about you, empathy before a rebuttal, a clear and honest reason to keep talking,
  or making it easy to say yes. Lower it when the rep is pushy, talks over you, dodges, or makes claims
  that sound too good to be true.
- Below 3 you end the conversation. At 8 or above you agree to {{success_condition}}.
- Never coach the rep or step out of character. Never state Sunrun prices or programs; ask questions instead.
- Sound like a real person: interruptions, "uh," short sentences, the occasional off-topic remark.
```

### 9.3 Draft: `coaching_note`

```text
You are writing coaching feedback as Chase Hermansen, leader of the Twelve sales team.
Voice profile: {{voice_profile}}
Examples of Chase's real feedback: {{examples}}
Chase's rubric (stage, skill, what good sounds like): {{rubric}}

Below is a timestamped transcript of a {{setting}} appointment by {{rep_first_name}}, a {{rep_type}} on day {{day}} of training.
{{transcript}}

Write feedback the way Chase would say it to this rep in person: direct, specific, encouraging but honest.
Rules:
- Every point must cite a timestamp and quote the rep's actual words.
- 3 to 6 moments. At least one is something the rep did well.
- Mark a moment "red" only if it likely lost or seriously risked the deal.
- "chase_would_say" is the exact words Chase would use at that moment, as a line the rep can memorize.
- Flag any compliance problem (misrepresenting who they are, pressure, false promises) as red with skill "compliance".
- Do not invent anything not in the transcript.
Return only JSON matching the CoachingNote schema.
```

### 9.4 Schemas (enforced with Zod)

```ts
type Moment = {
  t_start: number; t_end: number;          // seconds
  skill: string;                            // a skills.slug, or "compliance"
  severity: "red" | "yellow" | "good";
  rep_said: string;                         // quote
  what_happened: string;                    // 1-2 sentences
  chase_would_say: string | null;           // null for "good" moments
  why: string;                              // 1 sentence
};
type CoachingNote = {
  overall_score: number;                    // 0-100
  outcome_guess: "set" | "closed" | "follow_up" | "lost" | "unclear";
  summary: string;                          // 2-3 sentences, Chase's voice
  moments: Moment[];                        // 3-6
  per_skill: Record<string, 1 | 2 | 3 | 4 | 5>;
  practice_next: { skill: string; persona_slug: string | null };
};
type RoleplayScore = {
  overall: number; outcome: "set" | "closed" | "lost" | "abandoned";
  per_skill: Record<string, { score: 1 | 2 | 3 | 4 | 5; reason: string }>;
  top_fix: { turn: number; text: string };
  chase_line: string;
  highlights: { turn: number; text: string }[];   // up to 2
  compliance_flags: string[];
};
```

### 9.5 The voice-improvement loop

- Every approved note stores `edit_distance` between the AI version and Chase's final version. The admin dashboard charts the weekly average; it should fall over the pilot.
- Notes Chase approves with no edits, and his best rewrites, can be promoted to `voice_examples` with one tap.
- A fixed test set of 10 recordings and 10 role plays is re-run whenever a prompt changes; Chase blind-rates old vs new before a new version goes live.

## 10. Screens, brand and UX rules

### 10.1 Screen inventory

| # | Screen | Who | Notes |
| --- | --- | --- | --- |
| 1 | Login (phone) and code entry | All | RUN XII logo, one field per screen |
| 2 | Intake (6–8 steps) | Rep | Progress bar; photo step first |
| 3 | Today | Rep | Home tab |
| 4 | Track map | Rep | Tab |
| 5 | Lesson | Rep | Video, text, workbook, mark complete |
| 6 | Quiz / assessment and results | Rep | One question per screen |
| 7 | Role play picker and pre-brief | Rep | Tab: "Practice" |
| 8 | Live role play (voice / text) | Rep | Big mic button, live captions, End button |
| 9 | Role play results | Rep | Score, fix, Chase line, retry |
| 10 | Recordings list and upload | Rep | Tab; upload status chips |
| 11 | Coaching note (released) | Rep | Moment timeline with audio |
| 12 | Profile and settings | Rep | Quiet hours, install app prompt |
| 13 | Coaching queue and review | Coach | Coach home |
| 14 | Rep list and rep detail | Coach, Leader | 1:1 prep |
| 15 | Team Themes | Coach, Leader |  |
| 16 | Content admin (tracks, lessons, quizzes, personas, rubric) | Coach, Admin | Desktop-friendly |
| 17 | Users | Coach, Admin | Invite, assign |

Rep bottom tabs: **Today · Track · Practice · Recordings · Me**. Coach bottom tabs: **Queue · Reps · Themes · Content**.

### 10.2 Brand tokens (from the RUN XII and Twelve merch)

| Token | Value | Use |
| --- | --- | --- |
| Ink | `#0E0E0E` | App background (dark), text on light |
| Bone | `#F5F4F0` | Text on dark, light surfaces |
| Tan | `#CDBFA6` | Accent: progress, active tab, primary button on dark |
| Charcoal | `#1F1C19` | Cards on dark |
| Brown-grey | `#6B5A45` | Accent text on light |
| Muted text | `#C8C3BA` on dark, `#55504A` on light | Secondary text |
| Red (flags only) | `#D9534F` | "Run to the red" moments; always paired with the word "Red" |
| Headings | Archivo 800–900, lowercase for display titles | Matches the "twelve" wordmark feel |
| Body | Public Sans 400/600 |  |
| Logo | RUN XII white and black PNGs (already cut); replace with the original vector files from Chase | Login, splash, header |

### 10.3 UX rules

- **Built for the field:** one hand, outdoors in sun. Tap targets ≥ 48 px, body text ≥ 16 px, contrast ≥ 4.5:1. Dark theme by default, with a high-contrast light theme in settings; test both in direct sunlight.
- **Fast:** Today loads in under 2 seconds on 4G; skeleton loaders, never blank screens.
- **Chase's voice everywhere:** buttons, empty states and confirmations are written in his voice once the voice profile exists. Until then use plain, short placeholders marked `TODO-VOICE`.
- **No dead ends:** every result screen has a next action (retry, next task, practice this).
- **Respect people:** no public leaderboards in the MVP; scores are private to the rep, their leader and Chase.

## 11. Security, privacy, consent and non-functional requirements

### 11.1 Security

- RLS on every table, with a test suite that logs in as each role and proves what it can and can't read and write.
- The service-role key is used only in edge functions and server routes, never in the browser.
- Storage buckets are private; audio and video play through signed URLs that expire in 1 hour.
- Voice role play tokens are short-lived (≤ 60 seconds to connect) and issued only to logged-in users under their daily cap.
- Webhooks (Mux, Deepgram) verify signatures.
- `audit_log` records role changes, note approvals and rejections, deletions and exports.

### 11.2 Privacy and consent

- California requires every party's consent to record a conversation. The app requires the rep's attestation **and** checks the transcript for consent language before any analysis (section 7.2).
- Suggested consent script for reps, built into the upload screen: *"Our team records some meetings for training and quality. Are you okay with me recording this one?"* then, once recording: *"This call's being recorded, you're good with that?"* Wording to be confirmed with Chase and Sunrun.
- Homeowner personal details are masked in stored transcripts; labels can't contain names.
- Audio is deleted after 90 days unless Chase marks it as a training example.
- A rep's reflections are visible only to the rep and Chase.
- Account deletion: admin can delete a rep and all their recordings; transcripts are anonymized for theme statistics.
- Not legal advice. Have the consent flow and retention policy reviewed before the pilot.

### 11.3 Performance and reliability

| Requirement | Target |
| --- | --- |
| Today screen load on 4G | < 2 s |
| Voice role play reply latency | < 1 s typical |
| Role play score ready | < 20 s after end |
| Recording to draft note (45 minutes of audio) | ≤ 10 min |
| Job retries | 3 with backoff, then `failed` and an admin alert |
| Backups | Supabase daily backups + weekly export of content tables |
| Uptime | Best effort; Vercel + Supabase status alerts to Tallen |

### 11.4 Analytics events (PostHog)

`login`, `intake_completed`, `task_completed`, `lesson_progress` (25/50/90%), `quiz_submitted`, `assessment_passed`, `roleplay_started`, `roleplay_completed`, `recording_uploaded`, `coaching_released`, `coaching_viewed`, `moment_played`, `practice_from_moment`, `note_approved` (with edit distance), `theme_viewed`. Each carries role, rep type, track and day.

### 11.5 Cost guardrails (estimates to verify against current pricing)

- Voice role play is the biggest variable cost; cap per rep per day (section 6.4) and show the month's usage on the admin screen.
- Coaching uses one large model call per recording, plus small calls for labeling, consent and redaction.
- Monthly usage alert at a budget Chase sets.

## 12. Build plan: 10 weekly milestones

One milestone a week at \~15 hours, each ending with a test Chase or Tallen can run on a phone. The two holiday weeks are deliberately light. Feb 14–28 is a **buffer** before the spring class, not extra scope.

| Week | Dates | Build | Acceptance test |
| --- | --- | --- | --- |
| 1 | Dec 7–13 | Repo, Supabase, Vercel, phone login, roles, RLS skeleton, brand theme, PWA shell. **Voice spike:** same persona on both voice providers | Log in by phone on iPhone and Android; role tests pass; voice provider chosen on latency and realism |
| 2 | Dec 14–20 | All migrations and seed data; intake form; content admin v1 (tracks, weeks, days, tasks, lessons with Mux upload) | Chase builds Day 1 with a video lesson himself |
| 3 | Dec 21–27 (light) | Today screen, track map, lesson player with resume, task progress, streak | A test rep completes Day 1 end to end on a phone |
| 4 | Dec 28 – Jan 3 (light) | Quizzes, weekly assessment, week unlock logic, short-answer grading, quiz editor | A failed assessment blocks week 2 and says what to redo |
| 5 | Jan 4–10 | Role play: personas, persona editor, text and voice sessions, scoring, results screen, daily cap | All 5 personas playable by voice; score in under 20 s |
| 6 | Jan 11–17 | Recording upload, transcription, speaker labels, consent check, redaction, coaching note generation, coaching queue review. **Demo to Chase \~Jan 15** | Chase uploads his own close and approves the note; wow tests 1 and 2 pass |
| 7 | Jan 18–24 | Released note screen with moment audio, flags, rep list and rep detail with 1:1 topics, notifications; weeks 1–2 content loaded | Pilot-ready checklist complete; wow test 3 passes |
| 8 | Jan 25–31 | **Pilot starts** (10–15 reps). Team Themes nightly job; daily fix list from pilot feedback | Wow test 4 passes on pilot data |
| 9 | Feb 1–7 | Experienced Setter and Closer week 1 structure; sample lessons for EQ, Leadership, Values, Self-Development, Recruiting; voice-loop tools (edit distance, promote to example) | Chase approves ≥ 60% of notes without a rewrite |
| 10 | Feb 8–13 | Hardening: RLS test suite, performance, cost caps, 90-day audio deletion, analytics events, error alerts; pilot review with Chase | Go / no-go for the spring class |

**Rules for the build:** ship to a preview link every week; Chase reviews on his phone; nothing moves to the next week until that week's test passes or is consciously deferred in the decisions log.

## 13. Content and inputs needed from Chase

The software is half the MVP; the other half is Chase's content. Without these by the dates below, the matching week ships with placeholders.

| Input | Needed by | Used in |
| --- | --- | --- |
| Rubric: stage names and 8–12 skills for the door and the table, with "what good sounds like" | Dec 13 | Scoring, coaching, themes |
| 60-day New Setter plan: daily non-negotiables (the "60 Days to Six Figures" outline) | Dec 13 | Track map, Today |
| Weeks 1–2 content: 10–14 lesson videos (studio day), lesson text, 2 workbooks, quiz questions | Dec 20 (outline), Jan 10 (videos) | Lessons, quizzes |
| 5 persona briefs: real objections, real smoke screens, what wins | Jan 3 | Role play |
| 10–20 of his best recorded closes + 5 lost ones, with consent confirmed | Jan 3 | Coaching examples, demo |
| 20+ real coaching notes or voice memos he's given reps | Jan 3 | Voice profile |
| Two 90-minute voice interviews | Dec 20 | Voice profile |
| "Never say" list and compliance rules from Sunrun | Jan 3 | Personas, scorer |
| Pilot list: 10–15 reps (mix of new and experienced) + 1–2 leaders | Jan 17 | Pilot |
| Original logo files (vector) and brand fonts | Dec 13 | Brand |
| Week 1 outlines for Experienced Setter and Closer tracks | Jan 31 | Week 9 |
| Approval of the consent script and 90-day audio retention | Jan 3 | Uploads |

### Decisions to lock before week 1

- [ ] Voice provider (decided by the week 1 spike)
- [ ] Plaud devices for closers: yes or no
- [ ] Pilot dates and rep list
- [ ] Whether leaders get rep detail in the MVP or only the rep list
- [ ] Budget alert level for AI and voice usage per month

## 14. Kickoff prompt for Claude Code

How to use it: export this spec to Markdown and save it in the repo as `docs/SPEC.md`. Create `CLAUDE.md` from the block in 14.1. Start each week with the prompt in 14.2, changing only the week number.

### 14.1 `CLAUDE.md` (lives at the repo root)

```markdown
# Twelve LMS
Mobile-first training app for Chase Hermansen's Sunrun D2D solar team (RUN XII / Twelve).
The full spec is docs/SPEC.md. Read the section for the current task before writing code.

## Stack
Next.js 15 App Router + TypeScript (strict), Tailwind + shadcn/ui, Supabase (Postgres, Auth phone OTP, Storage, RLS, pgvector, Edge Functions),
Mux, Deepgram, Anthropic Claude API, realtime voice provider behind lib/voice/, PostHog, Sentry, Vercel.

## Rules
- Mobile first. Test every screen at 390px wide. Tap targets >= 48px.
- Every table has RLS. Never use the service-role key in client code.
- Schema changes only through new files in supabase/migrations/. Never edit an applied migration.
- Every AI call: prompt loaded from prompt_versions by key, output validated with Zod, prompt_version_id stored with the result.
- Long work (transcription, coaching, scoring, themes) runs as a job, never inside a request.
- Brand tokens live in tailwind.config.ts; use them, no stray hex values.
- User-facing copy that should sound like Chase is marked TODO-VOICE until the voice profile exists.
- Keep components small; server components by default; client components only for interaction.
- Write a short entry in docs/DECISIONS.md for any decision the spec doesn't cover.
- Before saying a task is done: typecheck, lint, run tests, and list what to check by hand on a phone.
```

### 14.2 Weekly prompt

```text
We're building the Twelve LMS. Read CLAUDE.md and docs/SPEC.md first.

This session: Week {{N}} from section 12 of the spec.
1. Restate the week's build items and its acceptance test in your own words, and list any spec gaps
   or questions. Stop and wait for my answers before writing code.
2. Propose a short plan: files to create or change, migrations, edge functions, and tests.
3. Build it in small commits, one feature at a time. After each feature, run typecheck, lint and tests.
4. Seed realistic test data so the acceptance test can be run on a phone.
5. Finish with: what was built, how to run the acceptance test step by step, what's deferred,
   and new entries for docs/DECISIONS.md.
Don't build anything from later weeks. If something in the spec seems wrong, say so instead of guessing.
```

### 14.3 First session (Week 1) checklist for Tallen

- [ ] Phase 0 accounts open (section 3) and keys in Vercel and local `.env.local`
- [ ] Empty repo with `docs/SPEC.md` and `CLAUDE.md`
- [ ] RUN XII logo PNGs in `public/brand/`
- [ ] Two test phone numbers (one rep, one coach)
- [ ] Run the 14.2 prompt with N = 1
