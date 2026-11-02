-- Row-level security: users only ever see and change their own rows,
-- reward-related tables are read-only for clients, anon sees nothing.
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

-- ---------------------------------------------------------------------------
-- Fixtures (as table owner): user A owns one row in every table, user B none
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, aud, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated');

insert into public.lessons (id, user_id, title, language, level)
values ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A lesson', 'ja', 'N4');
insert into public.sentences (id, lesson_id, user_id, position, source_text)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 0, '駅に行きます。');
insert into public.attempts (id, user_id, sentence_id, user_translation, verdict)
values ('30000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '20000000-0000-0000-0000-000000000001', 'Tôi đi đến ga.', 'exact');
insert into public.vocab_items (id, user_id, language, term)
values ('40000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ja', '駅');
insert into public.flashcards (user_id, vocab_item_id)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '40000000-0000-0000-0000-000000000001');
insert into public.pomodoro_sessions (user_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
insert into public.transactions (user_id, xp_delta, reason, idempotency_key)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 10, 'test', 'k1');
insert into public.error_logs (user_id, attempt_id, tag)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '30000000-0000-0000-0000-000000000001', 'particle');

-- ---------------------------------------------------------------------------
-- No API role may TRUNCATE (it bypasses RLS)
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from information_schema.role_table_grants
   where table_schema = 'public' and privilege_type = 'TRUNCATE'
     and grantee in ('anon', 'authenticated', 'service_role')),
  0,
  'no API role has TRUNCATE on public tables'
);

-- ---------------------------------------------------------------------------
-- As user B: sees none of A's rows in any table
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select is((select count(*)::int from public.profiles where user_id <> auth.uid()), 0, 'B cannot see other profiles');
select is((select count(*)::int from public.wallets where user_id <> auth.uid()), 0, 'B cannot see other wallets');
select is((select count(*)::int from public.lessons), 0, 'B cannot see A lessons');
select is((select count(*)::int from public.sentences), 0, 'B cannot see A sentences');
select is((select count(*)::int from public.attempts), 0, 'B cannot see A attempts');
select is((select count(*)::int from public.vocab_items), 0, 'B cannot see A vocab_items');
select is((select count(*)::int from public.flashcards), 0, 'B cannot see A flashcards');
select is((select count(*)::int from public.pomodoro_sessions), 0, 'B cannot see A pomodoro_sessions');
select is((select count(*)::int from public.transactions), 0, 'B cannot see A transactions');
select is((select count(*)::int from public.error_logs), 0, 'B cannot see A error_logs');

-- Updates / deletes on invisible rows silently affect nothing
update public.lessons set title = 'hacked' where id = '10000000-0000-0000-0000-000000000001';
delete from public.flashcards where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select throws_ok(
  $$ insert into public.lessons (user_id, title, language, level)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'forged', 'ja', 'N5') $$,
  '42501', null, 'B cannot create a lesson owned by A'
);

select throws_ok(
  $$ insert into public.sentences (lesson_id, user_id, position, source_text)
     values ('10000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 9, 'x') $$,
  '42501', null, 'B cannot attach a sentence to A lesson'
);

-- ---------------------------------------------------------------------------
-- As user A: own data is visible; reward tables are read-only
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select is((select title from public.lessons), 'A lesson', 'A lesson unchanged after B update attempt');
select is((select count(*)::int from public.flashcards), 1, 'A flashcard survived B delete attempt');
select is((select count(*)::int from public.sentences), 1, 'A sees own sentences');
select is((select count(*)::int from public.attempts), 1, 'A sees own attempts');
select is((select count(*)::int from public.wallets), 1, 'A sees own wallet');

select lives_ok(
  $$ insert into public.lessons (user_id, title, language, level)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Second', 'en', 'B1') $$,
  'A can create own lesson'
);
select lives_ok(
  $$ update public.profiles set display_name = 'A' where user_id = auth.uid() $$,
  'A can update own profile'
);

select throws_ok(
  $$ update public.wallets set coins = 9999 $$,
  '42501', null, 'A cannot write wallets'
);
select throws_ok(
  $$ insert into public.attempts (user_id, sentence_id, user_translation, verdict)
     values (auth.uid(), '20000000-0000-0000-0000-000000000001', 'x', 'exact') $$,
  '42501', null, 'A cannot forge attempts'
);
select throws_ok(
  $$ insert into public.transactions (user_id, coins_delta, reason, idempotency_key)
     values (auth.uid(), 100, 'cheat', 'k2') $$,
  '42501', null, 'A cannot write transactions'
);
select throws_ok(
  $$ insert into public.pomodoro_sessions (user_id) values (auth.uid()) $$,
  '42501', null, 'A cannot write pomodoro_sessions directly'
);
select throws_ok(
  $$ insert into public.error_logs (user_id, attempt_id, tag)
     values (auth.uid(), '30000000-0000-0000-0000-000000000001', 'x') $$,
  '42501', null, 'A cannot write error_logs'
);
select throws_ok(
  $$ insert into public.profiles (user_id) values (gen_random_uuid()) $$,
  '42501', null, 'A cannot insert profiles'
);
select throws_ok(
  $$ update public.profiles set user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' where user_id = auth.uid() $$,
  '42501', null, 'A cannot reassign profile ownership'
);
select throws_ok(
  $$ update public.lessons set user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  '42501', null, 'A cannot give a lesson to B'
);

-- ---------------------------------------------------------------------------
-- As anon: no access at all
-- ---------------------------------------------------------------------------
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok($$ select count(*) from public.lessons $$, '42501', null, 'anon cannot read lessons');
select throws_ok($$ select count(*) from public.profiles $$, '42501', null, 'anon cannot read profiles');
select throws_ok($$ select count(*) from public.wallets $$, '42501', null, 'anon cannot read wallets');

select * from finish();
rollback;
