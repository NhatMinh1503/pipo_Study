-- Per-sentence XP and completion rewards with the daily cap for manual lessons
-- (xp-levels spec §3.1, §3.2, §3.6, task T4).
--
-- The server computes the points (lib/scoring.ts, from stored attempts) and calls these
-- functions; the database decides the source of the lesson, applies the cap and makes every
-- reward idempotent. reward_claims records each decision, including 0 XP results, so a
-- sentence or lesson is never paid twice, not even on another day after the cap resets.

create table public.reward_claims (
  user_id uuid not null references auth.users on delete cascade,
  -- 'sentence:<id>' or 'lesson:<id>' (same keys as the wallet ledger)
  claim_key text not null check (char_length(claim_key) between 1 and 100),
  kind text not null check (kind in ('sentence', 'lesson')),
  lesson_id uuid references public.lessons on delete set null,
  source public.lesson_source not null,
  -- Before the cap: sentence points or completion bonus
  points integer not null default 0 check (points >= 0),
  xp integer not null default 0 check (xp >= 0),
  coins integer not null default 0 check (coins >= 0),
  capped boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, claim_key)
);

create index reward_claims_user_id_created_at_idx on public.reward_claims (user_id, created_at);
create index reward_claims_lesson_id_idx on public.reward_claims (lesson_id);

revoke all on public.reward_claims from anon, authenticated, service_role;
grant select on public.reward_claims to authenticated;
grant select, insert, delete on public.reward_claims to service_role;

alter table public.reward_claims enable row level security;
create policy "reward_claims: owner can read"
  on public.reward_claims for select to authenticated
  using (user_id = (select auth.uid()));

-- XP already earned today (learner's local day) from their own manual lessons
create function public.manual_xp_today(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(c.xp), 0)::integer
  from public.reward_claims c
  where c.user_id = p_user_id
    and c.source = 'manual'
    and (c.created_at at time zone coalesce(
          (select p.timezone from public.profiles p where p.user_id = p_user_id), 'UTC'))::date
      = (now() at time zone coalesce(
          (select p.timezone from public.profiles p where p.user_id = p_user_id), 'UTC'))::date;
$$;

revoke execute on function public.manual_xp_today from public, anon, authenticated;
grant execute on function public.manual_xp_today to service_role;

-- Pays a sentence the first time it is unlocked. Returns {points, awarded, capped}.
-- The unlock always counts as study activity, even when the cap leaves 0 XP.
create function public.award_sentence_xp(p_user_id uuid, p_sentence_id uuid, p_points integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claim public.reward_claims;
  v_lesson_id uuid;
  v_source public.lesson_source;
  v_awarded integer;
  v_key text := 'sentence:' || p_sentence_id::text;
begin
  if p_points is null or p_points < 0 or p_points > 10 then
    raise exception 'points out of range' using errcode = '22023';
  end if;

  -- One reward at a time per learner, so two sentences cannot both use the last of the cap
  perform 1 from public.wallets where user_id = p_user_id for update;
  if not found then
    raise exception 'wallet not found' using errcode = 'P0002';
  end if;

  select * into v_claim from public.reward_claims where user_id = p_user_id and claim_key = v_key;
  if found then
    return jsonb_build_object('points', v_claim.points, 'awarded', v_claim.xp, 'capped', v_claim.capped);
  end if;

  select l.id, l.source into v_lesson_id, v_source
  from public.sentences s join public.lessons l on l.id = s.lesson_id
  where s.id = p_sentence_id and s.user_id = p_user_id and l.user_id = p_user_id;
  if not found then
    raise exception 'sentence not found' using errcode = 'P0002';
  end if;

  v_awarded := p_points;
  if v_source = 'manual' then
    v_awarded := least(p_points, greatest(0, 300 - public.manual_xp_today(p_user_id)));
  end if;

  insert into public.reward_claims (user_id, claim_key, kind, lesson_id, source, points, xp, capped)
  values (p_user_id, v_key, 'sentence', v_lesson_id, v_source, p_points, v_awarded, v_awarded < p_points);

  if v_awarded > 0 then
    perform public.wallet_apply(
      p_user_id, v_awarded, 0, 'sentence_passed', v_key,
      jsonb_build_object('sentenceId', p_sentence_id, 'lessonId', v_lesson_id, 'source', v_source,
        'points', p_points, 'awarded', v_awarded, 'capped', v_awarded < p_points)
    );
  end if;

  perform public.record_study_activity(p_user_id);

  return jsonb_build_object('points', p_points, 'awarded', v_awarded, 'capped', v_awarded < p_points);
end;
$$;

-- Pays a finished lesson once: completion bonus XP + coins, as computed by the server
-- (0 for lessons under 3 sentences). For a manual lesson the bonus counts toward the cap,
-- and when the bonus cannot be paid in full the lesson pays no coins either (Q-A).
-- Returns {xp, coins, capped, legacy}; legacy = rewarded by the old rules before this change.
create function public.award_lesson_completion(
  p_user_id uuid,
  p_lesson_id uuid,
  p_bonus_xp integer,
  p_coins integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claim public.reward_claims;
  v_legacy public.transactions;
  v_source public.lesson_source;
  v_xp integer;
  v_coins integer;
  v_capped boolean := false;
  v_key text := 'lesson:' || p_lesson_id::text;
begin
  if p_bonus_xp is null or p_bonus_xp < 0 or p_bonus_xp > 100
    or p_coins is null or p_coins < 0 or p_coins > 10000 then
    raise exception 'reward out of range' using errcode = '22023';
  end if;

  perform 1 from public.wallets where user_id = p_user_id for update;
  if not found then
    raise exception 'wallet not found' using errcode = 'P0002';
  end if;

  select * into v_claim from public.reward_claims where user_id = p_user_id and claim_key = v_key;
  if found then
    return jsonb_build_object('xp', v_claim.xp, 'coins', v_claim.coins, 'capped', v_claim.capped, 'legacy', false);
  end if;

  -- Paid by the old whole-lesson rule (same key): report it, never pay again
  select * into v_legacy from public.transactions where user_id = p_user_id and idempotency_key = v_key;
  if found then
    return jsonb_build_object('xp', v_legacy.xp_delta, 'coins', v_legacy.coins_delta, 'capped', false, 'legacy', true);
  end if;

  select source into v_source from public.lessons where id = p_lesson_id and user_id = p_user_id;
  if not found then
    raise exception 'lesson not found' using errcode = 'P0002';
  end if;

  v_xp := p_bonus_xp;
  v_coins := p_coins;
  if v_source = 'manual' and p_bonus_xp > 0 then
    v_xp := least(p_bonus_xp, greatest(0, 300 - public.manual_xp_today(p_user_id)));
    if v_xp < p_bonus_xp then
      v_capped := true;
      v_coins := 0;
    end if;
  end if;

  insert into public.reward_claims (user_id, claim_key, kind, lesson_id, source, points, xp, coins, capped)
  values (p_user_id, v_key, 'lesson', p_lesson_id, v_source, p_bonus_xp, v_xp, v_coins, v_capped);

  if v_xp > 0 or v_coins > 0 then
    perform public.wallet_apply(
      p_user_id, v_xp, v_coins, 'lesson_bonus', v_key,
      jsonb_build_object('lessonId', p_lesson_id, 'source', v_source, 'bonus', p_bonus_xp,
        'awarded', v_xp, 'coins', v_coins, 'capped', v_capped)
    );
  end if;

  return jsonb_build_object('xp', v_xp, 'coins', v_coins, 'capped', v_capped, 'legacy', false);
end;
$$;

revoke execute on function public.award_sentence_xp from public, anon, authenticated;
revoke execute on function public.award_lesson_completion from public, anon, authenticated;
grant execute on function public.award_sentence_xp to service_role;
grant execute on function public.award_lesson_completion to service_role;
