# ⭐ XP & Levels — Spec

> Hệ thống: **XP & levels** · Trạng thái: **Approved (spec)**, chưa code · Branch: `feat/xp-levels` (từ `fix/game-hotfix`)
> Nguồn: `design/game/audit.md` §2–4, §17 · PRD mục F · `.claude/docs/game-pillars.md`
> Các quyết định của Minh (2026-11-05) được đánh dấu **[Chốt]**. Giá trị chưa được duyệt được đánh dấu **[Đề xuất]**.

---

## 1. Overview

XP là thước đo **công sức học thật**: câu dịch được mở khoá và thẻ đến hạn được ôn. Level là cách hiển thị XP tích luỹ thành những mốc dễ cảm nhận.

| Thay đổi                  | Trước (code hiện tại)            | Sau                                                           |
| ------------------------- | -------------------------------- | ------------------------------------------------------------- |
| XP dịch                   | Trả **cả bài** khi xong câu cuối | Trả **từng câu** ngay khi câu được mở khoá **[Chốt]**         |
| Bonus hoàn thành bài      | Không có                         | +5 XP, chỉ bài ≥ 3 câu **[Chốt]**                             |
| Coins dịch                | Lúc xong bài, mọi độ dài bài     | Lúc xong bài, **chỉ bài ≥ 3 câu** **[Chốt]**                  |
| XP ôn thẻ                 | +1 / thẻ đến hạn / ngày (hotfix) | +1 / thẻ đến hạn **đã ôn ≥ 1 lần trước đó** **[Chốt]**        |
| Bonus ôn hết hàng đợi     | Không có                         | +5 XP, 1 lần/ngày, khi đã ôn ≥ 5 thẻ có thưởng **[Chốt]**     |
| XP Pomodoro               | XP = số phút (25/50)             | **0 XP**; vẫn có Coins + cây **[Chốt]**                       |
| Streak                    | Tăng khi có `xp_delta > 0`       | Tăng khi có **hoạt động học** (§3.5) **[Chốt]**               |
| Giới hạn XP từ bài tự tạo | Không có                         | 300 XP/ngày, có thông báo rõ **[Chốt]**                       |
| Level                     | Không có                         | Lv1–Lv50, đường cong A, sau Lv50 là "Sao bền bỉ" ★ **[Chốt]** |
| Trả bù XP cũ              | —                                | **Không** trả bù cho câu dịch trước deploy **[Chốt]**         |

Level **đo sự chăm chỉ**, không gắn với trình độ JLPT/CEFR **[Chốt]**. Lv30 không có nghĩa là "giỏi hơn" Lv10, mà là đã học nhiều hơn.

---

## 2. Learner fantasy & target feeling

- **Fantasy:** "Mỗi câu mình tự dịch đúng đều được tính; công sức tích luỹ thành mốc nhìn thấy được."
- **MDA aesthetic:** _Challenge_ (dịch đúng ngay lần đầu được nhiều XP hơn) + _Submission/Expression_ ở mức nhẹ (tiến bộ đều đặn). Không phải _Competition_; cạnh tranh để cho bảng xếp hạng.
- **Hành vi học cần tăng (P1):**
  - Dịch **thêm câu** (kể cả không xong cả bài), dịch đúng ngay lần đầu (P2).
  - Ôn **hết** thẻ đến hạn mỗi ngày (SRS integrity: thưởng hoàn thành, không thưởng lựa chọn rating).
- **Cảm giác mục tiêu (P3):** sau mỗi câu đúng, người học thấy ngay **"+8 XP"** và thanh tiến độ level nhích lên. Không bao giờ có tình huống "dịch đúng mà XP vẫn 0" (lỗi #1 trong audit).
- **Rủi ro overjustification:** XP chỉ là thông tin, không phải mệnh lệnh. Không có thông báo kiểu "làm thêm 3 câu để lên cấp!". Thông báo lên cấp mô tả điều đã làm được ("Bạn đã dịch 120 câu").

---

## 3. Detailed rules

### 3.1 XP theo câu **[Chốt]**

1. Một câu được **mở khoá** khi AI chấm lần đầu tiên trả `exact` hoặc `acceptable` (cùng điều kiện `scoreSentence` dùng hiện nay).
2. Ngay lúc đó, server tính `sentence_xp` (§4.1) **từ các `attempts` đã lưu**, không tin số liệu từ client.
3. Trả qua `wallet_apply`, key **`sentence:<sentence_id>`**, nên mỗi câu tối đa 1 lần, kể cả khi request bị gửi lại.
4. Lỗi AI (`AI_UNAVAILABLE`, timeout): không có attempt, không có XP, không tính lần thử (giữ hành vi hiện tại của S07).
5. **Không trả bù [Chốt]:** câu đã mở khoá trước khi deploy không bao giờ được trả XP; bài đang dở lúc deploy chỉ được XP cho các câu mở khoá sau deploy.

### 3.2 Hoàn thành bài **[Chốt]**

1. Khi câu cuối của bài được mở khoá (`completeLesson`):
   - Bài có **≥ 3 câu** → +5 XP (`lesson_bonus_xp`) và Coins theo công thức hiện tại (§4.2). Key giữ nguyên **`lesson:<lesson_id>`**.
   - Bài **< 3 câu** → không bonus XP, không Coins. XP từng câu vẫn được trả (§3.1).
2. Bài đã được trả thưởng theo cách cũ (key `lesson:<id>` đã tồn tại) sẽ không được trả lại, nhờ idempotency.

### 3.3 Ôn thẻ **[Chốt]**

1. **+1 XP** cho một lượt ôn khi **cả ba** điều kiện đúng:
   - Thẻ đã đến hạn lúc bắt đầu lượt ôn (`due_date <= now()`, đọc trước khi cập nhật SRS, giữ nguyên hotfix).
   - Thẻ **đã được ôn ít nhất 1 lần trước đó**: `repetitions + lapses > 0`, đọc **trước** khi cập nhật SRS.
   - Chưa được trả hôm nay: key `review:<card_id>:<ngày local>` (hotfix).
2. Lượt ôn đầu tiên của thẻ mới (vừa lưu từ) **vẫn cập nhật lịch SRS** nhưng **0 XP** và **không tính là hoạt động học**. Không đổi gì trong thuật toán SRS **[Chốt]**.
3. Phần thưởng không phụ thuộc rating Again/Hard/Good/Easy.

### 3.4 Bonus ôn hết hàng đợi **[Chốt]**

Ngay sau một lượt ôn **có thưởng** (§3.3), server kiểm tra:

1. Không còn thẻ nào của user có `due_date <= now()`, kể cả thẻ mới.
2. Hôm nay (ngày local) đã có **≥ 5** lượt ôn có thưởng (`review_clear_min_reviews`).
3. Đúng cả hai → +5 XP, key **`review_clear:<ngày local>`** (1 lần/ngày).

Hệ quả: lưu thêm từ sau khi đã nhận bonus không làm mất bonus; người chỉ có 1–4 thẻ đến hạn không nhận bonus (tránh "ôn 1 thẻ được 6 XP").

### 3.5 Hoạt động học & streak **[Chốt — spec `streak-goals.md` dùng lại mục này]**

**Hoạt động học** (study activity) là **một trong hai** sự kiện:

| Sự kiện                                   | Tính là hoạt động học?                              |
| ----------------------------------------- | --------------------------------------------------- |
| Câu dịch được mở khoá (§3.1)              | ✅ Có, **kể cả khi XP = 0 do chạm giới hạn** (§3.6) |
| Lượt ôn thẻ có thưởng (§3.3)              | ✅ Có                                               |
| Lượt ôn đầu tiên của thẻ mới              | ❌ Không                                            |
| Bonus hoàn thành bài / bonus hết hàng đợi | ❌ Không (đã có sự kiện gốc ở trên)                 |
| Phiên Pomodoro                            | ❌ Không **[Chốt]**                                 |
| Mua đồ, đấu battle, đăng bài cộng đồng    | ❌ Không                                            |

- Streak tăng **theo hoạt động học**, không theo `xp_delta > 0` nữa. Ngày được tính theo `profiles.timezone`, giống `wallet_apply` và `effective_streak`.
- Hiển thị streak vẫn qua `effective_streak` (hotfix).

### 3.6 Giới hạn XP từ bài tự tạo **[Chốt]**

1. Bài **tự tạo** = `lessons.source = 'manual'`. Bài `ai` (Tạo bài AI, micro-lesson) và `news` **không bị giới hạn**.
2. Tổng XP **từ bài tự tạo** trong một ngày local (XP câu + bonus hoàn thành) tối đa **300** (`manual_lesson_daily_xp_cap`).
3. Câu làm vượt giới hạn được trả `min(sentence_xp, phần còn lại)` (có thể là 0).
4. **Không âm thầm cho 0 XP [Chốt].** Khi câu bị cắt (`awarded < sentence_xp`), màn dịch hiện rõ: **"Đã đạt giới hạn XP hôm nay cho bài tự tạo"**, kèm phần đã nhận (nếu > 0).
5. Người học **vẫn dịch được**, câu **vẫn mở khoá**, và **vẫn tính là hoạt động học** (giữ streak) **[Chốt]**.
6. **Coins của bài tự tạo cũng dừng khi đã chạm giới hạn [Chốt — Q-A]:** khi một bài `manual` hoàn thành mà **bonus hoàn thành không được trả đủ** (giới hạn 300 đã đầy trước hoặc trong lúc trả bonus), bài đó **không có Coins**. Màn kết quả ghi rõ: **"Đã đạt giới hạn XP hôm nay cho bài tự tạo nên bài này không có thưởng hoàn thành"**.
7. **Bài AI nằm ngoài giới hạn [Chốt — Q-B]:** micro-lesson và bài AI theo chủ đề (`source = 'ai'`) không bị giới hạn, vì rate limit AI (150 lượt/ngày) đã chặn gián tiếp.
8. ⚠️ **Điều kiện tiên quyết bảo mật:** `source` phải do server quyết định. Xem §9 và task T0.
9. **Bài tin tức đã sửa là bài tự tạo [Chốt — 2026-11-05]:** khi tạo bài từ tin tức, server so đoạn văn gửi lên với bản viết lại trong `news_rewrites` (cùng URL, trình độ, phiên bản prompt). **Giống hệt** (sau khi chuẩn hoá xuống dòng và khoảng trắng đầu/cuối) → `source = 'news'`. **Đã sửa** hoặc không có bản cache → `source = 'manual'` (tính vào giới hạn 300), **vẫn giữ dòng ghi nguồn** (giấy phép yêu cầu ghi nguồn và ghi chú "đã biên tập").

### 3.7 Pomodoro **[Chốt]**

- `complete_pomodoro` trả **0 XP**, Coins giữ nguyên (`pomodoro_reward_coins`: 1 Coin / 5 phút), 1 cây.
- Bảng xếp hạng "phút tập trung" không đổi (đọc `pomodoro_sessions`, không đọc XP).

### 3.8 Level & Sao bền bỉ **[Chốt]**

1. Level tính hoàn toàn từ tổng `wallets.xp` (§4.3). Không lưu level như một nguồn sự thật riêng.
2. Lv1 khi XP = 0. Level tối đa **50** (`level_cap`).
3. Từ Lv50, mỗi **2.000 XP** thêm = 1 **Sao bền bỉ ★** (§4.4). XP không bao giờ bị reset.
4. Level và sao **không mở khoá sức mạnh** hay vật phẩm trả phí; không pay-to-win (Ethics).
5. **Dữ liệu cũ:** `wallets.xp` hiện có (gồm cả XP Pomodoro cũ) được giữ nguyên; level tính từ đó. Deploy **không** tạo sự kiện lên cấp hàng loạt (§3.9).

### 3.9 Khoảnh khắc lên cấp (event, chưa có hoạt hình)

1. Khi `wallet_apply` làm `xp` vượt **một hoặc nhiều** mốc level, hoặc mốc sao (sau Lv50), trong **cùng transaction** sẽ ghi **1 dòng** `level_ups`:

| Trường          | Kiểu        | Ý nghĩa                                                                                  |
| --------------- | ----------- | ---------------------------------------------------------------------------------------- |
| `id`            | uuid        |                                                                                          |
| `user_id`       | uuid        |                                                                                          |
| `kind`          | enum        | `level` (Lv tăng) hoặc `star` (★ tăng sau Lv50)                                          |
| `from_level`    | int         | Level trước                                                                              |
| `to_level`      | int         | Level sau (nhảy nhiều cấp vẫn chỉ 1 dòng)                                                |
| `from_stars`    | int         | Số sao trước (0 nếu chưa tới Lv50)                                                       |
| `to_stars`      | int         | Số sao sau                                                                               |
| `xp_total`      | int         | Tổng XP sau khi cộng                                                                     |
| `xp_into_level` | int         | XP đã có trong level/sao hiện tại                                                        |
| `xp_to_next`    | int         | XP cần cho mốc kế tiếp                                                                   |
| `source_reason` | text        | Nguồn gây lên cấp: `sentence_passed`, `lesson_bonus`, `flashcard_review`, `review_clear` |
| `created_at`    | timestamptz |                                                                                          |
| `seen_at`       | timestamptz | null = chưa hiển thị                                                                     |

2. Client lấy các dòng `seen_at is null` (RLS: chỉ của mình), hiển thị, rồi gọi RPC đánh dấu đã xem. Học trên 2 thiết bị thì chỉ hiện 1 lần.
3. Payload này đủ cho hoạt hình sau này: số cũ → số mới, thanh tiến độ mới, nguồn ("Câu dịch vừa rồi giúp bạn lên Lv7").

---

## 4. Formulas

### 4.1 `sentence_xp` — giữ nguyên `scoreSentence` trong `lib/scoring.ts`

```
sentence_xp = 0                                                  nếu không lần thử nào đạt
sentence_xp = max(MIN_POINTS, POINTS[v] − RETRY_PENALTY × k)     nếu lần thử thứ (k+1) đạt với verdict v
```

| Ký hiệu              | Kiểu | Khoảng             | Mô tả                                |
| -------------------- | ---- | ------------------ | ------------------------------------ |
| `v`                  | enum | exact / acceptable | Verdict của lần thử **đầu tiên** đạt |
| `k`                  | int  | 0 … ∞              | Số lần `incorrect` trước lần đạt     |
| `POINTS[exact]`      | int  | 10                 | Hiện có trong code                   |
| `POINTS[acceptable]` | int  | 7                  | Hiện có trong code                   |
| `RETRY_PENALTY`      | int  | 2                  | Hiện có                              |
| `MIN_POINTS`         | int  | 2                  | Hiện có                              |

- **Output:** bị chặn, **[2, 10]** khi đạt; 0 khi chưa đạt. Max = exact, k = 0. Min = 2 khi k ≥ 4 (exact) hoặc k ≥ 3 (acceptable). Không âm. Lần thử lại không bao giờ được nhiều hơn lần đầu.
- **Ví dụ:** sai 1 lần rồi exact → max(2, 10 − 2) = **8 XP**. Acceptable ngay → **7 XP**.

### 4.2 Thưởng hoàn thành bài

```
lesson_bonus_xp    = (n ≥ MIN_LESSON_SENTENCES) ? LESSON_BONUS_XP : 0
lesson_bonus_coins = (n ≥ MIN_LESSON_SENTENCES) ? floor(P / 10) + (perfect ? PERFECT_BONUS_COINS : 0) : 0
```

| Ký hiệu                | Kiểu | Khoảng  | Mô tả                                                |
| ---------------------- | ---- | ------- | ---------------------------------------------------- |
| `n`                    | int  | 1 … 200 | Số câu của bài                                       |
| `P`                    | int  | 0 … 10n | Tổng `sentence_xp` của bài (điểm, chưa trừ giới hạn) |
| `perfect`              | bool |         | Mọi câu exact ngay lần đầu                           |
| `MIN_LESSON_SENTENCES` | int  | 3       | **[Chốt]**                                           |
| `LESSON_BONUS_XP`      | int  | 5       | **[Chốt]**                                           |
| `PERFECT_BONUS_COINS`  | int  | 3       | Hiện có                                              |

- **Output:** bonus XP ∈ {0, 5}; Coins ∈ [0, n + 3] (P ≤ 10n).
- **Ví dụ:** bài 5 câu, P = 42, không perfect → +5 XP, +4 Coins. Bài 2 câu → +0 XP, +0 Coins.
- Coins vẫn tính trên `P` (điểm), **không** trên XP đã bị cắt bởi giới hạn (§3.6), để giữ hành vi cũ.

### 4.3 Đường cong level (phương án A) **[Chốt]**

```
xp_to_next(L)   = BASE + STEP × (L − 1)                         với 1 ≤ L < 50
xp_to_reach(L)  = Σ_{k=1}^{L−1} xp_to_next(k) = 20L² − 10L − 10   (với BASE = 50, STEP = 40)
level(xp)       = min(LEVEL_CAP, max L sao cho xp_to_reach(L) ≤ xp)
```

| Ký hiệu     | Kiểu | Khoảng | Mô tả                         |
| ----------- | ---- | ------ | ----------------------------- |
| `xp`        | int  | 0 … ∞  | `wallets.xp`                  |
| `L`         | int  | 1 … 50 | Level                         |
| `BASE`      | int  | 50     | XP từ Lv1 lên Lv2 **[Chốt]**  |
| `STEP`      | int  | 40     | Mỗi level đắt thêm **[Chốt]** |
| `LEVEL_CAP` | int  | 50     | **[Chốt]**                    |

- **Output:** level ∈ [1, 50], tăng đơn điệu theo xp. Dạng đóng: `L = floor((10 + √(100 + 80·(xp + 10))) / 40)`, nhưng cài đặt nên dùng **so sánh số nguyên** với `xp_to_reach` (tránh lỗi làm tròn số thực ở biên).
- **Mốc:** xp_to_reach(2) = 50 · (5) = 440 · (10) = 1.890 · (20) = 7.790 · (50) = **49.490**. xp_to_next(49) = 1.970.
- **Ví dụ:** xp = 500 → xp_to_reach(5) = 440 ≤ 500 < xp_to_reach(6) = 650 → **Lv5**, đã có 60/210 XP trong level.

### 4.4 Sao bền bỉ ★ **[Chốt]**

```
stars(xp) = (xp ≥ XP_AT_CAP) ? floor((xp − XP_AT_CAP) / STAR_XP) : 0       với XP_AT_CAP = xp_to_reach(50) = 49.490
```

| Ký hiệu   | Kiểu | Khoảng | Mô tả      |
| --------- | ---- | ------ | ---------- |
| `STAR_XP` | int  | 2.000  | **[Chốt]** |

- **Output:** không chặn trên, ≥ 0. Người học "Chăm" (280 XP/ngày) được khoảng 1 ★ mỗi 7–8 ngày.
- **Ví dụ:** xp = 53.600 → floor(4.110 / 2.000) = **2 ★**, đã có 110/2.000 XP tới sao thứ 3.

### 4.5 XP dự kiến mỗi ngày học & số ngày tới các mốc

Giả định **8 XP/câu** (**NOT ASSESSED — NO DATA**: chưa có tỷ lệ verdict thật), bài 5 câu, có bonus hết hàng đợi.

| Người học                        | XP/ngày học | Lv2 | Lv5 | Lv10 | Lv20 | Lv50            |
| -------------------------------- | ----------- | --- | --- | ---- | ---- | --------------- |
| Nhẹ: 1 bài + 10 thẻ, 4 ngày/tuần | 60          | 1   | 11  | 53   | 226  | 1.443 (~4 năm)  |
| PRD: 2 bài + 20 thẻ, mỗi ngày    | 115         | 1   | 4   | 17   | 68   | 431 (~14 tháng) |
| Chăm: 5 bài + 50 thẻ, mỗi ngày   | 280         | 1   | 2   | 7    | 28   | 177 (~6 tháng)  |

Số liệu là ngày lịch. Độ nhạy cho người học PRD tới Lv50: 6 XP/câu → 521 ngày; 10 XP/câu → 367 ngày.

### 4.6 Ma trận tương tác

| Đầu ra ↓ / Đầu vào →     | Level | Streak         | Leaderboard XP | Skill tree / Thành tựu | Shop |
| ------------------------ | ----- | -------------- | -------------- | ---------------------- | ---- |
| XP câu dịch              | ✅    | ✅ (hoạt động) | ✅             | (chưa)                 | —    |
| XP ôn thẻ                | ✅    | ✅ (hoạt động) | ✅             | (chưa)                 | —    |
| Bonus bài / hết hàng đợi | ✅    | —              | ✅             | —                      | —    |
| Coins bài                | —     | —              | —              | —                      | ✅   |
| Level                    | —     | —              | —              | —                      | —    |

Không có vòng lặp tự khuếch đại: level không nhân XP, không mở khoá nguồn XP mới.

---

## 5. Economy impact

| Faucet / Sink              | Tiền tệ | Mức                         | Giới hạn ngày                                        | Trạng thái      |
| -------------------------- | ------- | --------------------------- | ---------------------------------------------------- | --------------- |
| Câu dịch mở khoá           | XP      | 2–10 / câu                  | 300 cho bài `manual`; không giới hạn cho `ai`/`news` | **Mới**         |
| Bonus hoàn thành (≥ 3 câu) | XP      | 5 / bài                     | Tính vào 300 nếu bài `manual`                        | **Mới**         |
| Hoàn thành bài (≥ 3 câu)   | Coins   | floor(P/10) + 3 nếu perfect | Không                                                | Đổi (≥ 3 câu)   |
| Ôn thẻ có thưởng           | XP      | 1 / thẻ                     | Tự nhiên: số thẻ đến hạn                             | Đổi (thẻ đã ôn) |
| Bonus hết hàng đợi         | XP      | 5                           | 1 / ngày                                             | **Mới**         |
| Pomodoro                   | XP      | **0** (trước: 25/50)        | —                                                    | **Bỏ**          |
| Pomodoro                   | Coins   | 1 / 5 phút (5 hoặc 10)      | Không                                                | Giữ             |
| Shop                       | Coins   | 25–80                       | —                                                    | Giữ (sink)      |

- **XP không tiêu được**, nên không có lạm phát giá; tác động chỉ ở tốc độ level và bảng xếp hạng XP.
- **Bỏ XP Pomodoro:** XP tuần trên bảng xếp hạng phản ánh học thật. Người chỉ chạy Pomodoro sẽ tụt hạng; đây là chủ đích (P1).
- **Coins:** nguồn Coins từ dịch giảm nhẹ (bài < 3 câu không còn Coins). Sink của shop chưa đổi. Xem `shop.md` sau.

---

## 6. Retention hooks

- **Ngày đầu:** người học nào cũng lên **Lv2 trong ngày học đầu tiên** (≥ 50 XP ≈ 1 bài 5 câu + vài thẻ). Đây là khoảnh khắc "competence" sớm, hỗ trợ D1/D7 (KPI PRD: D7 > 40%).
- **Tuần đầu:** người học PRD đạt Lv5 vào ngày 4, người học nhẹ vào khoảng ngày 11.
- **Hằng ngày:** bonus hết hàng đợi gắn thói quen ôn SRS mỗi ngày; streak dựa trên hoạt động học thật (§3.5).
- **Dài hạn:** Lv50 khoảng 14 tháng (PRD); sau đó là Sao bền bỉ, không reset.
- **Không dùng:** đếm ngược, "sắp mất cấp", hay XP nhân đôi có thời hạn (Ethics, P5).

---

## 7. UX & accessibility

| Trạng thái / Sự kiện          | Hiển thị                                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| Câu mở khoá, có XP            | Chip **"+8 XP"** cạnh verdict trong `feedback-panel`; thanh level nhích (không chặn thao tác)         |
| Câu mở khoá, bị cắt một phần  | "+4 XP · Đã đạt giới hạn XP hôm nay cho bài tự tạo"                                                   |
| Câu mở khoá, 0 XP do giới hạn | **"Đã đạt giới hạn XP hôm nay cho bài tự tạo"**, kèm dòng phụ "Bạn vẫn giữ chuỗi ngày học" **[Chốt]** |
| Hoàn thành bài ≥ 3 câu        | Màn kết quả: tổng XP câu + "+5 XP hoàn thành" + Coins                                                 |
| Hoàn thành bài < 3 câu        | Màn kết quả ghi rõ: "Bài từ 3 câu trở lên mới có thưởng hoàn thành"                                   |
| Ôn thẻ mới lần đầu            | Không hiện XP; không hiện thông báo lỗi                                                               |
| Bonus hết hàng đợi            | Màn "Xong phiên ôn tập": "+5 XP · Ôn hết thẻ hôm nay"                                                 |
| Lên cấp / thêm sao            | Thông báo từ sự kiện `level_ups` (§3.9); về sau có hoạt hình                                          |
| Dashboard / Hồ sơ             | Lv hiện tại, thanh `xp_into_level / xp_to_next`, ★ nếu có                                             |

**Accessibility (WCAG 2.2 AA):**

- Chip XP và thông báo giới hạn nằm trong vùng `aria-live="polite"`, không cướp focus của textarea dịch (IME tiếng Nhật đang gõ dở không bị ngắt).
- Thanh level có `role="progressbar"` với `aria-valuenow`, `aria-valuemax`, kèm nhãn chữ ("Lv7 · 120/290 XP"). Không chỉ dùng màu.
- Hoạt hình lên cấp tôn trọng `prefers-reduced-motion`; có thể đóng bằng `Esc`; không tự phát âm thanh.
- Mọi text qua next-intl (VI/EN/JA).

---

## 8. Edge cases & degenerate strategies

| Tình huống                                       | Xử lý                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Gửi lại request chấm câu đã mở khoá              | Key `sentence:<id>` → không trả 2 lần                                                       |
| Bài 1–2 câu "siêu dễ" để farm                    | Không bonus, không Coins; XP câu tính vào giới hạn 300 (nếu `manual`)                       |
| Nhiều bài 3 câu "siêu dễ" (`manual`)             | Giới hạn 300 XP/ngày; chạm giới hạn thì bài `manual` cũng hết Coins (§3.6 mục 6)            |
| Khai báo `source = 'ai'` cho bài tự tạo          | Chặn bằng T0: chỉ server (service role) tạo được bài `ai`/`news`                            |
| Chèn thêm câu vào bài `ai` bằng INSERT trực tiếp | Chặn bằng T0: thu hồi INSERT trực tiếp vào `lessons`/`sentences` của `authenticated`        |
| Dán bản dịch máy                                 | Không chặn được ở hệ này; ghi nhận ở audit §15b                                             |
| Thử sai liên tục rồi mới đúng                    | Tối thiểu 2 XP, luôn ít hơn đúng ngay lần đầu                                               |
| Lưu từ rồi ôn ngay để lấy XP                     | Thẻ mới lần đầu = 0 XP (§3.3)                                                               |
| Bấm Again liên tục                               | Thẻ chưa đến hạn = 0 XP; mỗi thẻ 1 lần/ngày (hotfix)                                        |
| Ôn 1–4 thẻ để lấy bonus hết hàng đợi             | Cần ≥ 5 lượt ôn có thưởng trong ngày                                                        |
| Đã nhận bonus hàng đợi, sau đó lưu từ mới        | Không mất bonus; không nhận lần 2 trong ngày                                                |
| Học quanh nửa đêm                                | Ngày theo `profiles.timezone`. Giới hạn 300 và bonus hàng đợi tính lại từ 0 sau 00:00 local |
| Đổi múi giờ trong Cài đặt giữa ngày              | Có thể có thêm một "ngày" giới hạn. Chấp nhận (hiếm, giá trị nhỏ)                           |
| Một request cộng XP vượt nhiều level             | 1 dòng `level_ups` với `from_level` → `to_level`                                            |
| XP cũ rất lớn (do Pomodoro trước đây)            | Giữ nguyên **[Chốt]**; không tạo sự kiện lên cấp lúc deploy                                 |
| Bài đang dở lúc deploy                           | Câu cũ 0 XP (không trả bù); câu mới trả theo câu; khi xong chỉ còn bonus 5 + Coins          |
| AI chấm lỗi / timeout                            | Không attempt, không XP, không tính lần thử                                                 |

**Câu hỏi đã chốt (2026-11-05):**

- **Q-A — Có:** chạm giới hạn 300 XP thì bài `manual` cũng không còn Coins (§3.6 mục 6), có ghi rõ trên màn hình.
- **Q-B — Đồng ý:** micro-lesson và bài AI theo chủ đề nằm ngoài giới hạn (§3.6 mục 7).

---

## 9. Dependencies

| Phụ thuộc                              | Vai trò                                                                                                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wallet_apply` (S22 + hotfix)          | Nơi duy nhất ghi XP/Coins; thêm phát hiện lên cấp (§3.9). Bỏ cập nhật streak theo `xp_delta`                                                               |
| Hàm hoạt động học (mới)                | Cập nhật streak theo §3.5. Được gọi từ thưởng câu và thưởng ôn thẻ                                                                                         |
| `effective_streak` (hotfix)            | Hiển thị streak; không đổi                                                                                                                                 |
| AI grading (S07, `verify-translation`) | Nơi biết câu vừa mở khoá → gọi thưởng câu                                                                                                                  |
| `completeLesson`                       | Đổi sang chỉ trả bonus + Coins, với điều kiện ≥ 3 câu                                                                                                      |
| Review action (hotfix)                 | Thêm điều kiện "đã ôn trước đó", bonus hết hàng đợi                                                                                                        |
| `complete_pomodoro`                    | XP = 0                                                                                                                                                     |
| `lessons.source` + `create_lesson`     | ⚠️ **T0:** hiện client tự khai báo `p_source`, và có INSERT trực tiếp vào `lessons`/`sentences`. Phải chuyển sang server quyết định trước khi bật giới hạn |
| `profiles.timezone` (NOT NULL)         | Ngày local cho giới hạn, bonus hàng đợi, streak                                                                                                            |
| Leaderboard XP                         | Đọc `transactions`; tự phản ánh nguồn XP mới                                                                                                               |

---

## 10. Tuning knobs

Mọi giá trị nằm ở **một module config** phía TypeScript (`lib/game/config.ts`, đề xuất) và một bảng `game_config` (hoặc hằng số trong một hàm SQL duy nhất) phía DB. Không được viết cứng ở component.

| Knob                         | Giá trị | Khoảng an toàn | Loại  | Nơi đặt (đề xuất)                            |
| ---------------------------- | ------- | -------------- | ----- | -------------------------------------------- |
| `POINTS[exact]`              | 10      | 8–12           | feel  | `lib/scoring.ts` → `lib/game/config.ts`      |
| `POINTS[acceptable]`         | 7       | 5–9            | feel  | như trên                                     |
| `RETRY_PENALTY`              | 2       | 1–3            | feel  | như trên                                     |
| `MIN_POINTS`                 | 2       | 1–3            | feel  | như trên                                     |
| `MIN_LESSON_SENTENCES`       | 3       | 3–5            | gate  | config + SQL                                 |
| `LESSON_BONUS_XP`            | 5       | 0–10           | feel  | config                                       |
| `PERFECT_BONUS_COINS`        | 3       | 0–5            | feel  | config                                       |
| `REVIEW_XP`                  | 1       | 1–2            | feel  | `lib/review/reward.ts` → config              |
| `REVIEW_CLEAR_BONUS_XP`      | 5       | 0–10           | feel  | config                                       |
| `REVIEW_CLEAR_MIN_REVIEWS`   | 5       | 3–10           | gate  | config + SQL                                 |
| `MANUAL_LESSON_DAILY_XP_CAP` | 300     | 200–500        | gate  | SQL (server quyết định), mirror trong config |
| `LEVEL_BASE`                 | 50      | 40–80          | curve | SQL `level_for_xp` (nguồn duy nhất)          |
| `LEVEL_STEP`                 | 40      | 30–60          | curve | như trên                                     |
| `LEVEL_CAP`                  | 50      | cố định        | curve | như trên                                     |
| `STAR_XP`                    | 2.000   | 1.500–3.000    | curve | như trên                                     |
| `POMODORO_XP`                | 0       | cố định        | gate  | `complete_pomodoro`                          |

---

## 11. Acceptance criteria

**Chức năng (mỗi dòng kiểm tra được bằng test):**

1. Dịch đúng **1 câu** (exact, lần đầu) → `wallets.xp` tăng **10** ngay, Dashboard hiện XP mới. _(Sửa lỗi #1.)_
2. Gửi lại cùng câu → XP không đổi.
3. Bài 5 câu xong → XP = tổng các câu + 5; Coins = floor(P/10) (+3 nếu perfect).
4. Bài 2 câu xong → không có +5 XP, không có Coins; XP của 2 câu vẫn có.
5. Ôn thẻ mới (chưa ôn lần nào) → 0 XP, streak không đổi; lịch SRS vẫn cập nhật.
6. Ôn thẻ đến hạn đã ôn trước đó → +1 XP; ôn lại cùng thẻ trong ngày → 0.
7. Ôn hết hàng đợi sau ≥ 5 lượt có thưởng → +5 XP đúng 1 lần/ngày; < 5 lượt → không bonus.
8. Hoàn thành Pomodoro → 0 XP, Coins như cũ, 1 cây; streak **không** đổi.
9. Bài `manual`: tổng XP trong ngày dừng ở **300**; câu tiếp theo mở khoá, hiện thông báo giới hạn, streak vẫn tăng.
10. Bài `ai` / `news` không bị giới hạn 300.
11. Bài `manual` hoàn thành khi giới hạn đã đầy → 0 bonus XP, **0 Coins**, màn kết quả hiện câu thông báo giới hạn.
12. User không thể tạo bài `ai`/`news`, cũng không thể thêm câu vào bài có sẵn bằng gọi trực tiếp Supabase (T0).
13. `level(xp)` đúng tại biên: 49 → Lv1, 50 → Lv2, 439 → Lv4, 440 → Lv5, 49.489 → Lv49, 49.490 → Lv50, 51.490 → Lv50 + 1 ★.
14. Một lần cộng XP vượt 2 level → đúng 1 dòng `level_ups` (from → to).
15. Deploy (chạy migration) không tạo dòng `level_ups` nào.
16. Sự kiện lên cấp hiện đúng 1 lần dù mở 2 thiết bị; user không đọc được sự kiện của người khác.

**Trải nghiệm:**

17. Sau mỗi câu đúng, người học thấy XP vừa nhận trong ≤ 1 giây sau kết quả AI. Không có trạng thái "đúng mà 0 XP" mà không giải thích.
18. Thông báo giới hạn dùng đúng câu chữ **"Đã đạt giới hạn XP hôm nay cho bài tự tạo"**.

**Chỉ số theo dõi (sau deploy):**

| Chỉ số                                        | Mục tiêu / dùng để                     |
| --------------------------------------------- | -------------------------------------- |
| % người dùng mới đạt Lv2 trong ngày đầu       | ≥ 80% người đã dịch ≥ 1 bài            |
| Số câu dịch / người dùng hoạt động / ngày     | Tăng so với trước deploy (đo P1)       |
| % ngày có bonus hết hàng đợi / ngày có ôn thẻ | Theo dõi thói quen SRS                 |
| D7 retention                                  | KPI PRD > 40%                          |
| % user chạm giới hạn 300                      | Nếu > 5% user hoạt động → xem lại knob |
| Phân bố XP/câu thực tế                        | Thay giả định 8 XP/câu trong §4.5      |

---

## 12. Implementation notes (không có code)

### 12.1 Nguyên tắc

- Mọi XP/Coins tính **ở server** từ dữ liệu đã lưu (`attempts`, `flashcards`, `lessons`), trả qua `wallet_apply` với idempotency key.
- Công thức level chỉ có **một nguồn**: hàm SQL `level_for_xp(xp)` (và `stars_for_xp`). TypeScript đọc level qua view (ví dụ mở rộng `wallet_summaries` thêm `level`, `stars`, `xp_into_level`, `xp_to_next`), không viết lại công thức.
- Các con số ở §10 vào một module config + registry.

### 12.2 Phác thảo dữ liệu

| Đối tượng                                         | Thay đổi                                                                                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `transactions.reason`                             | Thêm: `sentence_passed`, `lesson_bonus`, `review_clear`. `metadata` của câu: `{sentenceId, lessonId, source, points, awarded, capped}`                       |
| Hàm `award_sentence_xp(user, sentence)`           | Server gọi sau khi câu mở khoá: tính điểm từ `attempts`, áp giới hạn `manual`, gọi `wallet_apply`, ghi hoạt động học; trả `{points, awarded, capped}`        |
| Hàm `record_study_activity(user)`                 | Tách logic streak ra khỏi `wallet_apply`; gọi từ thưởng câu và thưởng ôn thẻ                                                                                 |
| `wallet_apply`                                    | Bỏ cập nhật streak theo `xp_delta`; thêm so sánh level/sao trước và sau → ghi `level_ups`                                                                    |
| Bảng `level_ups`                                  | Như §3.9; RLS owner SELECT; UPDATE `seen_at` qua RPC `mark_level_ups_seen(ids)`                                                                              |
| Hàm `level_for_xp`, `stars_for_xp`, `xp_to_reach` | `immutable`, số nguyên                                                                                                                                       |
| `complete_pomodoro`                               | XP = 0                                                                                                                                                       |
| `create_lesson` (T0)                              | `p_source` chỉ nhận `manual` từ `authenticated`; bài `ai`/`news` tạo bằng service role ở server. Thu hồi INSERT trực tiếp vào `lessons`/`sentences`          |
| Giới hạn 300                                      | Tổng `xp_delta` hôm nay (ngày local) từ `transactions` có `metadata.source = 'manual'`, khoá dòng ví (`for update`) để hai câu đồng thời không vượt giới hạn |

### 12.3 Bảng test case

| #   | Lớp         | Kịch bản                                                     | Kỳ vọng                                         |
| --- | ----------- | ------------------------------------------------------------ | ----------------------------------------------- |
| 1   | unit        | `scoreSentence` không đổi (test cũ)                          | Pass nguyên trạng                               |
| 2   | unit        | `lessonRewards(n=2/3, P, perfect)`                           | n=2 → 0/0; n=3 → 5 XP + Coins                   |
| 3   | pgTAP       | `level_for_xp` tại 0, 49, 50, 439, 440, 49.489, 49.490, 10⁹  | 1, 1, 2, 4, 5, 49, 50, 50                       |
| 4   | pgTAP       | `stars_for_xp` tại 49.489, 49.490, 51.489, 51.490            | 0, 0, 0, 1                                      |
| 5   | pgTAP       | `award_sentence_xp` 2 lần cùng câu                           | Lần 2 không cộng                                |
| 6   | pgTAP       | Bài `manual`, XP hôm nay 296, câu 10 điểm                    | awarded = 4, capped = true; câu tiếp: 0, capped |
| 7   | pgTAP       | Bài `ai`, XP `manual` hôm nay đã 300                         | Trả đủ điểm                                     |
| 7b  | pgTAP       | Bài `manual` ≥ 3 câu hoàn thành khi giới hạn đã đầy          | bonus = 0, Coins = 0, capped = true             |
| 8   | pgTAP       | Hai câu `manual` đồng thời quanh mốc 300                     | Tổng không vượt 300                             |
| 9   | pgTAP       | Câu bị capped → streak                                       | Streak vẫn tăng (hoạt động học)                 |
| 10  | pgTAP       | Pomodoro hoàn thành                                          | xp_delta = 0, streak không đổi, Coins đúng      |
| 11  | pgTAP       | Cộng XP vượt Lv4 → Lv6                                       | 1 dòng `level_ups` (4 → 6)                      |
| 12  | pgTAP       | Cộng XP không vượt mốc                                       | 0 dòng `level_ups`                              |
| 13  | pgTAP       | User B đọc / đánh dấu `level_ups` của A                      | Không thấy / không đổi                          |
| 14  | pgTAP       | Migration trên ví có sẵn XP                                  | 0 dòng `level_ups`                              |
| 15  | pgTAP       | `authenticated` gọi `create_lesson(p_source => 'ai')`        | Bị từ chối (T0)                                 |
| 16  | pgTAP       | `authenticated` INSERT vào `sentences` của bài có sẵn        | Bị từ chối (T0)                                 |
| 16b | integration | Tạo bài tin tức với đoạn văn **giống hệt** bản cache         | `source = 'news'`, có ghi nguồn                 |
| 16c | integration | Tạo bài tin tức với đoạn văn **đã sửa**                      | `source = 'manual'`, vẫn có ghi nguồn           |
| 17  | unit/route  | Ôn thẻ mới lần đầu                                           | 0 XP, không gọi hoạt động học                   |
| 18  | unit/route  | Ôn thẻ thứ 5 có thưởng, hàng đợi rỗng                        | +1 và +5 (key `review_clear:<ngày>`)            |
| 19  | unit/route  | Hàng đợi rỗng nhưng mới 4 lượt có thưởng                     | Không bonus                                     |
| 20  | route       | `verify` trả về `xpAwarded`, `capped` cho UI                 | Đúng giá trị từ server                          |
| 21  | E2E         | Dịch 1 câu → Dashboard XP tăng                               | Pass (lỗi #1)                                   |
| 22  | E2E         | Bài `manual` chạm giới hạn → thấy thông báo                  | Có đúng câu chữ, câu vẫn mở khoá                |
| 23  | E2E         | Lên cấp → thông báo hiện 1 lần, tải lại trang không hiện lại | Pass                                            |

### 12.4 Thứ tự task (mỗi task giao được độc lập)

| Task | Nội dung                                                                                                                                                                    | Phụ thuộc  |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| T0   | Khoá `lessons.source`: `create_lesson` chỉ `manual` cho client, bài `ai`/`news` tạo bằng service role; thu hồi INSERT trực tiếp; bài tin tức đã sửa → `manual` (§3.6 mục 9) | —          |
| T1   | Module config `lib/game/config.ts` + gom các con số hiện có (không đổi hành vi)                                                                                             | —          |
| T2   | Hàm level/sao trong SQL + mở rộng `wallet_summaries` + hiển thị Lv ở Dashboard/Hồ sơ                                                                                        | T1         |
| T3   | `record_study_activity` + bỏ streak theo `xp_delta` + Pomodoro 0 XP                                                                                                         | —          |
| T4   | XP theo câu (`award_sentence_xp`, key `sentence:<id>`), giới hạn 300, chip XP + thông báo giới hạn; `completeLesson` chỉ còn bonus + Coins (≥ 3 câu)                        | T0, T1, T3 |
| T5   | Ôn thẻ: điều kiện "đã ôn trước đó" + bonus hết hàng đợi                                                                                                                     | T1, T3     |
| T6   | `level_ups` + phát hiện trong `wallet_apply` + RPC đánh dấu đã xem + thông báo đơn giản (chưa hoạt hình)                                                                    | T2         |

Thứ tự deploy cho mỗi task có migration: `supabase db push` lên production trước, rồi mới merge PR (như hotfix).
