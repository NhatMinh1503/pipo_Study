-- Streak follows study activity, not XP (xp-levels spec §3.5 and §3.7, task T3).
--
-- Study activity = an unlocked sentence (even at 0 XP because of the daily cap) or a
-- rewarded review of a due card. Pomodoro, bonuses, the shop, battles and the community do
-- not count. The server calls record_study_activity for those two events; wallet_apply no
-- longer touches the streak, and Pomodoro no longer pays XP.

-- Marks "studied today" for the learner, in their own time zone
create function public.record_study_activity(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last date;
  v_today date;
begin
  select last_active_date into v_last from public.wallets where user_id = p_user_id for update;
  if not found then
    raise exception 'wallet not found' using errcode = 'P0002';
  end if;

  select (now() at time zone coalesce(
    (select timezone from public.profiles where user_id = p_user_id), 'UTC'))::date
  into v_today;

  update public.wallets
  set streak_current = case
        when v_last = v_today then streak_current
        when v_last = v_today - 1 then streak_current + 1
        else 1
      end,
      last_active_date = v_today
  where user_id = p_user_id;

  update public.wallets set streak_best = greatest(streak_best, streak_current)
  where user_id = p_user_id;
end;
$$;

revoke execute on function public.record_study_activity from public, anon, authenticated;
grant execute on function public.record_study_activity to service_role;

-- wallet_apply: the ledger and balances only (streak moved to record_study_activity)
create or replace function public.wallet_apply(
  p_user_id uuid,
  p_xp_delta integer,
  p_coins_delta integer,
  p_reason text,
  p_idempotency_key text,
  p_metadata jsonb default '{}'
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer;
begin
  -- Lock the wallet row so concurrent rewards cannot interleave
  perform 1 from public.wallets where user_id = p_user_id for update;
  if not found then
    raise exception 'wallet not found' using errcode = 'P0002';
  end if;

  insert into public.transactions (user_id, xp_delta, coins_delta, reason, idempotency_key, metadata)
  values (p_user_id, p_xp_delta, p_coins_delta, p_reason, p_idempotency_key, p_metadata)
  on conflict (user_id, idempotency_key) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return false;
  end if;

  -- CHECK constraints reject a negative balance and roll everything back
  update public.wallets
  set xp = xp + p_xp_delta, coins = coins + p_coins_delta
  where user_id = p_user_id;
  return true;
end;
$$;

-- Pomodoro: coins and a tree, no XP (and therefore no study activity)
create or replace function public.complete_pomodoro(p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.pomodoro_sessions;
  v_coins integer;
begin
  select * into v_session
  from public.pomodoro_sessions
  where id = p_session_id and user_id = v_user_id
  for update;
  if not found then
    raise exception 'session not found' using errcode = 'P0002';
  end if;
  if v_session.status <> 'running' then
    raise exception 'session is not running' using errcode = '22023';
  end if;
  if now() < v_session.started_at + make_interval(mins => v_session.planned_minutes) - interval '30 seconds' then
    return null;
  end if;

  update public.pomodoro_sessions
  set status = 'completed', ended_at = now()
  where id = p_session_id;

  v_coins := public.pomodoro_reward_coins(v_session.planned_minutes);
  perform public.wallet_apply(
    v_user_id, 0, v_coins, 'pomodoro_completed',
    'pomodoro:' || p_session_id::text,
    jsonb_build_object('sessionId', p_session_id, 'minutes', v_session.planned_minutes)
  );
  return v_coins;
end;
$$;
