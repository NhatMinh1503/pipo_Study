begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

-- Queue-clear bonus (xp-levels §3.4): +5 XP once per local day, only when no card is due
-- and at least 5 rewarded reviews happened today.

insert into auth.users (id, email, aud, role) values
  ('71717171-7171-7171-7171-717171717171', 'clear@test.local', 'authenticated', 'authenticated');
update public.profiles set timezone = 'UTC' where user_id = '71717171-7171-7171-7171-717171717171';

with item as (
  insert into public.vocab_items (user_id, language, term, meaning)
  values ('71717171-7171-7171-7171-717171717171', 'ja', '駅', 'nhà ga')
  returning id
)
insert into public.flashcards (user_id, vocab_item_id, due_date)
select '71717171-7171-7171-7171-717171717171', id, now() + interval '1 day' from item;

create function pg_temp.xp() returns integer language sql as $$
  select xp from public.wallets where user_id = '71717171-7171-7171-7171-717171717171' $$;

set local role service_role;
select public.wallet_apply('71717171-7171-7171-7171-717171717171', 1, 0, 'flashcard_review', 'review:c' || n)
from generate_series(1, 4) as n;

select is(public.award_review_clear('71717171-7171-7171-7171-717171717171'), 0,
  'no bonus with only 4 rewarded reviews today (#19)');

select public.wallet_apply('71717171-7171-7171-7171-717171717171', 1, 0, 'flashcard_review', 'review:c5');

reset role;
update public.flashcards set due_date = now() - interval '1 minute'
where user_id = '71717171-7171-7171-7171-717171717171';
set local role service_role;
select is(public.award_review_clear('71717171-7171-7171-7171-717171717171'), 0,
  'no bonus while a card is still due');

reset role;
update public.flashcards set due_date = now() + interval '1 day'
where user_id = '71717171-7171-7171-7171-717171717171';
set local role service_role;
select is(public.award_review_clear('71717171-7171-7171-7171-717171717171'), 5,
  'queue empty after 5 rewarded reviews: +5 XP (#18)');
select is(pg_temp.xp(), 10, 'wallet: 5 reviews + 5 bonus');
select is(public.award_review_clear('71717171-7171-7171-7171-717171717171'), 0,
  'the bonus is paid once per day');
select is(
  (select count(*)::int from public.transactions
   where user_id = '71717171-7171-7171-7171-717171717171' and idempotency_key = 'review_clear:' || current_date),
  1, 'keyed review_clear:<local date>'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"71717171-7171-7171-7171-717171717171","role":"authenticated"}';
select throws_ok(
  $$ select public.award_review_clear('71717171-7171-7171-7171-717171717171') $$,
  '42501', null, 'learners cannot pay themselves the bonus'
);

select * from finish();
rollback;
