-- Streak & daily goals (design/game/streak-goals.md).
--
-- 1. Daily goals are decided by what happened today in the learner's own time zone, and a goal
--    once reached stays reached: stored in daily_goal_days, never re-derived from the live queue.
-- 2. Streak freeze: bought with Coins (max 2 held), used up automatically to cover missed days.
-- 3. Streak milestones pay Coins once per streak run (3, 7, 14, 30, 60, 100 days, then every 100).
-- Values mirror lib/game/config.ts (GAME.goals, GAME.streak).

-- ── Streak freeze ───────────────────────────────────────────────────────────────────────────
alter table public.wallets
  add column streak_freezes integer not null default 0
  check (streak_freezes between 0 and 2);

-- Coins paid when a streak reaches n days (0 when n is not a milestone)
create function public.streak_milestone_coins(p_days integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when p_days = 3 then 5
    when p_days = 7 then 10
    when p_days = 14 then 20
    when p_days = 30 then 40
    when p_days = 60 then 60
    when p_days >= 100 and p_days % 100 = 0 then 100
    else 0
  end;
$$;

-- Study activity now spends freezes on missed days and pays streak milestones
create or replace function public.record_study_activity(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wallet public.wallets;
  v_today date;
  v_missed integer;
  v_streak integer;
  v_freezes integer;
  v_coins integer;
begin
  select * into v_wallet from public.wallets where user_id = p_user_id for update;
  if not found then
    raise exception 'wallet not found' using errcode = 'P0002';
  end if;

  select (now() at time zone coalesce(
    (select timezone from public.profiles where user_id = p_user_id), 'UTC'))::date
  into v_today;

  v_freezes := v_wallet.streak_freezes;
  if v_wallet.last_active_date = v_today then
    return;
  elsif v_wallet.last_active_date = v_today - 1 then
    v_streak := v_wallet.streak_current + 1;
  elsif v_wallet.last_active_date is not null and v_wallet.streak_current > 0 then
    v_missed := v_today - v_wallet.last_active_date - 1;
    if v_missed between 1 and v_freezes then
      -- Each missed day eats one freeze; the streak goes on as if nothing happened
      v_freezes := v_freezes - v_missed;
      v_streak := v_wallet.streak_current + 1;
    else
      v_streak := 1;
    end if;
  else
    v_streak := 1;
  end if;

  update public.wallets
  set streak_current = v_streak,
      streak_best = greatest(streak_best, v_streak),
      streak_freezes = v_freezes,
      last_active_date = v_today
  where user_id = p_user_id;

  v_coins := public.streak_milestone_coins(v_streak);
  if v_coins > 0 then
    -- The run's first day is part of the key, so a new run can earn the milestone again
    perform public.wallet_apply(
      p_user_id, 0, v_coins, 'streak_milestone',
      'streak_milestone:' || v_streak || ':' || (v_today - v_streak + 1)::text,
      jsonb_build_object('days', v_streak)
    );
  end if;
end;
$$;

revoke execute on function public.record_study_activity from public, anon, authenticated;
grant execute on function public.record_study_activity to service_role;

-- A streak stays alive through as many missed days as the learner holds freezes
create or replace function public.effective_streak(w public.wallets)
returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when w.last_active_date is not null
      and w.last_active_date >= (now() at time zone coalesce(
        (select p.timezone from public.profiles p where p.user_id = w.user_id), 'UTC'))::date
        - 1 - w.streak_freezes
    then w.streak_current
    else 0
  end;
$$;

-- Buys one freeze (price mirrors GAME.streak.freezePrice). Returns the freezes now held.
create function public.buy_streak_freeze()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_held integer;
begin
  if v_user_id is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select streak_freezes into v_held from public.wallets where user_id = v_user_id for update;
  if not found then
    raise exception 'wallet not found' using errcode = 'P0002';
  end if;
  if v_held >= 2 then
    raise exception 'freeze limit reached' using errcode = '22023';
  end if;
  -- A negative balance violates the wallets CHECK (23514) and rolls everything back
  perform public.wallet_apply(
    v_user_id, 0, -50, 'streak_freeze', 'streak_freeze:' || extensions.gen_random_uuid()::text
  );
  update public.wallets set streak_freezes = streak_freezes + 1 where user_id = v_user_id;
  return v_held + 1;
end;
$$;

revoke execute on function public.buy_streak_freeze from public, anon;
grant execute on function public.buy_streak_freeze to authenticated;

-- The wallet view the app reads gains the freezes held (new columns go last)
create or replace view public.wallet_summaries with (security_invoker = true) as
  select
    w.user_id,
    w.xp,
    w.coins,
    public.effective_streak(w) as effective_streak,
    w.streak_best,
    public.level_for_xp(w.xp) as level,
    public.stars_for_xp(w.xp) as stars,
    public.xp_into_level(w.xp) as xp_into_level,
    public.xp_to_next_level(w.xp) as xp_to_next,
    w.streak_freezes
  from public.wallets w;

-- ── Daily goals ─────────────────────────────────────────────────────────────────────────────
create table public.daily_goal_days (
  user_id uuid not null references auth.users on delete cascade,
  local_date date not null,
  -- Fixed at the first look of the day: min(5, cards seen before and due then); 0 = nothing to do
  review_target integer not null check (review_target between 0 and 5),
  translate_done_at timestamptz,
  review_done_at timestamptz,
  focus_done_at timestamptz,
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, local_date)
);

revoke all on public.daily_goal_days from anon, authenticated, service_role;
grant select on public.daily_goal_days to authenticated;
grant select, insert, update, delete on public.daily_goal_days to service_role;

alter table public.daily_goal_days enable row level security;

create policy "daily goals: owner can read"
  on public.daily_goal_days for select to authenticated
  using (user_id = (select auth.uid()));

-- Today's goals for the signed-in learner. Records goals reached so far (they never un-tick)
-- and pays the all-goals bonus once per local day.
create function public.today_goals()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text;
  v_today date;
  v_day public.daily_goal_days;
  v_sentences integer;
  v_reviews integer;
  v_focus integer;
  v_translate_target constant integer := 3;
  v_focus_target constant integer := 1;
  v_bonus constant integer := 5;
  v_just_rewarded boolean := false;
begin
  if v_user_id is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  select coalesce((select timezone from public.profiles where user_id = v_user_id), 'UTC')
  into v_timezone;
  v_today := (now() at time zone v_timezone)::date;

  insert into public.daily_goal_days (user_id, local_date, review_target)
  values (
    v_user_id, v_today,
    least(5, (
      select count(*) from public.flashcards
      where user_id = v_user_id and due_date <= now() and last_reviewed_at is not null
    ))
  )
  on conflict (user_id, local_date) do nothing;

  select * into v_day from public.daily_goal_days
  where user_id = v_user_id and local_date = v_today
  for update;

  select count(*) into v_sentences from public.reward_claims
  where user_id = v_user_id and kind = 'sentence'
    and (created_at at time zone v_timezone)::date = v_today;

  select count(*) into v_reviews from public.transactions
  where user_id = v_user_id and reason = 'flashcard_review'
    and (created_at at time zone v_timezone)::date = v_today;

  select count(*) into v_focus from public.pomodoro_sessions
  where user_id = v_user_id and status = 'completed'
    and (ended_at at time zone v_timezone)::date = v_today;

  update public.daily_goal_days
  set translate_done_at = coalesce(translate_done_at,
        case when v_sentences >= v_translate_target then now() end),
      review_done_at = coalesce(review_done_at,
        case when review_target > 0 and v_reviews >= review_target then now() end),
      focus_done_at = coalesce(focus_done_at,
        case when v_focus >= v_focus_target then now() end)
  where user_id = v_user_id and local_date = v_today
  returning * into v_day;

  if v_day.rewarded_at is null
    and v_day.translate_done_at is not null
    and v_day.focus_done_at is not null
    and (v_day.review_target = 0 or v_day.review_done_at is not null)
  then
    perform public.wallet_apply(
      v_user_id, 0, v_bonus, 'daily_goals', 'daily_goals:' || v_today::text
    );
    update public.daily_goal_days set rewarded_at = now()
    where user_id = v_user_id and local_date = v_today
    returning * into v_day;
    v_just_rewarded := true;
  end if;

  return jsonb_build_object(
    'date', v_today,
    'translate', jsonb_build_object('count', v_sentences, 'target', v_translate_target,
      'done', v_day.translate_done_at is not null),
    'review', jsonb_build_object('count', v_reviews, 'target', v_day.review_target,
      'done', v_day.review_done_at is not null, 'applicable', v_day.review_target > 0),
    'focus', jsonb_build_object('count', v_focus, 'target', v_focus_target,
      'done', v_day.focus_done_at is not null),
    'bonusCoins', v_bonus,
    'rewarded', v_day.rewarded_at is not null,
    'justRewarded', v_just_rewarded
  );
end;
$$;

revoke execute on function public.today_goals from public, anon;
grant execute on function public.today_goals to authenticated;
