# 🌳 Garden Scene — Spec (Vườn tri thức sống động)

> Hệ thống: **Pomodoro garden — phần hình ảnh và tương tác** · Trạng thái: **Approved (Minh, 2026-11-07)**, đang code · Branch: `feat/garden-visual`
> Phong cách: `design/game/art-bible.md` · Ảnh: `design/game/asset-prompts.md` · Pillars: `.claude/docs/game-pillars.md`
> **[Chốt]** = Minh đã quyết. **[Diễn giải]** = cách mình hiểu một quyết định, Minh có thể sửa. **[Đề xuất]** = chưa duyệt, chưa code.

---

## 1. Overview

Biến trang `/garden` từ lưới icon thành **một khu vườn sống động** vẽ tay theo art bible:

- Pipo đi dạo theo lối đi cong, dừng ngắm cây, ngồi ghế, phản ứng khi được bấm và nói câu ngắn **dựa trên dữ liệu thật**.
- Mèo đi ngược chiều, cá koi bơi trong hồ, cánh hoa anh đào rơi, mây trôi.
- Bấm vào cây để xem thông tin cây.
- Cây **lớn dần theo số phiên Pomodoro thật**.

| Thay đổi           | Trước            | Sau                                                                                                     |
| ------------------ | ---------------- | ------------------------------------------------------------------------------------------------------- |
| Một phiên Pomodoro | Trồng 1 cây mới  | Chăm cây đang lớn: phiên 1 mầm, 2 cây con, 4 trưởng thành; phiên kế tiếp trồng cây mới **[Chốt]**       |
| Loài cây           | Xoay vòng icon   | Người học **tự chọn** khi trồng cây mới; thông và tre có sẵn, anh đào và phong cần hạt giống **[Chốt]** |
| Hiển thị           | Lưới icon lucide | Cảnh PixiJS v8 3/4 từ trên, lazy load chỉ ở `/garden` **[Chốt]**                                        |
| Đồ trang trí       | Hàng emoji       | Đặt theo ô, lưu server **[Chốt]**                                                                       |
| Bản đồ             | —                | Cố định 8×6 ô; đầy thì mở khu vườn 2 **[Chốt]**                                                         |

## 2. Learner fantasy & target feeling

- **Fantasy:** "Mỗi lần mình tập trung, khu vườn của mình lớn thêm, và Pipo vui vẻ sống trong đó."
- **MDA:** _Sensation_ (cảnh đẹp, chuyển động nhẹ) + _Fantasy_ + _Expression_ (chọn loài, sắp xếp đồ trang trí).
- **Hành vi học cần tăng (P1):** hoàn thành phiên Pomodoro trọn vẹn; quay lại học mỗi ngày (anh đào nở khi hôm nay đã học).
- **Không** dùng vườn để gây áp lực: không có cây héo, không mất cây, Pipo không trách móc (P5).

## 3. Detailed rules

### 3.1 Cây lớn theo phiên **[Chốt]**

| Số phiên đã chăm cây | Giai đoạn               |
| -------------------- | ----------------------- |
| 1                    | Mầm (`sprout`)          |
| 2–3                  | Cây con (`sapling`)     |
| ≥ 4                  | Trưởng thành (`mature`) |

- Mỗi người học có **tối đa 1 cây đang lớn** (chưa trưởng thành). **[Diễn giải]** từ "xong thì phiên sau trồng cây mới".
- Phiên hoàn thành:
  - Có cây đang lớn → cây đó +1 phiên.
  - Không có → **trồng cây mới** ở ô trồng trống đầu tiên, với loài đã chọn khi bắt đầu phiên.
- **Chọn loài [Chốt]:** người học chọn loài khi **bắt đầu phiên sẽ trồng cây mới**. Khi đang có cây lớn dở, trang Pomodoro hiện "Đang chăm: Thông 2/4" thay cho ô chọn. **[Diễn giải]**
- Phiên bỏ dở hoặc kết thúc sớm: không chăm cây (giữ luật thưởng hiện tại).
- Cây **không bao giờ héo hay mất**.

### 3.2 Loài cây và hạt giống **[Chốt]**

| Loài       | Mã       | Có sẵn?                  |
| ---------- | -------- | ------------------------ |
| Thông Nhật | `pine`   | ✅                       |
| Tre        | `bamboo` | ✅                       |
| Phong đỏ   | `maple`  | Cần sở hữu `seed-maple`  |
| Anh đào    | `sakura` | Cần sở hữu `seed-sakura` |

- Server kiểm tra quyền dùng loài khi bắt đầu phiên; client chỉ hiển thị.
- Hai món `seed-maple`, `seed-sakura` có trong shop từ 09/11/2026 (loại `seed`, 120 Coins mỗi hạt, migration `20261109070100_shop_garden_items.sql`). Mua hạt là loài tự mở.

### 3.3 Anh đào nở hoa **[Chốt]**

- Cây anh đào **trưởng thành** hiển thị bản **nở hoa** khi **hôm nay đã có hoạt động học** (dùng `effective_streak > 0` và `last_active_date` = hôm nay theo múi giờ người học, cùng định nghĩa "hoạt động học" ở `xp-levels.md` §3.5).
- Chưa học hôm nay → tán lá xanh. Không có thông báo phạt.
- Cánh hoa rơi chỉ xuất hiện khi có ít nhất 1 cây anh đào đang nở.

### 3.4 Bản đồ, lối đi, khu vườn 2 **[Chốt]**

Lưới **8×6 ô**, mẫu cố định (`T` = ô trồng cây, `D` = ô đồ trang trí, `=` = lối đi, `W` = hồ 2×2):

```
      x: 0 1 2 3 4 5 6 7
   y0    T T T T T T T T
   y1    T D T T T T D T
   y2    = = = = = = = =
   y3    T D W W D T T T
   y4    T T W W T D T T
   y5    T T T T T T T T
```

- **31 ô trồng cây** mỗi khu vườn, trồng theo thứ tự đọc (trái → phải, trên → dưới). **5 ô đồ trang trí.**
- Ô `W` là hồ nếu người học có `deco-pond`, ngược lại là cỏ (không phải ô trồng).
- Khu vườn đầy 31 cây → cây mới sang **khu vườn 2** (rồi 3…). Trang `/garden` có nút chuyển khu vườn.
- **Lối đi** là chuỗi waypoint dọc hàng `y2`, nội suy cong (Catmull-Rom) để đường đi mềm. Có waypoint "ngắm cây" cạnh các ô cây và waypoint "ghế" cạnh ô `D` sát lối đi.

### 3.5 Đồ trang trí **[Chốt: đặt theo ô, lưu server]**

- Món đã mua có thể đặt vào **1 trong 5 ô `D`** của một khu vườn; mỗi món đặt một chỗ, mỗi ô một món. Gỡ ra thì món về kho.
- Hồ (`deco-pond`) không đặt vào ô `D`: có hồ thì ô `W` thành hồ, kèm **2 cá koi**.
- Cầu gỗ đỏ (50), cổng torii (60), mèo (90) có trong shop từ 09/11/2026, giá **[Đề xuất]**. Torii đặt vào ô trang trí; cầu bắc ngang hồ (cần có hồ); mèo đi dạo, không chiếm ô.

### 3.6 Pipo — máy trạng thái

| Trạng thái | Làm gì                                                               | Chuyển sang                                                                                                    |
| ---------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `walking`  | Đi theo lối với tốc độ 28 px/s, lật hướng khi quay đầu ở hai đầu lối | Tới waypoint "ngắm cây" (cây trưởng thành ở cạnh): 35% → `looking`; tới waypoint "ghế" có ghế: 50% → `sitting` |
| `looking`  | Đứng quay về phía cây 2–4 s, có thể nói 1 câu                        | Hết giờ → `walking`                                                                                            |
| `sitting`  | Ngồi trên ghế 4–7 s, chớp mắt, có thể nói 1 câu                      | Hết giờ → `walking`                                                                                            |
| `reacting` | Khi được bấm: nhảy nhẹ + vỗ cánh 1,2 s + nói 1 câu                   | Hết giờ → trạng thái trước đó                                                                                  |

- Luôn chớp mắt ngẫu nhiên mỗi 2,5–5 s.
- Logic thuần trong `lib/garden/pipo-machine.ts` (nhận `dt` và hàm random qua tham số) để unit test được.

### 3.7 Pipo nói theo dữ liệu thật

Chọn câu theo thứ tự ưu tiên, xoay vòng để không lặp liên tiếp. Giọng khích lệ, **không trách móc**:

| Điều kiện                      | Câu (vi)                                                  |
| ------------------------------ | --------------------------------------------------------- |
| Chưa có cây                    | "Mình trồng cây đầu tiên nhé? Một phiên tập trung là đủ." |
| Có cây đang lớn                | "Cây {loài} còn {n} phiên nữa là trưởng thành!"           |
| Có anh đào nở (hôm nay đã học) | "Hôm nay mình học rồi, anh đào nở hoa kìa!"               |
| Có anh đào, hôm nay chưa học   | "Dịch một câu thôi là anh đào sẽ nở đó."                  |
| Mặc định                       | "Vườn mình có {n} cây rồi!"                               |

Câu nói hiện trong bong bóng trên đầu Pipo và đồng thời trong vùng `aria-live="polite"` (tối đa 1 câu mỗi 10 s).

### 3.8 Sinh vật và hiệu ứng

- **Mèo:** khi có món mèo, đi lối ngược chiều Pipo, thỉnh thoảng ngồi liếm chân.
- **Koi:** 2 con, bơi vòng elip trong hồ, xoay theo hướng bơi.
- **Mây:** 3 đám, trôi chậm sang phải, quay vòng.
- **Cánh hoa:** tối đa 20 cánh cùng lúc, rơi từ tán anh đào đang nở, lắc nhẹ rồi mờ dần.

## 4. Formulas

### 4.1 Giai đoạn cây

```
stage(sessions) = sessions ≥ 4 ? "mature" : sessions ≥ 2 ? "sapling" : "sprout"
```

| Ký hiệu  | Kiểu | Khoảng | Mô tả                                |
| -------- | ---- | ------ | ------------------------------------ |
| sessions | int  | 1 … 4  | Số phiên đã chăm cây (dừng tăng ở 4) |

Ví dụ: 3 phiên → `sapling`, còn 1 phiên nữa là trưởng thành.

### 4.2 Vị trí ô → toạ độ cảnh (isometric, đổi ngày 09/11/2026)

Minh chọn kiểu vườn nông trại (giống Hay Day): ô đất hình thoi, cây trồng trong từng luống có viền gỗ.

```
project(gx, gy) = (ISO_X + (gx − gy) × TILE_W / 2,  ISO_Y + (gx + gy) × TILE_H / 2)
tâm ô (x, y)    = project(x + 0.5, y + 0.5)
```

| Ký hiệu   | Giá trị | Mô tả                                    |
| --------- | ------- | ---------------------------------------- |
| TILE_W    | 80      | Rộng một ô hình thoi (logical px)        |
| TILE_H    | 40      | Cao một ô (tỉ lệ 2:1)                    |
| ISO_X/Y   | 280/136 | Góc trên cùng của bản đồ (điểm lưới 0,0) |
| HORIZON_Y | 118     | Nơi cỏ gặp rặng cây xa                   |

- +x đi xuống-phải, +y đi xuống-trái. Lối đi (hàng 2) chạy chéo xuống-phải và kéo dài thêm 1 ô ra ngoài mỗi đầu bản đồ.
- Cỏ là một texture lặp (TilingSprite) phủ từ đường chân trời xuống; ô `T` vẽ luống đất `plot-soil`, ô `=` vẽ `tile-path`.
- Gốc cây và chân vật đứng đặt tại tâm ô + 3 px. Thứ tự vẽ theo `y` của điểm neo (vật thấp hơn vẽ sau).

## 5. Economy impact

Không có faucet hay sink mới trong spec này. Coins của Pomodoro giữ nguyên. Hạt giống và món trang trí mới là **sink tương lai** của spec shop (giá **[Đề xuất]**, chưa thêm vào DB).

## 6. Retention hooks

- Anh đào nở khi hôm nay đã học: lý do nhẹ nhàng để quay lại mỗi ngày, không phạt khi nghỉ.
- Cây đang lớn có tiến độ rõ ràng ("còn 1 phiên"), tạo động lực hoàn thành phiên.
- Khu vườn 2 khi khu 1 đầy: cột mốc dài hạn.

## 7. UX & accessibility

| Trạng thái                       | Hiển thị                                                               |
| -------------------------------- | ---------------------------------------------------------------------- |
| Đang tải thư viện cảnh           | Khung cùng tỉ lệ 640:432 với skeleton; danh sách cây (DOM) hiện ngay   |
| Không tải được cảnh (lỗi WebGL…) | Ẩn canvas, vẫn có danh sách cây và nút Pomodoro                        |
| Chưa có cây                      | Cảnh vẫn có Pipo, câu "Mình trồng cây đầu tiên nhé?", nút "Trồng cây"  |
| Bấm vào cây                      | Hộp thoại: loài, giai đoạn, phiên x/4, ngày trồng, ngày trưởng thành   |
| Chế độ sắp xếp                   | Chọn món → chọn ô `D` (nút có nhãn "Ô 1…5", ô được tô sáng trong cảnh) |

**Accessibility (WCAG 2.2 AA):**

- Canvas có `role="img"` và `aria-label` tóm tắt ("Vườn tri thức: 12 cây, 1 cây đang lớn").
- **Danh sách cây dạng văn bản** ngay dưới cảnh, mỗi cây là một nút mở cùng hộp thoại thông tin. Đây là đường chính cho trình đọc màn hình và bàn phím.
- Nút "Chào Pipo" (DOM) cho người dùng bàn phím, tương đương bấm vào Pipo.
- Câu nói của Pipo đọc qua `aria-live="polite"`, có giới hạn tần suất.
- **`prefers-reduced-motion` [Chốt]:** cảnh tĩnh; Pipo đứng yên và chỉ chớp mắt; mèo ngồi; koi đứng yên; không có cánh hoa rơi và mây không trôi.
- Mọi text qua next-intl (VI/EN/JA).

## 8. Edge cases & degenerate strategies

| Tình huống                                 | Xử lý                                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| Treo tab Pomodoro để lấy cây               | Đã chặn ở server (S21): phải đủ thời gian; cây chỉ lớn khi phiên `completed` |
| Gửi loài bị khoá (anh đào khi chưa có hạt) | Server từ chối khi bắt đầu phiên                                             |
| Đổi loài giữa chừng khi cây đang lớn       | Không được: phiên chăm cây đang lớn, tham số loài bị bỏ qua                  |
| Phiên hoàn thành 2 lần (gửi lại)           | `complete_pomodoro` đã chặn (status `running`), cây không lớn 2 lần          |
| Người dùng cũ có nhiều phiên               | Mỗi phiên cũ = 1 cây trưởng thành (§12.2), không mất cây                     |
| Hơn 31 cây                                 | Tự sang khu vườn 2, 3…                                                       |
| Gỡ đồ trang trí đang có Pipo ngồi          | Pipo đứng dậy, đi tiếp                                                       |
| Bán/mất quyền sở hữu món (hiện không có)   | Món không còn hiển thị                                                       |
| Tab ẩn                                     | Dừng ticker; quay lại thì tiếp tục, không "tua nhanh"                        |
| WebGL không có                             | Dùng danh sách cây, không lỗi trang                                          |

## 9. Dependencies

- `pomodoro_sessions`, `start_pomodoro`, `complete_pomodoro` (S21, hotfix T3).
- `purchases`, `shop_items` (S23) cho hạt giống và đồ trang trí.
- `wallet_summaries.effective_streak` + `wallets.last_active_date` (hotfix, T3) cho anh đào nở.
- PixiJS v8 **[Chốt]**, lazy load bằng `import()` trong component client của `/garden`.

## 10. Tuning knobs

Nằm ở `lib/garden/config.ts` (cảnh) và `lib/game/config.ts` (luật). Luật cũng có trong SQL.

| Knob                   | Giá trị      | Khoảng  | Loại | Nơi                                   |
| ---------------------- | ------------ | ------- | ---- | ------------------------------------- |
| `TREE_STAGE_SESSIONS`  | 1 / 2 / 4    | —       | gate | `lib/game/config.ts` + SQL **[Chốt]** |
| `GARDEN_COLS × ROWS`   | 8 × 6        | cố định | gate | `lib/garden/layout.ts` **[Chốt]**     |
| `PLOTS_PER_GARDEN`     | 31           | cố định | gate | suy ra từ layout + SQL                |
| `DECOR_SLOTS`          | 5            | cố định | gate | layout                                |
| `FREE_SPECIES`         | pine, bamboo | —       | gate | `lib/game/config.ts` + SQL **[Chốt]** |
| Tốc độ đi Pipo         | 28 px/s      | 20–40   | feel | `lib/garden/config.ts`                |
| Xác suất dừng ngắm cây | 0,35         | 0–1     | feel | như trên                              |
| Xác suất ngồi ghế      | 0,5          | 0–1     | feel | như trên                              |
| Cánh hoa tối đa        | 20           | 0–40    | feel | như trên                              |
| Số mây                 | 3            | 0–5     | feel | như trên                              |

## 11. Acceptance criteria

1. Phiên đầu tiên (chưa có cây) trồng một **mầm** đúng loài đã chọn, ở ô trồng đầu tiên.
2. Phiên 2 → cây con; phiên 4 → trưởng thành; phiên 5 → mầm mới ở ô kế tiếp.
3. Không có cây đang lớn → trang Pomodoro hiện chọn loài; đang có → hiện "Đang chăm: {loài} {n}/4".
4. Chọn anh đào khi chưa có `seed-sakura` → server từ chối (pgTAP).
5. Người dùng có N phiên cũ → sau migration có N cây trưởng thành, đúng thứ tự, sang khu vườn 2 nếu N > 31.
6. Anh đào trưởng thành nở hoa khi và chỉ khi hôm nay đã có hoạt động học.
7. Đặt đồ trang trí: chỉ món đã sở hữu, chỉ vào ô `D` trống; người khác không đọc hay sửa được (pgTAP).
8. Bấm cây (chuột) hoặc chọn cây trong danh sách (bàn phím) → hộp thoại thông tin đúng dữ liệu.
9. `prefers-reduced-motion` → không có chuyển động trừ chớp mắt.
10. Tab ẩn → ticker dừng.
11. Thư viện PixiJS **không** nằm trong bundle của trang khác ngoài `/garden`.
12. Thả ảnh thật đúng tên vào `public/garden/` là cảnh dùng ảnh đó, không sửa code.
13. Mục tiêu 60 fps trên điện thoại tầm trung; không quá 70 đối tượng chuyển động.

## 12. Implementation notes

### 12.1 Ảnh và placeholder

- `lib/garden/assets.ts`: **nguồn sự thật** cho tên file, kích thước @2x, điểm neo, điểm gắn bộ phận (khớp art bible và asset prompts).
- `npm run garden:placeholders`: sinh ảnh placeholder (hình khối đơn giản theo bảng màu, đúng kích thước, có chấm đánh dấu điểm neo) vào `public/garden/`, **chỉ ghi file chưa có**, nên không bao giờ đè ảnh thật.
- `npm run garden:check`: kiểm tra mọi file trong manifest: tồn tại, đúng kích thước, nền trong suốt, số màu ngoài bảng.
- PixiJS tự hiểu hậu tố `@2x` nên ảnh hiển thị đúng kích thước logical.

### 12.2 Dữ liệu (migration mới, chỉ tạo file)

| Đối tượng                                      | Nội dung                                                                                                                                                                      |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bảng `garden_trees`                            | `id, user_id, garden_index, plot_index, species, sessions (1–4), planted_at, matured_at, legacy` · RLS owner SELECT · ghi chỉ qua function                                    |
| `pomodoro_sessions`                            | + `species` (loài chọn khi bắt đầu), + `garden_tree_id` (cây được chăm)                                                                                                       |
| `start_pomodoro(p_planned_minutes, p_species)` | Kiểm tra quyền dùng loài khi sẽ trồng cây mới                                                                                                                                 |
| `complete_pomodoro`                            | Sau khi trả Coins: chăm cây đang lớn hoặc trồng cây mới ở ô trống đầu tiên                                                                                                    |
| Backfill                                       | Mỗi phiên `completed` cũ → 1 cây `mature`, `legacy = true`, loài xoay vòng pine → bamboo → maple → sakura theo thứ tự thời gian, xếp ô theo thứ tự, sang khu vườn sau khi đầy |
| Bảng `garden_decorations`                      | `user_id, item_id, garden_index, slot_index` · unique theo (user, item) và (user, garden, slot) · RLS owner SELECT                                                            |
| `place_decoration` / `remove_decoration`       | RPC kiểm tra sở hữu món (`purchases`), ô hợp lệ (0–4), ô trống                                                                                                                |

### 12.3 Bảng test case

| #   | Lớp   | Kịch bản                                                 | Kỳ vọng                                |
| --- | ----- | -------------------------------------------------------- | -------------------------------------- |
| 1   | unit  | `stageFor(1/2/3/4)`                                      | sprout / sapling / sapling / mature    |
| 2   | unit  | Layout: số ô T, D, W, lối đi                             | 31 / 5 / 4 / 8                         |
| 3   | unit  | Nội suy lối đi                                           | Liên tục, đi qua mọi waypoint          |
| 4   | unit  | Máy trạng thái Pipo với random cố định                   | Đúng chuỗi trạng thái                  |
| 5   | unit  | Chọn câu nói theo dữ liệu                                | Đúng ưu tiên, không lặp liên tiếp      |
| 6   | unit  | Manifest: mọi file có kích thước chẵn, neo nằm trong ảnh | Pass                                   |
| 7   | pgTAP | Phiên 1/2/4/5                                            | mầm / cây con / trưởng thành / cây mới |
| 8   | pgTAP | Loài khoá khi chưa có hạt                                | Từ chối                                |
| 9   | pgTAP | Backfill phiên cũ                                        | N cây trưởng thành, đúng ô, sang khu 2 |
| 10  | pgTAP | Đặt đồ trang trí: chưa sở hữu / ô chiếm / người khác     | Từ chối / từ chối / không thấy         |
| 11  | E2E   | Trang Pomodoro hiện chọn loài, anh đào khoá              | Pass                                   |
| 12  | E2E   | Trang vườn: danh sách cây, mở hộp thoại bằng bàn phím    | Pass                                   |
| 13  | E2E   | Cảnh tải (canvas có mặt), không lỗi console              | Pass                                   |
| 14  | E2E   | Đặt và gỡ đồ trang trí                                   | Pass                                   |

### 12.4 Danh sách task

| Task | Nội dung                                                                                           | Phụ thuộc |
| ---- | -------------------------------------------------------------------------------------------------- | --------- |
| G1   | Manifest ảnh + placeholder + `garden:check` + cài PixiJS                                           | —         |
| G2   | DB: `garden_trees`, chăm cây trong `complete_pomodoro`, chọn loài trong `start_pomodoro`, backfill | —         |
| G3   | Logic thuần: layout, giai đoạn, lối đi, máy trạng thái Pipo, câu nói                               | —         |
| G4   | Trang Pomodoro: chọn loài / "Đang chăm"                                                            | G2        |
| G5   | Cảnh PixiJS: nền, ô, cây, Pipo, mèo, koi, mây, cánh hoa; dừng khi tab ẩn; reduced motion           | G1, G3    |
| G6   | Tương tác & tiếp cận: danh sách cây, hộp thoại, nút "Chào Pipo", câu nói `aria-live`               | G5        |
| G7   | Đồ trang trí: bảng + RPC + chế độ sắp xếp                                                          | G2, G5    |
| G8   | Nhiều khu vườn: chuyển khu 1/2/…                                                                   | G5        |

Thứ tự deploy (sau này, Minh tự làm): `supabase db push` trước rồi mới merge, như các PR trước.
