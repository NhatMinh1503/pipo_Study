-- Forest-style garden: every completed focus session plants ONE whole tree (it grows from
-- sprout to mature on screen while the timer runs). A session left early plants nothing.
-- Replaces the "one tree grows over 4 sessions" rule of 20261107093456_garden_trees.

-- Trees still growing under the old rule count as grown
update public.garden_trees
set sessions = 4, matured_at = coalesce(matured_at, now())
where sessions < 4;

-- A completed session plants a mature tree of the species it was started with
create or replace function public.tend_garden(p_user_id uuid, p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.pomodoro_sessions;
  v_garden integer;
  v_plot integer;
  v_tree_id uuid;
begin
  -- One garden change at a time per learner
  perform 1 from public.wallets where user_id = p_user_id for update;

  select * into v_session from public.pomodoro_sessions where id = p_session_id;
  select o_garden, o_plot into v_garden, v_plot from public.next_garden_plot(p_user_id);
  insert into public.garden_trees
    (user_id, garden_index, plot_index, species, sessions, planted_at, matured_at)
  values (p_user_id, v_garden, v_plot, coalesce(v_session.species, 'pine'), 4,
    coalesce(v_session.started_at, now()), now())
  returning id into v_tree_id;

  update public.pomodoro_sessions set garden_tree_id = v_tree_id where id = p_session_id;
end;
$$;

-- Every session picks its own seed; locked species still need theirs
create or replace function public.start_pomodoro(
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
  v_species public.tree_species := coalesce(p_species, 'pine');
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not public.can_plant_species(v_user_id, v_species) then
    raise exception 'species locked' using errcode = '42501';
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

revoke execute on function public.tend_garden from public, anon, authenticated;
revoke execute on function public.start_pomodoro from public, anon;
grant execute on function public.start_pomodoro to authenticated;
