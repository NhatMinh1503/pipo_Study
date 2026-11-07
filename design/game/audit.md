# 🎮 Game Audit — pipo_Study

> Khảo sát toàn bộ lớp game hiện có, đối chiếu với PRD mục F (Gamification & Kinh tế) và G (Cộng đồng).
> Chỉ đọc code, **không sửa code**. Ngày: 2026-11-05 · Branch: `feat/game-rework`.
> Thang đánh giá theo `.claude/docs/game-pillars.md`: P1 Learning first · P2 Thưởng nỗ lực & độ chính xác · P3 Cảm nhận được tiến bộ · P4 Cạnh tranh tử tế · P5 Tôn trọng thời gian & ví.

---

## 0. Tóm tắt

| #   | Hệ thống                       | Trạng thái                                                 | Đề xuất                                 |
| --- | ------------------------------ | ---------------------------------------------------------- | --------------------------------------- |
| 1   | Ví XP / Coins (`wallet_apply`) | Nền tảng chắc (server-side, idempotent, khoá dòng)         | ✅ **Giữ**                              |
| 2   | XP từ dịch bài                 | Chỉ thưởng khi xong cả bài → **lỗi #1**                    | 🔧 **Sửa** (thưởng theo câu)            |
| 3   | XP từ ôn thẻ                   | +1 XP mỗi lượt, **farm được** bằng nút Again               | 🔧 **Sửa**                              |
| 4   | Level                          | Không có                                                   | 🆕 **Làm mới** (spec trước)             |
| 5   | Streak                         | Có, nhưng hiển thị sai khi đứt chuỗi, không có freeze      | 🔧 **Sửa**                              |
| 6   | Mục tiêu ngày                  | Hardcode trong component → **lỗi #2**                      | ♻️ **Làm lại**                          |
| 7   | Pomodoro + Vườn                | Chấm giờ ở server tốt; XP lệch quá lớn so với học          | 🔧 **Sửa** (cân bằng)                   |
| 8   | Shop                           | Giá ở DB, mua an toàn; ít vật phẩm, ít chỗ tiêu Coins      | ✅ **Giữ** + mở rộng sau                |
| 9   | Skill Tree → "Thành tựu"       | Chỉ là huy hiệu đếm số, không mở khoá gì; đếm ôn thẻ sai   | 🔧 **Đổi tên + sửa đếm**                |
| 10  | Bảng xếp hạng                  | Top 50 toàn cầu, cửa sổ trượt, streak cũ vẫn tính          | 🔧 **Sửa** (tuần lịch + kỷ lục cá nhân) |
| 11  | Battle 1v1                     | Chạy được; kẹt khi rớt mạng, kho câu cố định, không thưởng | 🔧 **Sửa** + chế độ bóng ma             |
| 12  | Cộng đồng                      | Feed / like / comment / report có; chưa có moderation      | ✅ **Giữ**, thêm xử lý báo cáo          |
| 13  | Config & registry              | Số game rải rác ở 6 nơi                                    | 🔧 **Sửa** (gom 1 module)               |

**Ưu tiên đề xuất:** (1) hotfix `fix/game-hotfix` (§17) → (2) hai lỗi đã biết → (3) gom config → (4) spec XP & Level → các hệ thống còn lại.

> **Cập nhật 2026-11-05 (sau review của Minh):** thêm nguyên nhân thứ hai của lỗi #2; đổi hướng Bảng xếp hạng, Battle và Skill Tree cho giai đoạn ít user; bổ sung §15b Rủi ro và §17 Hotfix.

---

## 1. Ví XP / Coins — `wallet_apply`

**Đã có**

- `supabase/migrations/20261102063955_streak_shop_avatars.sql` — hàm `security definer` duy nhất đổi XP/Coins/streak; chỉ `service_role` gọi được.
- Ghi sổ `transactions`, khoá dòng `for update`, `idempotency_key` unique, CHECK chặn số dư âm (pgTAP `wallet_apply.test.sql`).
- Nguồn gọi: hoàn thành bài (`server/services/complete-lesson.ts`), ôn thẻ (`app/(main)/review/_lib/actions.ts`), Pomodoro (`complete_pomodoro`), mua đồ (`buy_item`).

**Lỗi / thiếu**

- Streak bị nhét chung vào ví ("có XP > 0 là học hôm nay") → mọi nguồn XP, kể cả 1 XP ôn thẻ, đều giữ chuỗi.
- Không có giới hạn theo ngày (daily cap) cho bất kỳ nguồn nào.

**Đề xuất: ✅ Giữ.** Tách logic streak thành hàm riêng gọi từ `wallet_apply` (xem §5).

---

## 2. XP từ dịch bài — 🐞 Lỗi #1: "XP vẫn là 0 sau khi dịch đúng một câu"

**Đã có**

- `lib/scoring.ts`: exact 10 / acceptable 7, trừ 2 mỗi lần sai trước đó (tối thiểu 2); XP = điểm; Coins = điểm/10 + 3 nếu perfect.
- `completeLesson` trả thưởng **một lần** khi **mọi câu** đã xong (key `lesson:<id>`).

**Nguyên nhân lỗi #1** (đúng như code đang viết, không phải lỗi ngẫu nhiên)

- `POST /api/translations/verify` (`server/services/verify-translation.ts`) chỉ ghi `attempts`, **không gọi `wallet_apply`**.
- XP chỉ được cộng trong `completeLesson`, tức là sau câu cuối cùng của bài.
- Hệ quả:
  - Dịch đúng 1 câu (hoặc 4/5 câu rồi thoát) → XP = 0, biểu đồ XP 7 ngày trống.
  - **Streak cũng không tăng**, vì streak chỉ cập nhật khi XP > 0.
  - Vi phạm **P3**: người học không thấy mình vừa kiếm được gì.

**Lỗi / thiếu khác**

- Bài do user tự tạo → có thể tạo bài 1 câu dễ để lấy thưởng (rủi ro farm "tiny lessons" trong pillars).
- Không giới hạn số lần thử; "thử đến khi đúng" vẫn được tối thiểu 2 điểm.
- Màn dịch (`feedback-panel.tsx`) không hiện điểm/XP vừa kiếm.

**Đề xuất: 🔧 Sửa.** Thưởng XP **theo câu** ngay khi câu được mở khoá (key `sentence:<id>`, server tính từ `attempts`), còn bonus hoàn thành bài/perfect trả khi xong bài. Cần spec `xp-levels.md` để chốt con số và cơ chế chống farm (số câu tối thiểu, cap ngày cho bài tự tạo).

---

## 3. XP từ ôn thẻ

**Đã có:** mỗi lượt ôn +1 XP, 0 Coins, key `review:<cardId>:<timestamp>`.

**Lỗi / thiếu**

- 🚨 **Farm được.**
  - Key chứa timestamp nên mỗi lần bấm là một key mới.
  - Server action `reviewFlashcard` **không kiểm tra thẻ có đến hạn không**.
  - Bấm **Again** thì thẻ quay lại cuối hàng → bấm Again lặp lại = XP + streak vô hạn.
  - Vi phạm **P2** và **SRS integrity**: phần thưởng phụ thuộc thao tác chứ không phụ thuộc lượt ôn thật.
- Không có thưởng cho việc **hoàn thành** hàng đợi đến hạn (pillars khuyên thưởng completion, không thưởng rating).

**Đề xuất: 🔧 Sửa.**

- Chỉ thưởng khi thẻ thật sự đến hạn (`due_date <= now()`), mỗi thẻ tối đa 1 lần/ngày (key `review:<cardId>:<ngày local>`).
- Thêm bonus nhỏ khi ôn hết hàng đợi trong ngày.

---

## 4. Level

**Đã có:** không có. XP chỉ là một con số tăng dần trên Dashboard.

**Thiếu:** đường cong level, mốc mở khoá, phản hồi "lên cấp". PRD F không bắt buộc level, nhưng Skill Tree "mở khóa dần" cần một trục tiến bộ.

**Đề xuất: 🆕 Làm mới** trong `design/game/xp-levels.md` (cùng spec với §2–3).

---

## 5. Streak

**Đã có:** tính trong `wallet_apply` theo múi giờ của user; `streak_current`, `streak_best`, `last_active_date`.

**Lỗi / thiếu**

- 🐞 **Streak đứt vẫn hiển thị số cũ.**
  - `streak_current` chỉ được tính lại khi có XP mới; không có job nào reset.
  - Nghỉ 5 ngày, Dashboard và bảng xếp hạng (metric `streak`) vẫn hiện chuỗi cũ.
  - Đến lần học kế tiếp thì chuỗi tụt thẳng về 1.
- Không có streak freeze / repair → rủi ro **streak anxiety** (pillars, P5).
- Ngưỡng "đã học hôm nay" quá thấp: 1 lượt ôn thẻ (1 XP) là đủ.
- Không có hằng số nào cho streak trong registry.

**Đề xuất: 🔧 Sửa.**

- Tính "streak hiệu lực" khi đọc: `last_active_date >= hôm qua` thì giữ, ngược lại = 0.
- Đặt ngưỡng học tối thiểu trong ngày.
- Thêm freeze (mua bằng Coins → tạo sink cho kinh tế).
- Spec trong `streak-goals.md`.

---

## 6. Mục tiêu ngày — 🐞 Lỗi #2: "Ôn hết thẻ đến hạn" tự tick rồi tự bỏ tick

**Đã có:** `app/(main)/dashboard/_components/today-goals.tsx` + `get-dashboard-data.ts`. Có 3 mục tiêu hardcode trong component: dịch 1 bài, ôn hết thẻ, 1 phiên Pomodoro. Không lưu trong DB, không có thưởng.

**Nguyên nhân lỗi #2**

- Mục tiêu "ôn" được tính `done: dueCards === 0`, trong đó `dueCards` = số thẻ có `due_date <= now()` **tại lúc tải trang**.
- Đây là ảnh chụp hàng đợi ở thời điểm hiện tại, không phải "hôm nay đã ôn xong chưa", nên trạng thái đổi theo đồng hồ:
  - **Tự tick** dù chưa ôn gì: user mới chưa có thẻ, hoặc thẻ chưa đến hạn sáng nay → `dueCards = 0` → ✓.
  - **Tự bỏ tick:**
    - Thẻ bấm Again đến hạn lại sau 10 phút (`RELEARN_MINUTES`).
    - Hoặc thẻ khác đến hạn trong ngày (due_date tính theo giờ, không theo ngày).
    - Khi đó `dueCards > 0` → ✗, dù user đã ôn xong lúc trước.
- **Nguyên nhân thứ hai: thẻ mới đến hạn ngay lập tức.**
  - `flashcards.due_date` có `default now()` (`supabase/migrations/20261102005851_vocabulary.sql`).
  - Lưu một từ vào Sổ tay → thẻ mới **đã đến hạn ngay** → `dueCards > 0` → mục tiêu đang ✓ chuyển thành ✗.
  - Càng tra và lưu nhiều từ trong lúc dịch, mục tiêu càng nhảy.
- `countGoalsDone` (dải trạng thái trên Dashboard) dùng lại đúng điều kiện này, nên cũng nhảy theo.

**Lỗi / thiếu khác**

- Mục tiêu "dịch" chỉ tính **bài hoàn thành**, không tính câu.
- Không tuỳ chỉnh được, không thưởng, không liên kết với streak.

**Đề xuất: ♻️ Làm lại.**

- Mục tiêu ngày dựa trên **sự kiện đã xảy ra hôm nay**, ví dụ: "ôn ≥ N thẻ đến hạn hôm nay, hoặc đã ôn hết hàng đợi lúc bắt đầu ngày".
- Lưu trạng thái phía server để không nhảy.
- Số lượng mục tiêu lấy từ config; có thể gắn với streak (xong mục tiêu = giữ chuỗi).
- Spec trong `streak-goals.md`.

---

## 7. Pomodoro + Vườn tri thức

**Đã có**

- `start/complete/abandon_pomodoro`: server ghi `started_at`, chỉ cho hoàn thành khi đủ giờ (sai lệch cho phép 30 s), thưởng 1 lần (key `pomodoro:<id>`). 10 test pgTAP.
- Lựa chọn 25 / 50 phút, nghỉ 5 phút (`lib/pomodoro/timer.ts`). Store Zustand persist, đúng giờ khi đổi tab.
- Thưởng: **XP = số phút** (25 hoặc 50), **Coins = phút/5** (5 hoặc 10), trong SQL `pomodoro_reward_coins`.
- Vườn (`server/queries/garden.ts`): 1 cây cho mỗi phiên hoàn thành + đồ trang trí đã mua (emoji).

**Lỗi / thiếu**

- ⚖️ **Lệch kinh tế.**
  - 1 phiên 50 phút = 50 XP, bằng 5 câu dịch exact lần đầu.
  - Treo tab cũng có thưởng (rủi ro "timer left running" trong pillars).
  - Pomodoro trở thành nguồn XP chính dù không đo được việc học (P1, P2).
- Vườn chỉ là danh sách cây: không tăng trưởng, không loại cây, không gắn với nội dung học.
- Đồ trang trí chỉ hiện thành một hàng emoji, chưa đặt được vào vườn.

**Đề xuất: 🔧 Sửa.**

- Pomodoro chủ yếu thưởng **Coins + cây**, XP thấp hoặc bằng 0.
- Có thể yêu cầu có hoạt động học trong phiên mới được thưởng XP.
- Spec trong `garden.md`.

---

## 8. Shop

**Đã có**

- Bảng `shop_items` (giá ở DB): 3 theme × 60, 3 trang trí 25–40, 2 gói chủ đề × 80. Hiển thị ở `lib/shop/catalog.ts`.
- `buy_item`: giá lấy từ DB, chặn mua trùng, trừ qua `wallet_apply`.
- Theme chỉ áp dụng khi đã sở hữu (trigger).

**Lỗi / thiếu**

- Ít chỗ tiêu Coins (tổng toàn bộ catalog = 435 Coins). Mua hết rồi thì Coins vô dụng → lạm phát.
- Không có vật phẩm tiêu hao (streak freeze, đổi gợi ý...) làm sink định kỳ.
- **NOT ASSESSED — NO DATA:** tốc độ kiếm Coins thực tế / ngày (chưa có dữ liệu user thật).

**Đề xuất: ✅ Giữ** cơ chế. Mở rộng sink trong `shop.md` (streak freeze, cây hiếm, trang trí đặt được vào vườn). Không pay-to-win.

---

## 9. Skill Tree

**Đã có:** `lib/skills/tree.ts` gồm 4 nhánh (dịch / từ vựng / ôn / tập trung) × 5 mốc đếm số. Trạng thái tính từ `server/queries/learner-stats.ts`.

**Lỗi / thiếu**

- ❌ **Không khớp PRD F.**
  - PRD: "lộ trình theo nhánh **chủ đề & cấp độ**, mở khóa dần".
  - Hiện tại: huy hiệu đếm hoạt động, **không mở khoá nội dung** hay bài học nào.
- 🐞 **Đếm số lượt ôn sai.**
  - Công thức: `reviews = repetitions + lapses`, nhưng bấm Again thì `repetitions` bị reset về 0 (`lib/srs/schedule.ts`).
  - Ví dụ: thẻ đã ôn 5 lần, bấm Again → chỉ còn được tính 1.
  - Tiến độ có thể **giảm**, node đã "done" có thể khoá lại.
- Nhánh "từ vựng" thưởng việc **lưu từ** (bấm nút), không phải nhớ từ (P2).

**Đề xuất (đã chốt với Minh): 🔧 Đổi tên + sửa đếm. Skill Tree thật để sau.**

- **Giai đoạn này:**
  - Đổi tên trang hiện tại thành **"Thành tựu"** cho đúng bản chất (huy hiệu theo mốc).
  - Sửa lỗi đếm lượt ôn: đếm từ log lượt ôn (ví dụ `transactions` có `reason = 'flashcard_review'`, hoặc một bảng `review_logs`), không suy ra từ `repetitions + lapses`.
- **Để sau:** Skill Tree theo chủ đề × trình độ, mỗi node là một nhóm bài/từ cần đạt độ chính xác để mở node sau. Spec trong `skill-tree.md`.

---

## 10. Bảng xếp hạng

**Đã có:** hàm `leaderboard(metric, period)` (tính khi xem) với 3 tiêu chí XP / Streak / phút Pomodoro × tuần / tháng. Hiện top 50, làm nổi vị trí của mình.

**Lỗi / thiếu**

- "Tuần/tháng" là **cửa sổ trượt 7/30 ngày**, không reset theo lịch → không có cảm giác "mùa giải".
- Metric `streak` dùng `streak_current` chưa được reset (§5) → người đã nghỉ vẫn đứng hạng.
- Bảng **toàn cầu**: mọi trình độ và ngôn ngữ chung một bảng; người mới không bao giờ lên top (vi phạm **P4**).
- XP leaderboard cộng cả XP farm từ ôn thẻ (§3).
- Ngoài top 50 thì không biết hạng của mình.

**Đề xuất (đã chốt với Minh): 🔧 Sửa. League để sau.**

- **Vì sao chưa làm league:** khi còn ít user, chia nhóm 20–30 người theo trình độ sẽ ra những nhóm chỉ 1–2 người, không có ý nghĩa.
- **Giai đoạn đầu:**
  - Bảng xếp hạng theo **tuần lịch**, reset vào thứ Hai, bỏ cửa sổ trượt 7/30 ngày. Cần chốt reset theo UTC hay theo múi giờ của user.
  - Thêm **kỷ lục cá nhân** (XP tuần cao nhất, streak dài nhất), để người mới có mục tiêu so với chính mình (P4).
  - Metric streak dùng **streak hiệu lực** (§17 b).
- **Để sau, khi đủ user:** league theo nhóm nhỏ cùng ngôn ngữ và trình độ gần nhau. Spec trong `leagues.md`.

---

## 11. Battle 1v1

**Đã có**

- `join_battle` / `leave_battle` (RPC), ngân hàng 5 câu theo trình độ (`lib/battle/passages.ts`).
- Server bấm giờ và chấm qua grader + grading cache.
- Điểm = exact 10 / acceptable 7 + tối đa 5 điểm tốc độ (`lib/battle/scoring.ts`); hoà điểm thì ai xong trước thắng.
- Realtime broadcast + presence, polling dự phòng. pgTAP `community_battle.test.sql`.

**Lỗi / thiếu**

- Ghép cặp **chỉ theo ngôn ngữ, bỏ qua trình độ** (`join_battle` không lọc `level`) → N5 có thể gặp N1 (P4).
- Đối thủ rớt mạng hoặc đóng tab mà không bấm "Rời" → battle **kẹt ở `active` mãi**. Presence chỉ hiện online/offline, không tự xử thua sau timeout.
- Không có phần thưởng XP / Coins cho trận đấu (PRD G không nói rõ; cần quyết).
- Câu bị AI chấm sai hoặc lỗi AI: chưa có cơ chế khiếu nại hoặc huỷ trận (pillars: _AI judgment fairness_).
- Hoà điểm phân thắng bằng tốc độ, trong khi tốc độ đã được cộng vào điểm → thưởng tốc độ hai lần.

**Đề xuất (đã chốt với Minh): 🔧 Sửa + thêm chế độ bất đồng bộ.**

- **Chưa ghép theo trình độ:** ít user thì lọc theo trình độ chỉ làm phòng chờ trống lâu hơn. Giữ ghép theo ngôn ngữ; ghép theo trình độ để sau khi đủ user.
- **Chế độ "bóng ma" (async):**
  - Khi không có ai online, người học đấu với **bản ghi** một lượt chơi trước đó trên cùng đoạn văn (điểm và thời gian từng câu).
  - Luôn có trận để chơi; không cần hai người online cùng lúc.
- Tự kết thúc khi đối thủ vắng quá một khoảng thời gian.
- Thưởng nhỏ cho **cả hai** người chơi hoàn thành trận.
- Spec trong `battle.md`.

---

## 12. Cộng đồng

**Đã có:** `posts` / `comments` / `likes` / `reports` + RLS. Chia sẻ bài dịch từ màn kết quả, phân trang keyset, view `profile_cards` chỉ lộ tên + avatar.

**Lỗi / thiếu**

- Báo cáo chỉ được ghi lại, **không có bước xử lý**: không ẩn bài khi nhiều báo cáo, không có trang admin.
- Không có thưởng cho đóng góp. Đây có thể là quyết định đúng: thưởng like dễ bị farm.

**Đề xuất: ✅ Giữ.** Thêm quy tắc tự ẩn bài khi có ≥ N báo cáo. Không gắn XP với like.

---

## 13. Config & registry

**Hiện trạng:** các con số game nằm rải rác ở 6 nơi, vi phạm quy tắc "every game number lives in one config module".

| Con số                   | Đang ở đâu                                           |
| ------------------------ | ---------------------------------------------------- |
| Điểm câu, retry, perfect | `lib/scoring.ts`                                     |
| XP ôn thẻ (= 1)          | Hardcode trong `app/(main)/review/_lib/actions.ts`   |
| Thưởng Pomodoro          | SQL `pomodoro_reward_coins` + `complete_pomodoro`    |
| Thời lượng Pomodoro      | `lib/pomodoro/timer.ts`                              |
| Giá shop                 | Bảng `shop_items` (migration)                        |
| Mốc Skill Tree           | `lib/skills/tree.ts`                                 |
| Điểm battle              | `lib/battle/scoring.ts`                              |
| 3 mục tiêu ngày          | Hardcode trong `today-goals.tsx` và `countGoalsDone` |

`design/game/registry.md` vẫn là khung trống; hai dòng Pomodoro ghi "_find in code_". Giá trị thật là `lib/pomodoro/timer.ts` (25/50, nghỉ 5).

**Đề xuất: 🔧 Sửa.**

- Một module `lib/game/config.ts` cho mọi con số phía TypeScript.
- Các con số phía SQL đọc từ một bảng `game_config` hoặc truyền tham số từ server.
- Cập nhật registry sau khi Minh duyệt từng spec.

---

## 14. Đối chiếu PRD

| PRD                                                   | Hiện trạng                                           |
| ----------------------------------------------------- | ---------------------------------------------------- |
| F · Pomodoro 25/5, xong phiên = 1 cây + Coins         | ✅ Có (thêm tuỳ chọn 50 phút)                        |
| F · Coins/XP từ dịch bài, Pomodoro, Streak            | ⚠️ Dịch: chỉ khi xong bài · Streak: **không thưởng** |
| F · Tiêu vào trang trí vườn, Themes, chủ đề độc quyền | ✅ Có (ít vật phẩm)                                  |
| F · Skill Tree theo chủ đề & cấp độ, mở khoá dần      | ❌ Chỉ là huy hiệu đếm hoạt động                     |
| G · Community Feed: publish, Like, Comment            | ✅ Có                                                |
| G · Leaderboards tuần/tháng theo XP, Streak, Pomodoro | ⚠️ Có, nhưng cửa sổ trượt + streak cũ                |
| G · Battle 1v1 realtime, chấm Tốc độ + Độ chính xác   | ⚠️ Có, thiếu ghép theo trình độ + xử lý rớt mạng     |

---

## 15. NOT ASSESSED — NO DATA

- Retention D1/D7/D30, số phiên/ngày (KPI PRD §3): chưa có analytics sự kiện.
- Tốc độ kiếm và tiêu XP/Coins của user thật: cần truy vấn `transactions` trên production sau khi có user.
- Độ chính xác AI chấm (KPI > 95%): chưa có bộ đánh giá trên dữ liệu thật.

---

## 15b. Rủi ro bổ sung

| Rủi ro                                                  | Hiện trạng                                                                                                                                                                                                                                                                                                                                   | Hướng xử lý                                                                                                                                                             |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kho câu battle cố định**                              | `lib/battle/passages.ts` là danh sách tĩnh theo trình độ. Chơi vài trận là thuộc đáp án, nên điểm phản ánh trí nhớ chứ không phản ánh khả năng dịch (P1, P2).                                                                                                                                                                                | Mở rộng kho và xoay vòng câu; tránh lặp đoạn đã chơi với cùng user. Sau này có thể sinh câu bằng AI có cache.                                                           |
| **Dán bản dịch máy**                                    | Ô dịch (bài học và battle) nhận mọi văn bản; không phân biệt được tự dịch hay chép từ Google Translate.                                                                                                                                                                                                                                      | Không chặn hoàn toàn được. Giảm động lực: thưởng chủ yếu cho lần thử đầu, đánh dấu câu trả lời nhanh bất thường trong battle, có thể chặn paste trong battle. Cần spec. |
| **Rate limit AI chưa đủ chặt**                          | Đã có giới hạn **theo ngày** cho từng user (`rate_limit_hit`, key `ai`, `AI_DAILY_LIMIT` = 150), dùng chung cho chấm câu, battle, từ điển, viết lại tin và tạo bài. **Chưa có** giới hạn theo phút, nên 150 lượt có thể bị gọi dồn trong vài giây. Lượt trúng grading cache không bị tính. Ngày được tính theo UTC, không theo múi giờ user. | Thêm giới hạn theo phút (burst); tách quota theo tính năng nếu cần.                                                                                                     |
| **`reviewFlashcard` chưa kiểm tra rõ quyền sở hữu thẻ** | Action đọc và cập nhật thẻ bằng client của user, nên RLS đang chặn thẻ của người khác. Nhưng bước thưởng XP dùng **admin client** và chỉ dựa vào việc đã đọc được thẻ ở bước trước. Nếu RLS hoặc query bị đổi sau này, XP có thể bị cộng cho thẻ không phải của user.                                                                        | Lọc rõ `user_id = user.id` và kiểm tra đúng 1 dòng được cập nhật trước khi thưởng (làm trong hotfix §17 a).                                                             |

---

## 16. Bước tiếp theo đề xuất (chờ Minh duyệt)

1. `design/game/xp-levels.md`: XP theo câu, XP ôn thẻ chống farm, level → sửa lỗi #1.
2. `design/game/streak-goals.md`: streak hiệu lực, freeze, mục tiêu ngày lưu ở server → sửa lỗi #2.
3. Gom config (`lib/game/config.ts`) + điền registry.
4. Sau đó lần lượt: `garden.md` → `shop.md` → `skill-tree.md` → `leagues.md` → `battle.md`.

Mỗi hệ thống một branch, spec được duyệt trước rồi mới code.

---

## 17. Hotfix `fix/game-hotfix` (Minh đã duyệt phạm vi)

Chỉ 3 việc, mỗi việc có test:

| Việc  | Nội dung                                                                                                                                                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **a** | Ôn thẻ chỉ được thưởng khi thẻ **đến hạn**. Key `review:<cardId>:<ngày local>`, tức tối đa 1 lần / thẻ / ngày. Kiểm tra quyền sở hữu thẻ trước khi thưởng.    |
| **b** | **Streak hiệu lực** tính khi đọc: `last_active_date` là hôm nay hoặc hôm qua (theo múi giờ user) thì giữ, ngược lại = 0. Dùng cho Dashboard và bảng xếp hạng. |
| **c** | Battle **tự kết thúc** khi đối thủ vắng mặt quá một khoảng timeout.                                                                                           |

Ngoài phạm vi hotfix: lỗi #1, lỗi #2, Thành tựu, bảng xếp hạng tuần lịch, chế độ bóng ma.
