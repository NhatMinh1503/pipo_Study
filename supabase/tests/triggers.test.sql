-- Signup trigger, updated_at trigger, and data constraints.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email, aud, role)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'c@test.local', 'authenticated', 'authenticated');

-- Signup creates profile + wallet with defaults
select is(
  (select count(*)::int from public.profiles where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  1, 'signup creates a profile'
);
select is(
  (select display_language::text from public.profiles where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  'en', 'profile defaults to English display language'
);
select results_eq(
  $$ select xp, coins, streak_current from public.wallets
     where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  $$ values (0, 0, 0) $$,
  'signup creates an empty wallet'
);

-- updated_at moves forward on update
update public.profiles set updated_at = '2000-01-01' where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
update public.profiles set display_name = 'C' where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
select ok(
  (select updated_at > '2000-01-01' from public.profiles where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  'updated_at is refreshed on update'
);

-- Level must match language
select throws_ok(
  $$ insert into public.lessons (user_id, title, language, level)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bad', 'ja', 'B1') $$,
  '23514', null, 'Japanese lesson rejects a CEFR level'
);
select throws_ok(
  $$ update public.profiles set learning_language = 'en', level = 'N3'
     where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  '23514', null, 'profile rejects a level from the other language'
);

-- Onboarding cannot be marked complete without choices
select throws_ok(
  $$ update public.profiles set onboarded_at = now(), learning_language = null
     where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  '23514', null, 'onboarded profile needs language and level'
);

-- Balances can never go negative
select throws_ok(
  $$ update public.wallets set coins = -1 where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  '23514', null, 'wallet coins cannot be negative'
);

-- Deleting the auth user cascades to all owned data
delete from auth.users where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
select is(
  (select count(*)::int from public.wallets where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  0, 'deleting a user removes their wallet'
);

select * from finish();
rollback;
