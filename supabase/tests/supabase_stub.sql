-- Local-only stand-ins for Supabase's auth and storage schemas, so migrations and RLS can be tested on plain Postgres 16.
-- Run: create database, then psql -f supabase/tests/supabase_stub.sql -f <migration with vector stubbed> -f supabase/tests/rls_smoke.sql
create role anon nologin;
create schema auth; create table auth.users (id uuid primary key, phone text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public bool, file_size_limit bigint);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
grant usage on schema public, auth, storage to authenticated;
