-- Offline English dictionary, imported by `npm run dict:import:en`:
-- * english_entries: headwords with IPA, learner senses and frequency rank
-- * english_forms: inflected forms pointing at their lemma (went → go), so a click on any
--   form finds the dictionary entry without asking the AI
-- Sources (attribution shown in the app): ECDICT (MIT), WordNet 3.1 © Princeton University
-- (WordNet license), CMUdict © Carnegie Mellon University (BSD).

create table public.english_entries (
  word text primary key check (char_length(word) between 1 and 100),
  ipa text,
  senses jsonb not null default '[]',      -- [{ pos, gloss, example }]
  rank integer check (rank is null or rank > 0), -- 1 = most common word
  oxford boolean not null default false     -- in the Oxford 3000 core list
);

create table public.english_forms (
  form text not null check (char_length(form) between 1 and 100),
  lemma text not null references public.english_entries (word) on delete cascade,
  ipa text,                                 -- pronunciation of the form itself (went /went/)
  kind text not null check (
    kind in ('past', 'pastParticiple', 'presentParticiple', 'thirdPerson', 'plural',
             'comparative', 'superlative')
  ),
  primary key (form, lemma, kind)
);

create index english_forms_lemma_idx on public.english_forms (lemma);

revoke all on public.english_entries from anon, authenticated, service_role;
grant select on public.english_entries to authenticated;
grant select, insert, update, delete on public.english_entries to service_role;

revoke all on public.english_forms from anon, authenticated, service_role;
grant select on public.english_forms to authenticated;
grant select, insert, update, delete on public.english_forms to service_role;

alter table public.english_entries enable row level security;
alter table public.english_forms enable row level security;

create policy "english_entries: readable by signed-in users"
  on public.english_entries for select to authenticated
  using (true);

create policy "english_forms: readable by signed-in users"
  on public.english_forms for select to authenticated
  using (true);
