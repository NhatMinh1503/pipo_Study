-- Translation lessons: lessons, their sentences, and graded attempts.

create type public.lesson_source as enum ('manual', 'ai', 'news');
create type public.translation_verdict as enum ('exact', 'acceptable', 'incorrect');

-- ---------------------------------------------------------------------------
-- lessons
-- ---------------------------------------------------------------------------
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  language public.learning_language not null,
  level public.proficiency_level not null,
  source public.lesson_source not null default 'manual',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lessons_level_matches_language check (
    public.level_matches_language(language, level)
  )
);

create index lessons_user_id_created_at_idx on public.lessons (user_id, created_at desc);

create trigger lessons_set_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

revoke all on public.lessons from anon, authenticated, service_role;
grant select, insert, update, delete on public.lessons to authenticated, service_role;

alter table public.lessons enable row level security;

create policy "lessons: owner can read"
  on public.lessons for select to authenticated
  using (user_id = (select auth.uid()));
create policy "lessons: owner can insert"
  on public.lessons for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "lessons: owner can update"
  on public.lessons for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "lessons: owner can delete"
  on public.lessons for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- sentences: user_id is denormalized so RLS needs no join
-- ---------------------------------------------------------------------------
create table public.sentences (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  position integer not null check (position >= 0),
  source_text text not null check (char_length(source_text) between 1 and 1000),
  reference_translation text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sentences_lesson_id_position_key unique (lesson_id, position)
);

-- A sentence must belong to a lesson owned by the same user
create function public.sentence_owner_matches_lesson() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.lessons where id = new.lesson_id and user_id = new.user_id
  ) then
    raise exception 'sentence user_id must match lesson owner' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger sentences_owner_matches_lesson
  before insert or update of lesson_id, user_id on public.sentences
  for each row execute function public.sentence_owner_matches_lesson();

revoke all on public.sentences from anon, authenticated, service_role;
grant select, insert, update, delete on public.sentences to authenticated, service_role;

alter table public.sentences enable row level security;

create policy "sentences: owner can read"
  on public.sentences for select to authenticated
  using (user_id = (select auth.uid()));
create policy "sentences: owner can insert"
  on public.sentences for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "sentences: owner can update"
  on public.sentences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "sentences: owner can delete"
  on public.sentences for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- attempts: written by the server after AI grading; clients read only
-- (scores and rewards are recomputed from attempts, so clients must not forge them)
-- ---------------------------------------------------------------------------
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  sentence_id uuid not null references public.sentences on delete cascade,
  user_translation text not null check (char_length(user_translation) between 1 and 2000),
  verdict public.translation_verdict not null,
  feedback text not null default '',
  hint text,
  error_tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index attempts_user_id_sentence_id_idx on public.attempts (user_id, sentence_id);
create index attempts_sentence_id_idx on public.attempts (sentence_id);

revoke all on public.attempts from anon, authenticated, service_role;
grant select on public.attempts to authenticated;
grant select, insert, update, delete on public.attempts to service_role;

alter table public.attempts enable row level security;

create policy "attempts: owner can read"
  on public.attempts for select to authenticated
  using (user_id = (select auth.uid()));
