-- Pomodoro sessions are timed by the server: the start time is recorded here and
-- completion is only accepted once enough server time has passed.

-- Rewards for one completed focus session
create function public.pomodoro_reward_coins(p_minutes integer) returns integer
language sql immutable set search_path = '' as $$
  select greatest(1, p_minutes / 5);
$$;

-- Starts a focus session; any session still running is abandoned first.
create function public.start_pomodoro(p_planned_minutes integer default 25)
returns public.pomodoro_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.pomodoro_sessions;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  update public.pomodoro_sessions
  set status = 'abandoned', ended_at = now()
  where user_id = v_user_id and status = 'running';

  insert into public.pomodoro_sessions (user_id, planned_minutes)
  values (v_user_id, p_planned_minutes)
  returning * into v_session;

  return v_session;
end;
$$;

-- Completes a session if the planned time has elapsed (30 s grace for clock drift),
-- then pays coins and XP once. Returns the coins earned, or null if it was too early.
create function public.complete_pomodoro(p_session_id uuid)
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
    v_user_id, v_session.planned_minutes, v_coins, 'pomodoro_completed',
    'pomodoro:' || p_session_id::text,
    jsonb_build_object('sessionId', p_session_id, 'minutes', v_session.planned_minutes)
  );

  return v_coins;
end;
$$;

create function public.abandon_pomodoro(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.pomodoro_sessions
  set status = 'abandoned', ended_at = now()
  where id = p_session_id and user_id = auth.uid() and status = 'running';
end;
$$;

revoke execute on function public.pomodoro_reward_coins from public, anon;
revoke execute on function public.start_pomodoro, public.complete_pomodoro, public.abandon_pomodoro
  from public, anon;
grant execute on function public.start_pomodoro, public.complete_pomodoro, public.abandon_pomodoro
  to authenticated;
