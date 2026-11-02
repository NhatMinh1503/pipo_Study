-- Creates a lesson and all of its sentences atomically.
-- security invoker: runs as the caller, so the normal RLS policies still apply.

create function public.create_lesson(
  p_title text,
  p_language public.learning_language,
  p_level public.proficiency_level,
  p_sentences text[],
  p_source public.lesson_source default 'manual'
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

  insert into public.lessons (user_id, title, language, level, source)
  values (v_user_id, p_title, p_language, p_level, p_source)
  returning id into v_lesson_id;

  insert into public.sentences (lesson_id, user_id, position, source_text)
  select v_lesson_id, v_user_id, ordinality - 1, sentence
  from unnest(p_sentences) with ordinality as t(sentence, ordinality);

  return v_lesson_id;
end;
$$;

revoke execute on function public.create_lesson from public, anon;
grant execute on function public.create_lesson to authenticated, service_role;
