-- Leaderboards by calendar week (Monday 00:00) and calendar month, instead of sliding 7 / 30 day
-- windows, so every board resets and starts a fresh "season" (audit §10). Boundaries follow the
-- viewer's own time zone. Adds the viewer's own rank (also outside the top 50) and personal
-- bests so a beginner always has a goal against themselves (pillar P4).

-- Start of the current period for the signed-in viewer, as an absolute time
create function public.leaderboard_period_start(p_period text)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  with tz as (
    select coalesce((select timezone from public.profiles where user_id = auth.uid()), 'UTC') as name
  )
  select date_trunc(case p_period when 'month' then 'month' else 'week' end,
    now() at time zone tz.name) at time zone tz.name
  from tz;
$$;

revoke execute on function public.leaderboard_period_start from public, anon;
grant execute on function public.leaderboard_period_start to authenticated;

-- Every learner's score for a metric in the current period (internal)
create function public.leaderboard_scores(p_metric text, p_period text)
returns table (user_id uuid, value bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with since as (select public.leaderboard_period_start(p_period) as at)
  select t.user_id, sum(t.xp_delta)::bigint
  from public.transactions t, since
  where p_metric = 'xp' and t.created_at >= since.at and t.xp_delta > 0
  group by t.user_id
  union all
  select w.user_id, public.effective_streak(w)::bigint
  from public.wallets w
  where p_metric = 'streak' and public.effective_streak(w) > 0
  union all
  select s.user_id, sum(s.planned_minutes)::bigint
  from public.pomodoro_sessions s, since
  where p_metric = 'focus' and s.status = 'completed' and s.ended_at >= since.at
  group by s.user_id;
$$;

revoke execute on function public.leaderboard_scores from public, anon, authenticated;

create or replace function public.leaderboard(p_metric text, p_period text)
returns table (rank bigint, user_id uuid, display_name text, avatar_path text, value bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select rank() over (order by s.value desc), s.user_id, p.display_name, p.avatar_path, s.value
  from public.leaderboard_scores(p_metric, p_period) s
  join public.profiles p on p.user_id = s.user_id
  where s.value > 0
  order by s.value desc, s.user_id
  limit 50;
$$;

-- The viewer's own rank and value; rank is null while they have nothing on this board
create function public.my_leaderboard_rank(p_metric text, p_period text)
returns table (rank bigint, value bigint, total bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select s.user_id, s.value, rank() over (order by s.value desc) as rank
    from public.leaderboard_scores(p_metric, p_period) s
    where s.value > 0
  )
  select
    (select r.rank from ranked r where r.user_id = auth.uid()),
    coalesce((select r.value from ranked r where r.user_id = auth.uid()), 0),
    (select count(*) from ranked);
$$;

revoke execute on function public.my_leaderboard_rank from public, anon;
grant execute on function public.my_leaderboard_rank to authenticated;

-- Personal bests of the viewer: best calendar week of XP and focus, longest streak
create function public.leaderboard_personal_bests()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with tz as (
    select coalesce((select timezone from public.profiles where user_id = auth.uid()), 'UTC') as name
  ),
  xp_weeks as (
    select date_trunc('week', t.created_at at time zone tz.name) as week, sum(t.xp_delta) as xp
    from public.transactions t, tz
    where t.user_id = auth.uid() and t.xp_delta > 0
    group by 1
  ),
  focus_weeks as (
    select date_trunc('week', s.ended_at at time zone tz.name) as week, sum(s.planned_minutes) as minutes
    from public.pomodoro_sessions s, tz
    where s.user_id = auth.uid() and s.status = 'completed'
    group by 1
  )
  select jsonb_build_object(
    'bestWeekXp', coalesce((select max(xp) from xp_weeks), 0),
    'bestWeekFocus', coalesce((select max(minutes) from focus_weeks), 0),
    'bestStreak', coalesce((select streak_best from public.wallets where user_id = auth.uid()), 0)
  );
$$;

revoke execute on function public.leaderboard_personal_bests from public, anon;
grant execute on function public.leaderboard_personal_bests to authenticated;
