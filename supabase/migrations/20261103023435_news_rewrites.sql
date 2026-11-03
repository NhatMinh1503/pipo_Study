-- Lessons rewritten from openly licensed news (首相官邸 PDL1.0, GOV.UK OGL v3.0).
-- The licences allow adaptation only with attribution and a note that the text was edited,
-- so each such lesson keeps where it came from.

alter table public.lessons
  add column source_name text check (char_length(source_name) between 1 and 100),
  add column source_url text check (source_url ~ '^https://' and char_length(source_url) <= 500),
  add column source_license text check (char_length(source_license) between 1 and 100);

-- Same contract as before plus optional attribution; the old signature is replaced
drop function public.create_lesson(text, public.learning_language, public.proficiency_level, text[], public.lesson_source);

create function public.create_lesson(
  p_title text,
  p_language public.learning_language,
  p_level public.proficiency_level,
  p_sentences text[],
  p_source public.lesson_source default 'manual',
  p_source_name text default null,
  p_source_url text default null,
  p_source_license text default null
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_lesson_id uuid;
  v_count integer := coalesce(array_length(p_sentences, 1), 0);
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if v_count = 0 or v_count > 200 then
    raise exception 'a lesson needs between 1 and 200 sentences' using errcode = '22023';
  end if;

  insert into public.lessons (user_id, title, language, level, source, source_name, source_url, source_license)
  values (v_user_id, p_title, p_language, p_level, p_source, p_source_name, p_source_url, p_source_license)
  returning id into v_lesson_id;

  insert into public.sentences (lesson_id, user_id, position, source_text)
  select v_lesson_id, v_user_id, ordinality - 1, sentence
  from unnest(p_sentences) with ordinality as t(sentence, ordinality);

  return v_lesson_id;
end;
$$;

revoke execute on function public.create_lesson from public, anon;
grant execute on function public.create_lesson to authenticated, service_role;

-- AI rewrites shared by every learner at the same level: one Gemini call per article and level.
-- Only the server (secret key) reads and writes it.
create table public.news_rewrites (
  source_url text not null check (source_url ~ '^https://'),
  level public.proficiency_level not null,
  prompt_version text not null,
  title text not null check (char_length(title) between 1 and 120),
  passage text not null check (char_length(passage) between 1 and 5000),
  created_at timestamptz not null default now(),
  primary key (source_url, level, prompt_version)
);

revoke all on public.news_rewrites from anon, authenticated, service_role;
grant select, insert on public.news_rewrites to service_role;
alter table public.news_rewrites enable row level security;
-- No policies: signed-in users cannot touch the cache directly
