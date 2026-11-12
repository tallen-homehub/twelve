-- Day 2: quiz delivery and grading without exposing answers, plus default track assignment.
-- Paste into Supabase > SQL Editor and run once.

-- Questions for a quiz, without the correct answers. Any active user can call it.
create or replace function public.get_quiz_questions(p_quiz uuid)
returns table (id uuid, "position" int, prompt text, qtype text, options jsonb, skill_slug text)
language sql stable security definer set search_path = public as $$
  select q.id, q.position, q.prompt, q.qtype, q.options, q.skill_slug
  from public.quiz_questions q
  join public.quizzes z on z.id = q.quiz_id
  where q.quiz_id = p_quiz
    and public.my_role() is not null
    and (z.published or public.is_staff())
  order by q.position
$$;

-- Grades a quiz for the caller, records the attempt, and returns per-question results.
-- p_answers: {"<question id>": 0 | [0,2] | "free text"}
-- Short-answer questions are recorded but scored as correct for now (AI grading arrives with the AI layer).
create or replace function public.submit_quiz(p_quiz uuid, p_answers jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  z public.quizzes%rowtype;
  q record;
  given jsonb;
  ok boolean;
  total int := 0;
  right_count int := 0;
  results jsonb := '[]'::jsonb;
  pct int;
  attempt_id uuid;
begin
  if me is null or public.my_role() is null then
    raise exception 'Not allowed';
  end if;
  select * into z from public.quizzes where id = p_quiz and (published or public.is_staff());
  if not found then
    raise exception 'Quiz not found';
  end if;

  for q in select * from public.quiz_questions where quiz_id = p_quiz order by position loop
    total := total + 1;
    given := p_answers -> q.id::text;
    if q.qtype = 'single' then
      ok := given is not null and given = q.correct;
    elsif q.qtype = 'multi' then
      ok := given is not null and jsonb_typeof(given) = 'array'
        and (select coalesce(array_agg(v::int order by v::int), '{}') from jsonb_array_elements_text(given) v)
          = (select coalesce(array_agg(v::int order by v::int), '{}') from jsonb_array_elements_text(q.correct) v);
    else
      ok := given is not null and length(trim(both '"' from given::text)) > 0;
    end if;
    if ok then right_count := right_count + 1; end if;
    results := results || jsonb_build_object(
      'question_id', q.id, 'correct', ok, 'given', given,
      'answer', case when q.qtype = 'short' then q.correct -> 'model_answer' else q.correct end,
      'explanation', q.explanation, 'skill_slug', q.skill_slug);
  end loop;

  pct := case when total = 0 then 0 else round(100.0 * right_count / total) end;

  insert into public.quiz_attempts (quiz_id, profile_id, answers, graded, score_pct, passed)
  values (p_quiz, me, p_answers, results, pct, pct >= z.pass_pct)
  returning id into attempt_id;

  return jsonb_build_object('attempt_id', attempt_id, 'score_pct', pct, 'passed', pct >= z.pass_pct,
                            'pass_pct', z.pass_pct, 'results', results);
end $$;

-- Reps who finish intake without a track get the published track for their rep type.
create or replace function public.assign_default_track() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.track_id is null and new.status = 'active' and new.role in ('rep', 'leader') then
    select id into new.track_id from public.tracks
    where published and rep_type = coalesce(new.rep_type, 'setter')
    order by (slug in ('new-setter', 'closer')) desc, created_at limit 1;
  end if;
  return new;
end $$;

-- Let the default-track trigger fill an empty track when a rep activates; everything else stays staff-only.
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_staff() or auth.uid() is null then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.leader_id is distinct from old.leader_id
     or (new.track_id is distinct from old.track_id and old.track_id is not null)
     or new.phone is distinct from old.phone
     or (new.status is distinct from old.status and not (old.status = 'invited' and new.status = 'active'))
     or (new.track_started_on is distinct from old.track_started_on and old.track_started_on is not null) then
    raise exception 'Only Chase or an admin can change that.';
  end if;
  return new;
end $$;

create trigger profiles_default_track before insert or update of status on public.profiles
  for each row execute function public.assign_default_track();

grant execute on function public.get_quiz_questions(uuid) to authenticated;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;
