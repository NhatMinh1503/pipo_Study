---
paths:
  - "app/**"
  - "components/**"
  - "messages/**"
---

# Frontend Rules (Next.js + shadcn)

## Cấu trúc

- Route group: `app/(auth)/` (chưa đăng nhập), `app/(main)/` (đã đăng nhập, có layout chung). `app/api/**` theo `server.md`.
- Component theo tính năng: `components/<feature>/<name>.tsx`; shadcn ở `components/ui/` (không sửa trực tiếp trừ khi đổi style toàn app).
- Truy cập dữ liệu: qua hook ở `lib/api/` (TanStack Query bọc Supabase client hoặc `fetch('/api/...')`). Component không gọi Supabase / `fetch` trực tiếp.

## Server vs Client

- Mặc định Server Component; chỉ thêm `"use client"` khi cần state, effect, event handler, hoặc browser API.
- Component client **không** import từ `server/`.

## State

- Dữ liệu từ server → **TanStack Query** (query key dạng `['lessons', id]`, invalidate sau mutation).
- State UI dùng chung giữa trang (Pomodoro timer, phiên dịch đang làm) → **Zustand** store ở `lib/stores/`.
- State cục bộ → `useState`. Không đưa dữ liệu server vào Zustand.

## Form

- `react-hook-form` + `zodResolver` với schema từ `lib/schemas/`.
- Hiện lỗi theo field, disable nút submit khi đang gửi.

## UI / UX

- Dark mode mặc định, có chuyển light. Màu qua CSS variables của shadcn, không hardcode hex.
- Minimalist: tông trung tính, 1 màu accent, khoảng trắng rộng.
- Mọi trang đạt chuẩn ở 375px và desktop.
- Mọi thao tác async có trạng thái loading / error / empty.
- Accessibility: label cho input, focus ring, phím tắt (Enter, Space, 1–4) không chặn screen reader.

## i18n

- Mọi text hiển thị qua `useTranslations()` / `getTranslations()`; key dạng `translate.feedback.hint`.
- Thêm key → thêm vào cả `vi.json`, `en.json`, `ja.json` (chưa dịch thì tạm copy tiếng Việt và đánh dấu `TODO`).

## Animation

- Dùng GSAP (`useGSAP` + scope) khi cần animation phức tạp; transition đơn giản dùng Tailwind. Tôn trọng `prefers-reduced-motion`.

## Test

- Luồng chính có E2E Playwright ở `e2e/`: đăng ký/đăng nhập, dịch 1 bài, ôn flashcard, Pomodoro.
