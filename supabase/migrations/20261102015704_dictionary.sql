-- Dictionary data shared by all users:
-- * dictionary_entries: offline JMdict (Japanese → English), imported by `npm run dict:import`
-- * word_explanations: cache of AI explanations, so each word costs AI quota only once
-- Also stores tokenized sentences so the browser never downloads the tokenizer dictionary.

-- ---------------------------------------------------------------------------
-- JMdict entries (EDRDG, CC BY-SA 4.0 — attribution shown in the app)
-- ---------------------------------------------------------------------------
create table public.dictionary_entries (
  id text primary key,                      -- JMdict sequence id
  kanji text[] not null default '{}',       -- written forms, most common first
  kana text[] not null default '{}',        -- readings
  senses jsonb not null default '[]',       -- [{ pos: string[], glosses: string[] }]
  common boolean not null default false
);

create index dictionary_entries_kanji_idx on public.dictionary_entries using gin (kanji);
create index dictionary_entries_kana_idx on public.dictionary_entries using gin (kana);

revoke all on public.dictionary_entries from anon, authenticated, service_role;
grant select on public.dictionary_entries to authenticated;
grant select, insert, update, delete on public.dictionary_entries to service_role;

alter table public.dictionary_entries enable row level security;

create policy "dictionary_entries: readable by signed-in users"
  on public.dictionary_entries for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- AI explanations cache: one row per (word, reading, language, explanation language)
-- ---------------------------------------------------------------------------
create table public.word_explanations (
  id uuid primary key default gen_random_uuid(),
  language public.learning_language not null,
  term text not null check (char_length(term) between 1 and 100),
  reading text not null default '',
  display_language public.display_language not null,
  meaning text not null,
  part_of_speech text,
  note text,
  created_at timestamptz not null default now(),
  constraint word_explanations_lookup_key unique (language, term, reading, display_language)
);

revoke all on public.word_explanations from anon, authenticated, service_role;
grant select on public.word_explanations to authenticated;
grant select, insert, update, delete on public.word_explanations to service_role;

alter table public.word_explanations enable row level security;

create policy "word_explanations: readable by signed-in users"
  on public.word_explanations for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Tokens per sentence: [{ surface, base, reading, pos, isWord }]
-- ---------------------------------------------------------------------------
alter table public.sentences add column tokens jsonb;
