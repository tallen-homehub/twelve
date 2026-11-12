-- Dashboards: reps' daily numbers, weekly focus, and coaching touches.
-- Paste into Supabase → SQL Editor and run once. Safe to re-run.

-- Can the caller coach this rep? Staff (Chase, leadership) for anyone; a team leader for their own reps.
create or replace function public.can_coach_rep(rep uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_staff()
      or (public.my_role() = 'leader' and exists (select 1 from public.profiles p where p.id = rep and p.leader_id = auth.uid()))
$$;

-- ───────────── Daily numbers ─────────────
-- One row per rep per day (Pacific). Setters: doors, convos, appts. Closers: sits, closes. Self-gen: all five.
create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles on delete cascade,
  log_date date not null,
  doors int not null default 0 check (doors between 0 and 1000),
  convos int not null default 0 check (convos between 0 and 1000),
  appts int not null default 0 check (appts between 0 and 200),
  sits int not null default 0 check (sits between 0 and 100),
  closes int not null default 0 check (closes between 0 and 100),
  note text check (length(note) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, log_date)
);
create index if not exists daily_logs_date_idx on public.daily_logs (log_date);
alter table public.daily_logs enable row level security;

drop policy if exists "daily_logs: read" on public.daily_logs;
create policy "daily_logs: read" on public.daily_logs for select to authenticated using (public.can_see_rep(profile_id));
-- Reps log today or fix the last two days; staff can correct anything.
drop policy if exists "daily_logs: own write" on public.daily_logs;
create policy "daily_logs: own write" on public.daily_logs for insert to authenticated
  with check (profile_id = auth.uid() and public.my_role() is not null and log_date between (now() at time zone 'America/Los_Angeles')::date - 2 and (now() at time zone 'America/Los_Angeles')::date);
drop policy if exists "daily_logs: own update" on public.daily_logs;
create policy "daily_logs: own update" on public.daily_logs for update to authenticated
  using (profile_id = auth.uid() and log_date >= (now() at time zone 'America/Los_Angeles')::date - 2)
  with check (profile_id = auth.uid() and log_date between (now() at time zone 'America/Los_Angeles')::date - 2 and (now() at time zone 'America/Los_Angeles')::date);
drop policy if exists "daily_logs: staff write" on public.daily_logs;
create policy "daily_logs: staff write" on public.daily_logs for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ───────────── Weekly focus ─────────────
-- One thing each rep works on this week (week starts Monday, Pacific). Set by staff or the rep's team leader.
create table if not exists public.weekly_focus (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles on delete cascade,
  week_start date not null,
  focus text not null check (length(focus) between 1 and 300),
  suggested text,
  set_by uuid references public.profiles on delete set null,
  prompt_version_id uuid references public.prompt_versions,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, week_start)
);
alter table public.weekly_focus enable row level security;
drop policy if exists "weekly_focus: read" on public.weekly_focus;
create policy "weekly_focus: read" on public.weekly_focus for select to authenticated using (public.can_see_rep(profile_id));
drop policy if exists "weekly_focus: coach write" on public.weekly_focus;
create policy "weekly_focus: coach write" on public.weekly_focus for all to authenticated
  using (public.can_coach_rep(profile_id)) with check (public.can_coach_rep(profile_id));

-- ───────────── Coaching touches ─────────────
-- "Mark coached": a 1:1, ride-along or call. Feeds "last coached" on the dashboards.
create table if not exists public.coaching_touches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles on delete cascade,
  coach_id uuid not null references public.profiles on delete cascade,
  kind text not null default '1on1' check (kind in ('1on1', 'ride_along', 'call', 'other')),
  note text check (length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists coaching_touches_rep_idx on public.coaching_touches (profile_id, created_at desc);
alter table public.coaching_touches enable row level security;
-- Reps don't see the touch log; their coaches do.
drop policy if exists "coaching_touches: coach read" on public.coaching_touches;
create policy "coaching_touches: coach read" on public.coaching_touches for select to authenticated using (public.can_coach_rep(profile_id));
drop policy if exists "coaching_touches: coach write" on public.coaching_touches;
create policy "coaching_touches: coach write" on public.coaching_touches for insert to authenticated
  with check (coach_id = auth.uid() and public.can_coach_rep(profile_id));

-- ───────────── Prompt ─────────────
insert into public.prompt_versions (key, version, model, temperature, active, notes, body) values
('focus_suggest', 1, 'claude-haiku-5-5', 0.4, true, 'Weekly focus suggestion for a rep', $p$You suggest ONE weekly focus for a rep on Chase Hermansen's TWELVE door-to-door solar team (Sunrun).
The focus is the single thing that would move this rep's numbers most this week. Write it the way Chase would say it: short, direct, specific, something the rep can act on at the next door.

Rep: {{rep_name}}, {{rep_type}}, day {{day}} of training.
Their numbers this week vs last week, and vs the team middle:
{{numbers}}
Weakest practice skills (1-5, from AI role play scores):
{{skills}}
Recent coaching fixes they were given:
{{fixes}}
Last week's focus: {{last_focus}}

Rules: one sentence for the focus, under 15 words, starting with a verb. Then one short sentence of why, pointing at a number or skill above. Don't repeat last week's focus word for word. Don't invent numbers.
Return ONLY JSON: {"focus": "...", "why": "..."}$p$)
on conflict (key, version) do nothing;
