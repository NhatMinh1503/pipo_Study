# Progress log

<!-- Ghi 1 dòng mỗi khi xong / tạm dừng một session. Hook PreCompact cũng tự ghi vào đây. -->

- 2026-10-29 · Tạo cấu trúc .claude/. Chưa bắt đầu S01.
- 2026-10-29 · Chốt quy tắc code + đổi stack: Amplify Gen 2 → SAM trên Learner Lab, frontend Vercel, monorepo. Chưa bắt đầu S01.
- 2026-10-29 · Learner Lab hết credits → đổi stack miễn phí, local-first: Next.js + Supabase (Docker) + Gemini free tier. Deploy ở S29. Chưa bắt đầu S01.
- 2026-11-02 · S01 done · branch feat/s01-project-setup · Next.js 16.4.3 (proxy.ts, Cache Components) + shadcn (radix-nova) + Supabase local port 554xx (tránh trùng project AWS_). Phát hiện: bảng mới không có GRANT mặc định → luôn revoke all + grant rõ (đã ghi vào rules/database.md).
  - ⏳ TODO trước S07: Minh xem giới hạn Gemini free tier (RPM/RPD) của model Flash trong AI Studio → Rate limits, ghi vào đây. Docs chính thức (cập nhật 2026-10-28) không còn công bố số chung.
