begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

insert into auth.users (id, email, aud, role) values
  ('22222222-2222-2222-2222-222222222223', 'cache@test.local', 'authenticated', 'authenticated');

set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222223","role":"authenticated"}';

select throws_ok($$ select * from public.grading_cache $$, '42501', null, 'learners cannot read the grading cache');
select throws_ok(
  $$ insert into public.grading_cache (cache_key, prompt_version, result)
     values (repeat('a', 64), 'v1', '{}') $$,
  '42501', null, 'learners cannot poison the grading cache'
);

reset role;
select throws_ok(
  $$ insert into public.grading_cache (cache_key, prompt_version, result) values ('not-a-hash', 'v1', '{}') $$,
  '23514', null, 'cache keys must be sha-256 hex'
);

select * from finish();
rollback;
