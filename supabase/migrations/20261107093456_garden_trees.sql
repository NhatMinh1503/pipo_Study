-- Garden trees grow with completed Pomodoro sessions (garden-scene spec §3.1–3.4, task G2).
--
--   session 1 → sprout, 2–3 → sapling, 4 → mature (sessions stops at 4)
--   one growing tree per learner; the session after it matures plants a new tree
--   31 plots per garden, filled in reading order; a full garden opens garden 2, 3, …
--   pine and bamboo are free; maple and sakura need seed-maple / seed-sakura
-- Old completed sessions become one mature "legacy" tree each, so nobody loses a tree.

create type public.tree_species as enum ('pine', 'bamboo', 'maple', 'sakura');

create table public.garden_trees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  garden_index integer not null check (garden_index >= 1),
  plot_index integer not null check (plot_index between 0 and 30),
  species public.tree_species not null,
  sessions integer not null default 1 check (sessions between 1 and 4),
  planted_at timestamptz not null default now(),
  matured_at timestamptz,
  legacy boolean not null default false,
  created_at timestamptz not null default now(),
  constraint garden_trees_plot_key unique (user_id, garden_index, plot_index)
);

-- At most one growing (not yet mature) tree per learner
create unique index garden_trees_one_growing_idx on public.garden_trees (user_id) where sessions < 4;

revoke all on public.garden_trees from anon, authenticated, service_role;
grant select on public.garden_trees to authenticated;
grant select, insert, update, delete on public.garden_trees to service_role;

alter table public.garden_trees enable row level security;
create policy "garden_trees: owner can read"
  on public.garden_trees for select to authenticated
  using (user_id = (select auth.uid()));

alter table public.pomodoro_sessions
  add column species public.tree_species,
  add column garden_tree_id uuid references public.garden_trees on delete set null;

-- Whether the learner may plant this species (free, or they own its seed)
create function public.can_plant_species(p_user_id uuid, p_species public.tree_species)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_species in ('pine', 'bamboo')
    or exists (
      select 1 from public.purchases
      where user_id = p_user_id and item_id = 'seed-' || p_species::text
    );
$$;

-- Next free plot: the lowest empty plot of the newest garden, or plot 0 of a new garden
create function public.next_garden_plot(p_user_id uuid, out o_garden integer, out o_plot integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  select coalesce(max(garden_index), 1) into o_garden from public.garden_trees where user_id = p_user_id;
  select count(*) into v_count from public.garden_trees where user_id = p_user_id and garden_index = o_garden;
  if v_count >= 31 then
    o_garden := o_garden + 1;
    o_plot := 0;
    return;
  end if;
  select min(p) into o_plot
  from generate_series(0, 30) as p
  where not exists (
    select 1 from public.garden_trees
    where user_id = p_user_id and garden_index = o_garden and plot_index = p
  );
end;
$$;

-- Tends the growing tree with a completed session, or plants a new one
create function public.tend_garden(p_user_id uuid, p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tree public.garden_trees;
  v_species public.tree_species;
  v_garden integer;
  v_plot integer;
begin
  -- One garden change at a time per learner
  perform 1 from public.wallets where user_id = p_user_id for update;

  select * into v_tree from public.garden_trees
  where user_id = p_user_id and sessions < 4
  for update;

  if found then
    update public.garden_trees
    set sessions = sessions + 1,
        matured_at = case when sessions + 1 >= 4 then now() else null end
    where id = v_tree.id;
  else
    select coalesce(species, 'pine') into v_species from public.pomodoro_sessions where id = p_session_id;
    select o_garden, o_plot into v_garden, v_plot from public.next_garden_plot(p_user_id);
    insert into public.garden_trees (user_id, garden_index, plot_index, species)
    values (p_user_id, v_garden, v_plot, v_species)
    returning * into v_tree;
  end if;

  update public.pomodoro_sessions
  set garden_tree_id = v_tree.id, species = v_tree.species
  where id = p_session_id;
end;
$$;

-- Starts a focus session. The species matters only when the session will plant a new tree;
-- while a tree is growing, the session tends that tree.
drop function public.start_pomodoro(integer);

create function public.start_pomodoro(
  p_planned_minutes integer default 25,
  p_species public.tree_species default null
) returns public.pomodoro_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.pomodoro_sessions;
  v_growing public.tree_species;
  v_species public.tree_species;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select species into v_growing from public.garden_trees where user_id = v_user_id and sessions < 4;
  if found then
    v_species := v_growing;
  else
    v_species := coalesce(p_species, 'pine');
    if not public.can_plant_species(v_user_id, v_species) then
      raise exception 'species locked' using errcode = '42501';
    end if;
  end if;

  update public.pomodoro_sessions
  set status = 'abandoned', ended_at = now()
  where user_id = v_user_id and status = 'running';

  insert into public.pomodoro_sessions (user_id, planned_minutes, species)
  values (v_user_id, p_planned_minutes, v_species)
  returning * into v_session;

  return v_session;
end;
$$;

-- Completes a session (unchanged rules: server time, coins, no XP) and tends the garden
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

  perform public.tend_garden(v_user_id, p_session_id);
  return v_coins;
end;
$$;

-- Turns old completed sessions (no tree yet) into mature legacy trees, oldest first,
-- species in rotation pine → bamboo → maple → sakura, 31 per garden. Returns trees added.
create function public.backfill_garden_trees(p_user_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_added integer;
begin
  with pending as (
    select s.id as session_id, s.user_id, s.ended_at,
      (select count(*) from public.garden_trees t where t.user_id = s.user_id)
        + row_number() over (partition by s.user_id order by s.ended_at, s.id) - 1 as n
    from public.pomodoro_sessions s
    where s.status = 'completed' and s.garden_tree_id is null
      and (p_user_id is null or s.user_id = p_user_id)
  ),
  planted as (
    insert into public.garden_trees
      (user_id, garden_index, plot_index, species, sessions, planted_at, matured_at, legacy)
    select user_id, (n / 31)::integer + 1, (n % 31)::integer,
      (array['pine', 'bamboo', 'maple', 'sakura']::public.tree_species[])[(n % 4)::integer + 1],
      4, coalesce(ended_at, now()), coalesce(ended_at, now()), true
    from pending
    returning id, user_id, garden_index, plot_index
  )
  update public.pomodoro_sessions s
  set garden_tree_id = planted.id
  from pending join planted
    on planted.user_id = pending.user_id
   and planted.garden_index = (pending.n / 31)::integer + 1
   and planted.plot_index = (pending.n % 31)::integer
  where s.id = pending.session_id;
  get diagnostics v_added = row_count;
  return v_added;
end;
$$;

revoke execute on function public.can_plant_species, public.next_garden_plot, public.tend_garden,
  public.backfill_garden_trees from public, anon, authenticated;
grant execute on function public.backfill_garden_trees to service_role;
revoke execute on function public.start_pomodoro from public, anon;
grant execute on function public.start_pomodoro to authenticated;

-- Existing learners keep every tree they grew
select public.backfill_garden_trees();
