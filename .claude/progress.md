# Progress log

<!-- Ghi 1 dòng mỗi khi xong / tạm dừng một session. Hook PreCompact cũng tự ghi vào đây. -->

- 2026-10-29 · Tạo cấu trúc .claude/. Chưa bắt đầu S01.
- 2026-10-29 · Chốt quy tắc code + đổi stack: Amplify Gen 2 → SAM trên Learner Lab, frontend Vercel, monorepo. Chưa bắt đầu S01.
- 2026-10-29 · Learner Lab hết credits → đổi stack miễn phí, local-first: Next.js + Supabase (Docker) + Gemini free tier. Deploy ở S29. Chưa bắt đầu S01.
- 2026-11-02 · S01 done · branch feat/s01-project-setup · Next.js 16.4.3 (proxy.ts, Cache Components) + shadcn (radix-nova) + Supabase local port 554xx (tránh trùng project AWS_). Phát hiện: bảng mới không có GRANT mặc định → luôn revoke all + grant rõ (đã ghi vào rules/database.md).
  - ⏳ TODO trước S07: Minh xem giới hạn Gemini free tier (RPM/RPD) của model Flash trong AI Studio → Rate limits, ghi vào đây. Docs chính thức (cập nhật 2026-10-28) không còn công bố số chung.
- 2026-11-02 · S02 done · branch feat/s02-data-models (stack trên S01) · 10 bảng, 3 mức quyền (owner CRUD / profile / read-only cho dữ liệu ảnh hưởng điểm). 45 pgTAP + 4 integration test. Seed: demo@pipo.local, demo2@pipo.local (password123).
- 2026-11-02 · S03 done · branch feat/s03-auth · Supabase Auth (email confirm qua Mailpit, PKCE callback), proxy chặn route, next-intl setup sớm (vi/en/ja), Playwright E2E 10/10 (desktop + mobile). Chưa có E2E cho luồng quên mật khẩu.
- 2026-11-02 · S04 done · branch feat/s04-onboarding · Wizard 3 bước (ChoiceGroup dùng chung, hook use-onboarding-wizard), lưu timezone trình duyệt, đồng bộ cookie ngôn ngữ khi đăng nhập/onboarding, (main) chặn user chưa onboarding. E2E 14/14.
