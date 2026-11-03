-- Progress columns (completed_at, reference_translation) are written by the server only.
-- Owners keep update rights on the columns they legitimately edit.

revoke update on public.sentences from authenticated;
grant update (tokens) on public.sentences to authenticated;

revoke update on public.lessons from authenticated;
grant update (title) on public.lessons to authenticated;
