-- Removes all DEMO data added by demo_reps.sql (everyone with a +1 555-010-00xx number).
-- Their logs, scores, focus, 1:1s, flags and chats go with them.
delete from public.invites where phone like '+1555010%';
delete from auth.users where phone like '1555010%' or phone like '+1555010%';
select count(*) as demo_profiles_left from public.profiles where full_name like 'Demo %';
