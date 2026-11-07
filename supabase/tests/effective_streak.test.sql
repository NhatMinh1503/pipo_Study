begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

-- Pago Pago (UTC-11) and Kiritimati (UTC+14) are 25 hours apart, so the same stored date
-- is "yesterday" in one zone and at least two days ago in the other.
insert into auth.users (id, email, aud, role) values
  ('31313131-3131-3131-3131-313131313131', 'today@test.local', 'authenticated', 'authenticated'),
  ('32323232-3232-3232-3232-323232323232', 'yesterday@test.local', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'broken@test.local', 'authenticated', 'authenticated'),
  ('34343434-3434-3434-3434-343434343434', 'never@test.local', 'authenticated', 'authenticated'),
  ('35353535-3535-3535-3535-353535353535', 'ahead@test.local', 'authenticated', 'authenticated');

update public.profiles set timezone = 'Pacific/Pago_Pago', display_name = 'Streaker'
where user_id in (
  '31313131-3131-3131-3131-313131313131', '32323232-3232-3232-3232-323232323232',
  '33333333-3333-3333-3333-333333333333', '34343434-3434-3434-3434-343434343434'
);
update public.profiles set timezone = 'Pacific/Kiritimati', display_name = 'Ahead'
where user_id = '35353535-3535-3535-3535-353535353535';

update public.wallets set streak_current = 5, streak_best = 5,
  last_active_date = (now() at time zone 'Pacific/Pago_Pago')::date
where user_id = '31313131-3131-3131-3131-313131313131';
update public.wallets set streak_current = 6, streak_best = 6,
  last_active_date = (now() at time zone 'Pacific/Pago_Pago')::date - 1
where user_id = '32323232-3232-3232-3232-323232323232';
update public.wallets set streak_current = 9, streak_best = 9,
  last_active_date = (now() at time zone 'Pacific/Pago_Pago')::date - 2
where user_id = '33333333-3333-3333-3333-333333333333';
update public.wallets set streak_current = 0, streak_best = 0, last_active_date = null
where user_id = '34343434-3434-3434-3434-343434343434';
-- Same stored date as the "yesterday" learner, but in a zone already a day or two ahead
update public.wallets set streak_current = 7, streak_best = 7,
  last_active_date = (now() at time zone 'Pacific/Pago_Pago')::date - 1
where user_id = '35353535-3535-3535-3535-353535353535';

create function pg_temp.streak_of(p_user uuid) returns integer
language sql as $$ select public.effective_streak(w) from public.wallets w where w.user_id = p_user $$;

select is(pg_temp.streak_of('31313131-3131-3131-3131-313131313131'), 5, 'active today keeps the streak');
select is(pg_temp.streak_of('32323232-3232-3232-3232-323232323232'), 6, 'active yesterday keeps the streak');
select is(pg_temp.streak_of('33333333-3333-3333-3333-333333333333'), 0, 'two days without activity shows 0');
select is(pg_temp.streak_of('34343434-3434-3434-3434-343434343434'), 0, 'never active shows 0');
select is(
  pg_temp.streak_of('35353535-3535-3535-3535-353535353535'), 0,
  'the learner''s own time zone decides: the same date is too old a day ahead'
);

-- ---------------------------------------------------------------------------
-- Leaderboard and access, as a signed-in learner
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"31313131-3131-3131-3131-313131313131","role":"authenticated"}';

select ok(
  not exists (
    select 1 from public.leaderboard('streak', 'week')
    where user_id = '33333333-3333-3333-3333-333333333333'
  ),
  'a broken streak no longer appears on the leaderboard'
);
select is(
  (select value from public.leaderboard('streak', 'week')
   where user_id = '32323232-3232-3232-3232-323232323232'),
  6::bigint, 'a live streak is ranked by its effective value'
);
select is(
  (select count(*)::int from public.wallets w
   where w.user_id = '32323232-3232-3232-3232-323232323232'),
  0, 'one learner cannot read another learner''s wallet or streak'
);
select is(
  (select effective_streak from public.wallet_summaries), 5,
  'wallet_summaries shows the learner''s own effective streak'
);
select is(
  (select count(*)::int from public.wallet_summaries
   where user_id = '33333333-3333-3333-3333-333333333333'),
  0, 'wallet_summaries keeps the wallets RLS (no other learner''s row)'
);

select * from finish();
rollback;
