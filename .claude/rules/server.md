---
paths:
  - "app/api/**"
  - "server/**"
  - "middleware.ts"
---

# Server Rules (Route Handlers + server-only code)

## Ranh giới

- Code dùng secret (Gemini key, `SUPABASE_SERVICE_ROLE_KEY`) chỉ nằm trong `server/`, file đầu tiên dòng `import "server-only"`.
- Biến môi trường bí mật **không** có tiền tố `NEXT_PUBLIC_`. Đọc env qua `server/env.ts` (parse bằng Zod, fail sớm khi thiếu).
- Admin client (service role) chỉ dùng khi bắt buộc (xoá tài khoản, cron); mặc định dùng server client theo session user để RLS vẫn áp dụng.

## Khi nào dùng Route Handler

- Gọi dịch vụ ngoài (Gemini, tin tức), cần secret, hoặc cần logic nhiều bước không làm được bằng RLS.
- CRUD đơn giản trên dữ liệu của chính user → client gọi Supabase trực tiếp (RLS bảo vệ), không cần route.
- Thay đổi Coins / XP / Streak → luôn qua RPC `security definer`, không bao giờ UPDATE trực tiếp.

## Route Handler

- Mỗi route: `app/api/<resource>/<action>/route.ts` + `route.test.ts`.
- Thứ tự: lấy user từ session (không có → 401) → parse body bằng Zod (sai → 400) → gọi service trong `server/` → trả JSON.
- Không nhận `userId` từ request. Resource của user khác → **404**.
- Lỗi trả về dạng `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }`, không lộ stack trace. Helper ở `server/http.ts`.
- Route cron (`app/api/cron/**`) kiểm tra header `Authorization: Bearer ${CRON_SECRET}`.

## Logging

- Dùng `server/logger.ts`: JSON một dòng, có `requestId`, `route`, `userHash`, `latencyMs`, `level`.
- **Không** log: nội dung bản dịch, văn bản bài học, token, API key, email.

## Gọi Gemini

- Qua `server/gemini.ts` duy nhất. Timeout 10s; retry tối đa **2 lần** (exponential backoff + jitter) khi lỗi mạng / 429 / 5xx / JSON sai schema.
- Hết retry → trả lỗi có `code` (`AI_UNAVAILABLE`) để UI hiện "Thử lại"; không tính vào số lần thử của user.
- Tên model từ `GEMINI_MODEL`. Log thêm `model`, `promptVersion`, `attempt`, `outcome`.

## Rate limit

- Route gọi AI kiểm tra giới hạn theo user / ngày qua RPC `rate_limit_hit(key, limit)` trước khi gọi Gemini; vượt → 429 `RATE_LIMITED`.
- Đặt giới hạn sao cho tổng vẫn nằm trong free tier của Gemini (xem số liệu ghi ở `.claude/progress.md`).

## Test

- Vitest; mock Gemini và Supabase client — test không gọi mạng thật.
- Mỗi route test tối thiểu: chưa đăng nhập (401), input sai (400), không phải owner (404), Gemini lỗi, thành công.
