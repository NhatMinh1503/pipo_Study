-- 3D garden (garden-scene spec §3.4): the garden is now a clay floating island with 26
-- plots instead of the 31-tile isometric map. Trees are renumbered per learner in the order
-- they were placed, 26 per garden: garden 1 keeps plots 0–25 as they were, the trees that
-- stood on plots 26–30 move to the start of garden 2, and later gardens shift along. No tree
-- is lost and every tree keeps its species, growth and history.

alter table public.garden_trees drop constraint garden_trees_plot_key;
alter table public.garden_trees drop constraint garden_trees_plot_index_check;

with ordered as (
  select id,
    row_number() over (partition by user_id order by garden_index, plot_index, planted_at, id) - 1 as n
  from public.garden_trees
)
update public.garden_trees t
set garden_index = (o.n / 26)::integer + 1,
    plot_index = (o.n % 26)::integer
from ordered o
where o.id = t.id
  and (t.garden_index, t.plot_index) is distinct from ((o.n / 26)::integer + 1, (o.n % 26)::integer);

alter table public.garden_trees
  add constraint garden_trees_plot_index_check check (plot_index between 0 and 25),
  add constraint garden_trees_plot_key unique (user_id, garden_index, plot_index);

-- Next free plot: the lowest empty plot of the newest garden, or plot 0 of a new garden
create or replace function public.next_garden_plot(p_user_id uuid, out o_garden integer, out o_plot integer)
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
  if v_count >= 26 then
    o_garden := o_garden + 1;
    o_plot := 0;
    return;
  end if;
  select min(p) into o_plot
  from generate_series(0, 25) as p
  where not exists (
    select 1 from public.garden_trees
    where user_id = p_user_id and garden_index = o_garden and plot_index = p
  );
end;
$$;

-- Turns old completed sessions (no tree yet) into mature legacy trees, oldest first,
-- species in rotation pine → bamboo → maple → sakura, 26 per garden. Returns trees added.
create or replace function public.backfill_garden_trees(p_user_id uuid default null)
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
    select user_id, (n / 26)::integer + 1, (n % 26)::integer,
      (array['pine', 'bamboo', 'maple', 'sakura']::public.tree_species[])[(n % 4)::integer + 1],
      4, coalesce(ended_at, now()), coalesce(ended_at, now()), true
    from pending
    returning id, user_id, garden_index, plot_index
  )
  update public.pomodoro_sessions s
  set garden_tree_id = planted.id
  from pending join planted
    on planted.user_id = pending.user_id
   and planted.garden_index = (pending.n / 26)::integer + 1
   and planted.plot_index = (pending.n % 26)::integer
  where s.id = pending.session_id;
  get diagnostics v_added = row_count;
  return v_added;
end;
$$;

-- create or replace keeps the old grants; restate them so this file reads on its own
revoke execute on function public.next_garden_plot, public.backfill_garden_trees
  from public, anon, authenticated;
grant execute on function public.backfill_garden_trees to service_role;
