begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email, aud, role)
values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'e@test.local', 'authenticated', 'authenticated'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'f@test.local', 'authenticated', 'authenticated');

set local role authenticated;
set local request.jwt.claims = '{"sub":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee","role":"authenticated"}';

select is(public.rate_limit_hit('grade', 2), true, 'first call is allowed');
select is(public.rate_limit_hit('grade', 2), true, 'second call is allowed');
select is(public.rate_limit_hit('grade', 2), false, 'third call exceeds the limit');
select is(public.rate_limit_hit('generate', 2), true, 'other keys have their own counter');

select throws_ok(
  $$ update public.rate_limits set count = 0 $$,
  '42501', null, 'clients cannot reset their counter'
);

-- Counters are per user
set local request.jwt.claims = '{"sub":"ffffffff-ffff-ffff-ffff-ffffffffffff","role":"authenticated"}';
select is(public.rate_limit_hit('grade', 2), true, 'another user starts at zero');

select * from finish();
rollback;
