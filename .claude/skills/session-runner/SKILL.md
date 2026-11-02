---
name: session-runner
description: Thực hiện một session Sxx trong SESSIONS.md của pipo_Study. Dùng khi Minh nói "làm S05", "tiếp session tiếp theo", hoặc nhắc tới mã session.
---

# Session Runner

## 1. Chuẩn bị

1. **Xác định session**: có mã (vd. `S07`) → dùng mã đó; không có → đọc `.claude/progress.md`, chọn session kế tiếp.
2. **Đọc spec**: mục session trong `SESSIONS.md` + phần tính năng liên quan trong `PRD.md` + rule trong `.claude/rules/` cho thư mục sẽ đụng tới.
3. **Kiểm tra phụ thuộc**: session trước đã xong chưa (vd. S08 cần S06, S07)? Thiếu → báo Minh.
4. **Kiểm tra môi trường**: Docker đang chạy, `supabase status` OK, `git status` sạch, đang ở `main` mới nhất. Lỗi → báo Minh cách bật, rồi dừng.

## 2. Trình bày plan — chờ Minh duyệt

```
📋 Plan Sxx — <tên>
🌿 Branch: feat/sxx-<slug>
1. ...
📁 File tạo/sửa: ...
📦 Package mới: ... (lý do từng cái, xác nhận miễn phí)
🗄 Thay đổi DB: migration / bảng / policy / function mới (nếu có)
🧪 Test: unit ... · pgTAP ... · E2E ...
✔️ Xong khi: <copy từ SESSIONS.md>
❓ Minh có muốn tiếp tục không?
```

## 3. Thực thi (sau khi được duyệt)

1. `git switch -c feat/sxx-<slug>` từ `main`.
2. Code theo plan. Thứ tự: migration + RLS + pgTAP → `npm run db:types` → schema Zod + logic thuần + test → server/route → UI.
3. Thay đổi nhỏ ngoài plan → tự làm, ghi lại để báo. Thay đổi lớn (schema DB, package, API contract) → dừng, hỏi.
4. Kiểm tra tiêu chí "Xong khi" trên `localhost` (dev server + Supabase local).

## 4. Kết thúc

1. Chạy `/ship` — phải pass.
2. Commit theo Conventional Commits (`feat(sxx): ...`), có thể chia nhiều commit logic; push `-u origin feat/sxx-<slug>`.
3. Ghi `.claude/progress.md`: `- YYYY-MM-DD · Sxx done · branch feat/sxx-... · <ghi chú>`; đánh dấu ✅ ở bảng Tổng quan trong `SESSIONS.md`.
4. Báo cáo:

```
✅ Đã làm: ...
📁 File thay đổi: ...
🔀 Thay đổi ngoài plan: ...
🌿 Đã push: feat/sxx-... → Minh tạo PR để merge
🧭 Cách tự kiểm tra: các bước Minh làm trên localhost để thấy tính năng chạy
⚠️ Lưu ý: ...
📚 Khái niệm mới (3–5): giải thích ngắn bằng tiếng Việt, có ví dụ từ chính code vừa viết
```
