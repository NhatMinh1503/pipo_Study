begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- Community moderation: auto-hide after 3 reports, reporter/author visibility, moderator review.

insert into auth.users (id, email, aud, role) values
  ('e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1', 'author@test.local', 'authenticated', 'authenticated'),
  ('e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2', 'r1@test.local', 'authenticated', 'authenticated'),
  ('e3e3e3e3-e3e3-e3e3-e3e3-e3e3e3e3e3e3', 'r2@test.local', 'authenticated', 'authenticated'),
  ('e4e4e4e4-e4e4-e4e4-e4e4-e4e4e4e4e4e4', 'r3@test.local', 'authenticated', 'authenticated'),
  ('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', 'reader@test.local', 'authenticated', 'authenticated'),
  ('e6e6e6e6-e6e6-e6e6-e6e6-e6e6e6e6e6e6', 'mod@test.local', 'authenticated', 'authenticated');

insert into public.posts (id, user_id, title, language, pairs) values
  ('f0000000-0000-0000-0000-000000000001', 'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1', 'Post', 'ja',
   '[{"source":"駅","translation":"ga"}]');
insert into public.moderators (user_id) values ('e6e6e6e6-e6e6-e6e6-e6e6-e6e6e6e6e6e6');

create function pg_temp.sees(p_user uuid) returns boolean language plpgsql as $$
declare v boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select exists (select 1 from public.posts where id = 'f0000000-0000-0000-0000-000000000001') into v;
  reset role;
  return v;
end $$;

insert into public.reports (post_id, user_id, reason) values
  ('f0000000-0000-0000-0000-000000000001', 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2', 'spam');
select ok(not pg_temp.sees('e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2'), 'a reporter stops seeing the post');
select ok(pg_temp.sees('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5'), 'one report does not hide it for others');

insert into public.reports (post_id, user_id, reason) values
  ('f0000000-0000-0000-0000-000000000001', 'e3e3e3e3-e3e3-e3e3-e3e3-e3e3e3e3e3e3', 'spam'),
  ('f0000000-0000-0000-0000-000000000001', 'e4e4e4e4-e4e4-e4e4-e4e4-e4e4e4e4e4e4', 'spam');
select isnt((select hidden_at from public.posts where id = 'f0000000-0000-0000-0000-000000000001'),
  null, 'the third report hides the post');
select ok(not pg_temp.sees('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5'), 'a hidden post leaves the feed');
select ok(pg_temp.sees('e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1'), 'the author still sees it');
select ok(pg_temp.sees('e6e6e6e6-e6e6-e6e6-e6e6-e6e6e6e6e6e6'), 'a moderator still sees it');

-- Only moderators review
set local role authenticated;
set local request.jwt.claims = '{"sub":"e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5","role":"authenticated"}';
select is((select count(*) from public.moderation_queue())::integer, 0, 'learners get an empty queue');
select throws_ok($$select public.moderate_post('f0000000-0000-0000-0000-000000000001', 'restore')$$,
  '42501', null, 'learners cannot moderate');

set local request.jwt.claims = '{"sub":"e6e6e6e6-e6e6-e6e6-e6e6-e6e6e6e6e6e6","role":"authenticated"}';
select is((select open_reports from public.moderation_queue()
  where post_id = 'f0000000-0000-0000-0000-000000000001'), 3::bigint, 'the queue shows open reports');
select public.moderate_post('f0000000-0000-0000-0000-000000000001', 'restore');
select is((select count(*) from public.moderation_queue())::integer, 0, 'a restored post leaves the queue');
reset role;
select ok(pg_temp.sees('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5'), 'a restored post is back in the feed');

select * from finish();
rollback;
