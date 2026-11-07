-- The level-up moment (xp-levels spec §3.9, task T6).
--
-- When an XP gain crosses a level boundary (or, past Lv50, a "Sao bền bỉ" star boundary),
-- wallet_apply records one level_ups row in the same transaction. The app shows unseen rows
-- once and marks them seen. Nothing is backfilled: existing XP creates no event.

create table public.level_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('level', 'star')),
  from_level integer not null check (from_level between 1 and 50),
  to_level integer not null check (to_level between 1 and 50),
  from_stars integer not null check (from_stars >= 0),
  to_stars integer not null check (to_stars >= 0),
  xp_total integer not null check (xp_total >= 0),
  xp_into_level integer not null check (xp_into_level >= 0),
  xp_to_next integer not null check (xp_to_next > 0),
  -- The transaction reason that crossed the boundary (sentence_passed, lesson_bonus, ...)
  source_reason text not null,
  -- The reward key of that transaction, for tracing
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);

create index level_ups_user_id_unseen_idx on public.level_ups (user_id, created_at) where seen_at is null;

revoke all on public.level_ups from anon, authenticated, service_role;
grant select on public.level_ups to authenticated;
grant select on public.level_ups to service_role;

alter table public.level_ups enable row level security;
create policy "level_ups: owner can read"
  on public.level_ups for select to authenticated
  using (user_id = (select auth.uid()));

-- Marks the caller's own events as shown. Returns how many were newly marked.
create function public.mark_level_ups_seen(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  update public.level_ups
  set seen_at = now()
  where id = any (p_ids) and user_id = auth.uid() and seen_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.mark_level_ups_seen from public, anon;
grant execute on function public.mark_level_ups_seen to authenticated;

-- wallet_apply: ledger and balances (T3) + level-up detection
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
  v_old_xp integer;
  v_new_xp integer;
  v_old_level integer;
  v_new_level integer;
  v_old_stars integer;
  v_new_stars integer;
begin
  -- Lock the wallet row so concurrent rewards cannot interleave
  select xp into v_old_xp from public.wallets where user_id = p_user_id for update;
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
  where user_id = p_user_id
  returning xp into v_new_xp;

  if p_xp_delta > 0 then
    v_old_level := public.level_for_xp(v_old_xp);
    v_new_level := public.level_for_xp(v_new_xp);
    v_old_stars := public.stars_for_xp(v_old_xp);
    v_new_stars := public.stars_for_xp(v_new_xp);
    if v_new_level > v_old_level or v_new_stars > v_old_stars then
      insert into public.level_ups (
        user_id, kind, from_level, to_level, from_stars, to_stars,
        xp_total, xp_into_level, xp_to_next, source_reason, idempotency_key
      ) values (
        p_user_id,
        case when v_new_level > v_old_level then 'level' else 'star' end,
        v_old_level, v_new_level, v_old_stars, v_new_stars,
        v_new_xp, public.xp_into_level(v_new_xp), public.xp_to_next_level(v_new_xp),
        p_reason, p_idempotency_key
      );
    end if;
  end if;

  return true;
end;
$$;
