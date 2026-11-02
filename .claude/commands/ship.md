---
description: Kiểm tra toàn dự án (lint, typecheck, test, DB, build) trước khi commit session
allowed-tools: Bash(npm run:*), Bash(npm test:*), Bash(npx tsc --noEmit:*), Bash(supabase status:*), Bash(supabase db lint:*), Bash(supabase test db:*), Bash(supabase gen types typescript --local:*), Bash(git status:*), Bash(git diff:*)
---

Chạy lần lượt, dừng ở bước đầu tiên bị lỗi:

1. `npm run lint` — warning cũng tính là fail
2. `npm run typecheck`
3. `npm test` — Vitest
4. Nếu `supabase/` có thay đổi (cần `supabase status` đang chạy):
   - `supabase db lint`
   - `supabase test db`
   - `supabase gen types typescript --local | diff - types/database.ts` — khác nhau = quên chạy `npm run db:types`
5. `npm run build`
6. Nếu session có E2E: `npx playwright test`
7. `git status` — kiểm tra không có file lạ (`.env*`, `.next/`, dump DB) sắp bị commit; `.env.example` có đủ key mới

Bước nào chưa có script (giai đoạn đầu dự án) → ghi "skip" kèm lý do, không tính fail.

Báo cáo:

```
✅ Pass: [các bước đã qua]
⏭ Skip: [bước + lý do]
❌ Fail: [bước lỗi + tóm tắt error, file:line]
💡 Hướng fix: [1–2 gợi ý]
```

Không tự sửa lỗi trong lệnh này. Pass hết → được phép commit + push branch session theo CLAUDE.md.
