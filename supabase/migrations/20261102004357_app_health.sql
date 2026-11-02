-- Connectivity check table: lets the app verify it can reach the database.
-- Read-only for everyone; rows are only written by migrations / seed.

create table public.app_health (
  id smallint primary key,
  status text not null check (status in ('ok', 'degraded')),
  message text not null,
  updated_at timestamptz not null default now()
);

comment on table public.app_health is 'Single-row connectivity check used by the home page.';

-- New tables get no usable default grants here, and API roles inherit TRUNCATE.
-- Reset to nothing, then grant exactly what the policies below need.
revoke all on public.app_health from anon, authenticated, service_role;
grant select on public.app_health to anon, authenticated, service_role;

alter table public.app_health enable row level security;

create policy "app_health is readable by everyone"
  on public.app_health
  for select
  to anon, authenticated
  using (true);

-- No insert / update / delete policies: clients cannot write.
