begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

select has_table('public', 'app_health', 'app_health table exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.app_health'::regclass),
  true,
  'RLS is enabled on app_health'
);

-- Insert a fixture row as the table owner so the test does not depend on seed.sql
insert into public.app_health (id, status, message) values (99, 'ok', 'test row');

set local role anon;

select ok(
  (select count(*) from public.app_health where id = 99) = 1,
  'anon can read app_health'
);

select throws_ok(
  $$ insert into public.app_health (id, status, message) values (100, 'ok', 'x') $$,
  '42501',
  null,
  'anon cannot insert into app_health'
);

select throws_ok(
  $$ update public.app_health set message = 'hacked' where id = 99 $$,
  '42501',
  null,
  'anon cannot update app_health'
);

select * from finish();
rollback;
