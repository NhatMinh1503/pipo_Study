-- Core user data: shared enums, profiles, wallets, and the signup trigger.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.learning_language as enum ('ja', 'en');
create type public.display_language as enum ('vi', 'en', 'ja');
create type public.proficiency_level as enum (
  'N5', 'N4', 'N3', 'N2', 'N1',
  'A1', 'A2', 'B1', 'B2', 'C1', 'C2'
);

-- JLPT levels belong to Japanese, CEFR levels to English
create function public.level_matches_language(
  lang public.learning_language,
  lvl public.proficiency_level
) returns boolean
language sql
immutable
set search_path = ''
as $$
  select case lang
    when 'ja' then lvl in ('N5', 'N4', 'N3', 'N2', 'N1')
    when 'en' then lvl in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')
  end;
$$;

-- CHECK constraints run with the inserting role's privileges
revoke execute on function public.level_matches_language from public, anon;
grant execute on function public.level_matches_language to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per user, created by trigger on signup
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text check (char_length(display_name) between 1 and 50),
  learning_language public.learning_language,
  level public.proficiency_level,
  display_language public.display_language not null default 'vi',
  timezone text not null default 'Asia/Tokyo',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_level_matches_language check (
    level is null or learning_language is null
    or public.level_matches_language(learning_language, level)
  ),
  -- Onboarding is only complete once both choices are made
  constraint profiles_onboarding_complete check (
    onboarded_at is null or (learning_language is not null and level is not null)
  )
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

revoke all on public.profiles from anon, authenticated, service_role;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "profiles: owner can read"
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));

create policy "profiles: owner can update"
  on public.profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- wallets: balances that affect rewards; clients read only
-- ---------------------------------------------------------------------------
create table public.wallets (
  user_id uuid primary key references auth.users on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  coins integer not null default 0 check (coins >= 0),
  streak_current integer not null default 0 check (streak_current >= 0),
  streak_best integer not null default 0 check (streak_best >= 0),
  last_active_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger wallets_set_updated_at
  before update on public.wallets
  for each row execute function public.set_updated_at();

revoke all on public.wallets from anon, authenticated, service_role;
grant select on public.wallets to authenticated;
grant select, insert, update, delete on public.wallets to service_role;

alter table public.wallets enable row level security;

create policy "wallets: owner can read"
  on public.wallets for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Signup trigger: every new auth user gets a profile and a wallet
-- ---------------------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id);
  insert into public.wallets (user_id) values (new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
