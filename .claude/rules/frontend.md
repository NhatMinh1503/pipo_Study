---
paths:
  - "app/**"
  - "components/**"
  - "hooks/**"
  - "messages/**"
---

# Frontend Rules (Next.js + shadcn)

## Cấu trúc — feature-based colocation

Code của trang nào nằm trong thư mục của trang đó. Thư mục có tiền tố `_` là private folder, Next.js không coi là route.

```
app/(main)/lessons/[id]/translate/
├── page.tsx                  # mỏng: lấy params, ghép component — không chứa logic
├── loading.tsx · error.tsx   # trạng thái của trang (khi cần)
├── _components/              # component CHỈ trang này dùng
│   ├── source-pane.tsx
│   └── target-pane.tsx
├── _hooks/                   # hook CHỈ trang này dùng
│   └── use-translate-session.ts
└── _lib/                     # helper / constant / type CHỈ trang này dùng
```

Code dùng chung đặt ở cấp cao hơn:

| Vị trí                  | Chứa gì                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `components/ui/`        | shadcn primitives (Button, Dialog...) — không sửa trừ khi đổi style toàn app                                |
| `components/common/`    | Khối UI dùng nhiều trang: `page-header`, `empty-state`, `error-state`, `loading-skeleton`, `confirm-dialog` |
| `components/layout/`    | `app-nav`, `mobile-nav`, `theme-toggle`                                                                     |
| `components/<feature>/` | Component của một tính năng dùng ở nhiều trang (vd. `flashcard/` dùng ở Ôn tập + Quiz + Sổ tay)             |
| `hooks/`                | Hook dùng chung: `use-media-query`, `use-debounce`, `use-hotkeys`, `use-speech`                             |
| `lib/api/`              | Hook TanStack Query theo tài nguyên: `use-lessons.ts`, `use-flashcards.ts`                                  |

### Quy tắc tái sử dụng

- **Lặp lần 2 → tách.** UI hoặc logic xuất hiện ở trang thứ 2 → chuyển từ `_components/` / `_hooks/` lên `components/` / `hooks/`.
- **Logic ra hook, component chỉ hiển thị.** Có state + effect, fetch, timer, phím tắt → tách thành `use-*.ts`; component nhận dữ liệu qua props.
- `page.tsx` ≤ ~60 dòng; component ≤ ~150 dòng — dài hơn thì tách component con.
- Một component export chính mỗi file; props đặt tên `<Component>Props`, khai báo ngay trên component.
- Không tạo file `index.ts` re-export (barrel) trong `app/` — import thẳng đường dẫn.
- Import dùng alias `@/` (vd. `@/components/common/page-header`), không dùng `../../..`.
- Truy cập dữ liệu: qua hook ở `lib/api/` (TanStack Query bọc Supabase client hoặc `fetch('/api/...')`). Component không gọi Supabase / `fetch` trực tiếp.
- Route group: `app/(auth)/` (chưa đăng nhập), `app/(main)/` (đã đăng nhập, có layout chung). `app/api/**` theo `server.md`.

## Cache Components (Next 16) — bắt buộc

- `page.tsx` / `layout.tsx` **không `await` ở top-level** (kể cả `getTranslations`, `cookies`, `searchParams`, Supabase). Mỗi phần cần dữ liệu là một async component trong `_components/`, bọc bằng `<Suspense fallback={...}>`.
- Đọc đồng hồ (`new Date()`, `Date.now()`) hoặc random ở server → gọi `await connection()` (từ `next/server`) trước đó.
- `searchParams` / `params`: truyền Promise xuống component con trong `<Suspense>` rồi mới `await`.
- Kiểm tra: mở trang ở dev, Console / dev overlay không được có lỗi "uncached data" hay "unstable value".

## Server vs Client

- Mặc định Server Component; chỉ thêm `"use client"` khi cần state, effect, event handler, hoặc browser API.
- Component client **không** import từ `server/`, trừ Server Action dùng chung ở `server/actions/*.ts` (file `"use server"`, client chỉ nhận reference). Action chỉ một trang dùng → `app/.../_lib/actions.ts`.

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
