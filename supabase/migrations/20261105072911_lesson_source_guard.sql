-- Who decides a lesson's source (xp-levels spec §3.6, task T0).
--
-- XP limits depend on lessons.source ('manual' is capped, 'ai' / 'news' are not), so a
-- learner must not be able to choose it or change a lesson's content afterwards:
--   * create_lesson (learners) always creates 'manual' lessons;
--   * create_lesson_for_user (service role only) creates 'ai' and 'news' lessons;
--   * no direct INSERT into lessons / sentences, no deleting single sentences.
-- Deleting a whole lesson still works (sentences go with it through the foreign key).

-- Shared insert, callable only from the two functions below (they run as the owner)
create function public.insert_lesson_rows(
  p_user_id uuid,
  p_title text,
  p_language public.learning_language,
  p_level public.proficiency_level,
  p_sentences text[],
  p_source public.lesson_source,
  p_source_name text,
  p_source_url text,
  p_source_license text
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

  insert into public.lessons (user_id, title, language, level, source, source_name, source_url, source_license)
  values (p_user_id, p_title, p_language, p_level, p_source, p_source_name, p_source_url, p_source_license)
  returning id into v_lesson_id;

  insert into public.sentences (lesson_id, user_id, position, source_text)
  select v_lesson_id, p_user_id, ordinality - 1, sentence
  from unnest(p_sentences) with ordinality as t(sentence, ordinality);

  return v_lesson_id;
end;
$$;

revoke execute on function public.insert_lesson_rows from public, anon, authenticated, service_role;

-- Learners: always 'manual'. Attribution is allowed (a news rewrite the learner edited).
drop function public.create_lesson(
  text, public.learning_language, public.proficiency_level, text[], public.lesson_source, text, text, text
);

create function public.create_lesson(
  p_title text,
  p_language public.learning_language,
  p_level public.proficiency_level,
  p_sentences text[],
  p_source_name text default null,
  p_source_url text default null,
  p_source_license text default null
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
    p_source_name, p_source_url, p_source_license
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
  p_source_license text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.insert_lesson_rows(
    p_user_id, p_title, p_language, p_level, p_sentences, p_source,
    p_source_name, p_source_url, p_source_license
  );
end;
$$;

revoke execute on function public.create_lesson_for_user from public, anon, authenticated;
grant execute on function public.create_lesson_for_user to service_role;

-- No direct writes that could create a lesson or change its content
revoke insert on public.lessons from authenticated;
revoke insert, delete on public.sentences from authenticated;
drop policy "lessons: owner can insert" on public.lessons;
drop policy "sentences: owner can insert" on public.sentences;
drop policy "sentences: owner can delete" on public.sentences;
