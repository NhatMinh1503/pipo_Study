begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- Decorations placed by tile (garden-scene spec §3.5, test case #10)

insert into auth.users (id, email, aud, role) values
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'deco@test.local', 'authenticated', 'authenticated'),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'deco2@test.local', 'authenticated', 'authenticated');
insert into public.purchases (user_id, item_id) values
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'deco-lantern'),
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'deco-bench'),
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'deco-pond')
-- (welcome gifts may already have given some of these)
on conflict do nothing;

set local role authenticated;
set local request.jwt.claims = '{"sub":"b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1","role":"authenticated"}';

select lives_ok($$ select public.place_decoration('deco-lantern', 1, 0) $$, 'an owned decoration can be placed');
select results_eq($$ select item_id, garden_index, slot_index from public.garden_decorations $$,
  $$ values ('deco-lantern', 1, 0) $$, 'the placement is saved');

select throws_ok($$ select public.place_decoration('deco-bench', 1, 0) $$, '23505', null,
  'a slot holds one decoration');
select lives_ok($$ select public.place_decoration('deco-lantern', 1, 3) $$, 'placing again moves it');
select results_eq($$ select slot_index from public.garden_decorations where item_id = 'deco-lantern' $$,
  $$ values (3) $$, 'one placement per item');

select throws_ok($$ select public.place_decoration('deco-torii', 1, 1) $$, '42501', null,
  'an item the learner does not own cannot be placed');
select throws_ok($$ select public.place_decoration('deco-pond', 1, 1) $$, '22023', null,
  'the pond is not placed on a slot (it fills the pond tiles)');
select throws_ok($$ select public.place_decoration('deco-bench', 1, 5) $$, '22023', null,
  'slots are 0–4');
select throws_ok($$ select public.place_decoration('deco-bench', 2, 0) $$, '22023', null,
  'only gardens the learner has');

select public.remove_decoration('deco-lantern');
select is((select count(*)::int from public.garden_decorations), 0, 'removing puts it back in storage');

set local request.jwt.claims = '{"sub":"b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2","role":"authenticated"}';
reset role;
insert into public.garden_decorations (user_id, item_id, garden_index, slot_index)
values ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'deco-bench', 1, 2);
set local role authenticated;
select is((select count(*)::int from public.garden_decorations), 0, 'another learner sees none of it');

select * from finish();
rollback;
