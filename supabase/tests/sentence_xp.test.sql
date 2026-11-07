begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- Per-sentence XP, the 300 XP/day cap for manual lessons and completion rewards
-- (xp-levels spec §3.1, §3.2, §3.6; test cases #5, #6, #7, #7b, #9).

insert into auth.users (id, email, aud, role) values
  ('61616161-6161-6161-6161-616161616161', 'xp@test.local', 'authenticated', 'authenticated'),
  ('62626262-6262-6262-6262-626262626262', 'xp-other@test.local', 'authenticated', 'authenticated');
update public.profiles set timezone = 'UTC'
where user_id in ('61616161-6161-6161-6161-616161616161', '62626262-6262-6262-6262-626262626262');

create temporary table ids (name text, id uuid) on commit drop;
grant all on ids to authenticated, service_role;

set local role service_role;
insert into ids select 'manual', public.create_lesson_for_user(
  '61616161-6161-6161-6161-616161616161', 'Mine', 'ja', 'N5', array['一。', '二。', '三。', '四。'], 'manual');
insert into ids select 'ai', public.create_lesson_for_user(
  '61616161-6161-6161-6161-616161616161', 'AI', 'ja', 'N5', array['一。', '二。', '三。'], 'ai');
insert into ids select 'legacy', public.create_lesson_for_user(
  '61616161-6161-6161-6161-616161616161', 'Old', 'ja', 'N5', array['一。', '二。', '三。'], 'manual');
insert into ids select 's' || s.position, s.id from public.sentences s
where s.lesson_id = (select id from ids where name = 'manual');
insert into ids select 'ai' || s.position, s.id from public.sentences s
where s.lesson_id = (select id from ids where name = 'ai');

create function pg_temp.sid(p_name text) returns uuid language sql as $$ select id from ids where name = p_name $$;
create function pg_temp.xp() returns integer language sql as $$
  select xp from public.wallets where user_id = '61616161-6161-6161-6161-616161616161' $$;

-- #5: a sentence pays once
select is(
  public.award_sentence_xp('61616161-6161-6161-6161-616161616161', pg_temp.sid('s0'), 10),
  '{"points": 10, "awarded": 10, "capped": false}'::jsonb,
  'an unlocked sentence pays its points'
);
select is(pg_temp.xp(), 10, 'the XP lands in the wallet');
select is(
  public.award_sentence_xp('61616161-6161-6161-6161-616161616161', pg_temp.sid('s0'), 10),
  '{"points": 10, "awarded": 10, "capped": false}'::jsonb,
  'asking again returns the first result'
);
select is(pg_temp.xp(), 10, 'but pays nothing more');

-- #9 (part): an unlocked sentence is study activity
select is(
  (select streak_current from public.wallets where user_id = '61616161-6161-6161-6161-616161616161'),
  1, 'an unlocked sentence starts the streak'
);

-- #6: the daily cap for manual lessons. Pretend 286 XP were already earned today (+10 above = 296)
reset role;
insert into public.reward_claims (user_id, claim_key, kind, source, points, xp)
values ('61616161-6161-6161-6161-616161616161', 'test:earlier', 'sentence', 'manual', 286, 286);
set local role service_role;

select is(
  public.award_sentence_xp('61616161-6161-6161-6161-616161616161', pg_temp.sid('s1'), 10),
  '{"points": 10, "awarded": 4, "capped": true}'::jsonb,
  'a sentence crossing the cap pays only what is left'
);
select is(
  public.award_sentence_xp('61616161-6161-6161-6161-616161616161', pg_temp.sid('s2'), 8),
  '{"points": 8, "awarded": 0, "capped": true}'::jsonb,
  'after the cap a manual sentence pays 0 and says so'
);
select is(pg_temp.xp(), 14, 'the wallet got 10 + 4 XP only');

-- #9: a capped sentence still keeps the streak (moved to yesterday to see it change)
reset role;
update public.wallets set last_active_date = current_date - 1, streak_current = 3
where user_id = '61616161-6161-6161-6161-616161616161';
set local role service_role;
select public.award_sentence_xp('61616161-6161-6161-6161-616161616161', pg_temp.sid('s3'), 10);
select is(
  (select streak_current from public.wallets where user_id = '61616161-6161-6161-6161-616161616161'),
  4, 'a sentence that earned 0 XP because of the cap still counts as study activity'
);

-- #7: ai lessons are outside the cap
select is(
  public.award_sentence_xp('61616161-6161-6161-6161-616161616161', pg_temp.sid('ai0'), 10),
  '{"points": 10, "awarded": 10, "capped": false}'::jsonb,
  'an ai lesson pays in full even after the manual cap'
);

-- #7b: a manual lesson completed with the cap full gets no bonus and no coins
select is(
  public.award_lesson_completion('61616161-6161-6161-6161-616161616161', pg_temp.sid('manual'), 5, 4),
  '{"xp": 0, "coins": 0, "capped": true, "legacy": false}'::jsonb,
  'capped manual lesson: no bonus XP and no coins'
);
select is(
  public.award_lesson_completion('61616161-6161-6161-6161-616161616161', pg_temp.sid('manual'), 5, 4),
  '{"xp": 0, "coins": 0, "capped": true, "legacy": false}'::jsonb,
  'completing again returns the same result'
);

-- ai lesson completion pays the bonus and coins
select is(
  public.award_lesson_completion('61616161-6161-6161-6161-616161616161', pg_temp.sid('ai'), 5, 3),
  '{"xp": 5, "coins": 3, "capped": false, "legacy": false}'::jsonb,
  'an ai lesson pays the completion bonus and coins'
);
select results_eq(
  $$ select xp, coins from public.wallets where user_id = '61616161-6161-6161-6161-616161616161' $$,
  $$ values (29, 3) $$,
  'wallet: 14 + 10 + 5 XP, 3 coins'
);

-- A lesson paid by the old rules (key lesson:<id> already in the ledger) is never paid again
select public.wallet_apply('61616161-6161-6161-6161-616161616161', 30, 3, 'lesson_completed',
  'lesson:' || pg_temp.sid('legacy'));
select is(
  public.award_lesson_completion('61616161-6161-6161-6161-616161616161', pg_temp.sid('legacy'), 5, 3),
  '{"xp": 30, "coins": 3, "capped": false, "legacy": true}'::jsonb,
  'a lesson rewarded before the change reports its old reward and pays nothing new'
);
select is(pg_temp.xp(), 59, 'only the legacy payment itself was added');

-- Validation and ownership
select throws_ok(
  format('select public.award_sentence_xp(%L, %L, 11)', '61616161-6161-6161-6161-616161616161', pg_temp.sid('s3')),
  '22023', null, 'points above the maximum are rejected'
);
select throws_ok(
  format('select public.award_sentence_xp(%L, %L, 10)', '62626262-6262-6262-6262-626262626262', pg_temp.sid('ai1')),
  'P0002', null, 'a sentence of another learner cannot be paid to this one'
);

-- Learners cannot pay themselves; they can read their own claims only
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"61616161-6161-6161-6161-616161616161","role":"authenticated"}';
select throws_ok(
  format('select public.award_sentence_xp(%L, %L, 10)', '61616161-6161-6161-6161-616161616161', pg_temp.sid('ai1')),
  '42501', null, 'learners cannot call award_sentence_xp'
);
select throws_ok(
  format('select public.award_lesson_completion(%L, %L, 5, 3)', '61616161-6161-6161-6161-616161616161', pg_temp.sid('ai')),
  '42501', null, 'learners cannot call award_lesson_completion'
);
select ok(
  (select count(*) from public.reward_claims) > 0,
  'learners read their own reward claims (result screen)'
);
set local request.jwt.claims = '{"sub":"62626262-6262-6262-6262-626262626262","role":"authenticated"}';
select is((select count(*)::int from public.reward_claims), 0, 'but not another learner''s');

select * from finish();
rollback;
