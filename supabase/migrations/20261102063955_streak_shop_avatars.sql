-- S22 streaks, S23 shop + accent themes, S25 avatars.

-- ---------------------------------------------------------------------------
-- S22: wallet_apply also maintains the daily streak (in the user's time zone)
-- ---------------------------------------------------------------------------
create or replace function public.wallet_apply(
  p_user_id uuid,
  p_xp_delta integer,
  p_coins_delta integer,
  p_reason text,
  p_idempotency_key text,
  p_metadata jsonb default '{}'
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer;
  v_today date;
  v_last date;
begin
  -- Lock the wallet row so concurrent rewards cannot interleave
  select last_active_date into v_last from public.wallets where user_id = p_user_id for update;
  if not found then
    raise exception 'wallet not found' using errcode = 'P0002';
  end if;

  insert into public.transactions (user_id, xp_delta, coins_delta, reason, idempotency_key, metadata)
  values (p_user_id, p_xp_delta, p_coins_delta, p_reason, p_idempotency_key, p_metadata)
  on conflict (user_id, idempotency_key) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return false;
  end if;

  update public.wallets
  set xp = xp + p_xp_delta, coins = coins + p_coins_delta
  where user_id = p_user_id;

  -- Earning XP counts as studying today; spending does not
  if p_xp_delta > 0 then
    select (now() at time zone coalesce(
      (select timezone from public.profiles where user_id = p_user_id), 'UTC'))::date
    into v_today;

    update public.wallets
    set streak_current = case
          when v_last = v_today then streak_current
          when v_last = v_today - 1 then streak_current + 1
          else 1
        end,
        last_active_date = v_today
    where user_id = p_user_id;

    update public.wallets set streak_best = greatest(streak_best, streak_current)
    where user_id = p_user_id;
  end if;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- S23: shop catalog (server-side prices), purchases, accent theme
-- ---------------------------------------------------------------------------
create type public.shop_item_kind as enum ('theme', 'decoration', 'topic_pack');

create table public.shop_items (
  id text primary key,
  kind public.shop_item_kind not null,
  price integer not null check (price > 0),
  sort_order integer not null default 0
);

insert into public.shop_items (id, kind, price, sort_order) values
  ('theme-sakura', 'theme', 60, 1),
  ('theme-matcha', 'theme', 60, 2),
  ('theme-ocean', 'theme', 60, 3),
  ('deco-pond', 'decoration', 40, 4),
  ('deco-lantern', 'decoration', 30, 5),
  ('deco-bench', 'decoration', 25, 6),
  ('topics-anime', 'topic_pack', 80, 7),
  ('topics-business', 'topic_pack', 80, 8);

create table public.purchases (
  user_id uuid not null references auth.users on delete cascade,
  item_id text not null references public.shop_items on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.profiles add column accent text references public.shop_items on delete set null;
alter table public.profiles add column avatar_path text;

revoke all on public.shop_items, public.purchases from anon, authenticated, service_role;
grant select on public.shop_items, public.purchases to authenticated;
grant select, insert, update, delete on public.shop_items, public.purchases to service_role;

alter table public.shop_items enable row level security;
alter table public.purchases enable row level security;

create policy "shop_items: readable by signed-in users"
  on public.shop_items for select to authenticated using (true);
create policy "purchases: owner can read"
  on public.purchases for select to authenticated
  using (user_id = (select auth.uid()));

-- The accent may only point at a theme the user owns
create function public.profile_accent_is_owned() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.accent is not null and not exists (
    select 1 from public.purchases p join public.shop_items i on i.id = p.item_id
    where p.user_id = new.user_id and p.item_id = new.accent and i.kind = 'theme'
  ) then
    raise exception 'theme not owned' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_accent_is_owned
  before insert or update of accent on public.profiles
  for each row execute function public.profile_accent_is_owned();

-- Buys an item with coins: price comes from the catalog, never from the client
create function public.buy_item(p_item_id text) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_price integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select price into v_price from public.shop_items where id = p_item_id;
  if not found then
    raise exception 'unknown item' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.purchases where user_id = v_user_id and item_id = p_item_id) then
    raise exception 'already owned' using errcode = '23505';
  end if;

  -- Raises 23514 (check violation) when the balance would go negative
  perform public.wallet_apply(v_user_id, 0, -v_price, 'shop_purchase', 'shop:' || p_item_id);
  insert into public.purchases (user_id, item_id) values (v_user_id, p_item_id);
  return v_price;
end;
$$;

revoke execute on function public.buy_item from public, anon;
grant execute on function public.buy_item to authenticated;
revoke execute on function public.profile_accent_is_owned from public, anon, authenticated;

-- Profile fields users may edit themselves (column-level, like lessons/sentences)
revoke update on public.profiles from authenticated;
grant update (display_name, learning_language, level, display_language, timezone, onboarded_at, accent, avatar_path)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- S25: avatars in Storage — public read, owners write only in their own folder
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars: owner can upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: owner can replace"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: owner can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
