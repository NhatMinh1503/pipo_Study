begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

-- The daily review goal counts new cards too (streak-goals.md §1).

insert into auth.users (id, email, aud, role) values
  ('a7a7a7a7-a7a7-a7a7-a7a7-a7a7a7a7a7a7', 'newcards@test.local', 'authenticated', 'authenticated');
update public.profiles set timezone = 'UTC' where user_id = 'a7a7a7a7-a7a7-a7a7-a7a7-a7a7a7a7a7a7';

with items as (
  insert into public.vocab_items (user_id, language, term, meaning)
  select 'a7a7a7a7-a7a7-a7a7-a7a7-a7a7a7a7a7a7', 'ja', '語' || n, 'm' from generate_series(1, 2) n
  returning id
)
insert into public.flashcards (user_id, vocab_item_id, due_date)
select 'a7a7a7a7-a7a7-a7a7-a7a7-a7a7a7a7a7a7', id, now() - interval '1 minute' from items;

set local role authenticated;
set local request.jwt.claims = '{"sub":"a7a7a7a7-a7a7-a7a7-a7a7-a7a7a7a7a7a7","role":"authenticated"}';
select is((public.today_goals() -> 'review' ->> 'target')::integer, 2,
  'two new cards due: the review goal targets both');
reset role;

-- Reviewing both new cards (never reviewed before) reaches the goal
update public.flashcards set last_reviewed_at = now(), repetitions = 1, due_date = now() + interval '1 day'
where user_id = 'a7a7a7a7-a7a7-a7a7-a7a7-a7a7a7a7a7a7';

set local role authenticated;
set local request.jwt.claims = '{"sub":"a7a7a7a7-a7a7-a7a7-a7a7-a7a7a7a7a7a7","role":"authenticated"}';
select is((public.today_goals() -> 'review' ->> 'count')::integer, 2, 'each card reviewed today counts once');
select is(public.today_goals() -> 'review' ->> 'done', 'true', 'the goal is reached with new cards');
reset role;

select * from finish();
rollback;
