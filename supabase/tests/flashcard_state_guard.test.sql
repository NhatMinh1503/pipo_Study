begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

-- Review rewards read due_date / repetitions / lapses (xp-levels §3.3). Learners must not
-- be able to write that state themselves, or they could mint "due, reviewed before" cards.

insert into auth.users (id, email, aud, role) values
  ('91919191-9191-9191-9191-919191919191', 'srs@test.local', 'authenticated', 'authenticated');

create temporary table ids (name text, id uuid) on commit drop;
grant all on ids to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub":"91919191-9191-9191-9191-919191919191","role":"authenticated"}';

with w as (
  insert into public.vocab_items (user_id, language, term, meaning)
  values (auth.uid(), 'ja', '駅', 'nhà ga') returning id
)
insert into ids select 'word', id from w;
with w as (
  insert into public.vocab_items (user_id, language, term, meaning)
  values (auth.uid(), 'ja', '猫', 'con mèo') returning id
)
insert into ids select 'word2', id from w;

select lives_ok(
  format($$ insert into public.flashcards (user_id, vocab_item_id) values (auth.uid(), %L) $$,
    (select id from ids where name = 'word')),
  'saving a word still creates its flashcard (notebook)'
);
select results_eq(
  $$ select repetitions, lapses, due_date <= now() from public.flashcards $$,
  $$ values (0, 0, true) $$,
  'a new card starts unreviewed with the default schedule'
);

select throws_ok(
  format($$ insert into public.flashcards (user_id, vocab_item_id, repetitions, due_date)
            values (auth.uid(), %L, 5, now() - interval '1 day') $$,
    (select id from ids where name = 'word2')),
  '42501', null, 'a learner cannot create a card that looks reviewed before'
);

select throws_ok(
  $$ update public.flashcards set repetitions = 3 $$,
  '42501', null, 'a learner cannot change repetitions'
);
select throws_ok(
  $$ update public.flashcards set due_date = now() - interval '1 day' $$,
  '42501', null, 'a learner cannot move a card''s due date'
);
select throws_ok(
  $$ update public.flashcards set lapses = 1 $$,
  '42501', null, 'a learner cannot change lapses'
);

-- The server (service role) still schedules reviews
reset role;
set local role service_role;
select lives_ok(
  $$ update public.flashcards set repetitions = 1, due_date = now() + interval '1 day'
     where user_id = '91919191-9191-9191-9191-919191919191' $$,
  'the server updates the schedule'
);

select * from finish();
rollback;
