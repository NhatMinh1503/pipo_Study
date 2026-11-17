-- Battle: ghost mode, finisher rewards, draws (design/game/battle.md, audit §11).
--
-- Ghost mode: with nobody online, a learner in the waiting room can race a recorded run of
-- another learner on the same language. The recorded answers are replayed at their own pace;
-- the ghost's author never sees or joins this battle (no row in battle_players).
-- Rewards: every player who answers all sentences gets 3 Coins, the winner 2 more, for at most
-- 5 battles per local day (mirrors GAME.battle). Equal scores are a draw.

alter table public.battles
  add column ghost_battle_id uuid references public.battles on delete set null,
  add column ghost_user_id uuid references auth.users on delete set null;

-- Turns the caller's waiting room into a race against a recorded run. Returns the ghost's author.
create function public.start_ghost_battle(p_battle_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_battle public.battles;
  v_source record;
begin
  select * into v_battle from public.battles
  where id = p_battle_id and created_by = v_user_id
  for update;
  if not found then
    raise exception 'battle not found' using errcode = 'P0002';
  end if;
  if v_battle.status <> 'waiting' then
    raise exception 'battle is not waiting' using errcode = '22023';
  end if;

  -- A finished run by someone else, same language; same level first, then passages the caller
  -- has not played, then at random
  select b.id, b.level, b.sentences, p.user_id into v_source
  from public.battles b
  join public.battle_players p on p.battle_id = b.id
  where b.status = 'finished' and b.language = v_battle.language and b.ghost_battle_id is null
    and p.user_id <> v_user_id and p.answered = array_length(b.sentences, 1)
  order by
    (b.level = v_battle.level) desc,
    exists (
      select 1 from public.battles mine
      join public.battle_players me on me.battle_id = mine.id and me.user_id = v_user_id
      where mine.sentences[1] = b.sentences[1]
    ),
    random()
  limit 1;
  if not found then
    raise exception 'no recorded run yet' using errcode = 'P0002';
  end if;

  update public.battles
  set status = 'active', started_at = now(), level = v_source.level,
      sentences = v_source.sentences, ghost_battle_id = v_source.id, ghost_user_id = v_source.user_id
  where id = p_battle_id;
  update public.battle_players set last_seen_at = now()
  where battle_id = p_battle_id and user_id = v_user_id;
  return v_source.user_id;
end;
$$;

revoke execute on function public.start_ghost_battle from public, anon;
grant execute on function public.start_ghost_battle to authenticated;

-- The recorded answers of a ghost battle, as seconds from the recorded start. Only a player of
-- the ghost battle may read them; translations are not exposed.
create function public.ghost_timeline(p_battle_id uuid)
returns table (sentence_index integer, offset_seconds numeric, points integer)
language sql
stable
security definer
set search_path = ''
as $$
  select a.sentence_index, extract(epoch from a.created_at - src.started_at)::numeric, a.points
  from public.battles b
  join public.battles src on src.id = b.ghost_battle_id
  join public.battle_answers a on a.battle_id = src.id and a.user_id = b.ghost_user_id
  where b.id = p_battle_id and public.is_battle_player(p_battle_id)
  order by a.sentence_index;
$$;

revoke execute on function public.ghost_timeline from public, anon;
grant execute on function public.ghost_timeline to authenticated;

-- Pays the players of a finished battle who answered every sentence. Idempotent per player.
create function public.award_battle(p_battle_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_battle public.battles;
  v_player record;
  v_timezone text;
  v_today_count integer;
begin
  select * into v_battle from public.battles where id = p_battle_id;
  if not found or v_battle.status <> 'finished' then
    return;
  end if;

  for v_player in
    select p.user_id from public.battle_players p
    where p.battle_id = p_battle_id and p.answered = array_length(v_battle.sentences, 1)
  loop
    perform 1 from public.wallets where user_id = v_player.user_id for update;
    select coalesce((select timezone from public.profiles where user_id = v_player.user_id), 'UTC')
    into v_timezone;
    select count(*) into v_today_count from public.transactions
    where user_id = v_player.user_id and reason = 'battle_finished'
      and (created_at at time zone v_timezone)::date = (now() at time zone v_timezone)::date;
    if v_today_count < 5 then
      perform public.wallet_apply(
        v_player.user_id, 0,
        3 + case when v_battle.winner_id = v_player.user_id then 2 else 0 end,
        'battle_finished', 'battle:' || p_battle_id::text,
        jsonb_build_object('battleId', p_battle_id, 'won', v_battle.winner_id = v_player.user_id)
      );
    end if;
  end loop;
end;
$$;

revoke execute on function public.award_battle from public, anon, authenticated;
grant execute on function public.award_battle to service_role;

-- Leaving a ghost race abandons it (there is no opponent to hand the win to)
create or replace function public.leave_battle(p_battle_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_battle public.battles;
begin
  if not public.is_battle_player(p_battle_id) then
    raise exception 'not a player' using errcode = '42501';
  end if;
  select * into v_battle from public.battles where id = p_battle_id for update;
  if v_battle.status = 'waiting' then
    update public.battles set status = 'cancelled', finished_at = now() where id = p_battle_id;
  elsif v_battle.status = 'active' and v_battle.ghost_battle_id is not null then
    update public.battles set status = 'abandoned', finished_at = now() where id = p_battle_id;
  elsif v_battle.status = 'active' then
    update public.battles
    set status = 'finished', finished_at = now(),
        winner_id = (select user_id from public.battle_players where battle_id = p_battle_id and user_id <> v_user_id limit 1)
    where id = p_battle_id;
  end if;
end;
$$;

revoke execute on function public.leave_battle from public, anon;
grant execute on function public.leave_battle to authenticated;
