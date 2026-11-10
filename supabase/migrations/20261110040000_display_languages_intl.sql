-- International learners: English is the default UI language, and Burmese (my) and
-- Indonesian (id) join the display languages. New values are only added here, never used
-- in this transaction (Postgres forbids using a freshly added enum value before commit).
alter type public.display_language add value if not exists 'my';
alter type public.display_language add value if not exists 'id';

alter table public.profiles alter column display_language set default 'en';
