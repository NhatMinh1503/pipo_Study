begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

-- Ghost mode, finisher rewards and leaving a ghost race (battle.md).

insert into auth.users (id, email, aud, role) values
  ('c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1', 'author@test.local', 'authenticated', 'authenticated'),
  ('c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2', 'racer@test.local', 'authenticated', 'authenticated'),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'rival@test.local', 'authenticated', 'authenticated');
update public.profiles set timezone = 'UTC' where user_id in (
  'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1', 'c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2',
  'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3');
update public.wallets set coins = 0 where user_id in (
  'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1', 'c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2',
  'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3');

-- A finished live battle: the author answered both sentences, the rival only one
insert into public.battles (id, language, level, sentences, status, created_by, winner_id, started_at, finished_at)
values ('d0000000-0000-0000-0000-000000000001', 'ja', 'N5', array['駅に行きます。', '電車に乗ります。'],
  'finished', 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1', 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1',
  now() - interval '10 minutes', now() - interval '8 minutes');
insert into public.battle_players (battle_id, user_id, score, answered, finished_at) values
  ('d0000000-0000-0000-0000-000000000001', 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1', 27, 2, now() - interval '8 minutes'),
  ('d0000000-0000-0000-0000-000000000001', 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 12, 1, null);
insert into public.battle_answers (battle_id, user_id, sentence_index, translation, verdict, points, created_at) values
  ('d0000000-0000-0000-0000-000000000001', 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1', 0, 'Tôi đi ga.', 'exact', 15, now() - interval '9 minutes 50 seconds'),
  ('d0000000-0000-0000-0000-000000000001', 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1', 1, 'Tôi lên tàu.', 'acceptable', 12, now() - interval '9 minutes 20 seconds');

-- Rewards: only the player who answered every sentence is paid, the winner 5, once
set local role service_role;
select public.award_battle('d0000000-0000-0000-0000-000000000001');
select public.award_battle('d0000000-0000-0000-0000-000000000001');
reset role;
select is((select coins from public.wallets where user_id = 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1'), 5,
  'the winner who finished gets 3 + 2 coins, once');
select is((select coins from public.wallets where user_id = 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3'), 0,
  'a player who did not answer every sentence gets nothing');

-- The racer's waiting room becomes a race against the author's recorded run
insert into public.battles (id, language, level, sentences, created_by)
values ('d0000000-0000-0000-0000-000000000002', 'ja', 'N5', array['猫がいます。'], 'c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2');
insert into public.battle_players (battle_id, user_id) values
  ('d0000000-0000-0000-0000-000000000002', 'c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2');

set local role authenticated;
set local request.jwt.claims = '{"sub":"c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2","role":"authenticated"}';
select is(public.start_ghost_battle('d0000000-0000-0000-0000-000000000002'),
  'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1'::uuid, 'the recorded run of a finisher is picked');
select is((select status::text from public.battles where id = 'd0000000-0000-0000-0000-000000000002'),
  'active', 'the ghost race starts right away');
select is((select sentences from public.battles where id = 'd0000000-0000-0000-0000-000000000002'),
  array['駅に行きます。', '電車に乗ります。'], 'the race uses the recorded passage');
select is((select count(*) from public.ghost_timeline('d0000000-0000-0000-0000-000000000002'))::integer, 2,
  'the racer can replay the recorded answers');
select ok((select bool_and(offset_seconds between 0 and 60)
  from public.ghost_timeline('d0000000-0000-0000-0000-000000000002')),
  'offsets are seconds from the recorded start');
select throws_ok($$select public.start_ghost_battle('d0000000-0000-0000-0000-000000000002')$$,
  '22023', null, 'a battle that is already running cannot become a ghost race');

-- Somebody who is not in the race cannot read the timeline
set local request.jwt.claims = '{"sub":"c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3","role":"authenticated"}';
select is((select count(*) from public.ghost_timeline('d0000000-0000-0000-0000-000000000002'))::integer, 0,
  'outsiders see no ghost answers');

-- Leaving a ghost race abandons it: nobody is handed a win
set local request.jwt.claims = '{"sub":"c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2","role":"authenticated"}';
select public.leave_battle('d0000000-0000-0000-0000-000000000002');
reset role;
select is((select status::text from public.battles where id = 'd0000000-0000-0000-0000-000000000002'),
  'abandoned', 'leaving a ghost race abandons it');

select * from finish();
rollback;
