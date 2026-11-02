begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email, aud, role)
values
  ('15151515-1515-1515-1515-151515151515', 'pomo@test.local', 'authenticated', 'authenticated'),
  ('16161616-1616-1616-1616-161616161616', 'other@test.local', 'authenticated', 'authenticated');

set local role authenticated;
set local request.jwt.claims = '{"sub":"15151515-1515-1515-1515-151515151515","role":"authenticated"}';

create temporary table ids (name text, id uuid) on commit drop;
grant all on ids to authenticated;

insert into ids select 'first', (public.start_pomodoro(25)).id;
select is(
  (select status::text from public.pomodoro_sessions where id = (select id from ids where name = 'first')),
  'running', 'start creates a running session'
);

-- Finishing right away is too early: nothing is paid
select is(
  public.complete_pomodoro((select id from ids where name = 'first')),
  null, 'completing early returns null'
);
select is((select coins from public.wallets), 0, 'no coins for an early finish');

-- Starting again abandons the running session
insert into ids select 'second', (public.start_pomodoro(25)).id;
select is(
  (select status::text from public.pomodoro_sessions where id = (select id from ids where name = 'first')),
  'abandoned', 'a new start abandons the previous running session'
);

-- Simulate 25 minutes passing (as table owner)
reset role;
update public.pomodoro_sessions set started_at = now() - interval '25 minutes'
where id = (select id from ids where name = 'second');
set local role authenticated;
set local request.jwt.claims = '{"sub":"15151515-1515-1515-1515-151515151515","role":"authenticated"}';

select is(
  public.complete_pomodoro((select id from ids where name = 'second')),
  5, 'a full 25-minute session pays 5 coins'
);
select results_eq(
  $$ select xp, coins from public.wallets $$,
  $$ values (25, 5) $$,
  'wallet credited with XP = minutes and coins'
);
select throws_ok(
  format('select public.complete_pomodoro(%L)', (select id from ids where name = 'second')),
  '22023', null, 'a session cannot be completed twice'
);

-- Another user cannot complete or abandon my session
set local request.jwt.claims = '{"sub":"16161616-1616-1616-1616-161616161616","role":"authenticated"}';
insert into ids select 'mine', (public.start_pomodoro(25)).id;
set local request.jwt.claims = '{"sub":"15151515-1515-1515-1515-151515151515","role":"authenticated"}';
select throws_ok(
  format('select public.complete_pomodoro(%L)', (select id from ids where name = 'mine')),
  'P0002', null, 'cannot complete another user''s session'
);
select lives_ok(
  format('select public.abandon_pomodoro(%L)', (select id from ids where name = 'mine')),
  'abandoning another user''s session is a no-op'
);
reset role;
select is(
  (select status::text from public.pomodoro_sessions where id = (select id from ids where name = 'mine')),
  'running', 'the other user''s session is untouched'
);

select * from finish();
rollback;
