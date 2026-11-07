begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- Trees grow with completed Pomodoro sessions (garden-scene spec §3.1–3.4, §12.2).
-- Session 1 sprout, 2 sapling, 4 mature; one growing tree at a time; then a new tree.

insert into auth.users (id, email, aud, role) values
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'garden@test.local', 'authenticated', 'authenticated'),
  ('a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', 'garden2@test.local', 'authenticated', 'authenticated'),
  ('a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3', 'garden-old@test.local', 'authenticated', 'authenticated');

-- Starts a session as the learner, moves its start 26 minutes back, completes it
create function pg_temp.focus(p_user uuid, p_species public.tree_species default null) returns void
language plpgsql as $$
declare v_id uuid;
begin
  execute format('set local request.jwt.claims = %L', json_build_object('sub', p_user, 'role', 'authenticated'));
  set local role authenticated;
  v_id := (public.start_pomodoro(25, p_species)).id;
  reset role;
  update public.pomodoro_sessions set started_at = now() - interval '26 minutes' where id = v_id;
  set local role authenticated;
  perform public.complete_pomodoro(v_id);
  reset role;
end;
$$;

create function pg_temp.trees(p_user uuid) returns table (garden integer, plot integer, species text, sessions integer)
language sql as $$
  select garden_index, plot_index, species::text, sessions from public.garden_trees
  where user_id = p_user order by garden_index, plot_index $$;

-- #7: the first session plants a sprout of the chosen species in the first plot
select pg_temp.focus('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'bamboo');
select results_eq($$ select * from pg_temp.trees('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1') $$,
  $$ values (1, 0, 'bamboo', 1) $$, 'session 1: a bamboo sprout in garden 1, plot 0');

-- While a tree grows, the species asked for is ignored: the session tends that tree
select pg_temp.focus('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'pine');
select results_eq($$ select * from pg_temp.trees('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1') $$,
  $$ values (1, 0, 'bamboo', 2) $$, 'session 2: the same tree becomes a sapling');
select is(
  (select species::text from public.pomodoro_sessions
   where user_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1' order by started_at desc limit 1),
  'bamboo', 'the session records the species of the tree it tended');

select pg_temp.focus('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1');
select pg_temp.focus('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1');
select results_eq($$ select * from pg_temp.trees('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1') $$,
  $$ values (1, 0, 'bamboo', 4) $$, 'session 4: the tree is mature');
select isnt((select matured_at from public.garden_trees where user_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  null, 'maturity time is recorded');

select pg_temp.focus('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'pine');
select results_eq($$ select * from pg_temp.trees('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1') $$,
  $$ values (1, 0, 'bamboo', 4), (1, 1, 'pine', 1) $$, 'session 5: a new pine sprout in the next plot');
select is(
  (select count(*)::int from public.pomodoro_sessions
   where user_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1' and garden_tree_id is null),
  0, 'every completed session points at the tree it tended');

-- An abandoned session tends nothing
set local request.jwt.claims = '{"sub":"a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1","role":"authenticated"}';
set local role authenticated;
select public.abandon_pomodoro((public.start_pomodoro(25)).id);
reset role;
select results_eq($$ select sessions from public.garden_trees
  where user_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1' and species = 'pine' $$,
  $$ values (1) $$, 'an abandoned session does not grow the tree');

-- #8: locked species need their seed
set local request.jwt.claims = '{"sub":"a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2","role":"authenticated"}';
set local role authenticated;
select throws_ok($$ select public.start_pomodoro(25, 'sakura') $$, '42501', null,
  'sakura needs seed-sakura before planting');
select throws_ok($$ select public.start_pomodoro(25, 'maple') $$, '42501', null,
  'maple needs seed-maple before planting');
select lives_ok($$ select public.start_pomodoro(25, 'pine') $$, 'pine is free');
select lives_ok($$ select public.start_pomodoro(25) $$, 'no species asked: defaults to a free one');
reset role;
-- The seed item is not in the shop yet; add it here only to prove ownership unlocks it
insert into public.shop_items (id, kind, price) values ('seed-sakura', 'decoration', 1);
insert into public.purchases (user_id, item_id) values ('a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', 'seed-sakura');
select pg_temp.focus('a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', 'sakura');
select results_eq($$ select species from pg_temp.trees('a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2') $$,
  $$ values ('sakura') $$, 'owning seed-sakura unlocks sakura');

-- #9: old sessions become mature legacy trees, in order, spilling into garden 2
insert into public.pomodoro_sessions (user_id, planned_minutes, status, started_at, ended_at)
select 'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3', 25, 'completed',
  now() - make_interval(days => 40 - n), now() - make_interval(days => 40 - n) + interval '25 minutes'
from generate_series(1, 33) as n;
select is(public.backfill_garden_trees('a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3'), 33, 'each old session becomes one tree');
select is((select count(*)::int from public.garden_trees
  where user_id = 'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3' and sessions = 4 and legacy), 33,
  'all of them mature and marked legacy');
select results_eq($$ select garden, plot, species from pg_temp.trees('a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3')
  where (garden, plot) in ((1, 0), (1, 1), (1, 2), (1, 3), (1, 30), (2, 0), (2, 1)) $$,
  $$ values (1, 0, 'pine'), (1, 1, 'bamboo'), (1, 2, 'maple'), (1, 3, 'sakura'),
            (1, 30, 'maple'), (2, 0, 'sakura'), (2, 1, 'pine') $$,
  'oldest first, species in rotation, 31 per garden then garden 2');
select is(public.backfill_garden_trees('a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3'), 0, 'running it again adds nothing');

select pg_temp.focus('a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3', 'bamboo');
select results_eq($$ select garden, plot, sessions from pg_temp.trees('a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3')
  where species = 'bamboo' and sessions = 1 $$,
  $$ values (2, 2, 1) $$, 'a new tree after the old ones goes to the next free plot');

-- Access: own trees only, no direct writes
set local request.jwt.claims = '{"sub":"a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2","role":"authenticated"}';
set local role authenticated;
select is((select count(*)::int from public.garden_trees), 1, 'a learner sees only their own trees');
select throws_ok(
  $$ insert into public.garden_trees (user_id, garden_index, plot_index, species) values (auth.uid(), 1, 5, 'sakura') $$,
  '42501', null, 'learners cannot plant trees directly');

select * from finish();
rollback;
