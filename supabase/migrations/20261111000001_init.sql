-- Twelve LMS: initial schema (spec section 4) with row-level security (spec section 2).
-- Paste into Supabase > SQL Editor and run once. Never edit after it has been applied: add a new migration instead.

create extension if not exists pgcrypto;
create extension if not exists vector;

-- ───────────────────────── Types ─────────────────────────
create type public.user_role as enum ('rep', 'leader', 'coach', 'admin');
create type public.rep_type as enum ('setter', 'closer', 'self_gen');
create type public.task_kind as enum ('lesson', 'quiz', 'roleplay', 'field_task', 'reflection', 'workbook');
create type public.module_kind as enum ('core', 'eq', 'leadership', 'values', 'self_dev', 'recruiting');

-- ───────────────────────── Curriculum ─────────────────────────
create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  rep_type public.rep_type,
  description text,
  total_days int not null default 60,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null default 'quiz' check (kind in ('quiz', 'assessment')),
  pass_pct int not null default 80,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes on delete cascade,
  position int not null,
  prompt text not null,
  qtype text not null check (qtype in ('single', 'multi', 'short')),
  options jsonb,          -- ["A", "B", ...]
  correct jsonb,          -- single: 0, multi: [0,2], short: {"model_answer": "...", "rubric": "..."}
  explanation text,
  skill_slug text,
  created_at timestamptz not null default now()
);

create table public.weeks (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks on delete cascade,
  number int not null,
  title text not null,
  goal text,
  assessment_quiz_id uuid references public.quizzes,
  roleplay_threshold int default 70,
  created_at timestamptz not null default now(),
  unique (track_id, number)
);

create table public.days (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks on delete cascade,
  day_number int not null check (day_number between 1 and 120), -- day within the track
  title text,
  created_at timestamptz not null default now(),
  unique (week_id, day_number)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  body_md text,
  mux_asset_id text,
  mux_playback_id text,
  duration_s int,
  workbook_path text,
  module public.module_kind not null default 'core',
  skill_slugs text[] not null default '{}',
  is_draft_content boolean not null default true, -- true = placeholder written before Chase's real content
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  stage text not null check (stage in ('door', 'table', 'mindset', 'compliance')),
  description text,
  what_good_sounds_like text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  version int not null,
  body text not null,
  model text not null,
  temperature numeric not null default 0.4,
  active boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique (key, version)
);

create table public.personas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  setting text not null check (setting in ('door', 'table')),
  difficulty int not null default 1 check (difficulty between 1 and 5),
  backstory text,
  opening_line text,
  objections jsonb not null default '[]',
  success_condition text,
  start_trust int not null default 4,
  voice_id text,
  prompt_version_id uuid references public.prompt_versions,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.days on delete cascade,
  position int not null,
  kind public.task_kind not null,
  ref_id uuid,             -- lesson, quiz or persona id depending on kind
  title text not null,
  instructions text,
  est_minutes int,
  required boolean not null default true,
  created_at timestamptz not null default now()
);

-- ───────────────────────── People ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role public.user_role not null default 'rep',
  rep_type public.rep_type,
  full_name text not null default '',
  preferred_name text,
  phone text unique,
  email text,
  photo_path text,
  birthday date,
  interests text[] not null default '{}',
  goals text,
  start_date date,
  leader_id uuid references public.profiles,
  track_id uuid references public.tracks,
  track_started_on date,
  status text not null default 'invited' check (status in ('uninvited', 'invited', 'active', 'paused', 'left')),
  created_at timestamptz not null default now()
);

-- Who is allowed in. A phone number must be invited before its first login creates a usable profile.
create table public.invites (
  phone text primary key,            -- E.164, e.g. +14355551234
  full_name text not null,
  role public.user_role not null default 'rep',
  rep_type public.rep_type,
  leader_id uuid references public.profiles,
  track_id uuid references public.tracks,
  invited_by uuid references public.profiles,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.intake_responses (
  profile_id uuid primary key references public.profiles on delete cascade,
  answers jsonb not null default '{}',
  completed_at timestamptz
);

-- ───────────────────────── Progress ─────────────────────────
create table public.task_progress (
  profile_id uuid not null references public.profiles on delete cascade,
  task_id uuid not null references public.tasks on delete cascade,
  status text not null default 'todo' check (status in ('todo', 'done', 'skipped')),
  completed_at timestamptz,
  data jsonb,
  primary key (profile_id, task_id)
);

create table public.lesson_views (
  profile_id uuid not null references public.profiles on delete cascade,
  lesson_id uuid not null references public.lessons on delete cascade,
  watched_pct int not null default 0,
  last_position_s int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (profile_id, lesson_id)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes on delete cascade,
  profile_id uuid not null references public.profiles on delete cascade,
  answers jsonb not null,
  graded jsonb,
  score_pct int not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);

create table public.week_unlocks (  -- manual overrides by Chase/admin
  profile_id uuid not null references public.profiles on delete cascade,
  week_id uuid not null references public.weeks on delete cascade,
  unlocked_by uuid references public.profiles,
  created_at timestamptz not null default now(),
  primary key (profile_id, week_id)
);

-- ───────────────────────── Role play ─────────────────────────
create table public.roleplay_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles on delete cascade,
  persona_id uuid not null references public.personas,
  mode text not null check (mode in ('voice', 'text')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  turns jsonb not null default '[]',   -- [{role: "rep"|"homeowner", text, t}]
  audio_path text,
  status text not null default 'live' check (status in ('live', 'ended', 'scored', 'failed')),
  outcome text check (outcome in ('set', 'closed', 'lost', 'abandoned')),
  voice_seconds int not null default 0
);

create table public.roleplay_scores (
  session_id uuid primary key references public.roleplay_sessions on delete cascade,
  overall int not null,
  per_skill jsonb not null,
  top_fix jsonb,
  chase_line text,
  highlights jsonb,
  compliance_flags jsonb,
  prompt_version_id uuid references public.prompt_versions,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Recordings and coaching ─────────────────────────
create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles on delete cascade,
  setting text not null check (setting in ('door', 'table')),
  recorded_at timestamptz,
  storage_path text not null,
  duration_s int,
  source text not null default 'phone' check (source in ('phone', 'plaud', 'other')),
  consent_attested boolean not null check (consent_attested),
  consent_at_seconds numeric,
  label text,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'transcribing', 'analyzing', 'needs_consent_review', 'awaiting_review', 'released', 'failed')),
  error text,
  keep_as_example boolean not null default false,
  delete_audio_after date not null default (current_date + 90),
  created_at timestamptz not null default now()
);

create table public.transcripts (
  recording_id uuid primary key references public.recordings on delete cascade,
  provider text not null,
  raw jsonb,
  utterances jsonb not null default '[]',  -- [{start, end, speaker, text}]
  speaker_map jsonb,                        -- {"rep": 0, "homeowner": 1}
  consent jsonb,                            -- {"found": true, "t": 12.4, "quote": "..."}
  created_at timestamptz not null default now()
);

create table public.coaching_notes (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references public.recordings on delete cascade,
  profile_id uuid not null references public.profiles on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected', 'released')),
  ai_output jsonb not null,
  final_output jsonb,
  overall_score int,
  voice_memo_path text,
  reject_reason text,
  reviewed_by uuid references public.profiles,
  reviewed_at timestamptz,
  edit_distance numeric,
  prompt_version_id uuid references public.prompt_versions,
  created_at timestamptz not null default now()
);

create table public.flags (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles on delete cascade,
  source_type text not null check (source_type in ('recording', 'roleplay')),
  source_id uuid not null,
  t_start numeric,
  t_end numeric,
  skill_slug text,
  severity text not null check (severity in ('red', 'yellow')),
  note text,
  created_at timestamptz not null default now()
);

create table public.themes (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('team', 'leader')),
  leader_id uuid references public.profiles,
  period_start date not null,
  period_end date not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- ───────────────────────── AI plumbing ─────────────────────────
create table public.voice_examples (
  id uuid primary key default gen_random_uuid(),
  situation text not null,
  text text not null,
  source text,
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.content_chunks (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id uuid,
  text text not null,
  embedding vector(1024),
  created_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null default '{}',
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  attempts int not null default 0,
  run_after timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor uuid,
  action text not null,
  target_type text,
  target_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index on public.profiles (leader_id);
create index on public.tasks (day_id, position);
create index on public.days (week_id);
create index on public.quiz_attempts (profile_id, quiz_id);
create index on public.roleplay_sessions (profile_id, started_at desc);
create index on public.recordings (profile_id, created_at desc);
create index on public.recordings (status);
create index on public.coaching_notes (status, created_at);
create index on public.flags (profile_id, created_at desc);
create index on public.jobs (status, run_after);

-- ───────────────────────── Role helpers ─────────────────────────
-- security definer so policies can read the caller's role without recursing into profiles' own RLS.
create or replace function public.my_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and status in ('invited', 'active')
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('coach', 'admin') from public.profiles where id = auth.uid() and status = 'active'), false)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid() and status = 'active'), false)
$$;

-- True when the caller may see this rep: themselves, their leader, or staff.
create or replace function public.can_see_rep(rep uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select rep = auth.uid()
      or public.is_staff()
      or exists (select 1 from public.profiles p where p.id = rep and p.leader_id = auth.uid())
$$;

-- ───────────────────────── New-user hook ─────────────────────────
-- When a phone number signs in for the first time, copy its invite into a profile.
-- No invite = profile with status 'uninvited' and no access to anything.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  inv public.invites%rowtype;
  e164 text := case when new.phone is null then null else '+' || ltrim(new.phone, '+') end;
begin
  select * into inv from public.invites where phone = e164;
  if found then
    insert into public.profiles (id, role, rep_type, full_name, phone, leader_id, track_id, status, start_date)
    values (new.id, inv.role, inv.rep_type, inv.full_name, e164, inv.leader_id, inv.track_id, 'invited', current_date);
    update public.invites set accepted_at = now() where phone = e164;
  else
    insert into public.profiles (id, phone, status) values (new.id, e164, 'uninvited');
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Reps can edit their own profile, but never their role, leader, track or status.
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_staff() or auth.uid() is null then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.leader_id is distinct from old.leader_id
     or new.track_id is distinct from old.track_id
     or new.phone is distinct from old.phone
     or (new.status is distinct from old.status and not (old.status = 'invited' and new.status = 'active'))
     or (new.track_started_on is distinct from old.track_started_on and old.track_started_on is not null) then
    raise exception 'Only Chase or an admin can change that.';
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ───────────────────────── Row-level security ─────────────────────────
alter table public.tracks enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.weeks enable row level security;
alter table public.days enable row level security;
alter table public.lessons enable row level security;
alter table public.skills enable row level security;
alter table public.prompt_versions enable row level security;
alter table public.personas enable row level security;
alter table public.tasks enable row level security;
alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.intake_responses enable row level security;
alter table public.task_progress enable row level security;
alter table public.lesson_views enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.week_unlocks enable row level security;
alter table public.roleplay_sessions enable row level security;
alter table public.roleplay_scores enable row level security;
alter table public.recordings enable row level security;
alter table public.transcripts enable row level security;
alter table public.coaching_notes enable row level security;
alter table public.flags enable row level security;
alter table public.themes enable row level security;
alter table public.voice_examples enable row level security;
alter table public.content_chunks enable row level security;
alter table public.jobs enable row level security;
alter table public.audit_log enable row level security;

-- Curriculum: active users read published content; staff read and write everything.
-- quiz_questions holds the answers, so only staff read it directly; reps get questions through the server.
do $$
declare t text;
begin
  foreach t in array array['tracks', 'quizzes', 'lessons', 'personas'] loop
    execute format('create policy "%1$s: read published" on public.%1$I for select to authenticated using ((published and public.my_role() is not null) or public.is_staff())', t);
    execute format('create policy "%1$s: staff write" on public.%1$I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
  foreach t in array array['weeks', 'days', 'tasks', 'skills'] loop
    execute format('create policy "%1$s: read" on public.%1$I for select to authenticated using (public.my_role() is not null)', t);
    execute format('create policy "%1$s: staff write" on public.%1$I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
  foreach t in array array['quiz_questions', 'prompt_versions', 'voice_examples', 'content_chunks', 'invites'] loop
    execute format('create policy "%1$s: staff only" on public.%1$I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
  foreach t in array array['jobs', 'audit_log'] loop
    execute format('create policy "%1$s: admin read" on public.%1$I for select to authenticated using (public.is_admin())', t);
  end loop;
end $$;

-- Profiles
create policy "profiles: read visible" on public.profiles for select to authenticated using (public.can_see_rep(id));
create policy "profiles: update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: staff write" on public.profiles for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Rep-owned rows: the rep reads and writes their own; leaders and staff read; staff write.
do $$
declare t text;
begin
  foreach t in array array['intake_responses', 'task_progress', 'lesson_views', 'quiz_attempts', 'roleplay_sessions', 'recordings'] loop
    execute format('create policy "%1$s: read" on public.%1$I for select to authenticated using (public.can_see_rep(profile_id))', t);
    execute format('create policy "%1$s: own insert" on public.%1$I for insert to authenticated with check (profile_id = auth.uid())', t);
    execute format('create policy "%1$s: own update" on public.%1$I for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid())', t);
    execute format('create policy "%1$s: staff write" on public.%1$I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;

-- Reflections are private to the rep and Chase/admin, not leaders.
create policy "task_progress: hide reflections from leaders" on public.task_progress as restrictive for select to authenticated
  using (
    profile_id = auth.uid() or public.is_staff()
    or not exists (select 1 from public.tasks t where t.id = task_id and t.kind = 'reflection')
  );

create policy "week_unlocks: read" on public.week_unlocks for select to authenticated using (public.can_see_rep(profile_id));
create policy "week_unlocks: staff write" on public.week_unlocks for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Scores, transcripts, flags: written by the server (service role); read by whoever can see the rep.
create policy "roleplay_scores: read" on public.roleplay_scores for select to authenticated
  using (exists (select 1 from public.roleplay_sessions s where s.id = session_id and public.can_see_rep(s.profile_id)));
create policy "transcripts: read" on public.transcripts for select to authenticated
  using (exists (select 1 from public.recordings r where r.id = recording_id and public.can_see_rep(r.profile_id)));
create policy "flags: read" on public.flags for select to authenticated using (public.can_see_rep(profile_id));

-- Coaching notes: reps see only released notes; leaders see released notes for their team; staff see and edit all.
create policy "coaching_notes: rep and leader read released" on public.coaching_notes for select to authenticated
  using (status = 'released' and public.can_see_rep(profile_id));
create policy "coaching_notes: staff all" on public.coaching_notes for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "themes: read" on public.themes for select to authenticated
  using (public.is_staff() or (public.my_role() = 'leader' and leader_id = auth.uid()));

-- ───────────────────────── Storage ─────────────────────────
-- Private buckets. Files live under <user id>/... so ownership is readable from the path.
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('recordings', 'recordings', false, 524288000),  -- 500 MB
  ('avatars', 'avatars', false, 10485760),
  ('workbooks', 'workbooks', false, 52428800)
on conflict (id) do nothing;

create policy "recordings: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "recordings: read visible" on storage.objects for select to authenticated
  using (bucket_id = 'recordings' and public.can_see_rep(((storage.foldername(name))[1])::uuid));

create policy "avatars: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.my_role() is not null);

create policy "workbooks: read" on storage.objects for select to authenticated
  using (bucket_id = 'workbooks' and public.my_role() is not null);
create policy "workbooks: staff write" on storage.objects for all to authenticated
  using (bucket_id = 'workbooks' and public.is_staff()) with check (bucket_id = 'workbooks' and public.is_staff());
