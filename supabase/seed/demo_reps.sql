-- DEMO DATA for showing the dashboards. Not real people.
-- 2 team leaders + 10 reps, all named "Demo …", phone numbers +1 555-010-00xx (fake, can't log in).
-- Two weeks of daily numbers, training progress, scored role plays, weekly focus, 1:1s and a red flag.
-- Safe to re-run (it removes old demo data first). Remove everything with supabase/seed/demo_remove.sql.

do $$
declare
  today date := (now() at time zone 'America/Los_Angeles')::date;
  setter_track uuid := (select id from public.tracks where slug = 'new-setter');
  closer_track uuid := (select id from public.tracks where slug = 'closer');
  leaders uuid[] := array[]::uuid[];
  lead_names text[] := array['Demo Marcus Reyes', 'Demo Jess Tran'];
  -- name, rep_type, leader (1/2), days in, doors/day, talk rate, set rate, sits/day, close rate, logs (0-1), practice base, trend/session, weak skill, task completion
  reps jsonb := '[
    {"n":"Demo Tyler Brooks","t":"setter","l":1,"d":34,"doors":72,"talk":0.31,"set":0.15,"sits":0,"close":0,"logs":0.95,"rp":76,"tr":3,"weak":"objection-handling","done":0.97},
    {"n":"Demo Kayla Nguyen","t":"setter","l":1,"d":21,"doors":58,"talk":0.29,"set":0.07,"sits":0,"close":0,"logs":0.85,"rp":63,"tr":1,"weak":"setting","done":0.82},
    {"n":"Demo Jordan Pike","t":"setter","l":1,"d":9,"doors":44,"talk":0.17,"set":0.12,"sits":0,"close":0,"logs":0.8,"rp":56,"tr":0,"weak":"pattern-interrupt","done":0.7},
    {"n":"Demo Bri Santos","t":"closer","l":1,"d":6,"doors":0,"talk":0,"set":0,"sits":1.4,"close":0.36,"logs":0.9,"rp":71,"tr":2,"weak":"discovery","done":0.9},
    {"n":"Demo Marco Diaz","t":"self_gen","l":1,"d":40,"doors":46,"talk":0.27,"set":0.12,"sits":0.8,"close":0.31,"logs":0.85,"rp":69,"tr":1,"weak":"building-value","done":0.88},
    {"n":"Demo Ashley Cole","t":"setter","l":2,"d":27,"doors":66,"talk":0.32,"set":0.14,"sits":0,"close":0,"logs":0.95,"rp":80,"tr":2,"weak":"bill-ask","done":0.95},
    {"n":"Demo Devin Park","t":"setter","l":2,"d":14,"doors":52,"talk":0.26,"set":0.11,"sits":0,"close":0,"logs":0.75,"rp":70,"tr":-6,"weak":"tonality","done":0.6,"idle":4},
    {"n":"Demo Hannah Ruiz","t":"setter","l":2,"d":3,"doors":36,"talk":0.24,"set":0.10,"sits":0,"close":0,"logs":1.0,"rp":55,"tr":4,"weak":"approach","done":0.9},
    {"n":"Demo Isaiah Grant","t":"closer","l":2,"d":5,"doors":0,"talk":0,"set":0,"sits":1.1,"close":0.17,"logs":0.85,"rp":59,"tr":0,"weak":"closing","done":0.75,"flag":true},
    {"n":"Demo Sam Whitaker","t":"setter","l":2,"d":18,"doors":61,"talk":0.30,"set":0.15,"sits":0,"close":0,"logs":0.9,"rp":73,"tr":1,"weak":"qualifying","done":0.85}
  ]';
  r jsonb;
  i int := 0;
  uid uuid;
  ph text;
  track uuid;
  started date;
  dd date;
  k int;
  doors int; convos int; appts int; sits int; closes int;
  n_sess int;
  sid uuid;
  overall int;
  skill_slugs text[];
  per jsonb;
  s text;
  sc int;
  persona uuid;
  fix text;
  assess uuid;
  fixes jsonb := '{
    "objection-handling":"Agree first, then ask one curious question before you answer the objection.",
    "setting":"Offer two specific times instead of asking when works for them.",
    "pattern-interrupt":"Open with a real question about their bill, not a pitch.",
    "discovery":"Ask what they would do with the money they save, then stop talking.",
    "building-value":"Tie each benefit back to the exact words they used about their bill.",
    "bill-ask":"Say why you need the bill before you ask for it.",
    "tonality":"Slow down and drop your pitch at the end of sentences. You sound like you are asking permission.",
    "approach":"Step back from the door and say who you are and why you are on the street in one breath.",
    "closing":"Ask for the decision directly, then stay quiet until they answer.",
    "qualifying":"Confirm both decision makers before you go any further."
  }';
begin
  perform setseed(0.42);
  if setter_track is null then raise exception 'Run the curriculum seed (migration 0003) first.'; end if;

  -- Start clean.
  delete from public.invites iv where iv.phone like '+1555010%';
  delete from auth.users au where au.phone like '1555010%' or au.phone like '+1555010%';

  -- Team leaders
  for k in 1..2 loop
    ph := '+155501000' || lpad((90 + k)::text, 2, '0');
    insert into public.invites (phone, full_name, role, rep_type) values (ph, lead_names[k], 'leader', 'setter');
    uid := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, phone, phone_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ltrim(ph, '+'), now(), now(), now(), '{"provider":"phone","providers":["phone"]}', '{}');
    update public.profiles set status = 'active', track_id = setter_track, track_started_on = today - 75 where id = uid;
    leaders := leaders || uid;
  end loop;

  for r in select * from jsonb_array_elements(reps) loop
    i := i + 1;
    ph := '+155501000' || lpad(i::text, 2, '0');
    track := case when r->>'t' = 'closer' then coalesce(closer_track, setter_track) else setter_track end;
    started := today - (r->>'d')::int + 1;
    insert into public.invites (phone, full_name, role, rep_type, leader_id, track_id)
    values (ph, r->>'n', 'rep', (r->>'t')::public.rep_type, leaders[(r->>'l')::int], track);
    uid := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, phone, phone_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ltrim(ph, '+'), now(), now(), now(), '{"provider":"phone","providers":["phone"]}', '{}');
    update public.profiles set status = 'active', track_id = track, track_started_on = started where id = uid;

    -- Training progress: required tasks up to today, done at this rep's completion rate.
    insert into public.task_progress (profile_id, task_id, status, completed_at)
    select uid, t.id, 'done', (started + (d.day_number - 1))::timestamp + interval '18 hours'
    from public.tasks t join public.days d on d.id = t.day_id join public.weeks w on w.id = d.week_id
    where w.track_id = track and t.required and d.day_number <= (r->>'d')::int and random() < (r->>'done')::numeric
      and (d.day_number < (r->>'d')::int - coalesce((r->>'idle')::int, 0));

    -- Daily numbers, last 14 days (no Sundays, skipped days by habit, idle reps stop logging).
    for k in 0..13 loop
      dd := today - k;
      continue when dd < started or extract(dow from dd) = 0 or random() > (r->>'logs')::numeric;
      continue when k < coalesce((r->>'idle')::int, 0);
      continue when k = 0 and random() < 0.4; -- some haven't logged today yet
      doors := round((r->>'doors')::numeric * (0.7 + random() * 0.6));
      convos := round(doors * (r->>'talk')::numeric * (0.8 + random() * 0.4));
      appts := round(convos * (r->>'set')::numeric * (0.6 + random() * 0.8));
      sits := round((r->>'sits')::numeric * (0.4 + random() * 1.2));
      closes := least(sits, round(sits * (r->>'close')::numeric + random() * 0.6 - 0.2));
      insert into public.daily_logs (profile_id, log_date, doors, convos, appts, sits, closes)
      values (uid, dd, doors, convos, appts, sits, greatest(closes, 0));
    end loop;

    -- Practice role plays: 3–6 scored runs over two weeks, trending by the rep's trend.
    n_sess := 3 + floor(random() * 4)::int;
    skill_slugs := case when r->>'t' = 'closer' then array['discovery', 'building-value', 'closing', 'honesty']
                        else array['approach', 'pattern-interrupt', 'bill-ask', 'objection-handling', 'setting', 'tonality', 'qualifying'] end;
    for k in 1..n_sess loop
      dd := today - (13 - floor((k - 1) * 13.0 / greatest(n_sess - 1, 1)))::int;
      continue when dd < started;
      continue when today - dd < coalesce((r->>'idle')::int, 0);
      overall := least(98, greatest(25, (r->>'rp')::int + (k - n_sess) * (r->>'tr')::int + floor(random() * 11 - 5)::int));
      per := '{}';
      foreach s in array skill_slugs[1:4] loop
        sc := least(5, greatest(1, round(overall / 20.0 + random() - 0.5)));
        per := per || jsonb_build_object(s, jsonb_build_object('score', sc, 'reason', 'Demo score.'));
      end loop;
      per := per || jsonb_build_object(r->>'weak', jsonb_build_object('score', greatest(1, round(overall / 20.0) - 2), 'reason', 'Demo: this is the weak spot.'));
      select id into persona from public.personas
      where setting = case when r->>'t' = 'closer' then 'table' else 'door' end order by random() limit 1;
      sid := gen_random_uuid();
      insert into public.roleplay_sessions (id, profile_id, persona_id, mode, started_at, ended_at, status, outcome, turns)
      values (sid, uid, persona, case when random() < 0.5 then 'voice' else 'text' end,
              dd + time '17:00' + (random() * interval '3 hours'), dd + time '20:30', 'scored',
              case when overall >= 70 then (case when r->>'t' = 'closer' then 'closed' else 'set' end) else 'lost' end,
              '[{"role":"homeowner","text":"(demo session)","t":0}]');
      fix := fixes->>(r->>'weak');
      insert into public.roleplay_scores (session_id, overall, per_skill, top_fix, chase_line, highlights, compliance_flags)
      values (sid, overall, per, jsonb_build_object('turn', 2, 'text', fix), fix, '[{"turn":1,"text":"Strong, confident open."}]',
              case when (r->>'flag')::boolean and k = n_sess then '["Told the homeowner the panels were free."]'::jsonb else '[]'::jsonb end);
      if (r->>'flag')::boolean and k = n_sess then
        insert into public.flags (profile_id, source_type, source_id, skill_slug, severity, note, created_at)
        values (uid, 'roleplay', sid, 'honesty', 'red', 'Told the homeowner the panels were free.', dd + time '20:30');
      end if;
    end loop;

    -- Weekly focus: most had one last week; about half have one this week.
    if random() < 0.8 then
      insert into public.weekly_focus (profile_id, week_start, focus, set_by, created_at, updated_at)
      values (uid, (date_trunc('week', today::timestamp)::date - 7), fixes->>(r->>'weak'), leaders[(r->>'l')::int],
              date_trunc('week', today::timestamp) - interval '7 days' + interval '9 hours', date_trunc('week', today::timestamp) - interval '7 days' + interval '9 hours');
    end if;
    if i % 2 = 1 then
      insert into public.weekly_focus (profile_id, week_start, focus, set_by, created_at, updated_at)
      values (uid, date_trunc('week', today::timestamp)::date,
              case r->>'weak' when 'setting' then 'Offer two specific times at every door.' when 'closing' then 'Ask for the decision, then stay quiet.'
                   else 'Own one skill this week: ' || replace(r->>'weak', '-', ' ') || '.' end,
              leaders[(r->>'l')::int], date_trunc('week', today::timestamp) + interval '9 hours', date_trunc('week', today::timestamp) + interval '9 hours');
    end if;

    -- 1:1s and ride-alongs from their team leader.
    if random() < 0.75 then
      insert into public.coaching_touches (profile_id, coach_id, kind, note, created_at)
      values (uid, leaders[(r->>'l')::int], (array['1on1', 'ride_along', 'call'])[1 + floor(random() * 3)::int],
              'Demo: worked on ' || replace(r->>'weak', '-', ' ') || '.', now() - (floor(random() * 10) || ' days')::interval);
    end if;

    -- Jordan failed the week 1 assessment.
    if r->>'n' = 'Demo Jordan Pike' then
      select assessment_quiz_id into assess from public.weeks where track_id = setter_track and number = 1;
      if assess is not null then
        insert into public.quiz_attempts (quiz_id, profile_id, answers, score_pct, passed, created_at)
        values (assess, uid, '{}', 55, false, now() - interval '2 days');
      end if;
    end if;
  end loop;
  raise notice 'Demo data added: 2 team leaders, % reps.', i;
end $$;

select p.full_name, p.role, p.rep_type, l.full_name as team_leader,
  (select count(*) from public.daily_logs d where d.profile_id = p.id) as days_logged,
  (select count(*) from public.roleplay_sessions s where s.profile_id = p.id) as role_plays
from public.profiles p left join public.profiles l on l.id = p.leader_id
where p.full_name like 'Demo %' order by p.role, l.full_name, p.full_name;
