-- Decorations placed by tile (garden-scene spec §3.5, task G7). Each owned decoration sits in
-- one of the 5 decoration slots of one of the learner's gardens, or stays in storage. The pond
-- is not placed on a slot (owning it turns the pond tiles into a pond with koi), and the cat
-- walks the path, so neither can be placed here.

create table public.garden_decorations (
  user_id uuid not null references auth.users on delete cascade,
  item_id text not null references public.shop_items on delete cascade,
  garden_index integer not null check (garden_index >= 1),
  slot_index integer not null check (slot_index between 0 and 4),
  created_at timestamptz not null default now(),
  primary key (user_id, item_id),
  constraint garden_decorations_slot_key unique (user_id, garden_index, slot_index)
);

revoke all on public.garden_decorations from anon, authenticated, service_role;
grant select on public.garden_decorations to authenticated;
grant select, insert, update, delete on public.garden_decorations to service_role;

alter table public.garden_decorations enable row level security;
create policy "garden_decorations: owner can read"
  on public.garden_decorations for select to authenticated
  using (user_id = (select auth.uid()));

-- Places (or moves) an owned decoration into a slot of one of the learner's gardens
create function public.place_decoration(p_item_id text, p_garden_index integer, p_slot_index integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_gardens integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.purchases where user_id = v_user_id and item_id = p_item_id) then
    raise exception 'item not owned' using errcode = '42501';
  end if;
  if p_item_id in ('deco-pond', 'deco-cat', 'deco-bridge')
    or not exists (select 1 from public.shop_items where id = p_item_id and kind = 'decoration') then
    raise exception 'item cannot be placed on a slot' using errcode = '22023';
  end if;
  if p_slot_index is null or p_slot_index < 0 or p_slot_index > 4 then
    raise exception 'no such slot' using errcode = '22023';
  end if;
  select greatest(1, coalesce(max(garden_index), 1)) into v_gardens
  from public.garden_trees where user_id = v_user_id;
  if p_garden_index is null or p_garden_index < 1 or p_garden_index > v_gardens then
    raise exception 'no such garden' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.garden_decorations
    where user_id = v_user_id and garden_index = p_garden_index and slot_index = p_slot_index
      and item_id <> p_item_id
  ) then
    raise exception 'slot taken' using errcode = '23505';
  end if;

  insert into public.garden_decorations (user_id, item_id, garden_index, slot_index)
  values (v_user_id, p_item_id, p_garden_index, p_slot_index)
  on conflict (user_id, item_id)
  do update set garden_index = excluded.garden_index, slot_index = excluded.slot_index;
end;
$$;

-- Puts a decoration back in storage
create function public.remove_decoration(p_item_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.garden_decorations where user_id = auth.uid() and item_id = p_item_id;
$$;

revoke execute on function public.place_decoration, public.remove_decoration from public, anon;
grant execute on function public.place_decoration, public.remove_decoration to authenticated;
