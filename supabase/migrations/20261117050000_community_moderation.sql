-- Community moderation (audit §12; design/game/community.md).
--
-- 3 reports by different learners hide a post from the feed automatically. The author still
-- sees it, marked as under review; a learner who reported a post stops seeing it right away.
-- Moderators (a list kept by the service role) review hidden posts: restore or remove.

alter table public.posts
  add column hidden_at timestamptz,
  add column reviewed_at timestamptz;

create table public.moderators (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

revoke all on public.moderators from anon, authenticated, service_role;
grant select, insert, delete on public.moderators to service_role;
alter table public.moderators enable row level security;

create function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.moderators where user_id = auth.uid());
$$;

revoke execute on function public.is_moderator from public, anon;
grant execute on function public.is_moderator to authenticated;

-- Reports made since the last review count; the third one hides the post
create function public.hide_reported_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.posts p
  set hidden_at = now()
  where p.id = new.post_id and p.hidden_at is null
    and (
      select count(*) from public.reports r
      where r.post_id = p.id and (p.reviewed_at is null or r.created_at > p.reviewed_at)
    ) >= 3;
  return new;
end;
$$;

revoke execute on function public.hide_reported_post from public, anon, authenticated;

create trigger reports_hide_post
  after insert on public.reports
  for each row execute function public.hide_reported_post();

-- Reporters may see their own reports (the feed uses it to drop posts they reported)
grant select on public.reports to authenticated;
create policy "reports: reporter reads own" on public.reports for select to authenticated
  using (user_id = (select auth.uid()));

-- Feed visibility: hidden posts only for their author; posts I reported are gone for me
drop policy "posts: signed-in users read" on public.posts;
create policy "posts: visible to signed-in users" on public.posts for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      hidden_at is null
      and not exists (
        select 1 from public.reports r
        where r.post_id = posts.id and r.user_id = (select auth.uid())
      )
    )
    or (select public.is_moderator())
  );

-- Moderator queue: hidden posts first, then any post with open reports
create function public.moderation_queue()
returns table (
  post_id uuid, title text, pairs jsonb, author_id uuid, created_at timestamptz,
  hidden_at timestamptz, open_reports bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.title, p.pairs, p.user_id, p.created_at, p.hidden_at,
    (select count(*) from public.reports r
     where r.post_id = p.id and (p.reviewed_at is null or r.created_at > p.reviewed_at))
  from public.posts p
  where public.is_moderator()
    and exists (
      select 1 from public.reports r
      where r.post_id = p.id and (p.reviewed_at is null or r.created_at > p.reviewed_at)
    )
  order by p.hidden_at is null, p.hidden_at desc nulls last, p.created_at desc
  limit 100;
$$;

revoke execute on function public.moderation_queue from public, anon;
grant execute on function public.moderation_queue to authenticated;

-- restore: back in the feed, open reports cleared; remove: the post is deleted
create function public.moderate_post(p_post_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'not a moderator' using errcode = '42501';
  end if;
  if p_action = 'restore' then
    update public.posts set hidden_at = null, reviewed_at = now() where id = p_post_id;
  elsif p_action = 'remove' then
    delete from public.posts where id = p_post_id;
  else
    raise exception 'unknown action' using errcode = '22023';
  end if;
  if not found then
    raise exception 'post not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.moderate_post from public, anon;
grant execute on function public.moderate_post to authenticated;
