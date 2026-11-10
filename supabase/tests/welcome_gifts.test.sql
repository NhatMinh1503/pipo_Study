begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

-- Welcome event: new accounts get the active gifts (pond + lantern), nothing else.

-- An ended gift must not be handed out
insert into public.welcome_gifts (item_id, starts_at, ends_at)
values ('deco-bench', now() - interval '2 days', now() - interval '1 day');
-- A future gift must not be handed out yet
insert into public.welcome_gifts (item_id, starts_at) values ('deco-torii', now() + interval '1 day');

insert into auth.users (id, email, aud, role)
values ('9e9e9e9e-9e9e-9e9e-9e9e-9e9e9e9e9e9e', 'welcome@test.local', 'authenticated', 'authenticated');

select results_eq(
  $$ select item_id from public.purchases
     where user_id = '9e9e9e9e-9e9e-9e9e-9e9e-9e9e9e9e9e9e' order by item_id $$,
  $$ values ('deco-lantern'), ('deco-pond') $$,
  'a new account owns the pond and the lantern, and no ended or future gift');

select is((select coins from public.wallets where user_id = '9e9e9e9e-9e9e-9e9e-9e9e-9e9e9e9e9e9e'), 0,
  'the gifts cost nothing');

set local role authenticated;
set local request.jwt.claims = '{"sub":"9e9e9e9e-9e9e-9e9e-9e9e-9e9e9e9e9e9e","role":"authenticated"}';
select throws_ok($$ select * from public.welcome_gifts $$, '42501', null,
  'learners cannot read the event table');
select lives_ok($$ select public.place_decoration('deco-lantern', 1, 0) $$,
  'the gifted lantern can be placed in the garden');
select throws_ok($$ select public.buy_item('deco-pond') $$, '23505', null,
  'the gifted pond cannot be bought a second time');

select * from finish();
rollback;
