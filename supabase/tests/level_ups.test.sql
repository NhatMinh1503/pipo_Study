begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

-- The level-up moment (xp-levels §3.9; test cases #11–#14): wallet_apply writes one
-- level_ups row whenever an XP gain crosses a level (or, past Lv50, a star) boundary.

insert into auth.users (id, email, aud, role) values
  ('81818181-8181-8181-8181-818181818181', 'up@test.local', 'authenticated', 'authenticated'),
  ('82828282-8282-8282-8282-828282828282', 'up2@test.local', 'authenticated', 'authenticated');

create function pg_temp.events() returns integer language sql as $$
  select count(*)::int from public.level_ups where user_id = '81818181-8181-8181-8181-818181818181' $$;

-- #14: XP that already exists (e.g. before this change) creates no event by itself
update public.wallets set xp = 500 where user_id = '82828282-8282-8282-8282-828282828282';
select is(
  (select count(*)::int from public.level_ups where user_id = '82828282-8282-8282-8282-828282828282'),
  0, 'existing XP creates no level-up event'
);

set local role service_role;

select public.wallet_apply('81818181-8181-8181-8181-818181818181', 60, 0, 'sentence_passed', 'k1');
select is(pg_temp.events(), 1, 'crossing 50 XP records one event');
select results_eq(
  $$ select kind, from_level, to_level, xp_total, xp_into_level, xp_to_next, source_reason
     from public.level_ups where user_id = '81818181-8181-8181-8181-818181818181' $$,
  $$ values ('level', 1, 2, 60, 10, 90, 'sentence_passed') $$,
  'the event carries everything the level-up moment needs'
);

-- #12: no boundary crossed, no event
select public.wallet_apply('81818181-8181-8181-8181-818181818181', 10, 0, 'flashcard_review', 'k2');
select is(pg_temp.events(), 1, 'XP inside the same level records nothing');

select public.wallet_apply('81818181-8181-8181-8181-818181818181', 0, 50, 'pomodoro_completed', 'k3');
select is(pg_temp.events(), 1, 'coins alone never record a level-up');

-- #11: one gain over several levels is a single event
select public.wallet_apply('81818181-8181-8181-8181-818181818181', 600, 0, 'lesson_bonus', 'k4');
select is(pg_temp.events(), 2, 'a big gain records one event, not one per level');
select results_eq(
  $$ select from_level, to_level from public.level_ups
     where user_id = '81818181-8181-8181-8181-818181818181' and idempotency_key = 'k4' $$,
  $$ values (2, 6) $$,
  'from Lv2 straight to Lv6'
);

-- Replaying the same reward key changes nothing
select public.wallet_apply('81818181-8181-8181-8181-818181818181', 600, 0, 'lesson_bonus', 'k4');
select is(pg_temp.events(), 2, 'an idempotent replay records no new event');

-- Reaching the cap, then stars
reset role;
update public.wallets set xp = 49480 where user_id = '81818181-8181-8181-8181-818181818181';
set local role service_role;
select public.wallet_apply('81818181-8181-8181-8181-818181818181', 20, 0, 'sentence_passed', 'k5');
select results_eq(
  $$ select kind, from_level, to_level, to_stars from public.level_ups
     where user_id = '81818181-8181-8181-8181-818181818181' and idempotency_key = 'k5' $$,
  $$ values ('level', 49, 50, 0) $$,
  'reaching Lv50 is a level event'
);

reset role;
update public.wallets set xp = 51480 where user_id = '81818181-8181-8181-8181-818181818181';
set local role service_role;
select public.wallet_apply('81818181-8181-8181-8181-818181818181', 20, 0, 'sentence_passed', 'k6');
select results_eq(
  $$ select kind, from_level, to_level, from_stars, to_stars, xp_into_level, xp_to_next from public.level_ups
     where user_id = '81818181-8181-8181-8181-818181818181' and idempotency_key = 'k6' $$,
  $$ values ('star', 50, 50, 0, 1, 10, 2000) $$,
  'each 2 000 XP past the cap is a star event'
);

-- #13: learners see and mark only their own events
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"81818181-8181-8181-8181-818181818181","role":"authenticated"}';
select is((select count(*)::int from public.level_ups where seen_at is null), 4, 'the learner sees their unseen events');

set local request.jwt.claims = '{"sub":"82828282-8282-8282-8282-828282828282","role":"authenticated"}';
select is((select count(*)::int from public.level_ups), 0, 'another learner sees none of them');
select is(
  public.mark_level_ups_seen(array(select id from public.level_ups)),
  0, 'and cannot mark them seen'
);

set local request.jwt.claims = '{"sub":"81818181-8181-8181-8181-818181818181","role":"authenticated"}';
select is(
  public.mark_level_ups_seen(array(select id from public.level_ups where kind = 'level')),
  3, 'the owner marks events seen'
);
select is((select count(*)::int from public.level_ups where seen_at is null), 1, 'only the star event is left');
select is(
  public.mark_level_ups_seen(array(select id from public.level_ups where kind = 'level')),
  0, 'marking twice changes nothing'
);

select throws_ok(
  $$ insert into public.level_ups (user_id, kind, from_level, to_level, from_stars, to_stars,
       xp_total, xp_into_level, xp_to_next, source_reason, idempotency_key)
     values (auth.uid(), 'level', 1, 50, 0, 0, 0, 0, 0, 'x', 'fake') $$,
  '42501', null, 'learners cannot create level-up events'
);

select * from finish();
rollback;
