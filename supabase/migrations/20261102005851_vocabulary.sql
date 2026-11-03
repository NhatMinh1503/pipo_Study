-- Vocabulary notebook and spaced-repetition flashcards.

-- ---------------------------------------------------------------------------
-- vocab_items: a word saved from a lesson, with the sentence it came from
-- ---------------------------------------------------------------------------
create table public.vocab_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  language public.learning_language not null,
  term text not null check (char_length(term) between 1 and 100),
  reading text,
  part_of_speech text,
  meaning text not null default '',
  context_sentence text,
  context_translation text,
  sentence_id uuid references public.sentences on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vocab_items_user_id_language_term_key unique (user_id, language, term)
);

create trigger vocab_items_set_updated_at
  before update on public.vocab_items
  for each row execute function public.set_updated_at();

revoke all on public.vocab_items from anon, authenticated, service_role;
grant select, insert, update, delete on public.vocab_items to authenticated, service_role;

alter table public.vocab_items enable row level security;

create policy "vocab_items: owner can read"
  on public.vocab_items for select to authenticated
  using (user_id = (select auth.uid()));
create policy "vocab_items: owner can insert"
  on public.vocab_items for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "vocab_items: owner can update"
  on public.vocab_items for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "vocab_items: owner can delete"
  on public.vocab_items for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- flashcards: SRS schedule for a vocab item
-- ---------------------------------------------------------------------------
create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  vocab_item_id uuid not null references public.vocab_items on delete cascade,
  due_date timestamptz not null default now(),
  interval_days integer not null default 0 check (interval_days >= 0),
  ease numeric(4, 2) not null default 2.50 check (ease between 1.30 and 5.00),
  repetitions integer not null default 0 check (repetitions >= 0),
  lapses integer not null default 0 check (lapses >= 0),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint flashcards_vocab_item_id_key unique (vocab_item_id)
);

create index flashcards_user_id_due_date_idx on public.flashcards (user_id, due_date);

revoke all on public.flashcards from anon, authenticated, service_role;
grant select, insert, update, delete on public.flashcards to authenticated, service_role;

alter table public.flashcards enable row level security;

create policy "flashcards: owner can read"
  on public.flashcards for select to authenticated
  using (user_id = (select auth.uid()));
create policy "flashcards: owner can insert"
  on public.flashcards for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "flashcards: owner can update"
  on public.flashcards for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "flashcards: owner can delete"
  on public.flashcards for delete to authenticated
  using (user_id = (select auth.uid()));
