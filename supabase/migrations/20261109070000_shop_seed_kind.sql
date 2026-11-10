-- Seeds unlock locked tree species (garden-scene spec §3.2). They are a kind of their own so
-- they never show up as placeable decorations. Postgres cannot use a new enum value in the
-- transaction that adds it, so the catalog rows live in the next migration.
alter type public.shop_item_kind add value if not exists 'seed';
