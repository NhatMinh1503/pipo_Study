-- pipo_Study · demo study history for ONE existing account (manual testing only)
--
-- What it adds (all dated in the past, in the learner's own time zone):
--   * ~60 days of study: a completed lesson or two per study day (5 sentences each, with
--     wrong first tries, hints and error tags), Pomodoro sessions and the trees they grew,
--     flashcard reviews, and the matching XP / Coins ledger rows
--   * a current streak of 21 days ending yesterday (study today to make it 22)
--   * flashcards from the lessons' words, about a third due now
--   * 50,000 Coins, and XP set 6 short of the next level, so the next passed sentence
--     plays the level-up moment; one unseen level-up so the moment also shows at login
--   * the welcome-gift items (pond + stone lantern), as a new account would get them
--
-- How to run: Supabase Dashboard → SQL Editor → paste → set v_email → Run.
-- Needs every migration applied first (`supabase db push`).
-- Runs once per account: a second run stops without changing anything.
-- Undo: see the commented block at the end of this file.

do $$
declare
  v_email constant text := 'YOUR_EMAIL_HERE';
  v_days constant integer := 60;
  v_streak constant integer := 21;
  v_coins_grant constant integer := 50000;

  v_uid uuid;
  v_tz text;
  v_lang public.learning_language;
  v_level public.proficiency_level;
  v_today date;
  v_day date;
  v_base timestamptz;
  v_at timestamptz;
  v_pool jsonb;
  v_vocab jsonb;
  v_entry jsonb;
  v_lesson uuid;
  v_sentence uuid;
  v_attempt uuid;
  v_session uuid;
  v_tree uuid;
  v_tree_sessions integer := 4;
  v_trees integer := 0;
  v_garden integer;
  v_plot integer;
  v_species public.tree_species;
  v_vocab_id uuid;
  v_studied boolean;
  v_has_growing boolean;
  v_last_end timestamptz;
  v_wrong boolean;
  v_points integer;
  v_lessons_today integer;
  v_pos integer := 0;
  v_xp integer := 0;
  v_coins integer := 0;
  v_run integer := 0;
  v_best integer := 0;
  v_xp_now integer;
  v_next_level integer;
  v_target integer;
  v_lessons integer := 0;
  v_sessions integer := 0;
  v_cards integer := 0;
  d integer;
  i integer;
  j integer;
begin
  select id into v_uid from auth.users where lower(email) = lower(v_email);
  if v_uid is null then
    raise exception 'No account with email %', v_email;
  end if;
  if exists (select 1 from public.transactions where user_id = v_uid and idempotency_key = 'demo:seeded') then
    raise notice 'Demo data was already added for %; nothing changed.', v_email;
    return;
  end if;
  -- A tree the learner is growing now stays the growing one; demo trees all come out grown
  v_has_growing := exists (select 1 from public.garden_trees where user_id = v_uid and sessions < 4);

  select coalesce(timezone, 'Asia/Tokyo'), coalesce(learning_language, 'ja'), level
  into v_tz, v_lang, v_level
  from public.profiles where user_id = v_uid;
  v_tz := coalesce(v_tz, 'Asia/Tokyo');
  v_lang := coalesce(v_lang, 'ja');
  if v_level is null or not public.level_matches_language(v_lang, v_level) then
    v_level := case v_lang when 'ja' then 'N3' else 'B1' end;
  end if;
  v_today := (now() at time zone v_tz)::date;
  perform setseed(0.1302);

  -- [source, reference translation, a wrong first try, the error tag of that try]
  if v_lang = 'ja' then
    v_pool := $json$[
      ["今日は朝から雨が降っているので、傘を持って出かけました。", "Hôm nay trời mưa từ sáng nên tôi đã mang ô ra ngoài.", "Hôm nay trời mưa từ sáng nên tôi mang ô đi về.", "word_choice"],
      ["駅の近くに新しいパン屋ができたそうです。", "Nghe nói gần nhà ga mới mở một tiệm bánh mì.", "Gần nhà ga đã mở một tiệm bánh mì mới.", "omission"],
      ["週末は友達と映画を見に行く予定です。", "Cuối tuần tôi định đi xem phim với bạn.", "Cuối tuần tôi đã đi xem phim với bạn.", "tense"],
      ["先生に日本語の作文を見ていただきました。", "Tôi đã được thầy xem giúp bài văn tiếng Nhật.", "Thầy giáo xem bài văn tiếng Nhật.", "politeness"],
      ["猫が窓のそばで気持ちよさそうに寝ています。", "Con mèo đang ngủ có vẻ rất dễ chịu bên cửa sổ.", "Con mèo ngủ bên cửa sổ.", "omission"],
      ["この道をまっすぐ行くと、右側に郵便局があります。", "Đi thẳng con đường này thì bưu điện ở bên phải.", "Đi thẳng con đường này, bưu điện ở bên trái.", "meaning"],
      ["毎晩寝る前に、日記を書くことにしています。", "Tôi tập thói quen viết nhật ký mỗi tối trước khi ngủ.", "Tôi quyết định viết nhật ký trước khi ngủ.", "verb_form"],
      ["母が作ってくれたお弁当はとてもおいしかったです。", "Hộp cơm mẹ làm cho tôi rất ngon.", "Hộp cơm tôi làm cho mẹ rất ngon.", "particle"],
      ["会議は三時からなので、まだ時間があります。", "Cuộc họp bắt đầu từ ba giờ nên vẫn còn thời gian.", "Cuộc họp đến ba giờ nên vẫn còn thời gian.", "particle"],
      ["電車が遅れたせいで、授業に間に合いませんでした。", "Vì tàu đến trễ nên tôi đã không kịp giờ học.", "Tàu đến trễ nhờ vậy tôi không kịp giờ học.", "word_choice"],
      ["京都には古いお寺がたくさん残っています。", "Ở Kyoto vẫn còn lại rất nhiều ngôi chùa cổ.", "Kyoto có nhiều chùa.", "omission"],
      ["健康のために、エレベーターではなく階段を使っています。", "Vì sức khỏe, tôi dùng cầu thang bộ thay vì thang máy.", "Vì sức khỏe, tôi dùng thang máy thay vì cầu thang bộ.", "meaning"],
      ["日本に来てから、料理をするようになりました。", "Từ khi đến Nhật, tôi đã bắt đầu nấu ăn.", "Từ khi đến Nhật, tôi nấu ăn.", "verb_form"],
      ["宿題を忘れないように、メモを書いておきました。", "Tôi đã ghi chú sẵn để không quên bài tập.", "Tôi ghi chú để quên bài tập.", "verb_form"],
      ["雨が止んだら、公園を散歩しましょう。", "Khi tạnh mưa thì mình đi dạo công viên nhé.", "Mưa tạnh rồi, đi dạo công viên.", "naturalness"],
      ["この本は難しすぎて、半分しか読めませんでした。", "Cuốn sách này khó quá nên tôi chỉ đọc được một nửa.", "Cuốn sách này khó nên tôi đọc một nửa.", "grammar"],
      ["部長は明日の朝、大阪へいらっしゃいます。", "Sáng mai trưởng phòng sẽ đi Osaka.", "Sáng mai trưởng phòng đến từ Osaka.", "politeness"],
      ["窓を開けたまま寝てしまって、風邪をひきました。", "Tôi lỡ ngủ quên mà để cửa sổ mở nên bị cảm.", "Tôi mở cửa sổ rồi ngủ, bị cảm.", "grammar"],
      ["新しい仕事に慣れるまで、少し時間がかかりそうです。", "Có vẻ sẽ mất một chút thời gian cho tới khi quen với công việc mới.", "Quen công việc mới mất nhiều thời gian.", "word_choice"],
      ["来年こそ日本語能力試験に合格したいです。", "Năm sau nhất định tôi muốn đỗ kỳ thi năng lực tiếng Nhật.", "Năm sau tôi đỗ kỳ thi năng lực tiếng Nhật.", "omission"]
    ]$json$;
    -- [term, reading, part of speech, meaning, pool index of the context sentence]
    v_vocab := $json$[
      ["傘", "かさ", "Danh từ", "cái ô", 0], ["降る", "ふる", "Động từ nhóm I", "rơi (mưa, tuyết)", 0],
      ["予定", "よてい", "Danh từ", "dự định, kế hoạch", 2], ["作文", "さくぶん", "Danh từ", "bài văn", 3],
      ["窓", "まど", "Danh từ", "cửa sổ", 4], ["郵便局", "ゆうびんきょく", "Danh từ", "bưu điện", 5],
      ["日記", "にっき", "Danh từ", "nhật ký", 6], ["お弁当", "おべんとう", "Danh từ", "hộp cơm", 7],
      ["会議", "かいぎ", "Danh từ", "cuộc họp", 8], ["遅れる", "おくれる", "Động từ nhóm II", "trễ, muộn", 9],
      ["間に合う", "まにあう", "Động từ nhóm I", "kịp giờ", 9], ["お寺", "おてら", "Danh từ", "chùa", 10],
      ["健康", "けんこう", "Danh từ / Tính từ na", "sức khỏe; khỏe mạnh", 11], ["階段", "かいだん", "Danh từ", "cầu thang", 11],
      ["料理", "りょうり", "Danh từ / Động từ nhóm III", "món ăn; nấu ăn", 12], ["宿題", "しゅくだい", "Danh từ", "bài tập về nhà", 13],
      ["忘れる", "わすれる", "Động từ nhóm II", "quên", 13], ["散歩", "さんぽ", "Danh từ / Động từ nhóm III", "đi dạo", 14],
      ["難しい", "むずかしい", "Tính từ i", "khó", 15], ["部長", "ぶちょう", "Danh từ", "trưởng phòng", 16],
      ["風邪", "かぜ", "Danh từ", "cảm lạnh", 17], ["慣れる", "なれる", "Động từ nhóm II", "quen với", 18],
      ["合格", "ごうかく", "Danh từ / Động từ nhóm III", "thi đỗ", 19], ["試験", "しけん", "Danh từ", "kỳ thi", 19]
    ]$json$;
  else
    v_pool := $json$[
      ["I have been learning Japanese for two years.", "Tôi đã học tiếng Nhật được hai năm.", "Tôi học tiếng Nhật hai năm trước.", "tense"],
      ["If it rains tomorrow, we will stay at home.", "Nếu mai trời mưa, chúng tôi sẽ ở nhà.", "Mai trời mưa nên chúng tôi ở nhà.", "grammar"],
      ["She asked me to pick up some bread on the way home.", "Cô ấy nhờ tôi mua ít bánh mì trên đường về.", "Cô ấy hỏi tôi nhặt bánh mì trên đường về.", "word_choice"],
      ["The meeting has been moved to Friday afternoon.", "Cuộc họp đã được dời sang chiều thứ Sáu.", "Cuộc họp được tổ chức chiều thứ Sáu.", "meaning"],
      ["I'm looking forward to seeing you next week.", "Tôi rất mong được gặp bạn vào tuần sau.", "Tôi đang nhìn về phía trước để gặp bạn tuần sau.", "naturalness"],
      ["He couldn't finish the report because his computer broke.", "Anh ấy không thể hoàn thành báo cáo vì máy tính bị hỏng.", "Anh ấy hoàn thành báo cáo dù máy tính hỏng.", "meaning"],
      ["There are fewer tourists in the city during winter.", "Vào mùa đông, thành phố có ít khách du lịch hơn.", "Mùa đông thành phố có ít khách du lịch.", "omission"],
      ["You should have told me earlier.", "Lẽ ra bạn nên nói với tôi sớm hơn.", "Bạn nên nói với tôi sớm hơn.", "verb_form"],
      ["The book I borrowed from the library is due on Monday.", "Cuốn sách tôi mượn ở thư viện phải trả vào thứ Hai.", "Cuốn sách tôi mượn thư viện đến hạn thứ Hai.", "naturalness"],
      ["Most people in my office walk to work.", "Phần lớn mọi người ở văn phòng tôi đi bộ đi làm.", "Mọi người ở văn phòng tôi đi bộ đi làm.", "omission"],
      ["I didn't use to like coffee, but now I drink it every day.", "Trước đây tôi không thích cà phê, nhưng giờ ngày nào tôi cũng uống.", "Tôi đã không dùng để thích cà phê.", "grammar"],
      ["Could you tell me where the nearest station is?", "Bạn có thể chỉ giúp tôi ga gần nhất ở đâu không?", "Bạn nói tôi ga gần nhất ở đâu.", "politeness"],
      ["The new park was opened by the mayor last month.", "Công viên mới đã được thị trưởng khánh thành vào tháng trước.", "Thị trưởng mở công viên mới tháng trước.", "naturalness"],
      ["It's the first time I've ever eaten sushi.", "Đây là lần đầu tiên tôi được ăn sushi.", "Lần đầu tôi ăn sushi.", "naturalness"],
      ["We ran out of milk, so I went to the store.", "Nhà hết sữa nên tôi đã ra cửa hàng.", "Chúng tôi chạy ra khỏi sữa nên tôi đi cửa hàng.", "word_choice"]
    ]$json$;
    v_vocab := $json$[
      ["learn", "/lɜːn/", "Động từ", "học", 0], ["stay", "/steɪ/", "Động từ", "ở lại", 1],
      ["pick up", "/pɪk ʌp/", "Cụm động từ", "mua tiện đường; đón", 2], ["move", "/muːv/", "Động từ", "dời, chuyển", 3],
      ["look forward to", "/lʊk ˈfɔːwəd tuː/", "Cụm động từ", "mong chờ", 4], ["report", "/rɪˈpɔːt/", "Danh từ", "báo cáo", 5],
      ["tourist", "/ˈtʊərɪst/", "Danh từ", "khách du lịch", 6], ["earlier", "/ˈɜːliə/", "Trạng từ", "sớm hơn", 7],
      ["borrow", "/ˈbɒrəʊ/", "Động từ", "mượn", 8], ["due", "/djuː/", "Tính từ", "đến hạn", 8],
      ["office", "/ˈɒfɪs/", "Danh từ", "văn phòng", 9], ["used to", "/juːst tuː/", "Cụm động từ", "đã từng (thói quen cũ)", 10],
      ["nearest", "/ˈnɪərɪst/", "Tính từ", "gần nhất", 11], ["mayor", "/meə/", "Danh từ", "thị trưởng", 12],
      ["ever", "/ˈevə/", "Trạng từ", "từng, bao giờ", 13], ["run out of", "/rʌn aʊt əv/", "Cụm động từ", "hết, cạn", 14]
    ]$json$;
  end if;

  -- Oldest day first, so trees grow in order and the best streak can be counted
  for d in reverse v_days..1 loop
    v_day := v_today - d;
    v_studied := d <= v_streak or (d % 5 <> 0 and d <> v_streak + 1);
    if not v_studied then
      v_run := 0;
      continue;
    end if;
    v_run := v_run + 1;
    v_best := greatest(v_best, v_run);
    v_base := (v_day::timestamp + interval '7 hours') at time zone v_tz;

    -- Pomodoro: 1–3 sessions in the morning, each tending the garden like complete_pomodoro
    for i in 1..(1 + floor(random() * 3))::integer loop
      v_at := v_base + make_interval(mins => (i - 1) * 35 + floor(random() * 10)::integer);
      if v_tree_sessions >= 4 then
        v_species := case when v_trees % 2 = 0 then 'pine' else 'bamboo' end;
        select o_garden, o_plot into v_garden, v_plot from public.next_garden_plot(v_uid);
        -- Stored as grown right away (only one tree may be growing); the last one is fixed below
        insert into public.garden_trees (user_id, garden_index, plot_index, species, sessions, planted_at, created_at)
        values (v_uid, v_garden, v_plot, v_species, 4, v_at + interval '25 minutes', v_at + interval '25 minutes')
        returning id into v_tree;
        v_tree_sessions := 1;
        v_trees := v_trees + 1;
      else
        v_tree_sessions := v_tree_sessions + 1;
        if v_tree_sessions >= 4 then
          update public.garden_trees set matured_at = v_at + interval '25 minutes' where id = v_tree;
        end if;
      end if;
      v_last_end := v_at + interval '25 minutes';
      insert into public.pomodoro_sessions (user_id, planned_minutes, status, started_at, ended_at, created_at, species, garden_tree_id)
      values (v_uid, 25, 'completed', v_at, v_at + interval '25 minutes', v_at, v_species, v_tree)
      returning id into v_session;
      insert into public.transactions (user_id, xp_delta, coins_delta, reason, idempotency_key, metadata, created_at)
      values (v_uid, 0, 5, 'pomodoro_completed', 'demo:pomodoro:' || v_session,
        jsonb_build_object('sessionId', v_session, 'treeId', v_tree, 'minutes', 25, 'demo', true),
        v_at + interval '25 minutes');
      v_coins := v_coins + 5;
      v_sessions := v_sessions + 1;
    end loop;

    -- Lessons in the evening: 1, or 2 every third day
    v_lessons_today := case when d % 3 = 0 then 2 else 1 end;
    for i in 1..v_lessons_today loop
      v_lessons := v_lessons + 1;
      v_at := v_base + interval '12 hours' + make_interval(mins => (i - 1) * 50);
      insert into public.lessons (user_id, title, language, level, source, completed_at, created_at, updated_at)
      values (v_uid, '[Demo] Luyện dịch #' || v_lessons, v_lang, v_level, 'manual',
        v_at + interval '20 minutes', v_at, v_at + interval '20 minutes')
      returning id into v_lesson;

      for j in 0..4 loop
        v_entry := v_pool -> (v_pos % jsonb_array_length(v_pool));
        v_pos := v_pos + 1;
        v_at := v_at + interval '3 minutes';
        insert into public.sentences (lesson_id, user_id, position, source_text, reference_translation, completed_at, created_at)
        values (v_lesson, v_uid, j, v_entry ->> 0, v_entry ->> 1, v_at, v_at - interval '3 minutes')
        returning id into v_sentence;

        v_wrong := random() < 0.3;
        if v_wrong then
          insert into public.attempts (user_id, sentence_id, user_translation, verdict, feedback, hint, error_tags, created_at)
          values (v_uid, v_sentence, v_entry ->> 2, 'incorrect',
            case v_entry ->> 3
              when 'particle' then 'Trợ từ trong câu gốc đổi vai trò của các thành phần; bản dịch đang hiểu ngược.'
              when 'verb_form' then 'Thể của động từ mang thêm sắc thái mà bản dịch chưa thể hiện.'
              when 'tense' then 'Thì của câu gốc khác với bản dịch.'
              when 'politeness' then 'Câu gốc dùng kính ngữ; bản dịch chưa giữ được sắc thái lịch sự.'
              when 'word_choice' then 'Một từ được dịch chưa đúng nghĩa trong ngữ cảnh này.'
              when 'omission' then 'Bản dịch bỏ sót một phần ý của câu gốc.'
              when 'meaning' then 'Ý chính của câu bị hiểu sai.'
              when 'naturalness' then 'Nghĩa gần đúng nhưng câu tiếng Việt chưa tự nhiên.'
              else 'Cấu trúc ngữ pháp của câu gốc chưa được dịch đúng.'
            end,
            'Đọc lại phần cuối câu gốc và xem nó thêm ý gì cho cả câu.',
            array[v_entry ->> 3], v_at - interval '1 minute')
          returning id into v_attempt;
          insert into public.error_logs (user_id, attempt_id, tag, created_at)
          values (v_uid, v_attempt, v_entry ->> 3, v_at - interval '1 minute');
        end if;
        insert into public.attempts (user_id, sentence_id, user_translation, verdict, feedback, hint, error_tags, created_at)
        values (v_uid, v_sentence, v_entry ->> 1,
          case when random() < 0.75 then 'exact' else 'acceptable' end::public.translation_verdict,
          'Bản dịch đúng ý và tự nhiên.', null, '{}', v_at);
        v_points := case when v_wrong then 7 else 10 end;
        insert into public.transactions (user_id, xp_delta, coins_delta, reason, idempotency_key, metadata, created_at)
        values (v_uid, v_points, 0, 'sentence_passed', 'demo:sentence:' || v_sentence,
          jsonb_build_object('sentenceId', v_sentence, 'lessonId', v_lesson, 'demo', true), v_at);
        v_xp := v_xp + v_points;
      end loop;

      insert into public.transactions (user_id, xp_delta, coins_delta, reason, idempotency_key, metadata, created_at)
      values (v_uid, 5, 4, 'lesson_bonus', 'demo:lesson:' || v_lesson,
        jsonb_build_object('lessonId', v_lesson, 'demo', true), v_at + interval '1 minute');
      v_xp := v_xp + 5;
      v_coins := v_coins + 4;
    end loop;

    -- Flashcard reviews at night (1 XP each), clearing the queue on most days
    for i in 1..(4 + floor(random() * 8))::integer loop
      insert into public.transactions (user_id, xp_delta, coins_delta, reason, idempotency_key, metadata, created_at)
      values (v_uid, 1, 0, 'flashcard_review', 'demo:review:' || v_day || ':' || i,
        jsonb_build_object('demo', true), v_base + interval '15 hours' + make_interval(mins => i));
      v_xp := v_xp + 1;
    end loop;
    if d % 4 <> 0 then
      insert into public.transactions (user_id, xp_delta, coins_delta, reason, idempotency_key, metadata, created_at)
      values (v_uid, 5, 0, 'review_clear', 'demo:review_clear:' || v_day,
        jsonb_build_object('demo', true), v_base + interval '15 hours 20 minutes');
      v_xp := v_xp + 5;
    end if;
  end loop;

  -- The last demo tree: still growing, unless the learner already grows one
  if v_tree is not null and v_tree_sessions < 4 then
    if v_has_growing then
      update public.garden_trees set matured_at = v_last_end where id = v_tree;
    else
      update public.garden_trees set sessions = v_tree_sessions where id = v_tree;
    end if;
  end if;

  -- Notebook: one card per word, linked to a demo sentence; about a third due now
  for i in 0..jsonb_array_length(v_vocab) - 1 loop
    v_entry := v_vocab -> i;
    select s.id into v_sentence
    from public.sentences s join public.lessons l on l.id = s.lesson_id
    where l.user_id = v_uid and l.title like '[Demo]%'
      and s.source_text = v_pool -> ((v_entry ->> 4)::integer) ->> 0
    order by s.created_at desc limit 1;
    v_at := now() - make_interval(days => 5 + floor(random() * 50)::integer);
    v_vocab_id := null;
    insert into public.vocab_items (user_id, language, term, reading, part_of_speech, meaning,
      context_sentence, context_translation, sentence_id, created_at, updated_at)
    values (v_uid, v_lang, v_entry ->> 0, v_entry ->> 1, v_entry ->> 2, v_entry ->> 3,
      v_pool -> ((v_entry ->> 4)::integer) ->> 0, v_pool -> ((v_entry ->> 4)::integer) ->> 1,
      v_sentence, v_at, v_at)
    on conflict (user_id, language, term) do nothing
    returning id into v_vocab_id;
    continue when v_vocab_id is null;
    insert into public.flashcards (user_id, vocab_item_id, due_date, interval_days, ease, repetitions, lapses, last_reviewed_at, created_at)
    values (v_uid, v_vocab_id,
      case i % 3
        when 0 then now() - make_interval(hours => 1 + i)
        when 1 then now() + make_interval(days => 1 + i % 5)
        else now() + make_interval(days => 7 + i)
      end,
      case i % 3 when 0 then 1 when 1 then 3 else 14 end,
      case i % 3 when 0 then 2.30 when 1 then 2.50 else 2.70 end,
      case i % 3 when 0 then 1 when 1 then 2 else 4 end,
      case when i % 5 = 0 then 1 else 0 end,
      now() - make_interval(days => 2 + i % 6), v_at);
    v_cards := v_cards + 1;
  end loop;

  -- Balance: history + the Coins grant, with XP landing 6 short of the next level
  select xp into v_xp_now from public.wallets where user_id = v_uid for update;
  v_xp_now := v_xp_now + v_xp;
  v_next_level := public.level_for_xp(v_xp_now) + 1;
  while public.xp_to_reach(v_next_level) - 6 < v_xp_now loop
    v_next_level := v_next_level + 1;
  end loop;
  v_target := public.xp_to_reach(v_next_level) - 6;

  insert into public.transactions (user_id, xp_delta, coins_delta, reason, idempotency_key, metadata, created_at)
  values (v_uid, v_target - v_xp_now, v_coins_grant, 'demo_grant', 'demo:seeded',
    jsonb_build_object('demo', true, 'note', 'test data'), (v_today - v_days)::timestamp at time zone v_tz);

  update public.wallets
  set xp = v_target,
      coins = coins + v_coins + v_coins_grant,
      streak_current = v_streak,
      streak_best = greatest(streak_best, v_best),
      last_active_date = v_today - 1
  where user_id = v_uid;

  -- One level-up moment waiting at login (the real next one comes with the next sentence)
  insert into public.level_ups (user_id, kind, from_level, to_level, from_stars, to_stars,
    xp_total, xp_into_level, xp_to_next, source_reason, idempotency_key)
  values (v_uid, 'level', greatest(1, v_next_level - 2), v_next_level - 1, 0, 0,
    v_target, public.xp_into_level(v_target), public.xp_to_next_level(v_target),
    'lesson_bonus', 'demo:levelup');

  -- The welcome event's gifts, as an account created today would get them
  if to_regclass('public.welcome_gifts') is not null then
    insert into public.purchases (user_id, item_id)
    select v_uid, item_id from public.welcome_gifts
    where starts_at <= now() and (ends_at is null or ends_at > now())
    on conflict do nothing;
  end if;

  raise notice 'Demo data added for %: % lessons, % Pomodoro sessions, % trees, % cards, Lv% (% XP), +% Coins, streak % (best %).',
    v_email, v_lessons, v_sessions, v_trees, v_cards, v_next_level - 1, v_target,
    v_coins + v_coins_grant, v_streak, greatest(v_best, v_streak);
end;
$$;

-- ---------------------------------------------------------------------------------------
-- Undo (run separately if you want the demo data gone). Set the email first.
-- ---------------------------------------------------------------------------------------
-- do $$
-- declare
--   v_uid uuid := (select id from auth.users where lower(email) = lower('YOUR_EMAIL_HERE'));
-- begin
--   update public.wallets w
--   set xp = greatest(0, w.xp - t.xp), coins = greatest(0, w.coins - t.coins)
--   from (select coalesce(sum(xp_delta), 0)::integer as xp, coalesce(sum(coins_delta), 0)::integer as coins
--         from public.transactions where user_id = v_uid and idempotency_key like 'demo:%') t
--   where w.user_id = v_uid;
--   delete from public.pomodoro_sessions where user_id = v_uid and id in (
--     select (metadata ->> 'sessionId')::uuid from public.transactions
--     where user_id = v_uid and idempotency_key like 'demo:pomodoro:%');
--   delete from public.garden_trees where user_id = v_uid and id in (
--     select (metadata ->> 'treeId')::uuid from public.transactions
--     where user_id = v_uid and idempotency_key like 'demo:pomodoro:%');
--   delete from public.vocab_items where user_id = v_uid and sentence_id in (
--     select s.id from public.sentences s join public.lessons l on l.id = s.lesson_id
--     where l.user_id = v_uid and l.title like '[Demo]%');
--   delete from public.lessons where user_id = v_uid and title like '[Demo]%';
--   delete from public.level_ups where user_id = v_uid and idempotency_key = 'demo:levelup';
--   delete from public.transactions where user_id = v_uid and idempotency_key like 'demo:%';
-- end;
-- $$;
