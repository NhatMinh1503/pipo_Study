# 🖌️ Asset Prompts — Vườn tri thức

> Prompt tiếng Anh cho từng ảnh của vườn. Minh tự chạy bằng công cụ tạo ảnh AI.
> **Luôn đính kèm `public/icons/icon-source.png` làm ảnh tham chiếu phong cách** (style reference), và nếu công cụ hỗ trợ, một ảnh đã duyệt gần nhất trong cùng nhóm.
> Ảnh AI chỉ là **bản nháp**: mọi ảnh phải qua **hậu kỳ + checklist** trong `design/game/art-bible.md` §8–9 trước khi chép vào `public/garden/`.
> Tên file, kích thước và điểm neo ở đây khớp với `lib/garden/assets.ts`. Thả ảnh đúng tên vào `public/garden/` là cảnh tự dùng ảnh thật thay cho placeholder.

---

## 0. Khối prompt dùng chung

**STYLE** (dán vào đầu mọi prompt):

```
Children's picture-book illustration in the exact style of the attached reference (a cute yellow chick mascot).
Flat colours, smooth hand-drawn look, uniform dark brown outline (#542414) of even thickness, rounded friendly shapes,
one single shadow tone per colour, light from the top-left, no gradients, no texture.
Limited palette only: #FCF4EC #FCE46C #FCB41C #FC8C24 #F48C9C #FC5C44 #843C34 #542414 #84C4FC #C4E4FC #6CA4EC #4C74BC #CDE38A #8CC45C #4E8C46 #BCB0A4.
Three-quarter top-down view (camera about 35 degrees above the ground).
Single object, centered, full object visible, plain transparent background, generous empty margin, no ground, no cast shadow.
```

**NEGATIVE** (dán vào mọi prompt, công cụ không có ô negative thì thêm "Avoid: …"):

```
photorealistic, 3D render, glossy, plastic, shiny highlights, rim light, glow, gradient, airbrush, watercolor texture, paper texture, noise, grain,
sketch lines, variable line width, thin hairline outline, black outline, pixel art, anime, detailed shading, multiple light sources,
extra limbs, extra fingers, asymmetrical eyes, text, letters, watermark, signature, logo, frame, background scenery, ground plane, drop shadow
```

**Mẫu một prompt:** `[STYLE] + Subject: … + Pose/state: … + [NEGATIVE]`. Sinh 4–8 ảnh, chọn ảnh khớp icon nhất rồi hậu kỳ.

---

## 1. Pipo — tách bộ phận (nhìn sang phải, hơi chếch xuống)

Vẽ **một tấm "turnaround" đầy đủ** trước (ảnh tham chiếu riêng, không dùng trong game), rồi mới tách bộ phận. Mỗi bộ phận là **một ảnh riêng** để code tự animate. Bóng tự thân chỉ ở **phía dưới** (vì sẽ lật gương).

| File (`public/garden/`)   | @2x   | Điểm neo / trục xoay (logical) | Gắn vào thân tại (logical) | Prompt (Subject)                                                                                                                                                                                                                     |
| ------------------------- | ----- | ------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pipo-body@2x.png`        | 80×80 | đáy giữa (20, 38)              | —                          | Pipo the round yellow chick from the reference, body and head as one ball, facing right in three-quarter view, small orange beak, pink cheek, tiny tuft of feathers on top, **no eyes, no wings, no legs** (they are separate parts) |
| `pipo-eyes-open@2x.png`   | 32×20 | tâm (8, 5)                     | (25, 14)                   | Pipo's two eyes only, as in the reference, seen in three-quarter view facing right: near eye round, far eye slightly narrower, dark brown with one cream highlight dot each                                                          |
| `pipo-eyes-closed@2x.png` | 32×20 | tâm (8, 5)                     | (25, 14)                   | The same two eyes closed: two gentle curved dark brown lines, same size and position as the open eyes                                                                                                                                |
| `pipo-wing-front@2x.png`  | 28×32 | vai (3, 3)                     | (13, 21)                   | Pipo's near wing only, small rounded yellow wing with deep-yellow shadow underneath, attached at the top                                                                                                                             |
| `pipo-wing-back@2x.png`   | 24×28 | vai (9, 3)                     | (29, 19)                   | Pipo's far wing only, slightly smaller, partly hidden look, same style                                                                                                                                                               |
| `pipo-leg-front@2x.png`   | 16×20 | hông (4, 1)                    | (16, 36)                   | One short orange chick leg with a simple three-toe foot, straight down                                                                                                                                                               |
| `pipo-leg-back@2x.png`    | 16×20 | hông (4, 1)                    | (24, 36)                   | Same leg, a little darker orange-shadowed, for the far side                                                                                                                                                                          |
| `pipo-shadow@2x.png`      | 64×20 | tâm (16, 5)                    | (20, 40)                   | _(không cần AI)_ elip `#542414` độ mờ 25%                                                                                                                                                                                            |

**Animate bằng code:** đi = 2 chân xoay ±18° xen kẽ + thân nhún 2 px; vỗ cánh = cánh xoay quanh vai; chớp mắt = đổi `eyes-open` ↔ `eyes-closed` 120 ms; ngồi = ẩn chân, hạ thân 4 px.

---

## 2. Cây — 4 loài × 3 giai đoạn (+ anh đào nở hoa)

| File                              | @2x     | Điểm neo  | Subject                                                                                                                                                |
| --------------------------------- | ------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tree-pine-sprout@2x.png`         | 64×64   | (16, 30)  | A tiny Japanese black pine seedling: a few short needle tufts on a thin brown stem in a small mound of soil                                            |
| `tree-pine-sapling@2x.png`        | 96×128  | (24, 60)  | A young Japanese pine, slim curved trunk, two or three rounded cloud-like needle pads, dark green                                                      |
| `tree-pine-mature@2x.png`         | 160×224 | (40, 108) | A mature Japanese garden pine (niwaki), graceful curved trunk, layered flat rounded cloud-shaped needle pads, dark green with lighter tops             |
| `tree-bamboo-sprout@2x.png`       | 64×64   | (16, 30)  | A small bamboo shoot just out of the soil, pointed light-green tip with brown sheath                                                                   |
| `tree-bamboo-sapling@2x.png`      | 96×128  | (24, 60)  | Two or three young bamboo stalks with segmented joints and a few narrow leaves                                                                         |
| `tree-bamboo-mature@2x.png`       | 160×224 | (40, 108) | A small bamboo clump, five slender segmented green stalks of different heights, narrow leaves in small tufts at the top                                |
| `tree-maple-sprout@2x.png`        | 64×64   | (16, 30)  | A tiny Japanese maple seedling with two small red-orange five-pointed leaves                                                                           |
| `tree-maple-sapling@2x.png`       | 96×128  | (24, 60)  | A young Japanese maple, thin brown trunk, a small rounded canopy of red and orange star-shaped leaves                                                  |
| `tree-maple-mature@2x.png`        | 160×224 | (40, 108) | A mature Japanese maple (momiji), elegant branching trunk, wide rounded canopy of red leaves with a few orange ones                                    |
| `tree-sakura-sprout@2x.png`       | 64×64   | (16, 30)  | A tiny cherry tree seedling with two round green leaves                                                                                                |
| `tree-sakura-sapling@2x.png`      | 96×128  | (24, 60)  | A young cherry tree, thin brown trunk, a small rounded green leafy canopy, no flowers                                                                  |
| `tree-sakura-mature@2x.png`       | 160×224 | (40, 108) | A mature cherry tree, sturdy curved brown trunk, wide rounded **green leafy** canopy, no flowers                                                       |
| `tree-sakura-mature-bloom@2x.png` | 160×224 | (40, 108) | **The exact same tree** as tree-sakura-mature (same trunk and silhouette — use it as a second reference), canopy fully covered in pink cherry blossoms |

Giữ **cùng thân và hình bao** giữa `tree-sakura-mature` và bản nở hoa để khi đổi ảnh cây không "nhảy".

---

## 3. Mặt đất, lối đi, hồ

| File                  | @2x     | Điểm neo     | Subject                                                                                                                                                                |
| --------------------- | ------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tile-grass-a@2x.png` | 128×96  | tâm          | A seamless rectangular patch of short flat grass seen from above, two greens, a few tiny lighter blades, **tileable on all four sides, no outline at the edges**       |
| `tile-grass-b@2x.png` | 128×96  | tâm          | Same grass with two tiny white flowers, tileable, matches tile-grass-a exactly at the edges                                                                            |
| `tile-path@2x.png`    | 128×96  | tâm          | Three to four flat rounded stepping stones in warm grey, seen from above, grass between them, tileable edges                                                           |
| `deco-pond@2x.png`    | 256×192 | tâm (64, 48) | A small oval garden pond seen from above at three-quarter angle, blue water with one lighter reflection band, a ring of rounded grey stones as the edge, two lily pads |

Ô cỏ không có viền ở mép (để ghép liền); viền chỉ quanh chi tiết bên trong.

---

## 4. Đồ trang trí (shop) và sinh vật

| File                   | @2x     | Điểm neo    | Subject                                                                                                                                                                      |
| ---------------------- | ------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deco-lantern@2x.png`  | 64×112  | (16, 54)    | A Japanese stone lantern (tōrō), warm grey stone, small square window with a soft cream glow ring                                                                            |
| `deco-bench@2x.png`    | 128×80  | (32, 38)    | A simple wooden garden bench, brown-red planks, seen from the front-right at three-quarter angle, room for a small chick to sit                                              |
| `deco-torii@2x.png`    | 192×192 | (48, 94)    | A small red torii gate, two round pillars, curved top beam with dark red-brown cap, symmetric                                                                                |
| `deco-bridge@2x.png`   | 192×112 | (48, 40)    | A small arched red wooden garden bridge seen from the side at three-quarter angle, simple railings                                                                           |
| `koi-a@2x.png`         | 40×20   | tâm (10, 5) | A koi fish seen from directly above, swimming right, white body with red-orange patches, small fins                                                                          |
| `koi-b@2x.png`         | 40×20   | tâm (10, 5) | Same koi shape, golden-yellow body                                                                                                                                           |
| `cat-body@2x.png`      | 72×48   | (18, 22)    | A small round cream-and-brown cat walking right in three-quarter view, body and head as one piece, **no legs, no tail**, friendly closed-mouth face, same style as the chick |
| `cat-leg-front@2x.png` | 12×18   | (3, 1)      | One short rounded cat leg with a paw, cream                                                                                                                                  |
| `cat-leg-back@2x.png`  | 12×18   | (3, 1)      | Same leg, shadow tone, far side                                                                                                                                              |
| `cat-tail@2x.png`      | 32×28   | (2, 24)     | A curved cat tail, pointing up and back, cream with brown tip                                                                                                                |
| `cat-shadow@2x.png`    | 60×16   | tâm         | _(không cần AI)_ elip `#542414` độ mờ 25%                                                                                                                                    |

Gắn bộ phận mèo (logical, so với góc trên-trái của `cat-body`): chân trước (24, 20), chân sau (10, 20), đuôi (4, 8), bóng (18, 24).

---

## 5. Nền: trời, núi Phú Sĩ, mây, cánh hoa

| File             | @2x      | Điểm neo | Subject                                                                                                                          |
| ---------------- | -------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `bg-sky@2x.png`  | 1280×864 | (0, 0)   | A calm flat sky backdrop: light blue top, a lighter band near the horizon (exactly two flat tones, no gradient), nothing else    |
| `bg-fuji@2x.png` | 640×192  | đáy giữa | Mount Fuji as in the reference: blue mountain with a white snow cap with a wavy edge, darker blue shadow on the right side, flat |
| `cloud-a@2x.png` | 192×80   | tâm      | A soft rounded cream cloud with a pale blue bottom shadow                                                                        |
| `cloud-b@2x.png` | 128×56   | tâm      | A smaller cloud, same style                                                                                                      |
| `petal@2x.png`   | 16×16    | tâm      | A single pink cherry blossom petal, notched tip                                                                                  |

---

## 6. Icon UI

| File               | @2x   | Subject                                                             |
| ------------------ | ----- | ------------------------------------------------------------------- |
| `ui-coin@2x.png`   | 96×96 | A round gold coin with a simple leaf emblem, deep-yellow rim, flat  |
| `ui-streak@2x.png` | 96×96 | A friendly orange flame with a cream core                           |
| `ui-shield@2x.png` | 96×96 | A rounded blue shield with a cream star in the middle               |
| `ui-chest@2x.png`  | 96×96 | A small wooden treasure chest, red-brown wood, golden clasp, closed |

---

## 7. Danh sách file cần tạo (45 file)

`pipo-body`, `pipo-eyes-open`, `pipo-eyes-closed`, `pipo-wing-front`, `pipo-wing-back`, `pipo-leg-front`, `pipo-leg-back`, `pipo-shadow` ·
`tree-{pine,bamboo,maple,sakura}-{sprout,sapling,mature}` (12) + `tree-sakura-mature-bloom` ·
`tile-grass-a`, `tile-grass-b`, `tile-path`, `deco-pond` ·
`deco-lantern`, `deco-bench`, `deco-torii`, `deco-bridge`, `koi-a`, `koi-b`, `cat-body`, `cat-leg-front`, `cat-leg-back`, `cat-tail`, `cat-shadow` ·
`bg-sky`, `bg-fuji`, `cloud-a`, `cloud-b`, `petal` ·
`ui-coin`, `ui-streak`, `ui-shield`, `ui-chest`

Tất cả có hậu tố `@2x.png`. Hai file bóng đổ (`pipo-shadow`, `cat-shadow`) không cần AI. Thứ tự nên làm: **Pipo → 1 loài cây (đủ 3 giai đoạn) → ô cỏ/lối đá → còn lại**, để chốt phong cách sớm bằng ảnh mẫu đã duyệt.
