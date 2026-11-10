-- Welcome event: every new account receives some shop items for free (Minh, 2026-11-10:
-- a koi pond and a stone lantern). Gifts live in a table so an event can start, end or
-- change without touching the sign-up trigger again.
create table public.welcome_gifts (
  item_id text primary key references public.shop_items on delete cascade,
  starts_at timestamptz not null default now(),
  -- null = runs until someone sets an end
  ends_at timestamptz,
  check (ends_at is null or ends_at > starts_at)
);

comment on table public.welcome_gifts is
  'Shop items given to every account created while the gift is active (welcome event).';

alter table public.welcome_gifts enable row level security;
-- Not visible to learners; only migrations and the service role manage the event
revoke all on public.welcome_gifts from anon, authenticated, service_role;
grant select, insert, update, delete on public.welcome_gifts to service_role;

insert into public.welcome_gifts (item_id, starts_at) values
  ('deco-pond', '2026-11-10 00:00:00+09'),
  ('deco-lantern', '2026-11-10 00:00:00+09');

create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id);
  insert into public.wallets (user_id) values (new.id);
  -- Welcome event: active gifts arrive as owned items, free of charge
  insert into public.purchases (user_id, item_id)
  select new.id, g.item_id
  from public.welcome_gifts g
  where g.starts_at <= now() and (g.ends_at is null or g.ends_at > now())
  on conflict do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
