begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

-- Streak freeze, streak milestones, daily goals (streak-goals.md) and calendar leaderboards.

insert into auth.users (id, email, aud, role) values
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'freeze@test.local', 'authenticated', 'authenticated'),
  ('a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', 'goals@test.local', 'authenticated', 'authenticated'),
  ('a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3', 'other@test.local', 'authenticated', 'authenticated');
update public.profiles set timezone = 'UTC', display_name = 'Learner'
where user_id in ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2',
  'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3');

create function pg_temp.wallet(p uuid) returns public.wallets
language sql as $$ select * from public.wallets where user_id = p $$;

-- ── Milestones ──────────────────────────────────────────────────────────────────────────────
select is(public.streak_milestone_coins(3), 5, 'a 3-day streak pays 5 coins');
select is(public.streak_milestone_coins(4), 0, 'day 4 is not a milestone');
select is(public.streak_milestone_coins(200), 100, 'every 100 days pays 100 coins');

update public.wallets set streak_current = 2, streak_best = 2, coins = 0,
  last_active_date = (now() at time zone 'UTC')::date - 1
where user_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
set local role service_role;
select public.record_study_activity('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1');
select public.record_study_activity('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1');
reset role;
select is((pg_temp.wallet('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1')).streak_current, 3,
  'studying the day after extends the streak once per day');
select is((pg_temp.wallet('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1')).coins, 5,
  'reaching 3 days pays the milestone once');

-- ── Freeze ──────────────────────────────────────────────────────────────────────────────────
update public.wallets set coins = 120 where user_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
set local role authenticated;
set local request.jwt.claims = '{"sub":"a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1","role":"authenticated"}';
select is(public.buy_streak_freeze(), 1, 'buying a freeze returns the freezes held');
select is(public.buy_streak_freeze(), 2, 'a second freeze can be held');
select throws_ok('select public.buy_streak_freeze()', '22023', null, 'a third freeze is refused');
select throws_ok('update public.wallets set streak_freezes = 2', '42501', null,
  'the client cannot write freezes directly');
reset role;
select is((pg_temp.wallet('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1')).coins, 20, 'two freezes cost 100 coins');

update public.wallets set coins = 10, streak_freezes = 0 where user_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
set local role authenticated;
set local request.jwt.claims = '{"sub":"a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1","role":"authenticated"}';
select throws_ok('select public.buy_streak_freeze()', '23514', null,
  'a freeze cannot be bought without enough coins');
reset role;

-- Missed two days while holding two freezes: the streak goes on, both freezes are spent
update public.wallets set streak_current = 9, streak_best = 9, streak_freezes = 2,
  last_active_date = (now() at time zone 'UTC')::date - 3
where user_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
select is(public.effective_streak(pg_temp.wallet('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1')), 9,
  'freezes keep the shown streak alive through missed days');
set local role service_role;
select public.record_study_activity('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1');
reset role;
select is((pg_temp.wallet('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1')).streak_current, 10,
  'studying after the frozen days continues the streak');
select is((pg_temp.wallet('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1')).streak_freezes, 0,
  'one freeze is spent per missed day');

-- Missed three days with one freeze: the streak restarts and the freeze is kept
update public.wallets set streak_current = 9, streak_freezes = 1,
  last_active_date = (now() at time zone 'UTC')::date - 4
where user_id = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
select is(public.effective_streak(pg_temp.wallet('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1')), 0,
  'too few freezes: the streak is shown as broken');
set local role service_role;
select public.record_study_activity('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1');
reset role;
select is((pg_temp.wallet('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1')).streak_current, 1,
  'too few freezes: the streak restarts at 1');

-- ── Daily goals ─────────────────────────────────────────────────────────────────────────────
-- A new learner with nothing studied gets no goal for free (bug #2)
set local role authenticated;
set local request.jwt.claims = '{"sub":"a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2","role":"authenticated"}';
select is(public.today_goals() -> 'review' ->> 'done', 'false', 'no review goal ticked without reviewing');
select is(public.today_goals() -> 'review' ->> 'applicable', 'false',
  'with no card due, the review goal does not apply');
select is(public.today_goals() ->> 'rewarded', 'false', 'no bonus before any goal');
reset role;

-- Translate 3 sentences + one finished Pomodoro = every applicable goal, bonus paid once
insert into public.reward_claims (user_id, claim_key, kind, source, points, xp)
select 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', 'sentence:g' || n, 'sentence', 'manual', 7, 7
from generate_series(1, 3) n;
insert into public.pomodoro_sessions (user_id, planned_minutes, status, started_at, ended_at)
values ('a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2', 25, 'completed', now() - interval '25 minutes', now());
update public.wallets set coins = 0 where user_id = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2';

set local role authenticated;
set local request.jwt.claims = '{"sub":"a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2","role":"authenticated"}';
select is(public.today_goals() ->> 'justRewarded', 'true', 'reaching every goal pays the bonus');
select is(public.today_goals() ->> 'justRewarded', 'false', 'the bonus is paid once per day');
reset role;
select is((pg_temp.wallet('a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2')).coins, 5, 'the daily bonus is 5 coins');

-- A goal once reached stays reached even if its source disappears (no un-ticking)
delete from public.pomodoro_sessions where user_id = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
set local role authenticated;
set local request.jwt.claims = '{"sub":"a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2","role":"authenticated"}';
select is(public.today_goals() -> 'focus' ->> 'done', 'true', 'a reached goal never un-ticks');

-- RLS: another learner sees no goal rows of someone else
set local request.jwt.claims = '{"sub":"a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3","role":"authenticated"}';
select is((select count(*) from public.daily_goal_days
  where user_id = 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2')::integer, 0,
  'goal days of another learner are hidden');

-- ── Calendar leaderboards ───────────────────────────────────────────────────────────────────
select is(public.leaderboard_period_start('week'),
  date_trunc('week', now() at time zone 'UTC') at time zone 'UTC',
  'the week board starts on Monday 00:00 in the viewer time zone');
select is((select rank from public.my_leaderboard_rank('xp', 'week')), null::bigint,
  'a learner with no XP this week has no rank');
reset role;

select * from finish();
rollback;
