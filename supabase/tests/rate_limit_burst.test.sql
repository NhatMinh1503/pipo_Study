begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

-- Per-minute burst cap and the learner's own day for the daily bucket.

insert into auth.users (id, email, aud, role) values
  ('a9a9a9a9-a9a9-a9a9-a9a9-a9a9a9a9a9a9', 'burst@test.local', 'authenticated', 'authenticated');
update public.profiles set timezone = 'Pacific/Kiritimati'
where user_id = 'a9a9a9a9-a9a9-a9a9-a9a9-a9a9a9a9a9a9';

set local role authenticated;
set local request.jwt.claims = '{"sub":"a9a9a9a9-a9a9-a9a9-a9a9-a9a9a9a9a9a9","role":"authenticated"}';

select is((select count(*) from generate_series(1, 30) n where public.rate_limit_hit('ai', 150))::integer,
  30, 'thirty calls in a minute are allowed');
select is(public.rate_limit_hit('ai', 150), false, 'the 31st call in the same minute is refused');
select throws_ok($$select * from public.rate_limit_minutes$$, '42501', null,
  'clients cannot read or reset the minute counters');
reset role;

select is((select bucket from public.rate_limits
  where user_id = 'a9a9a9a9-a9a9-a9a9-a9a9-a9a9a9a9a9a9' and key = 'ai'),
  (now() at time zone 'Pacific/Kiritimati')::date, 'the daily bucket is the learner''s own date');

select * from finish();
rollback;
