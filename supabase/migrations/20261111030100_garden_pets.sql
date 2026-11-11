-- Five more slime pets (prices from design/game/registry.md, [Đề xuất]). The first slime
-- keeps its id so learners who bought it still own it; it moves to the pet section.
-- Pets never take a decoration slot: place_decoration only accepts kind = 'decoration'.
update public.shop_items set kind = 'pet' where id = 'deco-slime';

insert into public.shop_items (id, kind, price, sort_order) values
  ('pet-slime-water', 'pet', 100, 14),
  ('pet-slime-moss', 'pet', 100, 15),
  ('pet-slime-sakura', 'pet', 140, 16),
  ('pet-slime-ember', 'pet', 160, 17),
  ('pet-slime-cloud', 'pet', 200, 18)
on conflict (id) do nothing;
