begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into public.dictionary_entries (id, kanji, kana, senses, common)
values ('test-1', array['試験語'], array['しけんご'], '[{"pos":["noun"],"glosses":["station"]}]', true);
insert into public.word_explanations (language, term, reading, display_language, meaning)
values ('ja', '試験語', 'しけんご', 'vi', 'nhà ga');

insert into auth.users (id, email, aud, role)
values ('12121212-1212-1212-1212-121212121212', 'dict@test.local', 'authenticated', 'authenticated');

set local role authenticated;
set local request.jwt.claims = '{"sub":"12121212-1212-1212-1212-121212121212","role":"authenticated"}';

select is(
  (select kana[1] from public.dictionary_entries where '試験語' = any(kanji)),
  'しけんご', 'signed-in users can look up entries'
);
select is(
  (select meaning from public.word_explanations where term = '試験語'),
  'nhà ga', 'signed-in users can read cached explanations'
);
select throws_ok(
  $$ insert into public.dictionary_entries (id) values ('hack') $$,
  '42501', null, 'clients cannot write dictionary entries'
);
select throws_ok(
  $$ insert into public.word_explanations (language, term, display_language, meaning)
     values ('ja', 'x', 'vi', 'poisoned') $$,
  '42501', null, 'clients cannot poison the shared explanation cache'
);

reset role;
set local role anon;
select throws_ok(
  $$ select count(*) from public.dictionary_entries $$,
  '42501', null, 'anon cannot read the dictionary'
);

select * from finish();
rollback;
