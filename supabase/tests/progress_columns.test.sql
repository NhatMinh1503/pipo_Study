begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email, aud, role)
values ('13131313-1313-1313-1313-131313131313', 'p@test.local', 'authenticated', 'authenticated');
insert into public.lessons (id, user_id, title, language, level)
values ('14141414-1414-1414-1414-141414141414', '13131313-1313-1313-1313-131313131313', 'L', 'ja', 'N5');
insert into public.sentences (lesson_id, user_id, position, source_text)
values ('14141414-1414-1414-1414-141414141414', '13131313-1313-1313-1313-131313131313', 0, '駅。');

set local role authenticated;
set local request.jwt.claims = '{"sub":"13131313-1313-1313-1313-131313131313","role":"authenticated"}';

select lives_ok(
  $$ update public.sentences set tokens = '[]' $$,
  'owner can store tokens'
);
select throws_ok(
  $$ update public.sentences set completed_at = now() $$,
  '42501', null, 'owner cannot mark a sentence completed'
);
select lives_ok(
  $$ update public.lessons set title = 'Renamed' $$,
  'owner can rename a lesson'
);
select throws_ok(
  $$ update public.lessons set completed_at = now() $$,
  '42501', null, 'owner cannot mark a lesson completed'
);

select * from finish();
rollback;
