-- AI rate limits (audit §15b): the daily bucket follows the learner's own day (profiles.timezone)
-- instead of UTC, and a per-minute cap stops a whole day's quota being fired in seconds.
-- Burst cap mirrors GAME.ai.perMinute in lib/game/config.ts.

create table public.rate_limit_minutes (
  user_id uuid not null references auth.users on delete cascade,
  key text not null check (char_length(key) between 1 and 40),
  minute timestamptz not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, key, minute)
);

revoke all on public.rate_limit_minutes from anon, authenticated, service_role;
grant select, insert, update, delete on public.rate_limit_minutes to service_role;
alter table public.rate_limit_minutes enable row level security;

create or replace function public.rate_limit_hit(p_key text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_minute timestamptz := date_trunc('minute', now());
  v_burst integer;
  v_count integer;
  v_per_minute constant integer := 30;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  -- Old minute rows are useless once the minute is over
  delete from public.rate_limit_minutes
  where user_id = v_user_id and minute < v_minute - interval '10 minutes';

  insert into public.rate_limit_minutes (user_id, key, minute, count)
  values (v_user_id, p_key, v_minute, 1)
  on conflict (user_id, key, minute)
  do update set count = public.rate_limit_minutes.count + 1
  returning count into v_burst;
  if v_burst > v_per_minute then
    return false;
  end if;

  insert into public.rate_limits (user_id, key, bucket, count)
  values (
    v_user_id, p_key,
    (now() at time zone coalesce(
      (select timezone from public.profiles where user_id = v_user_id), 'UTC'))::date,
    1
  )
  on conflict (user_id, key, bucket)
  do update set count = public.rate_limits.count + 1
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke execute on function public.rate_limit_hit from public, anon;
grant execute on function public.rate_limit_hit to authenticated;
