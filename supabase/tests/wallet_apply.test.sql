begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, aud, role)
values ('99999999-9999-9999-9999-999999999999', 'w@test.local', 'authenticated', 'authenticated');

set local role service_role;

select is(
  public.wallet_apply('99999999-9999-9999-9999-999999999999', 50, 5, 'lesson', 'lesson:1'),
  true, 'first reward is applied'
);
select is(
  public.wallet_apply('99999999-9999-9999-9999-999999999999', 50, 5, 'lesson', 'lesson:1'),
  false, 'same idempotency key is ignored'
);
select results_eq(
  $$ select xp, coins from public.wallets where user_id = '99999999-9999-9999-9999-999999999999' $$,
  $$ values (50, 5) $$,
  'wallet credited exactly once'
);
select is(
  (select count(*)::int from public.transactions where user_id = '99999999-9999-9999-9999-999999999999'),
  1, 'one ledger row'
);

select is(
  public.wallet_apply('99999999-9999-9999-9999-999999999999', 0, -5, 'shop', 'shop:1'),
  true, 'spending within balance works'
);
select throws_ok(
  $$ select public.wallet_apply('99999999-9999-9999-9999-999999999999', 0, -1, 'shop', 'shop:2') $$,
  '23514', null, 'balance cannot go negative'
);
select is(
  (select count(*)::int from public.transactions where idempotency_key = 'shop:2'),
  0, 'a rejected spend leaves no ledger row'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}';
select throws_ok(
  $$ select public.wallet_apply('99999999-9999-9999-9999-999999999999', 9999, 9999, 'cheat', 'x') $$,
  '42501', null, 'clients cannot call wallet_apply'
);

select * from finish();
rollback;
