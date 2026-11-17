-- Daily review goal fix (streak-goals.md §1): new cards count too.
--
-- The goal only counted cards seen before, so a learner whose due cards were all new saw
-- "nothing due today" next to "9 cards waiting" and could never reach the goal. The target is
-- now min(5, every card due at the first look of the day) and progress is the number of
-- different cards reviewed today. Today's rows that were fixed at 0 are recomputed once.

update public.daily_goal_days d
set review_target = least(5, (
  select count(*) from public.flashcards f where f.user_id = d.user_id and f.due_date <= now()
))
where d.review_target = 0 and d.review_done_at is null and d.rewarded_at is null
  and d.local_date >= (now() at time zone 'UTC')::date - 1;

-- Today's goals for the signed-in learner. Records goals reached so far (they never un-tick)
-- and pays the all-goals bonus once per local day.
create or replace function public.today_goals()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text;
  v_today date;
  v_day public.daily_goal_days;
  v_sentences integer;
  v_reviews integer;
  v_focus integer;
  v_translate_target constant integer := 3;
  v_focus_target constant integer := 1;
  v_bonus constant integer := 5;
  v_just_rewarded boolean := false;
begin
  if v_user_id is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  select coalesce((select timezone from public.profiles where user_id = v_user_id), 'UTC')
  into v_timezone;
  v_today := (now() at time zone v_timezone)::date;

  insert into public.daily_goal_days (user_id, local_date, review_target)
  values (
    v_user_id, v_today,
    least(5, (
      select count(*) from public.flashcards
      where user_id = v_user_id and due_date <= now()
    ))
  )
  on conflict (user_id, local_date) do nothing;

  select * into v_day from public.daily_goal_days
  where user_id = v_user_id and local_date = v_today
  for update;

  select count(*) into v_sentences from public.reward_claims
  where user_id = v_user_id and kind = 'sentence'
    and (created_at at time zone v_timezone)::date = v_today;

  -- Cards reviewed today (new ones included), each counted once
  select count(*) into v_reviews from public.flashcards
  where user_id = v_user_id
    and (last_reviewed_at at time zone v_timezone)::date = v_today;

  select count(*) into v_focus from public.pomodoro_sessions
  where user_id = v_user_id and status = 'completed'
    and (ended_at at time zone v_timezone)::date = v_today;

  update public.daily_goal_days
  set translate_done_at = coalesce(translate_done_at,
        case when v_sentences >= v_translate_target then now() end),
      review_done_at = coalesce(review_done_at,
        case when review_target > 0 and v_reviews >= review_target then now() end),
      focus_done_at = coalesce(focus_done_at,
        case when v_focus >= v_focus_target then now() end)
  where user_id = v_user_id and local_date = v_today
  returning * into v_day;

  if v_day.rewarded_at is null
    and v_day.translate_done_at is not null
    and v_day.focus_done_at is not null
    and (v_day.review_target = 0 or v_day.review_done_at is not null)
  then
    perform public.wallet_apply(
      v_user_id, 0, v_bonus, 'daily_goals', 'daily_goals:' || v_today::text
    );
    update public.daily_goal_days set rewarded_at = now()
    where user_id = v_user_id and local_date = v_today
    returning * into v_day;
    v_just_rewarded := true;
  end if;

  return jsonb_build_object(
    'date', v_today,
    'translate', jsonb_build_object('count', v_sentences, 'target', v_translate_target,
      'done', v_day.translate_done_at is not null),
    'review', jsonb_build_object('count', v_reviews, 'target', v_day.review_target,
      'done', v_day.review_done_at is not null, 'applicable', v_day.review_target > 0),
    'focus', jsonb_build_object('count', v_focus, 'target', v_focus_target,
      'done', v_day.focus_done_at is not null),
    'bonusCoins', v_bonus,
    'rewarded', v_day.rewarded_at is not null,
    'justRewarded', v_just_rewarded
  );
end;
$$;

revoke execute on function public.today_goals from public, anon;
grant execute on function public.today_goals to authenticated;
