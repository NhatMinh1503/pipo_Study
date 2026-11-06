-- Review rewards depend on a card's schedule (due_date, repetitions, lapses): a review pays
-- only for a due card that was reviewed before (xp-levels spec §3.3). Learners could write
-- every flashcard column directly, so they could create or edit cards that look "due and
-- reviewed before" and farm XP without limit. From now on:
--   * learners may only insert a new card for a saved word (user_id, vocab_item_id);
--     the schedule starts from the column defaults;
--   * only the server (review action, service role) changes the schedule;
--   * learners can still read and delete their own cards.
revoke insert, update on public.flashcards from authenticated;
grant insert (user_id, vocab_item_id) on public.flashcards to authenticated;

drop policy "flashcards: owner can update" on public.flashcards;
