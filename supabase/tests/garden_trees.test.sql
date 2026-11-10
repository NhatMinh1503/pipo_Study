begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

-- Forest-style garden (migration 20261110040100): each completed Pomodoro session plants
-- one whole (mature) tree of the species it was started with; an abandoned one plants none.

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

-- #7: a completed session plants a whole tree of the chosen species in the first plot
select pg_temp.focus('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'bamboo');
select results_eq($$ select * from pg_temp.trees('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1') $$,
  $$ values (1, 0, 'bamboo', 4) $$, 'session 1: a grown bamboo in garden 1, plot 0');
select isnt((select matured_at from public.garden_trees where user_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'),
  null, 'the tree is grown when the session ends');

-- Every session picks its own seed: the next one plants a new tree in the next plot
select pg_temp.focus('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'pine');
select results_eq($$ select * from pg_temp.trees('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1') $$,
  $$ values (1, 0, 'bamboo', 4), (1, 1, 'pine', 4) $$, 'session 2: a new pine in plot 1');
select is(
  (select species::text from public.pomodoro_sessions
   where user_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1' order by started_at desc limit 1),
  'pine', 'the session records the species it planted');

select pg_temp.focus('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1');
select results_eq($$ select species from pg_temp.trees('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1') $$,
  $$ values ('bamboo'), ('pine'), ('pine') $$, 'no species asked: a free pine');
select is(
  (select count(*)::int from public.pomodoro_sessions
   where user_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1' and garden_tree_id is null),
  0, 'every completed session points at the tree it planted');

-- An abandoned session plants nothing
set local request.jwt.claims = '{"sub":"a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1","role":"authenticated"}';
set local role authenticated;
select public.abandon_pomodoro((public.start_pomodoro(25)).id);
reset role;
select is((select count(*)::int from public.garden_trees
  where user_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'), 3, 'an abandoned session plants no tree');

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
-- seed-sakura is a shop item (migration 20261109070100); owning it unlocks sakura
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
select results_eq($$ select garden_index, plot_index from public.garden_trees
  where user_id = 'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3' and not legacy $$,
  $$ values (2, 2) $$, 'a new tree after the old ones goes to the next free plot');

-- Access: own trees only, no direct writes
set local request.jwt.claims = '{"sub":"a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2","role":"authenticated"}';
set local role authenticated;
select is((select count(*)::int from public.garden_trees), 1, 'a learner sees only their own trees');
select throws_ok(
  $$ insert into public.garden_trees (user_id, garden_index, plot_index, species) values (auth.uid(), 1, 5, 'sakura') $$,
  '42501', null, 'learners cannot plant trees directly');

select * from finish();
rollback;
