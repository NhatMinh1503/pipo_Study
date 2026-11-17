-- KPI measurement (PRD §3): retention D1/D7, daily engagement, AI latency and AI accuracy.
--
-- * ai_calls: one row per AI request (prompt, provider, outcome, latency). No user, no text.
-- * attempt_flags: a learner marks an AI verdict on their own attempt as wrong. The share of
--   graded attempts that get flagged is the measured AI error rate (accuracy = 1 - rate).
-- * kpi_summary(): numbers for the staff page /insights (moderators only).

create table public.ai_calls (
  id bigint generated always as identity primary key,
  prompt_version text not null check (char_length(prompt_version) between 1 and 60),
  provider text check (provider in ('gemini', 'groq')),
  outcome text not null check (outcome in ('ok', 'failover', 'failed')),
  latency_ms integer not null check (latency_ms >= 0),
  created_at timestamptz not null default now()
);
create index ai_calls_created_at_idx on public.ai_calls (created_at desc);

revoke all on public.ai_calls from anon, authenticated, service_role;
grant insert, select on public.ai_calls to service_role;
alter table public.ai_calls enable row level security;

create table public.attempt_flags (
  attempt_id uuid primary key references public.attempts on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

revoke all on public.attempt_flags from anon, authenticated, service_role;
grant select, insert on public.attempt_flags to authenticated;
grant select, insert, delete on public.attempt_flags to service_role;
alter table public.attempt_flags enable row level security;

create policy "attempt flags: owner reads" on public.attempt_flags for select to authenticated
  using (user_id = (select auth.uid()));
create policy "attempt flags: owner flags own attempt" on public.attempt_flags for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.attempts a
      where a.id = attempt_id and a.user_id = (select auth.uid())
    )
  );

-- Staff dashboard numbers over the last p_days days
create function public.kpi_summary(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 365)));
  v_result jsonb;
begin
  if not public.is_moderator() then
    raise exception 'staff only' using errcode = '42501';
  end if;

  with activity as (
    select user_id, created_at::date as day from public.attempts
    union select user_id, created_at::date from public.transactions
    union select user_id, started_at::date from public.pomodoro_sessions
  ),
  signups as (
    select id as user_id, created_at::date as day from auth.users
  ),
  d1 as (
    select s.user_id, exists (select 1 from activity a where a.user_id = s.user_id and a.day = s.day + 1) as back
    from signups s where s.day between (now() - interval '31 days')::date and (now() - interval '1 day')::date
  ),
  d7 as (
    select s.user_id, exists (select 1 from activity a where a.user_id = s.user_id and a.day = s.day + 7) as back
    from signups s where s.day between (now() - interval '37 days')::date and (now() - interval '7 days')::date
  ),
  active_days as (
    select user_id, day from activity where day >= v_since::date
  ),
  translate_sessions as (
    -- A translation session = a lesson worked on that day
    select a.user_id, a.created_at::date as day, count(distinct s.lesson_id) as sessions
    from public.attempts a join public.sentences s on s.id = a.sentence_id
    where a.created_at >= v_since
    group by 1, 2
  ),
  focus_sessions as (
    select user_id, ended_at::date as day, count(*) as sessions
    from public.pomodoro_sessions
    where status = 'completed' and ended_at >= v_since
    group by 1, 2
  ),
  calls as (
    select * from public.ai_calls where created_at >= v_since and prompt_version like 'grade-translation%'
  ),
  graded as (
    select count(*) as n from public.attempts where created_at >= v_since
  )
  select jsonb_build_object(
    'days', p_days,
    'signups', (select count(*) from signups where day >= v_since::date),
    'activeLearners', (select count(distinct user_id) from active_days),
    'd1', jsonb_build_object('cohort', (select count(*) from d1), 'returned', (select count(*) from d1 where back)),
    'd7', jsonb_build_object('cohort', (select count(*) from d7), 'returned', (select count(*) from d7 where back)),
    'translateSessionsPerActiveDay', (
      select round(coalesce(avg(sessions), 0), 2) from (
        select d.user_id, d.day, coalesce(t.sessions, 0) as sessions
        from (select distinct user_id, day from active_days) d
        left join translate_sessions t on t.user_id = d.user_id and t.day = d.day
      ) x),
    'focusSessionsPerActiveDay', (
      select round(coalesce(avg(sessions), 0), 2) from (
        select d.user_id, d.day, coalesce(f.sessions, 0) as sessions
        from (select distinct user_id, day from active_days) d
        left join focus_sessions f on f.user_id = d.user_id and f.day = d.day
      ) x),
    'gradingCalls', (select count(*) from calls),
    'gradingP50Ms', (select percentile_cont(0.5) within group (order by latency_ms) from calls where outcome <> 'failed'),
    'gradingP95Ms', (select percentile_cont(0.95) within group (order by latency_ms) from calls where outcome <> 'failed'),
    'gradingFailed', (select count(*) from calls where outcome = 'failed'),
    'gradedAttempts', (select n from graded),
    'flaggedAttempts', (select count(*) from public.attempt_flags where created_at >= v_since)
  ) into v_result;
  return v_result;
end;
$$;

revoke execute on function public.kpi_summary from public, anon;
grant execute on function public.kpi_summary to authenticated;
