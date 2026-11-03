begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email, aud, role)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'd@test.local', 'authenticated', 'authenticated');

set local role authenticated;
set local request.jwt.claims = '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}';

select lives_ok(
  $$ select public.create_lesson('Test', 'ja', 'N5', array['一。', '二。', '三。']) $$,
  'creates a lesson with sentences'
);

select is(
  (select count(*)::int from public.sentences s join public.lessons l on l.id = s.lesson_id
   where l.title = 'Test'),
  3, 'all sentences were inserted'
);

select results_eq(
  $$ select position, source_text from public.sentences order by position $$,
  $$ values (0, '一。'), (1, '二。'), (2, '三。') $$,
  'sentences keep their order starting at 0'
);

select throws_ok(
  $$ select public.create_lesson('Empty', 'ja', 'N5', array[]::text[]) $$,
  '22023', null, 'rejects a lesson without sentences'
);

select throws_ok(
  $$ select public.create_lesson('Bad level', 'en', 'N5', array['Hi.']) $$,
  '23514', null, 'rejects a level that does not match the language'
);

-- A failing sentence rolls back the whole lesson
select throws_ok(
  $$ select public.create_lesson('Atomic', 'ja', 'N5', array['ok', '']) $$,
  '23514', null, 'rejects an empty sentence'
);
select is(
  (select count(*)::int from public.lessons where title = 'Atomic'),
  0, 'no partial lesson is left behind'
);

select * from finish();
rollback;
