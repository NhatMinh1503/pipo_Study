-- Battle presence measured by the server: each player's open battle room sends a heartbeat
-- (about every 15 s). Absence is judged from that heartbeat, never from answer times, so a
-- slow but present player is never forfeited.
--
-- Timeouts (kept here so a client cannot send its own value; lib/battle/scoring.ts mirrors
-- the first two for client-side timers):
--   90 seconds  an absent opponent in an active battle can be claimed as a forfeit
--   45 seconds  a waiting room whose creator stopped sending heartbeats is no longer joinable
--   15 minutes  an active battle where both players are absent is closed with no winner

alter table public.battle_players add column last_seen_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- Cleanup: close stale rooms. Called on demand (opening a room, the battle history,
-- and inside join_battle) instead of a scheduled job.
-- ---------------------------------------------------------------------------
create function public.close_abandoned_battles()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_waiting integer;
  v_active integer;
begin
  -- A waiting room nobody keeps open any more: cancel it so nobody is matched into it
  update public.battles b
  set status = 'cancelled', finished_at = now()
  where b.status = 'waiting'
    and not exists (
      select 1 from public.battle_players p
      where p.battle_id = b.id and p.last_seen_at >= now() - interval '45 seconds'
    );
  get diagnostics v_waiting = row_count;

  -- Both players gone for a long time: abandoned, nobody wins
  update public.battles b
  set status = 'abandoned', finished_at = now(), winner_id = null
  where b.status = 'active'
    and not exists (
      select 1 from public.battle_players p
      where p.battle_id = b.id and p.last_seen_at >= now() - interval '15 minutes'
    );
  get diagnostics v_active = row_count;

  return v_waiting + v_active;
end;
$$;

-- ---------------------------------------------------------------------------
-- Heartbeat: "I still have this battle open".
-- ---------------------------------------------------------------------------
create function public.battle_heartbeat(p_battle_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  update public.battle_players p
  set last_seen_at = now()
  from public.battles b
  where b.id = p.battle_id
    and p.battle_id = p_battle_id
    and p.user_id = auth.uid()
    and b.status in ('waiting', 'active');
end;
$$;

-- ---------------------------------------------------------------------------
-- Claim a win when the opponent has been absent too long. Returns true if the battle
-- was closed in the caller's favour; false when the opponent is still present or
-- has already finished their answers.
-- ---------------------------------------------------------------------------
create function public.claim_battle_timeout(p_battle_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_status public.battle_status;
  v_opponent public.battle_players;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not public.is_battle_player(p_battle_id) then
    raise exception 'not a player' using errcode = '42501';
  end if;

  select status into v_status from public.battles where id = p_battle_id for update;

  -- Asking also proves the caller is present
  update public.battle_players set last_seen_at = now()
  where battle_id = p_battle_id and user_id = v_user_id;

  if v_status <> 'active' then
    return false;
  end if;

  select * into v_opponent from public.battle_players
  where battle_id = p_battle_id and user_id <> v_user_id;
  if not found
    or v_opponent.finished_at is not null
    or v_opponent.last_seen_at >= now() - interval '90 seconds' then
    return false;
  end if;

  update public.battles
  set status = 'finished', finished_at = now(), winner_id = v_user_id
  where id = p_battle_id;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- join_battle: cleans up first and never matches into a room whose creator has left.
-- ---------------------------------------------------------------------------
create or replace function public.join_battle(
  p_language public.learning_language,
  p_level public.proficiency_level,
  p_sentences text[]
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_battle_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  perform public.close_abandoned_battles();

  -- Already waiting (and still fresh after the cleanup)? Reuse that battle
  select b.id into v_battle_id from public.battles b
  where b.created_by = v_user_id and b.status = 'waiting' limit 1;
  if found then
    update public.battle_players set last_seen_at = now()
    where battle_id = v_battle_id and user_id = v_user_id;
    return v_battle_id;
  end if;

  select b.id into v_battle_id from public.battles b
  where b.status = 'waiting' and b.language = p_language and b.created_by <> v_user_id
    and exists (
      select 1 from public.battle_players p
      where p.battle_id = b.id and p.user_id = b.created_by
        and p.last_seen_at >= now() - interval '45 seconds'
    )
  order by b.created_at
  limit 1
  for update skip locked;
  if found then
    insert into public.battle_players (battle_id, user_id) values (v_battle_id, v_user_id);
    update public.battles set status = 'active', started_at = now() where id = v_battle_id;
    -- The game clock starts now for both players
    update public.battle_players set last_seen_at = now() where battle_id = v_battle_id;
    return v_battle_id;
  end if;

  insert into public.battles (language, level, sentences, created_by)
  values (p_language, p_level, p_sentences, v_user_id)
  returning id into v_battle_id;
  insert into public.battle_players (battle_id, user_id) values (v_battle_id, v_user_id);
  return v_battle_id;
end;
$$;

revoke execute on function public.close_abandoned_battles from public, anon;
revoke execute on function public.battle_heartbeat from public, anon;
revoke execute on function public.claim_battle_timeout from public, anon;
grant execute on function public.close_abandoned_battles to authenticated;
grant execute on function public.battle_heartbeat to authenticated;
grant execute on function public.claim_battle_timeout to authenticated;
