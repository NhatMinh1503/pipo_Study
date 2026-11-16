-- Writers and translators of a lesson's source article (Global Voices, CC BY 3.0 asks to name
-- them). Set by the server from the allow-listed feed, never from what the client sends.

alter table public.lessons
  add column source_credits text check (char_length(source_credits) between 1 and 300);

-- Same functions as in 20261105072911_lesson_source_guard.sql plus p_source_credits
drop function public.create_lesson(
  text, public.learning_language, public.proficiency_level, text[], text, text, text
);
drop function public.create_lesson_for_user(
  uuid, text, public.learning_language, public.proficiency_level, text[], public.lesson_source,
  text, text, text
);
drop function public.insert_lesson_rows(
  uuid, text, public.learning_language, public.proficiency_level, text[], public.lesson_source,
  text, text, text
);

create function public.insert_lesson_rows(
  p_user_id uuid,
  p_title text,
  p_language public.learning_language,
  p_level public.proficiency_level,
  p_sentences text[],
  p_source public.lesson_source,
  p_source_name text,
  p_source_url text,
  p_source_license text,
  p_source_credits text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lesson_id uuid;
  v_count integer := coalesce(array_length(p_sentences, 1), 0);
begin
  if v_count = 0 or v_count > 200 then
    raise exception 'a lesson needs between 1 and 200 sentences' using errcode = '22023';
  end if;

  insert into public.lessons (
    user_id, title, language, level, source, source_name, source_url, source_license, source_credits
  )
  values (
    p_user_id, p_title, p_language, p_level, p_source, p_source_name, p_source_url,
    p_source_license, p_source_credits
  )
  returning id into v_lesson_id;

  insert into public.sentences (lesson_id, user_id, position, source_text)
  select v_lesson_id, p_user_id, ordinality - 1, sentence
  from unnest(p_sentences) with ordinality as t(sentence, ordinality);

  return v_lesson_id;
end;
$$;

revoke execute on function public.insert_lesson_rows from public, anon, authenticated, service_role;

-- Learners: always 'manual'. Attribution is allowed (a news rewrite the learner edited).
create function public.create_lesson(
  p_title text,
  p_language public.learning_language,
  p_level public.proficiency_level,
  p_sentences text[],
  p_source_name text default null,
  p_source_url text default null,
  p_source_license text default null,
  p_source_credits text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  return public.insert_lesson_rows(
    auth.uid(), p_title, p_language, p_level, p_sentences, 'manual',
    p_source_name, p_source_url, p_source_license, p_source_credits
  );
end;
$$;

revoke execute on function public.create_lesson from public, anon;
grant execute on function public.create_lesson to authenticated;

-- Server only: AI-generated and unchanged news lessons, created for a given learner
create function public.create_lesson_for_user(
  p_user_id uuid,
  p_title text,
  p_language public.learning_language,
  p_level public.proficiency_level,
  p_sentences text[],
  p_source public.lesson_source,
  p_source_name text default null,
  p_source_url text default null,
  p_source_license text default null,
  p_source_credits text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.insert_lesson_rows(
    p_user_id, p_title, p_language, p_level, p_sentences, p_source,
    p_source_name, p_source_url, p_source_license, p_source_credits
  );
end;
$$;

revoke execute on function public.create_lesson_for_user from public, anon, authenticated;
grant execute on function public.create_lesson_for_user to service_role;
