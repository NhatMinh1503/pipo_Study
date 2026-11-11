-- Pets: slimes that hop around the garden, bought in the shop's own "Pets" section.
-- A new enum value cannot be used in the transaction that adds it, so the items come in
-- the next migration.
alter type public.shop_item_kind add value if not exists 'pet';
