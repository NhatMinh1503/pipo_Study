begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

-- Garden items in the shop (garden-scene spec §3.2, §3.5): seeds unlock species,
-- the torii is placed on a slot, the bridge and the slime take no slot.

insert into auth.users (id, email, aud, role)
values ('5e5e5e5e-5e5e-5e5e-5e5e-5e5e5e5e5e5e', 'garden-shop@test.local', 'authenticated', 'authenticated');

set local role service_role;
select public.wallet_apply('5e5e5e5e-5e5e-5e5e-5e5e-5e5e5e5e5e5e', 0, 500, 'lesson', 'garden-shop-seed');
reset role;

select results_eq(
  $$ select id, kind::text, price from public.shop_items
     where id in ('seed-maple', 'seed-sakura', 'deco-torii', 'deco-bridge', 'deco-slime') order by sort_order $$,
  $$ values ('seed-maple', 'seed', 120), ('seed-sakura', 'seed', 120), ('deco-torii', 'decoration', 60),
            ('deco-bridge', 'decoration', 50), ('deco-slime', 'pet', 90) $$,
  'the shop sells both seeds, two decorations and the first slime pet at the registry prices');

set local role authenticated;
set local request.jwt.claims = '{"sub":"5e5e5e5e-5e5e-5e5e-5e5e-5e5e5e5e5e5e","role":"authenticated"}';

select throws_ok($$ select public.start_pomodoro(25, 'sakura') $$, '42501', null,
  'sakura is locked before buying its seed');
select is(public.buy_item('seed-sakura'), 120, 'buying a seed charges the catalog price');
select lives_ok($$ select public.start_pomodoro(25, 'sakura') $$, 'owning seed-sakura unlocks sakura');
select throws_ok($$ select public.start_pomodoro(25, 'maple') $$, '42501', null,
  'each seed unlocks only its own species');

select public.buy_item('deco-torii');
select public.buy_item('deco-bridge');
select public.buy_item('deco-slime');
select lives_ok($$ select public.place_decoration('deco-torii', 1, 0) $$, 'the torii goes on a slot');
select throws_ok($$ select public.place_decoration('deco-bridge', 1, 1) $$, '22023', null,
  'the bridge sits on the pond, not on a slot');
select throws_ok($$ select public.place_decoration('deco-slime', 1, 1) $$, '22023', null,
  'the slime hops along the path, not on a slot');
select throws_ok($$ select public.place_decoration('seed-sakura', 1, 1) $$, '22023', null,
  'a seed is not a decoration');
select is((select coins from public.wallets), 500 - 120 - 60 - 50 - 90, 'every purchase was paid once');

select * from finish();
rollback;
