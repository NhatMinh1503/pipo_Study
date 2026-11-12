begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into public.english_entries (word, ipa, senses, rank, oxford)
values ('testrun', 'rʌn', '[{"pos":"verb","gloss":"move fast","example":null}]', 202, true);
insert into public.english_forms (form, lemma, kind) values ('testran', 'testrun', 'past');

insert into auth.users (id, email, aud, role)
values ('13131313-1313-1313-1313-131313131313', 'en-dict@test.local', 'authenticated', 'authenticated');

set local role authenticated;
set local request.jwt.claims = '{"sub":"13131313-1313-1313-1313-131313131313","role":"authenticated"}';

select is(
  (select ipa from public.english_entries where word = 'testrun'),
  'rʌn', 'signed-in users can look up English entries'
);
select is(
  (select lemma from public.english_forms where form = 'testran'),
  'testrun', 'signed-in users can resolve an inflected form to its lemma'
);
select throws_ok(
  $$ insert into public.english_entries (word) values ('hack') $$,
  '42501', null, 'clients cannot write English entries'
);
select throws_ok(
  $$ delete from public.english_forms $$,
  '42501', null, 'clients cannot delete English forms'
);

reset role;
set local role anon;
select throws_ok(
  $$ select count(*) from public.english_entries $$,
  '42501', null, 'anon cannot read English entries'
);
select throws_ok(
  $$ select count(*) from public.english_forms $$,
  '42501', null, 'anon cannot read English forms'
);

select * from finish();
rollback;
