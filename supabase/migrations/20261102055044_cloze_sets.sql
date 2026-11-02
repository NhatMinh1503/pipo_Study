-- Words the AI chose to blank out for a lesson at a given level (cached per user).

create table public.cloze_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  lesson_id uuid not null references public.lessons on delete cascade,
  level public.proficiency_level not null,
  -- [{ "sentenceId": uuid, "tokenIndex": int }]
  blanks jsonb not null default '[]',
  created_at timestamptz not null default now(),
  constraint cloze_sets_lesson_id_level_key unique (lesson_id, level)
);

revoke all on public.cloze_sets from anon, authenticated, service_role;
grant select on public.cloze_sets to authenticated;
grant select, insert, update, delete on public.cloze_sets to service_role;

alter table public.cloze_sets enable row level security;

create policy "cloze_sets: owner can read"
  on public.cloze_sets for select to authenticated
  using (user_id = (select auth.uid()));
