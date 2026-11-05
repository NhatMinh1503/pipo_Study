-- A battle closed because both players went away: nobody wins.
-- Kept in its own migration so the new enum value is committed before any later
-- migration or function uses it.
alter type public.battle_status add value if not exists 'abandoned';
