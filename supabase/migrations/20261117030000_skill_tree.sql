-- Skill tree by topic × level (PRD F, audit §9; design/game/skill-tree.md).
--
-- A node is "<topic>:<level>" (e.g. travel:N4). Starting a node makes the server generate an
-- AI lesson on that topic at that level and tag it with the node. A node is passed when one of
-- its lessons is finished with accuracy >= 60 %, accuracy = sentence points / (10 × sentences).
-- Which nodes are open is decided in lib/skills/topics.ts from this progress (and re-checked on
-- the server before a lesson is generated).

alter table public.lessons
  add column skill_node text
  check (skill_node is null or skill_node ~ '^[a-z_]{2,20}:(N[1-5]|A1|A2|B1|B2|C1|C2)$');

create index lessons_user_id_skill_node_idx on public.lessons (user_id, skill_node)
  where skill_node is not null;

-- The column-level UPDATE grant on lessons (title only) already keeps clients from setting it

-- Best accuracy per node for the signed-in learner, over finished lessons only
create function public.skill_tree_progress()
returns table (skill_node text, best_accuracy numeric, lessons_done integer)
language sql
stable
security definer
set search_path = ''
as $$
  with finished as (
    select l.id, l.skill_node,
      (select count(*) from public.sentences s where s.lesson_id = l.id) as sentences
    from public.lessons l
    where l.user_id = auth.uid() and l.skill_node is not null and l.completed_at is not null
  ),
  scored as (
    select f.skill_node,
      coalesce((
        select sum(c.points) from public.reward_claims c
        join public.sentences s on c.claim_key = 'sentence:' || s.id::text
        where c.user_id = auth.uid() and s.lesson_id = f.id
      ), 0)::numeric / greatest(1, 10 * f.sentences) as accuracy
    from finished f
  )
  select skill_node, round(max(accuracy), 3), count(*)::integer
  from scored
  group by skill_node;
$$;

revoke execute on function public.skill_tree_progress from public, anon;
grant execute on function public.skill_tree_progress to authenticated;

-- Honest review count for achievements: rewarded reviews in the ledger (audit §9 bug)
create function public.review_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.transactions
  where user_id = auth.uid() and reason = 'flashcard_review';
$$;

revoke execute on function public.review_count from public, anon;
grant execute on function public.review_count to authenticated;
