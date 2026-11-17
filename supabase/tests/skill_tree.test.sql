begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- Skill tree progress by topic × level (skill-tree.md) and the honest review count.

insert into auth.users (id, email, aud, role) values
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'tree@test.local', 'authenticated', 'authenticated'),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'peer@test.local', 'authenticated', 'authenticated');

set local role service_role;
select public.create_lesson_for_user('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'Travel', 'ja', 'N5',
  array['駅に行きます。', '電車に乗ります。'], 'ai');
reset role;

update public.lessons set skill_node = 'travel:N5', completed_at = now()
where user_id = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1';
-- One sentence exact (10), one acceptable (7): 17 of 20 = 85 %
insert into public.reward_claims (user_id, claim_key, kind, source, points, xp)
select 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'sentence:' || s.id, 'sentence', 'ai',
  case s.position when 0 then 10 else 7 end, 0
from public.sentences s join public.lessons l on l.id = s.lesson_id
where l.user_id = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1';

set local role authenticated;
set local request.jwt.claims = '{"sub":"b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1","role":"authenticated"}';
select throws_ok(
  $$update public.lessons set skill_node = 'work:N1'$$, '42501', null,
  'clients cannot tag a lesson with a skill node'
);
select is((select best_accuracy from public.skill_tree_progress() where skill_node = 'travel:N5'),
  0.850, 'node accuracy = sentence points / (10 × sentences)');
select is((select lessons_done from public.skill_tree_progress() where skill_node = 'travel:N5'),
  1, 'finished lessons on the node are counted');
select is(public.review_count(), 0, 'no reviews yet');
reset role;

insert into public.transactions (user_id, xp_delta, reason, idempotency_key)
select 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 1, 'flashcard_review', 'review:t' || n
from generate_series(1, 3) n;

set local role authenticated;
set local request.jwt.claims = '{"sub":"b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1","role":"authenticated"}';
select is(public.review_count(), 3, 'the review count comes from the ledger');

set local request.jwt.claims = '{"sub":"b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2","role":"authenticated"}';
select is((select count(*) from public.skill_tree_progress())::integer, 0,
  'another learner sees none of this progress');
reset role;

select * from finish();
rollback;
