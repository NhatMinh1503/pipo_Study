-- Local development seed data. Never put real user data here.
-- Demo accounts (password: password123):
--   demo@pipo.local   — onboarded, Japanese N4, has one lesson and three flashcards
--   demo2@pipo.local  — onboarded, English B1, no data (used to check isolation)

insert into public.app_health (id, status, message)
values (1, 'ok', 'Hello pipo — database connected')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Auth users (profiles + wallets are created by the on_auth_user_created trigger)
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
values
  (
    '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated', 'demo@pipo.local',
    extensions.crypt('password123', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated', 'demo2@pipo.local',
    extensions.crypt('password123', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  );

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now()
from auth.users u
where u.email in ('demo@pipo.local', 'demo2@pipo.local');

update public.profiles
set display_name = 'Minh Demo', learning_language = 'ja', level = 'N4', onboarded_at = now()
where user_id = '11111111-1111-1111-1111-111111111111';

update public.profiles
set display_name = 'Demo Two', learning_language = 'en', level = 'B1', onboarded_at = now()
where user_id = '22222222-2222-2222-2222-222222222222';

update public.wallets set xp = 120, coins = 35, streak_current = 3, streak_best = 5,
  last_active_date = current_date
where user_id = '11111111-1111-1111-1111-111111111111';

-- ---------------------------------------------------------------------------
-- Sample lesson for demo@pipo.local
-- ---------------------------------------------------------------------------
insert into public.lessons (id, user_id, title, language, level)
values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        'スーパーで買い物', 'ja', 'N4');

insert into public.sentences (lesson_id, user_id, position, source_text, reference_translation)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 0,
   '昨日、駅の近くのスーパーに行きました。', 'Hôm qua tôi đã đi siêu thị gần nhà ga.'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 1,
   '野菜と果物がとても安かったです。', 'Rau và trái cây rất rẻ.'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 2,
   'りんごを三つとバナナを一房買いました。', 'Tôi đã mua ba quả táo và một nải chuối.'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 3,
   'レジの前に長い列がありました。', 'Trước quầy thu ngân có một hàng dài.'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 4,
   '家に帰ってから、晩ご飯を作りました。', 'Sau khi về nhà, tôi đã nấu bữa tối.');

-- ---------------------------------------------------------------------------
-- Vocabulary + flashcards for demo@pipo.local
-- ---------------------------------------------------------------------------
with items as (
  insert into public.vocab_items (user_id, language, term, reading, part_of_speech, meaning,
                                  context_sentence, context_translation)
  values
    ('11111111-1111-1111-1111-111111111111', 'ja', '駅', 'えき', 'noun', 'nhà ga',
     '昨日、駅の近くのスーパーに行きました。', 'Hôm qua tôi đã đi siêu thị gần nhà ga.'),
    ('11111111-1111-1111-1111-111111111111', 'ja', '安い', 'やすい', 'i-adjective', 'rẻ',
     '野菜と果物がとても安かったです。', 'Rau và trái cây rất rẻ.'),
    ('11111111-1111-1111-1111-111111111111', 'ja', '列', 'れつ', 'noun', 'hàng (người xếp hàng)',
     'レジの前に長い列がありました。', 'Trước quầy thu ngân có một hàng dài.')
  returning id, user_id
)
insert into public.flashcards (user_id, vocab_item_id, due_date)
select user_id, id, now() from items;
