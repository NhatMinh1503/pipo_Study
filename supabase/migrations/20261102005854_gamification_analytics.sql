-- Reward-related and analytics data. All rows are written by server code or
-- security definer functions; clients only read their own rows.

create type public.pomodoro_status as enum ('running', 'completed', 'abandoned');

-- ---------------------------------------------------------------------------
-- pomodoro_sessions
-- ---------------------------------------------------------------------------
create table public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  planned_minutes integer not null default 25 check (planned_minutes between 1 and 120),
  status public.pomodoro_status not null default 'running',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint pomodoro_sessions_end_after_start check (ended_at is null or ended_at >= started_at)
);

create index pomodoro_sessions_user_id_started_at_idx
  on public.pomodoro_sessions (user_id, started_at desc);

-- ---------------------------------------------------------------------------
-- transactions: ledger behind wallets; idempotency_key blocks double rewards
-- ---------------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  xp_delta integer not null default 0,
  coins_delta integer not null default 0,
  reason text not null check (char_length(reason) between 1 and 60),
  idempotency_key text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint transactions_idempotency_key_key unique (user_id, idempotency_key),
  constraint transactions_nonzero check (xp_delta <> 0 or coins_delta <> 0)
);

create index transactions_user_id_created_at_idx on public.transactions (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- error_logs: one row per error tag found in a graded attempt
-- ---------------------------------------------------------------------------
create table public.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  attempt_id uuid not null references public.attempts on delete cascade,
  tag text not null check (char_length(tag) between 1 and 60),
  created_at timestamptz not null default now()
);

create index error_logs_user_id_created_at_idx on public.error_logs (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Grants + RLS: read-only for owners
-- ---------------------------------------------------------------------------
revoke all on public.pomodoro_sessions, public.transactions, public.error_logs
  from anon, authenticated, service_role;
grant select on public.pomodoro_sessions, public.transactions, public.error_logs
  to authenticated;
grant select, insert, update, delete
  on public.pomodoro_sessions, public.transactions, public.error_logs
  to service_role;

alter table public.pomodoro_sessions enable row level security;
alter table public.transactions enable row level security;
alter table public.error_logs enable row level security;

create policy "pomodoro_sessions: owner can read"
  on public.pomodoro_sessions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "transactions: owner can read"
  on public.transactions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "error_logs: owner can read"
  on public.error_logs for select to authenticated
  using (user_id = (select auth.uid()));
