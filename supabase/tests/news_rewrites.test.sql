begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email, aud, role) values
  ('21212121-2121-2121-2121-212121212121', 'news@test.local', 'authenticated', 'authenticated');

set local role authenticated;
set local request.jwt.claims = '{"sub":"21212121-2121-2121-2121-212121212121","role":"authenticated"}';

select throws_ok(
  $$ select * from public.news_rewrites $$,
  '42501', null, 'learners cannot read the rewrite cache directly'
);
select throws_ok(
  $$ insert into public.news_rewrites (source_url, level, prompt_version, title, passage)
     values ('https://www.kantei.go.jp/x', 'N4', 'v1', 't', 'p') $$,
  '42501', null, 'learners cannot write the rewrite cache'
);

-- Since T0 a learner's lesson is always manual; attribution is still kept (edited rewrite).
-- Unchanged news lessons are created by the server: see lesson_source_guard.test.sql.
select lives_ok(
  $$ select public.create_lesson('ニュース', 'ja', 'N4', array['一。', '二。'],
       p_source_name => '首相官邸', p_source_url => 'https://www.kantei.go.jp/jp/a.html',
       p_source_license => 'PDL1.0') $$,
  'a learner lesson rewritten from news keeps its attribution'
);
select is(
  (select source_license from public.lessons where title = 'ニュース'),
  'PDL1.0', 'licence is stored on the lesson'
);
select lives_ok(
  $$ select public.create_lesson('手書き', 'ja', 'N5', array['一。']) $$,
  'manual lessons still work without a source'
);

select * from finish();
rollback;
