-- Business brain: what's been synced from the Google Drive "Twelve Brain" folder.
-- Paste into Supabase → SQL Editor and run once. Safe to re-run.
create table if not exists public.brain_sources (
  source_key text primary key,            -- 'drive:<file id>'
  title text not null,
  url text,
  mime_type text,
  modified_at timestamptz,
  synced_at timestamptz not null default now(),
  chunks int not null default 0,
  status text not null default 'ok' check (status in ('ok', 'skipped', 'error')),
  error text
);
alter table public.brain_sources enable row level security;
drop policy if exists "brain_sources: staff read" on public.brain_sources;
create policy "brain_sources: staff read" on public.brain_sources for select to authenticated using (public.is_staff());
