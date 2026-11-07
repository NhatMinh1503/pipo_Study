-- Level curve (xp-levels spec §4.3–4.4, task T2). The single source of truth for levels:
-- the app reads them through wallet_summaries and never recomputes the curve itself.
--
--   xp_to_next(L)  = 50 + 40 × (L − 1)        (level_base, level_step in the registry)
--   xp_to_reach(L) = 20L² − 10L − 10         (sum of xp_to_next for levels below L)
--   level          = 1 … 50, then one "Sao bền bỉ" star per 2 000 XP past Lv50

-- Total XP needed to reach a level (Lv1 = 0)
create function public.xp_to_reach(p_level integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select 50 * (greatest(p_level, 1) - 1) + 20 * (greatest(p_level, 1) - 1) * (greatest(p_level, 1) - 2);
$$;

-- Level for a total XP: starts from the closed form, then checks it with integers so a
-- floating-point rounding at a boundary can never give the wrong level
create function public.level_for_xp(p_xp integer)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_level integer;
begin
  if p_xp is null or p_xp < 50 then
    return 1;
  end if;
  v_level := floor((10 + sqrt(100 + 80 * (p_xp::numeric + 10))) / 40)::integer;
  while v_level > 1 and public.xp_to_reach(v_level) > p_xp loop
    v_level := v_level - 1;
  end loop;
  while v_level < 50 and public.xp_to_reach(v_level + 1) <= p_xp loop
    v_level := v_level + 1;
  end loop;
  return least(v_level, 50);
end;
$$;

-- Stars earned after the level cap
create function public.stars_for_xp(p_xp integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(p_xp, 0) >= public.xp_to_reach(50) then (p_xp - public.xp_to_reach(50)) / 2000
    else 0
  end;
$$;

-- Progress toward the next level (or the next star at the cap)
create function public.xp_into_level(p_xp integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when public.level_for_xp(p_xp) >= 50 then (p_xp - public.xp_to_reach(50)) % 2000
    else greatest(coalesce(p_xp, 0), 0) - public.xp_to_reach(public.level_for_xp(p_xp))
  end;
$$;

create function public.xp_to_next_level(p_xp integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when public.level_for_xp(p_xp) >= 50 then 2000
    else public.xp_to_reach(public.level_for_xp(p_xp) + 1) - public.xp_to_reach(public.level_for_xp(p_xp))
  end;
$$;

revoke execute on function public.xp_to_reach, public.level_for_xp, public.stars_for_xp,
  public.xp_into_level, public.xp_to_next_level from public, anon;
grant execute on function public.xp_to_reach, public.level_for_xp, public.stars_for_xp,
  public.xp_into_level, public.xp_to_next_level to authenticated, service_role;

-- The wallet view the app reads gains the derived level columns (new columns go last)
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
    public.xp_to_next_level(w.xp) as xp_to_next
  from public.wallets w;
