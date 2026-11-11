begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- Slime pets (garden-scene spec §3.6): sold in the shop, never placed on a slot.

insert into auth.users (id, email, aud, role)
values ('9e7e9e7e-9e7e-9e7e-9e7e-9e7e9e7e9e7e', 'garden-pets@test.local', 'authenticated', 'authenticated');

set local role service_role;
select public.wallet_apply('9e7e9e7e-9e7e-9e7e-9e7e-9e7e9e7e9e7e', 0, 250, 'lesson', 'garden-pets-seed');
reset role;

select results_eq(
  $$ select id, price from public.shop_items where kind = 'pet' order by sort_order $$,
  $$ values ('deco-slime', 90), ('pet-slime-water', 100), ('pet-slime-moss', 100),
            ('pet-slime-sakura', 140), ('pet-slime-ember', 160), ('pet-slime-cloud', 200) $$,
  'six slime pets are sold, the first one keeping its id, at the registry prices');

set local role authenticated;
set local request.jwt.claims = '{"sub":"9e7e9e7e-9e7e-9e7e-9e7e-9e7e9e7e9e7e","role":"authenticated"}';

select is(public.buy_item('pet-slime-water'), 100, 'a pet costs its catalog price');
select throws_ok($$ select public.buy_item('pet-slime-water') $$, '23505', null,
  'a pet is bought only once');
select throws_ok($$ select public.place_decoration('pet-slime-water', 1, 0) $$, '22023', null,
  'a pet roams the garden, it is not placed on a slot');
select throws_ok($$ select public.buy_item('pet-slime-cloud') $$, '23514', null,
  'a pet the learner cannot afford is refused');
select is((select coins from public.wallets), 150, 'only the water slime was paid for');

select * from finish();
rollback;
