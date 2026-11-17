begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

-- KPI tables and the staff summary.

insert into auth.users (id, email, aud, role, created_at) values
  ('a0a0a0a0-0000-0000-0000-000000000001', 'kpi1@test.local', 'authenticated', 'authenticated', now() - interval '8 days'),
  ('a0a0a0a0-0000-0000-0000-000000000002', 'kpi2@test.local', 'authenticated', 'authenticated', now()),
  ('a0a0a0a0-0000-0000-0000-000000000003', 'staff@test.local', 'authenticated', 'authenticated', now());
insert into public.moderators (user_id) values ('a0a0a0a0-0000-0000-0000-000000000003');

set local role service_role;
select public.create_lesson_for_user('a0a0a0a0-0000-0000-0000-000000000001', 'L', 'ja', 'N5',
  array['駅に行きます。'], 'ai');
reset role;
insert into public.attempts (id, user_id, sentence_id, user_translation, verdict, feedback)
select 'a0a0a0a0-0000-0000-0000-0000000000a1', 'a0a0a0a0-0000-0000-0000-000000000001', s.id, 'x', 'exact', 'ok'
from public.sentences s where s.user_id = 'a0a0a0a0-0000-0000-0000-000000000001';
-- Back on day 7 after signing up
update public.attempts set created_at = now() - interval '1 day'
where id = 'a0a0a0a0-0000-0000-0000-0000000000a1';
insert into public.ai_calls (prompt_version, provider, outcome, latency_ms) values
  ('grade-translation.v2', 'groq', 'ok', 900), ('grade-translation.v2', 'groq', 'ok', 1100),
  ('grade-translation.v2', null, 'failed', 9000);

-- Flags: only on your own attempt
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0a0a0a0-0000-0000-0000-000000000002","role":"authenticated"}';
select throws_ok($$insert into public.attempt_flags (attempt_id, user_id)
  values ('a0a0a0a0-0000-0000-0000-0000000000a1', 'a0a0a0a0-0000-0000-0000-000000000002')$$,
  '42501', null, 'nobody can flag someone else''s attempt');
select throws_ok($$select * from public.ai_calls$$, '42501', null, 'learners cannot read AI call metrics');
select throws_ok($$select public.kpi_summary(30)$$, '42501', null, 'the summary is staff only');

set local request.jwt.claims = '{"sub":"a0a0a0a0-0000-0000-0000-000000000001","role":"authenticated"}';
insert into public.attempt_flags (attempt_id, user_id)
values ('a0a0a0a0-0000-0000-0000-0000000000a1', 'a0a0a0a0-0000-0000-0000-000000000001');
select is((select count(*) from public.attempt_flags)::integer, 1, 'a learner flags their own attempt');

set local request.jwt.claims = '{"sub":"a0a0a0a0-0000-0000-0000-000000000003","role":"authenticated"}';
select is((public.kpi_summary(30) -> 'd7' ->> 'returned')::integer, 1, 'D7 counts a learner back on day 7');
select is((public.kpi_summary(30) ->> 'gradingP50Ms')::numeric, 1000::numeric,
  'median grading latency ignores failed calls');
select is((public.kpi_summary(30) ->> 'flaggedAttempts')::integer, 1, 'flags are counted');
reset role;

select * from finish();
rollback;
