begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email, aud, role) values
  ('16161616-1616-1616-1616-161616161616', 'credits@test.local', 'authenticated', 'authenticated');

set local role authenticated;
set local request.jwt.claims = '{"sub":"16161616-1616-1616-1616-161616161616","role":"authenticated"}';

select lives_ok(
  $$ select public.create_lesson('GV', 'ja', 'N4', array['一。'],
       p_source_name => 'Global Voices 日本語',
       p_source_url => 'https://jp.globalvoices.org/2026/11/02/65795/',
       p_source_license => 'CC BY 3.0',
       p_source_credits => '記者 (English) Oiwan Lam · 翻訳 (日本語) Yasuhisa Miyata') $$,
  'a learner lesson can carry the writers of its source'
);
select is(
  (select source_credits from public.lessons where title = 'GV'),
  '記者 (English) Oiwan Lam · 翻訳 (日本語) Yasuhisa Miyata',
  'credits are stored on the lesson'
);
select is(
  (select source from public.lessons where title = 'GV')::text,
  'manual', 'credits do not change who decides the source'
);
select throws_ok(
  $$ select public.create_lesson('Long', 'ja', 'N4', array['一。'], p_source_credits => repeat('x', 301)) $$,
  '23514', null, 'credits longer than 300 characters are rejected'
);
select lives_ok(
  $$ select public.create_lesson('No credits', 'en', 'A1', array['Hi.']) $$,
  'lessons without credits still work'
);

select * from finish();
rollback;
