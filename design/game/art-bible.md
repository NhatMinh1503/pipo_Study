# 🎨 Art Bible — Vườn tri thức (pipo_Study)

> Trạng thái: **Approved** (Minh, 2026-11-07) · Nguồn phong cách: `public/icons/icon-source.png` (Pipo)
> Dùng cùng `design/game/asset-prompts.md` (prompt cho từng ảnh) và `design/game/garden-scene.md` (cách cảnh dùng ảnh).
> Mọi ảnh trong `public/garden/` phải qua **quy trình hậu kỳ (§8)** và **checklist duyệt (§9)** trước khi commit.

---

## 1. Phong cách

- **2D vẽ tay mịn, nét đều**, cùng "nhà" với icon Pipo: hình khối tròn đầy đặn, mắt to đơn giản, má hồng, viền nâu đậm liền mạch.
- **Không** pixel thô, không 3D, không ảnh chụp, không phong cách anime chi tiết.
- Bề mặt **phẳng**, tô màu khối + **1 tông bóng**. Không gradient, không texture.
- Cảm giác: ấm áp, yên bình, "sách tranh thiếu nhi Nhật".

## 2. Góc nhìn **[Chốt]**

- **3/4 nhìn chéo từ trên xuống** (khoảng 35–40° so với mặt đất). Mặt đất là lưới **hình chữ nhật** (không phải kim cương isometric).
- Vật đứng (cây, Pipo, đèn lồng) vẽ **thấy mặt trước + một chút đỉnh**; mặt đất, hồ, lối đá vẽ **thấy mặt trên**.
- Nhân vật chỉ vẽ **1 hướng: nhìn sang phải, hơi chếch xuống**. Hướng trái = **lật gương bằng code**. Vì vậy hình phải **gần đối xứng về ánh sáng** (xem §5) để lật không lộ sai bóng.

## 3. Bảng màu cố định — 16 màu **[Chốt]**

12 màu lấy từ icon + 3 xanh lá + 1 xám đá. Đã bỏ 2 màu gần trùng của icon (`#FCB444`, `#FCECBC`). **Ảnh cuối chỉ được dùng đúng 16 màu này** (bóng đổ dưới chân là ngoại lệ duy nhất, xem §5).

| #   | Tên            | Hex       | Dùng cho                                                 |
| --- | -------------- | --------- | -------------------------------------------------------- |
| 1   | Kem            | `#FCF4EC` | Điểm sáng, mây, mắt sáng, viền trong                     |
| 2   | Vàng Pipo      | `#FCE46C` | Thân Pipo, đèn lồng sáng, hoa vàng                       |
| 3   | Vàng đậm       | `#FCB41C` | Bóng của vàng, coin                                      |
| 4   | Cam mỏ         | `#FC8C24` | Mỏ, chân Pipo, lửa chuỗi, lá phong ngả cam               |
| 5   | Hồng anh đào   | `#F48C9C` | Hoa anh đào, má hồng, cánh hoa rơi                       |
| 6   | Đỏ torii       | `#FC5C44` | Cổng torii, cầu gỗ, lá phong đỏ, cá koi                  |
| 7   | Nâu đỏ         | `#843C34` | Mái torii, thân cây, gỗ ghế, bóng của đỏ                 |
| 8   | **Nâu viền**   | `#542414` | **Toàn bộ viền**, mắt, chi tiết tối                      |
| 9   | Xanh trời      | `#84C4FC` | Trời, mặt hồ sáng                                        |
| 10  | Xanh trời nhạt | `#C4E4FC` | Trời gần chân trời, phản chiếu nước, tuyết Phú Sĩ (bóng) |
| 11  | Xanh núi       | `#6CA4EC` | Núi Phú Sĩ, mặt hồ                                       |
| 12  | Xanh thẫm      | `#4C74BC` | Bóng núi, bóng nước, cá koi (đốm)                        |
| 13  | Lá non         | `#CDE38A` | Cỏ sáng, lá non, đỉnh tre                                |
| 14  | Lá             | `#8CC45C` | Cỏ, tán lá chính, tre                                    |
| 15  | Lá đậm         | `#4E8C46` | Bóng của lá, thông, rêu                                  |
| 16  | Xám đá         | `#BCB0A4` | Lối đá, đèn lồng đá, mép hồ, đá                          |

**Cặp màu bóng (1 tông):** 2→3, 4→6, 5→6, 6→7, 7→8, 9→11, 10→9, 11→12, 13→14, 14→15, 16→7 (đá ngả nâu), 1→10 (kem trong bóng).

## 4. Nét viền

- Màu **`#542414`** cho mọi viền ngoài. Không dùng đen.
- Độ dày ở **kích thước xuất @2x**: viền ngoài **4 px**, nét trong (nếp, tách bộ phận) **2 px**. Ở kích thước logical (1x) tương đương 2 px và 1 px.
- Độ dày **đều** trên toàn bộ hình, đầu nét tròn, không vuốt nhọn kiểu bút lông.
- Mọi hình đều **khép kín viền**; vật nhỏ (cánh hoa rơi, cá koi) cũng có viền 2 px.

## 5. Ánh sáng & bóng

- Ánh sáng **cố định từ trên-trái**. Bóng tự thân nằm ở **phía dưới-phải** của khối, dùng **đúng 1 tông** theo cặp ở §3.
- Vì nhân vật được lật gương, **bóng tự thân của Pipo, mèo và cá chỉ đặt ở phía dưới**, không lệch hẳn sang một bên.
- **Bóng đổ dưới chân**: một hình elip màu `#542414` độ mờ 25%, đặt ở **file riêng** (`*-shadow@2x.png`), không vẽ dính vào vật.
- Không highlight bóng loáng, không viền sáng (rim light), không phát sáng (glow), trừ ánh đèn lồng được vẽ bằng 1 vòng màu `#FCF4EC`.

## 6. Tỉ lệ & kích thước

Đơn vị **logical px** (1x). Ảnh xuất **@2x** (gấp đôi), **PNG nền trong suốt**, tên file có hậu tố `@2x`.

| Thứ                    | Kích thước logical (rộng×cao) | Kích thước file @2x | Điểm neo (logical, từ góc trên-trái) |
| ---------------------- | ----------------------------- | ------------------- | ------------------------------------ |
| Ô đất (cỏ, lối đá)     | 64×48                         | 128×96              | tâm ô (32, 24)                       |
| Cảnh (canvas)          | 640×432                       | —                   | —                                    |
| Pipo (ghép xong)       | ~40×44                        | —                   | giữa chân (20, 44)                   |
| Cây mầm                | 32×32                         | 64×64               | gốc (16, 30)                         |
| Cây con                | 48×64                         | 96×128              | gốc (24, 60)                         |
| Cây trưởng thành       | 80×112                        | 160×224             | gốc (40, 108)                        |
| Đèn lồng đá            | 32×56                         | 64×112              | chân (16, 54)                        |
| Ghế dài                | 64×40                         | 128×80              | giữa chân (32, 38)                   |
| Cổng torii             | 96×96                         | 192×192             | giữa 2 chân (48, 94)                 |
| Cầu gỗ đỏ              | 96×56                         | 192×112             | giữa (48, 40)                        |
| Hồ (gồm mép hồ, 2×2 ô) | 128×96                        | 256×192             | tâm (64, 48)                         |
| Cá koi                 | 20×10                         | 40×20               | tâm (10, 5)                          |
| Mèo (ghép xong)        | ~36×28                        | —                   | giữa chân (18, 28)                   |
| Nền trời               | 640×432                       | 1280×864            | (0, 0)                               |
| Núi Phú Sĩ             | 320×96                        | 640×192             | đáy giữa (160, 96)                   |
| Mây                    | 96×40 / 64×28                 | 192×80 / 128×56     | tâm                                  |
| Cánh hoa               | 8×8                           | 16×16               | tâm                                  |
| Icon UI                | 48×48                         | 96×96               | tâm                                  |

**Tỉ lệ:** Pipo cao khoảng **1 ô** (44 so với 48); cây trưởng thành cao khoảng **2,3 ô**; ghế dài rộng **1 ô**; torii rộng **1,5 ô**.

Kích thước và điểm neo của **từng bộ phận** Pipo và mèo ghi trong `asset-prompts.md` và trong `lib/garden/assets.ts` (nguồn sự thật cho code).

## 7. Dấu hiệu "nhìn ra là AI vẽ" — phải tránh

| Dấu hiệu                          | Ví dụ                                              | Cách xử lý                                |
| --------------------------------- | -------------------------------------------------- | ----------------------------------------- |
| Viền dày mỏng lung tung           | Viền đầu Pipo dày, cánh mảnh như sợi chỉ           | Vẽ lại viền bằng nét đều 4 px (§8 bước 3) |
| Bóng bẩy như nhựa                 | Highlight trắng bóng, chuyển màu mượt              | Giảm màu về bảng 16 màu, xoá highlight    |
| Chi tiết thừa vô nghĩa            | Lá thừa, hoa văn lạ trên thân, chữ giả             | Xoá; mỗi chi tiết phải có lý do           |
| Ánh sáng mỗi hình một hướng       | Cây bóng phải, đèn bóng trái                       | Tô lại bóng theo §5                       |
| Đối xứng méo                      | Hai mắt khác cỡ, hai cánh lệch, cổng torii nghiêng | Căn đối xứng, lật một nửa làm chuẩn       |
| Texture nhiễu                     | Hạt nhiễu, vân giấy, nét chì                       | Tô phẳng                                  |
| Gradient loè loẹt                 | Trời chuyển 5 màu, nước cầu vồng                   | Tối đa 2 tông phẳng                       |
| Số lượng bộ phận sai              | 3 chân, 4 ngón, thừa cánh                          | Sửa đúng giải phẫu Pipo                   |
| Viền mờ / răng cưa / quầng trắng  | Nền trong suốt còn viền trắng                      | Tách nền sạch, viền khép kín              |
| Phong cách lệch nhau giữa các ảnh | Cây này vẽ kiểu màu nước, cây kia kiểu vector      | So với ảnh mẫu đã duyệt (§9)              |

## 8. Quy trình hậu kỳ bắt buộc (cho mọi ảnh)

1. **Tách nền** → PNG trong suốt. Không còn quầng màu nền ở mép.
2. **Giảm màu về đúng 16 màu** của §3 (posterize/indexed theo bảng, tắt dithering). Ngoại lệ duy nhất: file bóng đổ `*-shadow`.
3. **Làm sạch / vẽ lại viền**: viền ngoài 4 px, nét trong 2 px, màu `#542414`, khép kín.
4. **Xoá chi tiết thừa** (§7) và sửa đối xứng.
5. **Tô lại bóng** đúng 1 tông, ánh sáng từ trên-trái.
6. **Căn tâm & kích thước**: đặt hình vào canvas đúng kích thước @2x ở §6; điểm neo đúng toạ độ (gốc cây chạm đáy theo bảng); chừa lề trong suốt tối thiểu 4 px.
7. **Đặt tên** đúng như `asset-prompts.md`, chép vào `public/garden/`, đè lên ảnh placeholder cùng tên.
8. **Kiểm tra tự động**: `npm run garden:check` (kích thước, nền trong, số màu ngoài bảng).
9. **Duyệt bằng mắt** theo §9 trong cảnh thật (`/garden`) ở cả light và dark mode.

## 9. Checklist duyệt từng ảnh

- [ ] Đúng kích thước file @2x và đúng điểm neo (không "bay" khỏi ô, gốc cây chạm đất).
- [ ] Nền trong suốt, không quầng.
- [ ] Chỉ 16 màu (trừ file bóng đổ). `npm run garden:check` không báo lỗi.
- [ ] Viền `#542414` đều, khép kín.
- [ ] Bóng 1 tông, sáng từ trên-trái; nhân vật lật gương không sai bóng.
- [ ] Không có dấu hiệu nào ở §7.
- [ ] Đặt cạnh Pipo và một ảnh đã duyệt: cùng độ dày nét, cùng độ bão hoà, cùng "tay vẽ".
- [ ] Đọc được ở kích thước 1x trên màn hình điện thoại 375 px.
- [ ] Bộ phận tách rời (Pipo, mèo) ghép lại khớp, không hở khe khi xoay.
