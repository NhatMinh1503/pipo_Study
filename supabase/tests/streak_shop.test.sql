begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email, aud, role)
values ('17171717-1717-1717-1717-171717171717', 'shop@test.local', 'authenticated', 'authenticated');
update public.profiles set timezone = 'Asia/Tokyo' where user_id = '17171717-1717-1717-1717-171717171717';

-- ---------------------------------------------------------------------------
-- Streak (as service_role, like the server)
-- ---------------------------------------------------------------------------
set local role service_role;
select public.wallet_apply('17171717-1717-1717-1717-171717171717', 10, 0, 'lesson', 's1');
select is((select streak_current from public.wallets where user_id = '17171717-1717-1717-1717-171717171717'), 1, 'first activity starts a streak of 1');

select public.wallet_apply('17171717-1717-1717-1717-171717171717', 10, 0, 'lesson', 's2');
select is((select streak_current from public.wallets where user_id = '17171717-1717-1717-1717-171717171717'), 1, 'more activity the same day keeps the streak');

reset role;
update public.wallets set last_active_date = (now() at time zone 'Asia/Tokyo')::date - 1, streak_current = 4, streak_best = 4
where user_id = '17171717-1717-1717-1717-171717171717';
set local role service_role;
select public.wallet_apply('17171717-1717-1717-1717-171717171717', 10, 0, 'lesson', 's3');
select results_eq(
  $$ select streak_current, streak_best from public.wallets where user_id = '17171717-1717-1717-1717-171717171717' $$,
  $$ values (5, 5) $$, 'activity the next day extends the streak and the best'
);

reset role;
update public.wallets set last_active_date = (now() at time zone 'Asia/Tokyo')::date - 3
where user_id = '17171717-1717-1717-1717-171717171717';
set local role service_role;
select public.wallet_apply('17171717-1717-1717-1717-171717171717', 10, 100, 'lesson', 's4');
select results_eq(
  $$ select streak_current, streak_best from public.wallets where user_id = '17171717-1717-1717-1717-171717171717' $$,
  $$ values (1, 5) $$, 'a missed day resets the streak but keeps the best'
);

-- ---------------------------------------------------------------------------
-- Shop (as the user)
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"17171717-1717-1717-1717-171717171717","role":"authenticated"}';

select is((select coins from public.wallets), 100, 'starting balance for the shop test');
select is(public.buy_item('theme-sakura'), 60, 'buying returns the catalog price');
select is((select coins from public.wallets), 40, 'coins deducted by the server-side price');
select is((select streak_current from public.wallets), 1, 'spending does not count as activity');
select throws_ok($$ select public.buy_item('theme-sakura') $$, '23505', null, 'cannot buy the same item twice');
select throws_ok($$ select public.buy_item('theme-matcha') $$, '23514', null, 'cannot buy without enough coins');
select is((select count(*)::int from public.purchases), 1, 'a failed purchase leaves no row');

select lives_ok(
  $$ update public.profiles set accent = 'theme-sakura' where user_id = auth.uid() $$,
  'can use an owned theme'
);
select throws_ok(
  $$ update public.profiles set accent = 'theme-ocean' where user_id = auth.uid() $$,
  '42501', null, 'cannot use a theme that is not owned'
);

select * from finish();
rollback;
