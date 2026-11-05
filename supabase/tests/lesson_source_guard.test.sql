begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- Who decides a lesson's source: learners can only create 'manual' lessons; 'ai' and 'news'
-- lessons are created by the server (service role), and lesson content cannot be changed
-- with direct table writes (xp-levels spec §3.6, task T0).

insert into auth.users (id, email, aud, role) values
  ('41414141-4141-4141-4141-414141414141', 'guard@test.local', 'authenticated', 'authenticated');

create temporary table ids (name text, id uuid) on commit drop;
grant all on ids to authenticated, service_role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"41414141-4141-4141-4141-414141414141","role":"authenticated"}';

insert into ids select 'manual', public.create_lesson('Mine', 'ja', 'N5', array['一。', '二。', '三。']);
select is(
  (select source::text from public.lessons where id = (select id from ids where name = 'manual')),
  'manual', 'a learner''s lesson is always manual'
);

select throws_ok(
  $$ select public.create_lesson('Fake AI', 'ja', 'N5', array['一。'], p_source => 'ai') $$,
  '42883', null, 'a learner cannot choose the source of a lesson'
);

select lives_ok(
  $$ select public.create_lesson('Edited news', 'ja', 'N5', array['一。'],
       p_source_name => '首相官邸', p_source_url => 'https://www.kantei.go.jp/x', p_source_license => 'PDL1.0') $$,
  'a manual lesson may keep attribution (edited news)'
);

select throws_ok(
  $$ select public.create_lesson_for_user('41414141-4141-4141-4141-414141414141', 'X', 'ja', 'N5', array['一。'], 'ai') $$,
  '42501', null, 'learners cannot call the server-only lesson function'
);

select throws_ok(
  $$ insert into public.lessons (user_id, title, language, level, source)
     values (auth.uid(), 'Direct', 'ja', 'N5', 'ai') $$,
  '42501', null, 'direct insert into lessons is not allowed'
);

select throws_ok(
  format(
    $$ insert into public.sentences (lesson_id, user_id, position, source_text) values (%L, auth.uid(), 99, 'はい。') $$,
    (select id from ids where name = 'manual')
  ),
  '42501', null, 'direct insert into sentences of an existing lesson is not allowed'
);

select throws_ok(
  format($$ delete from public.sentences where lesson_id = %L $$, (select id from ids where name = 'manual')),
  '42501', null, 'learners cannot delete single sentences'
);

-- The learner can still delete a whole lesson; its sentences go with it
delete from public.lessons where id = (select id from ids where name = 'manual');
select is(
  (select count(*)::int from public.sentences where lesson_id = (select id from ids where name = 'manual')),
  0, 'deleting a lesson still removes its sentences'
);

-- ---------------------------------------------------------------------------
-- Server (service role)
-- ---------------------------------------------------------------------------
reset role;
set local role service_role;

insert into ids select 'ai', public.create_lesson_for_user(
  '41414141-4141-4141-4141-414141414141', 'AI lesson', 'ja', 'N5', array['一。', '二。'], 'ai'
);
select results_eq(
  format($$ select user_id, source::text from public.lessons where id = %L $$, (select id from ids where name = 'ai')),
  $$ values ('41414141-4141-4141-4141-414141414141'::uuid, 'ai') $$,
  'the server creates an ai lesson for the learner'
);
select is(
  (select count(*)::int from public.sentences where lesson_id = (select id from ids where name = 'ai')),
  2, 'with its sentences in order'
);

insert into ids select 'news', public.create_lesson_for_user(
  '41414141-4141-4141-4141-414141414141', 'News', 'ja', 'N5', array['一。'], 'news',
  '首相官邸', 'https://www.kantei.go.jp/y', 'PDL1.0'
);
select results_eq(
  format($$ select source::text, source_name from public.lessons where id = %L $$, (select id from ids where name = 'news')),
  $$ values ('news', '首相官邸') $$,
  'the server creates a news lesson with attribution'
);

select throws_ok(
  $$ select public.create_lesson_for_user('41414141-4141-4141-4141-414141414141', 'Empty', 'ja', 'N5', array[]::text[], 'ai') $$,
  '22023', null, 'the server function keeps the sentence count rules'
);

select * from finish();
rollback;
