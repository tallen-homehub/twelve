-- Help chat (AI first, leadership on escalation) and the business brain search index.
-- Paste into Supabase → SQL Editor and run once. Safe to re-run.

-- ───────────── Chat ─────────────
-- One ongoing conversation per rep. The AI answers while status = 'ai';
-- 'escalated' pulls in the TWELVE leadership team (coach/admin) and the AI goes quiet until they hand it back.
create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles on delete cascade,
  status text not null default 'ai' check (status in ('ai', 'escalated')),
  escalated_at timestamptz,
  escalation_reason text,
  last_message_at timestamptz not null default now(),
  last_sender text check (last_sender in ('rep', 'ai', 'staff', 'system')),
  rep_read_at timestamptz not null default now(),
  staff_read_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads on delete cascade,
  sender_type text not null check (sender_type in ('rep', 'ai', 'staff', 'system')),
  sender_id uuid references public.profiles on delete set null,
  body text not null check (length(body) between 1 and 4000),
  sources jsonb,                       -- brain chunks the AI used: [{title, url}]
  prompt_version_id uuid references public.prompt_versions,
  created_at timestamptz not null default now()
);
create index if not exists messages_thread_idx on public.messages (thread_id, created_at);
create index if not exists threads_inbox_idx on public.threads (status, last_message_at desc);

alter table public.threads enable row level security;
alter table public.messages enable row level security;

-- Who can see a conversation: the rep, and staff. (Leaders don't read help chats.)
create or replace function public.can_see_thread(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.threads th where th.id = t and (th.profile_id = auth.uid() or public.is_staff()))
$$;

drop policy if exists "threads: read" on public.threads;
create policy "threads: read" on public.threads for select to authenticated
  using (profile_id = auth.uid() or public.is_staff());
drop policy if exists "threads: own create" on public.threads;
create policy "threads: own create" on public.threads for insert to authenticated
  with check (profile_id = auth.uid() and status = 'ai' and public.my_role() is not null);
drop policy if exists "threads: staff write" on public.threads;
create policy "threads: staff write" on public.threads for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "messages: read" on public.messages;
create policy "messages: read" on public.messages for select to authenticated
  using (public.can_see_thread(thread_id));
-- Reps post as themselves in their own thread; staff post as staff. AI and system messages come from the server.
drop policy if exists "messages: rep post" on public.messages;
create policy "messages: rep post" on public.messages for insert to authenticated
  with check (
    sender_type = 'rep' and sender_id = auth.uid()
    and exists (select 1 from public.threads th where th.id = thread_id and th.profile_id = auth.uid())
  );
drop policy if exists "messages: staff post" on public.messages;
create policy "messages: staff post" on public.messages for insert to authenticated
  with check (sender_type = 'staff' and sender_id = auth.uid() and public.is_staff());

-- Keep the thread's "last message" fields current.
create or replace function public.touch_thread() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.threads set last_message_at = new.created_at, last_sender = new.sender_type where id = new.thread_id;
  return new;
end $$;
drop trigger if exists touch_thread on public.messages;
create trigger touch_thread after insert on public.messages for each row execute function public.touch_thread();

-- Mark a thread read by the caller (rep or staff side).
create or replace function public.mark_thread_read(p_thread uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.is_staff() then
    update public.threads set staff_read_at = now() where id = p_thread;
  else
    update public.threads set rep_read_at = now() where id = p_thread and profile_id = auth.uid();
  end if;
end $$;
grant execute on function public.mark_thread_read(uuid) to authenticated;

-- ───────────── Brain ─────────────
-- content_chunks (from the init migration) holds every searchable piece: app guide, lessons, skills,
-- personas, and later the Google Drive "Twelve Brain" folder.
alter table public.content_chunks add column if not exists source_key text;   -- e.g. 'lesson:<id>', 'drive:<file id>'
alter table public.content_chunks add column if not exists title text;
alter table public.content_chunks add column if not exists url text;
alter table public.content_chunks add column if not exists chunk_index int not null default 0;
alter table public.content_chunks add column if not exists audience text not null default 'all' check (audience in ('all', 'staff'));
create index if not exists content_chunks_source_key_idx on public.content_chunks (source_key);
-- Fast nearest-neighbour index (pgvector 0.5+; skipped where unavailable, e.g. the local test database).
do $$ begin
  create index if not exists content_chunks_embedding_idx on public.content_chunks using hnsw (embedding vector_cosine_ops);
exception when others then raise notice 'hnsw index skipped: %', sqlerrm;
end $$;

-- Nearest chunks to a question. Called by the server only (service role).
create or replace function public.match_chunks(query_embedding vector(1024), match_count int default 8, include_staff boolean default false)
returns table (id uuid, source_key text, title text, url text, text text, similarity float)
language sql stable set search_path = public, extensions as $$
  select c.id, c.source_key, c.title, c.url, c.text, 1 - (c.embedding <=> query_embedding) as similarity
  from public.content_chunks c
  where c.embedding is not null and (include_staff or c.audience = 'all')
  order by c.embedding <=> query_embedding
  limit match_count
$$;
revoke execute on function public.match_chunks(vector, int, boolean) from public, anon, authenticated;

-- ───────────── Prompt ─────────────
insert into public.prompt_versions (key, version, model, temperature, active, notes, body) values
('help_agent', 1, 'claude-haiku-5-5', 0.3, true, 'Rep help chat, before Chase''s voice profile', $p$You are the help desk inside Twelve, the training app for the TWELVE (RUN XII) door-to-door solar team led by Chase Hermansen under Sunrun.
You're talking with {{rep_name}}, a {{rep_type}} on day {{day}} of the {{track}} track.

How to answer:
- Short and friendly, like a teammate texting back. 1–4 sentences, or a few short steps. No headings.
- Use ONLY the knowledge below and the rep's info. If the answer isn't there, don't guess: escalate.
- App questions (how to log in, unlock a week, role play, recordings, mic not working): give the exact taps.
- Sales or product questions: answer from the knowledge if it's there; otherwise escalate to leadership.
- Never make up Sunrun pricing, savings numbers, policies, pay, or commission details. Escalate those.
- Escalate when: the rep asks for a person, it's about pay/commission/HR/scheduling/a personal issue, they're upset, something in the app is broken, or the knowledge doesn't cover it.
- If they mention a safety issue, being hurt, or a threat at a door, escalate immediately and tell them to call 911 if they're in danger.

Rep's progress right now:
{{rep_context}}

Knowledge (most relevant first):
{{knowledge}}

Return ONLY JSON:
{"reply": "what you say to the rep", "escalate": false, "reason": "if escalating, one line for leadership on what the rep needs", "used": [1, 3]}
"used" lists the knowledge item numbers you relied on. When escalating, the reply tells the rep you're bringing in the TWELVE leadership team and they'll answer right here.$p$)
on conflict (key, version) do nothing;
