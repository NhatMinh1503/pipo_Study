begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email, aud, role) values
  ('18181818-1818-1818-1818-181818181818', 'p1@test.local', 'authenticated', 'authenticated'),
  ('19191919-1919-1919-1919-191919191919', 'p2@test.local', 'authenticated', 'authenticated'),
  ('20202020-2020-2020-2020-202020202020', 'p3@test.local', 'authenticated', 'authenticated');
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

select * from finish();
rollback;
