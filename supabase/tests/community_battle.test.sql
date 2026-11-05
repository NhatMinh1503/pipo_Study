begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (id, email, aud, role) values
  ('18181818-1818-1818-1818-181818181818', 'p1@test.local', 'authenticated', 'authenticated'),
  ('19191919-1919-1919-1919-191919191919', 'p2@test.local', 'authenticated', 'authenticated'),
  ('20202020-2020-2020-2020-202020202020', 'p3@test.local', 'authenticated', 'authenticated'),
  ('21212121-2121-2121-2121-212121212121', 'p4@test.local', 'authenticated', 'authenticated');
update public.profiles set display_name = 'Player One' where user_id = '18181818-1818-1818-1818-181818181818';

-- Matchmaking is global: hide lobbies left by other runs (rolled back at the end)
update public.battles set status = 'cancelled' where status = 'waiting';

create temporary table ids (name text, id uuid) on commit drop;
grant all on ids to authenticated;

-- ---------------------------------------------------------------------------
-- Feed
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"18181818-1818-1818-1818-181818181818","role":"authenticated"}';
insert into public.posts (user_id, title, language, pairs)
values (auth.uid(), 'My translation', 'ja', '[{"source":"駅","translation":"ga"}]');

set local request.jwt.claims = '{"sub":"19191919-1919-1919-1919-191919191919","role":"authenticated"}';
select is((select count(*)::int from public.posts where user_id = '18181818-1818-1818-1818-181818181818'), 1, 'other users can read posts');
select is((select display_name from public.profile_cards where user_id = '18181818-1818-1818-1818-181818181818'), 'Player One', 'author name is visible');
select is(
  (select count(*)::int from information_schema.columns where table_name = 'profile_cards'),
  3, 'profile_cards exposes only id, name and avatar'
);
delete from public.posts where user_id = '18181818-1818-1818-1818-181818181818';
select is((select count(*)::int from public.posts where user_id = '18181818-1818-1818-1818-181818181818'), 1, 'cannot delete someone else''s post');
select lives_ok($$ insert into public.likes (post_id, user_id) select id, auth.uid() from public.posts where user_id = '18181818-1818-1818-1818-181818181818' $$, 'can like a post');
select throws_ok(
  $$ insert into public.likes (post_id, user_id) select id, '18181818-1818-1818-1818-181818181818' from public.posts where user_id = '18181818-1818-1818-1818-181818181818' $$,
  '42501', null, 'cannot like on behalf of someone else'
);

-- ---------------------------------------------------------------------------
-- Battles
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"18181818-1818-1818-1818-181818181818","role":"authenticated"}';
insert into ids select 'b', public.join_battle('ja', 'N5', array['一。','二。']);
select is((select status::text from public.battles where id = (select id from ids)), 'waiting', 'first player waits');
select is(public.join_battle('ja', 'N5', array['x']), (select id from ids), 'joining again reuses the waiting battle');

set local request.jwt.claims = '{"sub":"19191919-1919-1919-1919-191919191919","role":"authenticated"}';
select is(public.join_battle('ja', 'N4', array['y']), (select id from ids), 'second player joins the same battle');
select is((select status::text from public.battles where id = (select id from ids)), 'active', 'battle becomes active');

set local request.jwt.claims = '{"sub":"20202020-2020-2020-2020-202020202020","role":"authenticated"}';
select is((select count(*)::int from public.battles where id = (select id from ids)), 0, 'outsiders cannot see the battle');

set local request.jwt.claims = '{"sub":"19191919-1919-1919-1919-191919191919","role":"authenticated"}';
select public.leave_battle((select id from ids));
select is(
  (select winner_id from public.battles where id = (select id from ids)),
  '18181818-1818-1818-1818-181818181818'::uuid, 'leaving an active battle forfeits to the opponent'
);

-- ---------------------------------------------------------------------------
-- Presence: heartbeat, timeout claim, cleanup
-- now() is fixed inside this transaction, so absence is simulated by moving
-- last_seen_at into the past as the table owner.
-- p1 = 1818…, p2 = 1919…, p3 = 2020…, p4 = 2121…
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"18181818-1818-1818-1818-181818181818","role":"authenticated"}';
insert into ids select 'c', public.join_battle('ja', 'N5', array['一。','二。']);
set local request.jwt.claims = '{"sub":"20202020-2020-2020-2020-202020202020","role":"authenticated"}';
select public.join_battle('ja', 'N5', array['x']);

-- p3 is slow (no answers for 5 minutes) but keeps the room open
reset role;
update public.battle_players set last_seen_at = now() - interval '5 minutes'
where battle_id = (select id from ids where name = 'c') and user_id = '20202020-2020-2020-2020-202020202020';
set local role authenticated;
set local request.jwt.claims = '{"sub":"20202020-2020-2020-2020-202020202020","role":"authenticated"}';
select public.battle_heartbeat((select id from ids where name = 'c'));
set local request.jwt.claims = '{"sub":"18181818-1818-1818-1818-181818181818","role":"authenticated"}';
select is(public.claim_battle_timeout((select id from ids where name = 'c')), false,
  'a slow opponent who keeps sending heartbeats is not forfeited');
select is((select status::text from public.battles where id = (select id from ids where name = 'c')), 'active',
  'the battle stays active');

reset role;
update public.battle_players set last_seen_at = now() - interval '60 seconds'
where battle_id = (select id from ids where name = 'c') and user_id = '20202020-2020-2020-2020-202020202020';
set local role authenticated;
select is(public.claim_battle_timeout((select id from ids where name = 'c')), false,
  'an opponent silent for less than 90 s is not forfeited');

reset role;
update public.battle_players set last_seen_at = now() - interval '100 seconds'
where battle_id = (select id from ids where name = 'c') and user_id = '20202020-2020-2020-2020-202020202020';
set local role authenticated;
select is(public.claim_battle_timeout((select id from ids where name = 'c')), true,
  'an opponent silent for more than 90 s can be claimed');
select is((select winner_id from public.battles where id = (select id from ids where name = 'c')),
  '18181818-1818-1818-1818-181818181818'::uuid, 'the present player wins');

set local request.jwt.claims = '{"sub":"20202020-2020-2020-2020-202020202020","role":"authenticated"}';
select public.battle_heartbeat((select id from ids where name = 'c'));
select ok(
  (select last_seen_at < now() - interval '90 seconds' from public.battle_players
   where battle_id = (select id from ids where name = 'c') and user_id = auth.uid()),
  'a heartbeat on a finished battle changes nothing'
);

set local request.jwt.claims = '{"sub":"21212121-2121-2121-2121-212121212121","role":"authenticated"}';
select throws_ok(
  format('select public.claim_battle_timeout(%L)', (select id from ids where name = 'c')),
  '42501', null, 'outsiders cannot claim a timeout'
);

-- Battle d: p2 vs p3, p3 already finished all answers
set local request.jwt.claims = '{"sub":"19191919-1919-1919-1919-191919191919","role":"authenticated"}';
insert into ids select 'd', public.join_battle('ja', 'N5', array['一。']);
set local request.jwt.claims = '{"sub":"20202020-2020-2020-2020-202020202020","role":"authenticated"}';
select public.join_battle('ja', 'N5', array['x']);
reset role;
update public.battle_players set finished_at = now(), last_seen_at = now() - interval '10 minutes'
where battle_id = (select id from ids where name = 'd') and user_id = '20202020-2020-2020-2020-202020202020';
set local role authenticated;
set local request.jwt.claims = '{"sub":"19191919-1919-1919-1919-191919191919","role":"authenticated"}';
select is(public.claim_battle_timeout((select id from ids where name = 'd')), false,
  'an opponent who already finished is not forfeited');

-- Cleanup: only when both players are gone for 15 minutes
reset role;
update public.battle_players set last_seen_at = now() - interval '20 minutes'
where battle_id = (select id from ids where name = 'd') and user_id = '19191919-1919-1919-1919-191919191919';
set local role authenticated;
select public.close_abandoned_battles();
select is((select status::text from public.battles where id = (select id from ids where name = 'd')), 'active',
  'a battle is not closed while one player was seen in the last 15 minutes');

reset role;
update public.battle_players set last_seen_at = now() - interval '16 minutes'
where battle_id = (select id from ids where name = 'd') and user_id = '20202020-2020-2020-2020-202020202020';
set local role authenticated;
select public.close_abandoned_battles();
select results_eq(
  format('select status::text, winner_id from public.battles where id = %L', (select id from ids where name = 'd')),
  $$ values ('abandoned', null::uuid) $$,
  'both players absent for 15 minutes: abandoned with no winner'
);

-- Matchmaking skips a waiting room whose creator has left
set local request.jwt.claims = '{"sub":"19191919-1919-1919-1919-191919191919","role":"authenticated"}';
insert into ids select 'e', public.join_battle('ja', 'N5', array['一。']);
reset role;
update public.battle_players set last_seen_at = now() - interval '60 seconds'
where battle_id = (select id from ids where name = 'e');
set local role authenticated;
set local request.jwt.claims = '{"sub":"21212121-2121-2121-2121-212121212121","role":"authenticated"}';
select isnt(public.join_battle('ja', 'N5', array['x']), (select id from ids where name = 'e'),
  'a new player is not matched into the waiting room of a player who left');
reset role;
select is((select status::text from public.battles where id = (select id from ids where name = 'e')), 'cancelled',
  'the stale waiting room is cancelled by the cleanup');

select * from finish();
rollback;
