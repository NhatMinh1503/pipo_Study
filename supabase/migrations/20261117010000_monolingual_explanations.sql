-- Explanations cached for a word in its own language (Japanese word, Japanese UI) were written
-- by the v1 prompt in ordinary dictionary Japanese/English, too hard for beginners. The v2 prompt
-- explains them with the easiest words, so drop the old ones; they are regenerated on demand.
-- This table is only a shared cache: no learner data is lost.
delete from public.word_explanations
where language::text = display_language::text;
