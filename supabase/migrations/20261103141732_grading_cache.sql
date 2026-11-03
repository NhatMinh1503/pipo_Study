-- Shared cache of AI grading results. The same source sentence translated the same way at
-- the same level gets the same verdict, so it is answered instantly and costs no AI quota.
-- Rows hold no user data: the key is a hash of the grading input, the value the AI's answer.

create table public.grading_cache (
  cache_key text primary key check (cache_key ~ '^[0-9a-f]{64}$'),
  prompt_version text not null,
  result jsonb not null,
  hits integer not null default 0,
  created_at timestamptz not null default now()
);

revoke all on public.grading_cache from anon, authenticated, service_role;
grant select, insert, update on public.grading_cache to service_role;
alter table public.grading_cache enable row level security;
-- No policies: only the server (secret key) reads and writes the cache
