-- Queue-clear bonus (xp-levels spec §3.4, task T5): +5 XP once per local day when, right
-- after a rewarded review, no card is due any more and the learner has made at least 5
-- rewarded reviews today. Values mirror lib/game/config.ts (review.clearBonusXp,
-- review.clearMinReviews). Returns the XP paid (0 or 5).
create function public.award_review_clear(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text;
  v_today date;
  v_reviews integer;
begin
  perform 1 from public.wallets where user_id = p_user_id for update;
  if not found then
    raise exception 'wallet not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.flashcards where user_id = p_user_id and due_date <= now()
  ) then
    return 0;
  end if;

  select coalesce((select timezone from public.profiles where user_id = p_user_id), 'UTC')
  into v_timezone;
  v_today := (now() at time zone v_timezone)::date;

  select count(*) into v_reviews
  from public.transactions
  where user_id = p_user_id
    and reason = 'flashcard_review'
    and (created_at at time zone v_timezone)::date = v_today;
  if v_reviews < 5 then
    return 0;
  end if;

  if public.wallet_apply(p_user_id, 5, 0, 'review_clear', 'review_clear:' || v_today::text) then
    return 5;
  end if;
  return 0;
end;
$$;

revoke execute on function public.award_review_clear from public, anon, authenticated;
grant execute on function public.award_review_clear to service_role;
