-- S26 community feed, S27 leaderboards, S28 1v1 translation battles.

-- ---------------------------------------------------------------------------
-- Public author cards: the only profile fields other users may see.
-- Runs with the owner's rights on purpose (profiles RLS is owner-only).
-- ---------------------------------------------------------------------------
create view public.profile_cards with (security_invoker = false) as
  select user_id, display_name, avatar_path from public.profiles;

revoke all on public.profile_cards from anon, authenticated, service_role;
grant select on public.profile_cards to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- S26: posts, comments, likes, reports
-- ---------------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  lesson_id uuid references public.lessons on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  language public.learning_language not null,
  -- [{ "source": "...", "translation": "..." }]
  pairs jsonb not null check (jsonb_typeof(pairs) = 'array' and jsonb_array_length(pairs) between 1 and 20),
  created_at timestamptz not null default now()
);
create index posts_created_at_id_idx on public.posts (created_at desc, id desc);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index comments_post_id_created_at_idx on public.comments (post_id, created_at);

create table public.likes (
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.reports (
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  reason text not null check (char_length(reason) between 1 and 200),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

revoke all on public.posts, public.comments, public.likes, public.reports from anon, authenticated, service_role;
grant select, insert, delete on public.posts, public.comments, public.likes to authenticated;
grant insert on public.reports to authenticated;
grant select, insert, update, delete on public.posts, public.comments, public.likes, public.reports to service_role;

alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.reports enable row level security;

-- Any signed-in user reads the feed; only authors write or delete their own rows
create policy "posts: signed-in users read" on public.posts for select to authenticated using (true);
create policy "posts: author inserts" on public.posts for insert to authenticated with check (user_id = (select auth.uid()));
create policy "posts: author deletes" on public.posts for delete to authenticated using (user_id = (select auth.uid()));
create policy "comments: signed-in users read" on public.comments for select to authenticated using (true);
create policy "comments: author inserts" on public.comments for insert to authenticated with check (user_id = (select auth.uid()));
create policy "comments: author deletes" on public.comments for delete to authenticated using (user_id = (select auth.uid()));
create policy "likes: signed-in users read" on public.likes for select to authenticated using (true);
create policy "likes: own like" on public.likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "likes: own unlike" on public.likes for delete to authenticated using (user_id = (select auth.uid()));
create policy "reports: own report" on public.reports for insert to authenticated with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- S27: leaderboards computed on demand (top 50, names only)
-- ---------------------------------------------------------------------------
create function public.leaderboard(p_metric text, p_period text)
returns table (rank bigint, user_id uuid, display_name text, avatar_path text, value bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with since as (
    select case p_period when 'month' then now() - interval '30 days' else now() - interval '7 days' end as at
  ),
  scores as (
    select t.user_id, sum(t.xp_delta)::bigint as value
    from public.transactions t, since
    where p_metric = 'xp' and t.created_at >= since.at and t.xp_delta > 0
    group by t.user_id
    union all
    select w.user_id, w.streak_current::bigint
    from public.wallets w
    where p_metric = 'streak' and w.streak_current > 0
    union all
    select s.user_id, sum(s.planned_minutes)::bigint
    from public.pomodoro_sessions s, since
    where p_metric = 'focus' and s.status = 'completed' and s.ended_at >= since.at
    group by s.user_id
  )
  select rank() over (order by s.value desc), s.user_id, p.display_name, p.avatar_path, s.value
  from scores s join public.profiles p on p.user_id = s.user_id
  where s.value > 0
  order by s.value desc, s.user_id
  limit 50;
$$;

revoke execute on function public.leaderboard from public, anon;
grant execute on function public.leaderboard to authenticated;

-- ---------------------------------------------------------------------------
-- S28: 1v1 battles
-- ---------------------------------------------------------------------------
create type public.battle_status as enum ('waiting', 'active', 'finished', 'cancelled');

create table public.battles (
  id uuid primary key default gen_random_uuid(),
  language public.learning_language not null,
  level public.proficiency_level not null,
  sentences text[] not null check (array_length(sentences, 1) between 1 and 10),
  status public.battle_status not null default 'waiting',
  created_by uuid not null references auth.users on delete cascade,
  winner_id uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index battles_waiting_idx on public.battles (language, created_at) where status = 'waiting';

create table public.battle_players (
  battle_id uuid not null references public.battles on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  score integer not null default 0,
  answered integer not null default 0,
  finished_at timestamptz,
  primary key (battle_id, user_id)
);

create table public.battle_answers (
  battle_id uuid not null references public.battles on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  sentence_index integer not null check (sentence_index >= 0),
  translation text not null check (char_length(translation) between 1 and 1000),
  verdict public.translation_verdict not null,
  points integer not null,
  created_at timestamptz not null default now(),
  primary key (battle_id, user_id, sentence_index)
);

revoke all on public.battles, public.battle_players, public.battle_answers from anon, authenticated, service_role;
grant select on public.battles, public.battle_players, public.battle_answers to authenticated;
grant select, insert, update, delete on public.battles, public.battle_players, public.battle_answers to service_role;

alter table public.battles enable row level security;
alter table public.battle_players enable row level security;
alter table public.battle_answers enable row level security;

-- Participants see their battle, its players and every answer in it
create function public.is_battle_player(p_battle_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.battle_players where battle_id = p_battle_id and user_id = auth.uid());
$$;
revoke execute on function public.is_battle_player from public, anon;
grant execute on function public.is_battle_player to authenticated;

create policy "battles: participants read" on public.battles for select to authenticated
  using (public.is_battle_player(id));
create policy "battle_players: participants read" on public.battle_players for select to authenticated
  using (public.is_battle_player(battle_id));
create policy "battle_answers: participants read" on public.battle_answers for select to authenticated
  using (public.is_battle_player(battle_id));

-- Joins the oldest waiting battle in the language, or opens a new one with the given sentences
create function public.join_battle(
  p_language public.learning_language,
  p_level public.proficiency_level,
  p_sentences text[]
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_battle_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  -- Already waiting? Reuse that battle instead of opening a second one
  select b.id into v_battle_id from public.battles b
  where b.created_by = v_user_id and b.status = 'waiting' limit 1;
  if found then return v_battle_id; end if;

  select b.id into v_battle_id from public.battles b
  where b.status = 'waiting' and b.language = p_language and b.created_by <> v_user_id
  order by b.created_at
  limit 1
  for update skip locked;

  if found then
    insert into public.battle_players (battle_id, user_id) values (v_battle_id, v_user_id);
    update public.battles set status = 'active', started_at = now() where id = v_battle_id;
    return v_battle_id;
  end if;

  insert into public.battles (language, level, sentences, created_by)
  values (p_language, p_level, p_sentences, v_user_id)
  returning id into v_battle_id;
  insert into public.battle_players (battle_id, user_id) values (v_battle_id, v_user_id);
  return v_battle_id;
end;
$$;

revoke execute on function public.join_battle from public, anon;
grant execute on function public.join_battle to authenticated;

-- Leaving: a waiting battle is cancelled; an active one is forfeited to the opponent
create function public.leave_battle(p_battle_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_status public.battle_status;
begin
  if not public.is_battle_player(p_battle_id) then
    raise exception 'not a player' using errcode = '42501';
  end if;
  select status into v_status from public.battles where id = p_battle_id for update;
  if v_status = 'waiting' then
    update public.battles set status = 'cancelled', finished_at = now() where id = p_battle_id;
  elsif v_status = 'active' then
    update public.battles
    set status = 'finished', finished_at = now(),
        winner_id = (select user_id from public.battle_players where battle_id = p_battle_id and user_id <> v_user_id limit 1)
    where id = p_battle_id;
  end if;
end;
$$;

revoke execute on function public.leave_battle from public, anon;
grant execute on function public.leave_battle to authenticated;
