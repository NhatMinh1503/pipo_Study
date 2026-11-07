-- Effective streak: the single place that decides which streak is shown.
--
-- wallets.streak_current is only recalculated when the learner earns XP (wallet_apply),
-- so after missing days it still holds the old number until the next activity. A streak
-- is alive only if the last active day is today or yesterday in the learner's own time
-- zone (the same zone wallet_apply uses); otherwise it is shown as 0.
--
-- Taking a wallets row makes this a PostgREST computed column:
--   .from("wallets").select("effective_streak")
create function public.effective_streak(w public.wallets)
returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when w.last_active_date is not null
      and w.last_active_date >= (now() at time zone coalesce(
        (select p.timezone from public.profiles p where p.user_id = w.user_id), 'UTC'))::date - 1
    then w.streak_current
    else 0
  end;
$$;

revoke execute on function public.effective_streak from public, anon;
grant execute on function public.effective_streak to authenticated, service_role;

-- Leaderboard: the streak metric now uses the effective streak (other metrics unchanged)
create or replace function public.leaderboard(p_metric text, p_period text)
returns table (rank bigint, user_id uuid, display_name text, avatar_path text, value bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with since as (
    select case p_period when 'month' then now() - interval '30 days' else now() - interval '7 days' end as at
  ),
  scores as (
    select t.user_id, sum(t.xp_delta)::bigint as value
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
    group by s.user_id
  )
  select rank() over (order by s.value desc), s.user_id, p.display_name, p.avatar_path, s.value
  from scores s join public.profiles p on p.user_id = s.user_id
  where s.value > 0
  order by s.value desc, s.user_id
  limit 50;
$$;

-- What the app reads to display a wallet. It only exposes the effective streak, so no
-- screen can show the raw (possibly stale) streak_current by accident. security_invoker
-- keeps the wallets RLS: each learner only sees their own row.
create view public.wallet_summaries with (security_invoker = true) as
  select w.user_id, w.xp, w.coins, public.effective_streak(w) as effective_streak, w.streak_best
  from public.wallets w;

revoke all on public.wallet_summaries from anon, authenticated, service_role;
grant select on public.wallet_summaries to authenticated, service_role;
