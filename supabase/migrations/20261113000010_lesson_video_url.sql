-- Lessons can play a video from a link (YouTube, Vimeo, Loom, Google Drive or a direct .mp4) until Mux uploads exist.
-- Paste into Supabase → SQL Editor and run once. Safe to re-run.
alter table public.lessons add column if not exists video_url text check (video_url is null or video_url ~* '^https://');
