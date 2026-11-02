-- Per-user daily counters that cap expensive operations (AI grading, generation)
-- so the app stays inside the Gemini free tier.

create table public.rate_limits (
  user_id uuid not null references auth.users on delete cascade,
  key text not null check (char_length(key) between 1 and 40),
  bucket date not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, key, bucket)
);

revoke all on public.rate_limits from anon, authenticated, service_role;
grant select on public.rate_limits to authenticated;
grant select, insert, update, delete on public.rate_limits to service_role;

alter table public.rate_limits enable row level security;

create policy "rate_limits: owner can read"
  on public.rate_limits for select to authenticated
  using (user_id = (select auth.uid()));

-- Atomically counts one use of `p_key` for the caller today (UTC).
-- Returns true while the caller is within `p_limit`, false once it is exceeded.
create function public.rate_limit_hit(p_key text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.rate_limits (user_id, key, bucket, count)
  values (v_user_id, p_key, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, key, bucket)
  do update set count = public.rate_limits.count + 1
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke execute on function public.rate_limit_hit from public, anon;
grant execute on function public.rate_limit_hit to authenticated;
