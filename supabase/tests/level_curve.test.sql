begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- xp-levels spec §4.3–4.4, test cases #3 and #4.
-- xp_to_reach(L) = 20L² − 10L − 10; level capped at 50; a star per 2 000 XP after that.

select is(public.xp_to_reach(1), 0, 'Lv1 needs 0 XP');
select is(public.xp_to_reach(2), 50, 'Lv2 needs 50 XP');
select is(public.xp_to_reach(5), 440, 'Lv5 needs 440 XP');
select is(public.xp_to_reach(10), 1890, 'Lv10 needs 1 890 XP');
select is(public.xp_to_reach(20), 7790, 'Lv20 needs 7 790 XP');
select is(public.xp_to_reach(50), 49490, 'Lv50 needs 49 490 XP');

select is(public.level_for_xp(0), 1, '0 XP is Lv1');
select is(public.level_for_xp(49), 1, '49 XP is still Lv1');
select is(public.level_for_xp(50), 2, '50 XP is Lv2');
select is(public.level_for_xp(439), 4, '439 XP is Lv4');
select is(public.level_for_xp(440), 5, '440 XP is Lv5');
select is(public.level_for_xp(49489), 49, '49 489 XP is Lv49');
select is(public.level_for_xp(49490), 50, '49 490 XP is Lv50');
select is(public.level_for_xp(1000000000), 50, 'the level never goes past 50');

select is(public.stars_for_xp(49489), 0, 'no star before the cap');
select is(public.stars_for_xp(49490), 0, 'no star exactly at the cap');
select is(public.stars_for_xp(51489), 0, '1 999 XP past the cap is still 0 stars');
select is(public.stars_for_xp(51490), 1, '2 000 XP past the cap is 1 star');

select results_eq(
  $$ select public.xp_into_level(500), public.xp_to_next_level(500) $$,
  $$ values (60, 210) $$,
  'Lv5 with 500 XP: 60 of 210 XP into the level'
);
select results_eq(
  $$ select public.xp_into_level(53600), public.xp_to_next_level(53600) $$,
  $$ values (110, 2000) $$,
  'after the cap, progress counts toward the next star'
);

-- The view the app reads: own row only, with the derived level columns
insert into auth.users (id, email, aud, role) values
  ('51515151-5151-5151-5151-515151515151', 'lv@test.local', 'authenticated', 'authenticated'),
  ('52525252-5252-5252-5252-525252525252', 'lv2@test.local', 'authenticated', 'authenticated');
update public.wallets set xp = 500 where user_id = '51515151-5151-5151-5151-515151515151';
update public.wallets set xp = 53600 where user_id = '52525252-5252-5252-5252-525252525252';

set local role authenticated;
set local request.jwt.claims = '{"sub":"51515151-5151-5151-5151-515151515151","role":"authenticated"}';
select results_eq(
  $$ select level, stars, xp_into_level, xp_to_next from public.wallet_summaries $$,
  $$ values (5, 0, 60, 210) $$,
  'wallet_summaries shows the learner''s level and progress'
);
select is(
  (select count(*)::int from public.wallet_summaries where user_id = '52525252-5252-5252-5252-525252525252'),
  0, 'another learner''s level is not visible'
);

set local request.jwt.claims = '{"sub":"52525252-5252-5252-5252-525252525252","role":"authenticated"}';
select results_eq(
  $$ select level, stars, xp_into_level, xp_to_next from public.wallet_summaries $$,
  $$ values (50, 2, 110, 2000) $$,
  'a learner past the cap sees Lv50 with stars'
);

select ok(
  (select provolatile = 'i' from pg_proc where proname = 'level_for_xp'),
  'level_for_xp is immutable (pure function of XP)'
);

select * from finish();
rollback;
