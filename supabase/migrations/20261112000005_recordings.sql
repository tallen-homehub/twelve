-- Day 4: field recordings → transcript → consent check → AI coaching draft → Chase's queue.
-- Paste into Supabase → SQL Editor and run once. Safe to re-run.

-- Reps create recordings but never change them afterwards (status is the pipeline's job).
drop policy if exists "recordings: own update" on public.recordings;

-- A rep's insert always starts at 'uploaded', whatever the browser sends.
create or replace function public.guard_recording_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    new.status := 'uploaded';
    new.error := null;
    new.keep_as_example := false;
    new.delete_audio_after := current_date + 90;
  end if;
  return new;
end $$;

drop trigger if exists guard_recording_insert on public.recordings;
create trigger guard_recording_insert before insert on public.recordings
  for each row execute function public.guard_recording_insert();

-- Staff can remove audio (consent problems, 90-day cleanup).
drop policy if exists "recordings: staff delete audio" on storage.objects;
create policy "recordings: staff delete audio" on storage.objects for delete to authenticated
  using (bucket_id = 'recordings' and public.is_staff());

-- Reps can see their own pipeline jobs' state through recordings.status; jobs stay server-only.
create index if not exists coaching_notes_recording_idx on public.coaching_notes (recording_id);

-- Prompts
insert into public.prompt_versions (key, version, model, temperature, active, notes, body) values
('recording_triage', 1, 'claude-haiku-5-5', 0, true, 'Speaker labels, consent check, names to mask', $p$You are checking the start of a recorded solar sales conversation before it is used for coaching.

Setting: {{setting}} (door = knocking on a home's front door; table = sit-down appointment in the home).
The rep is a door-to-door solar salesperson. Speakers are numbered by the transcription service.

Transcript (first minutes; [seconds] Speaker N: text):
{{transcript}}

Answer three things:
1. speaker_map: which speaker number is the rep, and which are homeowners or others. The rep introduces themselves, explains solar or the program, and asks questions.
2. consent: did the homeowner clearly agree to being recorded in this part? Look for the rep asking or stating that the conversation is recorded and the homeowner agreeing (e.g. "yeah that's fine", "sure"). A homeowner who objects, or no mention at all, means found = false.
3. names_to_mask: every homeowner or family member first or last name, street name, or city spoken. Not the rep's name, not company names (Sunrun, the utility).

Return ONLY JSON:
{"speaker_map": {"rep": [0], "homeowner": [1], "other": []}, "consent": {"found": true, "t": 12.4, "quote": "exact homeowner words agreeing"}, "names_to_mask": ["..."]}
If consent is not found: {"found": false, "t": null, "quote": null}.$p$),
('coaching_note', 1, 'claude-sonnet-5-5', 0.3, true, 'Spec 9.3 draft, before Chase''s voice profile', $p$You are writing coaching feedback as Chase Hermansen, leader of the Twelve sales team.
Voice profile: {{voice_profile}}
Examples of Chase's real feedback:
{{examples}}
Chase's rubric (slug: skill. what good sounds like):
{{rubric}}

Below is a timestamped transcript of a {{setting}} conversation by {{rep_first_name}}, a {{rep_type}} on day {{day}} of training. Homeowner details are masked as [name], [phone], [email].
{{transcript}}

Write feedback the way Chase would say it to this rep in person: direct, specific, encouraging but honest.
Rules:
- Every point must cite a timestamp (seconds) and quote the rep's actual words.
- 3 to 6 moments. At least one is something the rep did well.
- Mark a moment "red" only if it likely lost or seriously risked the deal.
- "chase_would_say" is the exact words Chase would use at that moment, as a line the rep can memorize. null for "good" moments.
- Flag any compliance problem (saying they're from the utility, promising savings, calling anything free, pressure after a clear no) as red with skill "compliance".
- Use only skill slugs from the rubric, or "compliance".
- practice_next.persona_slug is one of: {{persona_slugs}}, or null.
- Do not invent anything not in the transcript.

Return ONLY JSON:
{"overall_score": 0-100, "outcome_guess": "set|closed|follow_up|lost|unclear", "summary": "2-3 sentences in Chase's voice", "moments": [{"t_start": 0, "t_end": 0, "skill": "slug", "severity": "red|yellow|good", "rep_said": "quote", "what_happened": "1-2 sentences", "chase_would_say": "..." , "why": "1 sentence"}], "per_skill": {"slug": 1-5}, "practice_next": {"skill": "slug", "persona_slug": "slug or null"}}$p$)
on conflict (key, version) do nothing;
