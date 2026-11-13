-- Team themes: the prompt that turns a week of scores and flags into what to train next.
-- Paste into Supabase → SQL Editor and run once. Safe to re-run.
create index if not exists themes_scope_idx on public.themes (scope, leader_id, created_at desc);

insert into public.prompt_versions (key, version, model, temperature, active, notes, body) values
('team_themes', 1, 'claude-sonnet-5-5', 0.3, true, 'Weekly team themes for Chase / team leaders', $p$You help Chase Hermansen, leader of the TWELVE door-to-door solar team (Sunrun), decide what to train at the next team meeting.
Scope: {{scope}}. Period: {{period}}.

Below are the weakest skills this week, worst first. The numbers are computed from AI role play scores and coached field recordings; do not change them.
{{skills}}

Example moments (numbered) showing each weakness:
{{examples}}

Pick the 3 skills that will move the team's numbers most if trained this week (usually the most reps affected, then the lowest average).
For each, write:
- headline: one punchy line Chase would say to the room, naming the pattern (e.g. "Setters are pitching before they get permission"). Under 12 words. No numbers.
- why: 1-2 sentences on what's actually happening at the door, grounded in the examples.
- topic: the training topic title for the meeting (under 8 words).
- drill: exactly 3 short steps to run in a 20-minute team meeting (role play pairs, a line to memorize, a rep to watch).
- line: the one line every rep should say, in Chase's voice. Under 25 words.
- examples: up to 2 example numbers from the list above that show it best.
Use only skill slugs from the list. Do not invent numbers or names.

Return ONLY JSON:
{"themes":[{"skill":"slug","headline":"...","why":"...","topic":"...","drill":["...","...","..."],"line":"...","examples":[1,4]}]}$p$)
on conflict (key, version) do nothing;
