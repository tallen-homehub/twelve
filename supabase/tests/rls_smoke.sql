-- RLS smoke test: each role sees only what spec section 2 allows. Expected results are in the labels.
\set ON_ERROR_STOP 0
grant all on all tables in schema public to authenticated; grant all on all tables in schema storage to authenticated;
grant execute on all functions in schema public to authenticated;
-- invites
insert into public.invites (phone, full_name, role) values ('+15550000001','Admin A','admin'),('+15550000002','Leader L','leader'),('+15550000004','Rep Two','rep');
insert into auth.users values ('00000000-0000-0000-0000-000000000001','15550000001'),('00000000-0000-0000-0000-000000000002','15550000002');
update public.invites set leader_id='00000000-0000-0000-0000-000000000002' where phone='+15550000004';
insert into public.invites (phone, full_name, role, leader_id) values ('+15550000003','Rep One','rep',null);
insert into auth.users values ('00000000-0000-0000-0000-000000000003','15550000003'),('00000000-0000-0000-0000-000000000004','15550000004'),('00000000-0000-0000-0000-000000000009','15559999999');
update public.profiles set status='active';
update public.profiles set status='uninvited' where id='00000000-0000-0000-0000-000000000009';
select phone, role, status, leader_id is not null as has_leader from public.profiles order by phone;
insert into public.tracks (slug,name,published) values ('new-setter','New Setter',true),('draft','Draft',false);
insert into public.recordings (profile_id, setting, storage_path, consent_attested) values ('00000000-0000-0000-0000-000000000003','door','x',true) returning id \gset rec_
insert into public.coaching_notes (recording_id, profile_id, ai_output) values (:'rec_id','00000000-0000-0000-0000-000000000003','{}');

set role authenticated;
\echo == rep one (no leader)
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select 'profiles visible', count(*) from public.profiles;
select 'tracks visible', count(*) from public.tracks;
select 'draft notes visible (expect 0)', count(*) from public.coaching_notes;
update public.profiles set role='admin' where id=auth.uid();
update public.profiles set full_name='Rep 1 renamed' where id=auth.uid();
select 'name now', full_name from public.profiles where id=auth.uid();
insert into public.invites (phone, full_name) values ('+1','x');
\echo == leader
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select 'leader sees', string_agg(full_name, ', ' order by full_name) from public.profiles;
\echo == uninvited
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000009';
select 'uninvited tracks (expect 0)', count(*) from public.tracks;
select 'uninvited own profile', status from public.profiles;
\echo == admin
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select 'admin profiles', count(*) from public.profiles;
select 'admin tracks', count(*) from public.tracks;
select 'admin notes', count(*) from public.coaching_notes;
\echo == storage
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
insert into storage.objects (bucket_id, name) values ('recordings','00000000-0000-0000-0000-000000000003/a.m4a');
insert into storage.objects (bucket_id, name) values ('recordings','00000000-0000-0000-0000-000000000004/b.m4a');
