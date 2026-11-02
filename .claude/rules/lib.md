---
paths:
  - "lib/**"
---

# Lib Rules (code dùng chung client & server)

- `lib/` chạy được ở **cả browser và server** → không import `server/`, không dùng secret, không `import "server-only"`.
- Logic thuần (`lib/srs/`, `lib/nlp/`, `lib/scoring.ts`, `lib/diff.ts`, `lib/data/`) không import React, Next.js hay Supabase.
- Không đọc thời gian / random trực tiếp trong logic thuần — nhận `now: Date` hoặc hàm random qua tham số để test được.
- Zod schema ở `lib/schemas/`; type suy ra bằng `z.infer` — không khai báo type trùng lặp. Type của bảng DB lấy từ `types/database.ts`.
- Mỗi file logic thuần có file test cạnh nó (`schedule.ts` ↔ `schedule.test.ts`), gồm edge case: chuỗi rỗng, câu không có dấu câu, ranh giới ngày, múi giờ.
- `lib/supabase/`: `client.ts` (browser), `server.ts` (SSR, cookies). `lib/api/`: hook TanStack Query. `lib/stores/`: Zustand.
