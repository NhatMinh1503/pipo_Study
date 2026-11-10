-- Garden items that the code already understands but the shop never sold
-- (garden-scene spec §3.2, §3.5; prices in design/game/registry.md):
--   seed-maple / seed-sakura  unlock those species (can_plant_species reads purchases)
--   deco-torii                a decoration placed on a slot
--   deco-bridge               sits across the pond (needs deco-pond to be visible)
--   deco-slime                hops along the path, takes no slot (replaces the planned cat)
insert into public.shop_items (id, kind, price, sort_order) values
  ('seed-maple', 'seed', 120, 9),
  ('seed-sakura', 'seed', 120, 10),
  ('deco-torii', 'decoration', 60, 11),
  ('deco-bridge', 'decoration', 50, 12),
  ('deco-slime', 'decoration', 90, 13)
on conflict (id) do nothing;

-- The slime, like the pond and the bridge, never takes a decoration slot. The planned cat
-- was never sold, so it no longer needs a special case.
create or replace function public.place_decoration(p_item_id text, p_garden_index integer, p_slot_index integer)
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
  if p_item_id in ('deco-pond', 'deco-slime', 'deco-bridge')
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
