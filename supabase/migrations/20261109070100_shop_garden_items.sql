-- Garden items that the code already understands but the shop never sold
-- (garden-scene spec §3.2, §3.5; prices in design/game/registry.md):
--   seed-maple / seed-sakura  unlock those species (can_plant_species reads purchases)
--   deco-torii                a decoration placed on a slot
--   deco-bridge               sits across the pond (needs deco-pond to be visible)
--   deco-cat                  walks the path, takes no slot
insert into public.shop_items (id, kind, price, sort_order) values
  ('seed-maple', 'seed', 120, 9),
  ('seed-sakura', 'seed', 120, 10),
  ('deco-torii', 'decoration', 60, 11),
  ('deco-bridge', 'decoration', 50, 12),
  ('deco-cat', 'decoration', 90, 13)
on conflict (id) do nothing;
