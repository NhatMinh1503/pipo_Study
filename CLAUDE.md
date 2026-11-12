# pipo_Study — Project Rules

Nền tảng học ngoại ngữ (Nhật N5→N1, Anh A1→C2) qua dịch thuật ngữ cảnh + SRS + AI + game hóa.
Dự án cá nhân của Minh. **Chi phí = 0**: chỉ dùng công cụ miễn phí.

- Bối cảnh sản phẩm: @PRD.md
- Danh sách việc cần code + stack chi tiết: @SESSIONS.md (MVP = S01–S13 + S21)
- Tiến độ: `.claude/progress.md`

## 🧱 Stack (tóm tắt)

| Phần              | Công nghệ                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| App               | **Một app Next.js** (App Router) · TypeScript strict · Tailwind · shadcn/ui                                 |
| State             | TanStack Query (dữ liệu server) · Zustand (state UI)                                                        |
| Validation / i18n | Zod · next-intl (VI / EN / JA)                                                                              |
| Backend           | Next.js Route Handlers (`app/api/**`) + **Supabase local trong Docker** (Postgres, Auth, Realtime, Storage) |
| AI                | Gemini API free tier (key trong `.env.local`, chỉ dùng ở server)                                            |
| TTS               | Web Speech API của trình duyệt                                                                              |
| Chất lượng        | ESLint · Prettier · Vitest · pgTAP (`supabase test db`) · Playwright · Husky · GitHub Actions               |

Quy tắc chi tiết theo thư mục nằm ở `.claude/rules/` (tự nạp khi làm việc trong thư mục tương ứng).

## 🐳 Local-first — deploy để sau (S29)

- Toàn bộ dự án chạy trên máy: `supabase start` (Docker) + `npm run dev`. **Không deploy, không tạo project cloud** cho tới S29.
- Mọi thay đổi database phải là file trong `supabase/migrations/`. **Không sửa schema bằng tay trong Studio.**
- Mọi cấu hình qua biến môi trường (`.env.local`); giữ `.env.example` luôn đầy đủ key (không có giá trị thật).
- Không dùng tính năng chỉ chạy trên một nền tảng hosting (Vercel Cron, Edge Config...). Lịch chạy dùng `pg_cron`.
- Không thêm dịch vụ trả phí hay cần thẻ tín dụng. Cần dịch vụ ngoài mới → hỏi Minh.

## 📐 Quy ước code

- Tên file **kebab-case**; component `PascalCase`; hàm/biến `camelCase`; hằng số `UPPER_SNAKE_CASE`; bảng/cột SQL `snake_case`.
- Không `any`, không `as` ép kiểu để lách lỗi, không `!` non-null trừ khi đã chứng minh.
- Dữ liệu qua ranh giới (form, request body, output Gemini) phải parse bằng Zod schema trong `lib/schemas/`.
- Type của DB sinh tự động: `types/database.ts` — không sửa tay.
- Logic thuần (SRS, scoring, nlp, diff) ở `lib/`, **bắt buộc có unit test**.
- Comment tiếng Anh, chỉ giải thích _why_. JSDoc cho hàm export ở `lib/` và `server/`.
- Text UI không hardcode — luôn qua key next-intl.

## 🔐 Bảo mật

- Mọi bảng có **RLS bật** + policy rõ ràng; có test pgTAP cho policy.
- Gemini key và `SUPABASE_SECRET_KEY` chỉ dùng trong `server/` (có `import "server-only"`), không bao giờ có tiền tố `NEXT_PUBLIC_`, không log.
- Coins / XP / Streak chỉ thay đổi qua Postgres function `security definer`; client không có quyền UPDATE các cột này.
- `user_id` lấy từ `auth.uid()` (DB) hoặc session phía server — không bao giờ từ body / query.
- Không gửi thông tin cá nhân (email, tên) vào prompt Gemini (free tier có thể dùng dữ liệu để cải thiện sản phẩm).

## 🌿 Git (ngoại lệ riêng cho dự án này)

- Mỗi session một branch: `feat/s07-ai-grading`, `fix/s07-...`, `chore/...`.
- Conventional Commits, tiếng Anh, scope = mã session: `feat(s07): add Gemini grading route`.
- ✅ Claude **được** commit và push lên branch session, sau khi `/ship` pass.
- ❌ Claude **không bao giờ** commit/push/merge vào `main`, không `--force`, không rebase branch đã push.
- Merge vào `main` luôn do Minh làm qua Pull Request.

## 🤝 Cách làm việc

1. Minh nói "làm Sxx" → skill `session-runner`: đọc spec → trình bày plan → **chờ Minh duyệt**.
2. Sau khi plan được duyệt, Claude được tự:
   - cài package **có trong plan** (ngoài plan → hỏi),
   - tạo/sửa file trong phạm vi session, tạo migration mới,
   - chạy dev server, test, `supabase start/status/migration up/gen types`,
   - tạo branch, commit, push branch session.
3. Thay đổi nhỏ ngoài plan (không đổi schema DB, không thêm package, không đổi API contract) → tự làm, báo trong phần tổng kết.
   Thay đổi lớn → dừng lại, hỏi Minh.
4. Luôn hỏi trước khi: `supabase db reset` hoặc `stop --no-backup` (mất dữ liệu local), sửa migration **đã commit**, xoá file, đổi cấu trúc thư mục, kết nối dịch vụ cloud.
5. Xong session: `/ship` → commit + push → ghi `.claude/progress.md` → báo cáo, kèm **3–5 khái niệm mới** giải thích bằng tiếng Việt.

## 🛠 Lệnh thường dùng

```bash
supabase start                          # Postgres/Auth/Storage/Realtime + Studio (localhost:55423), Mailpit (55424)
npm run dev                             # Next.js (localhost:3000)
supabase migration new <name> < /dev/null   # Tạo file migration (stdin phải đóng, nếu không lệnh sẽ chờ input)
supabase migration up                   # Áp migration mới vào DB local
npm run db:types                        # supabase gen types typescript --local > types/database.ts
supabase test db                        # pgTAP: test RLS + functions
npm run dict:import                     # Import JMdict (chạy lại sau mỗi `supabase db reset`)
npm run dict:import:en                  # Import từ điển Anh: ECDICT + WordNet + CMUdict (cũng chạy lại sau reset)
npm run lint && npm run typecheck && npm test
npm run test:int                        # Integration test với Supabase local
npm run test:e2e                        # Playwright: server riêng port 3100, AI giả (AI_PROVIDER=fake)
npm run docker:up                       # Bản production trong Docker (localhost:3000), nối Supabase local qua host.docker.internal
npm run icons                           # Sinh lại icon PWA + favicon từ public/icons/icon-source.png
```

## Game design team (append this section to the existing CLAUDE.md)

This repo has a game-design team for the gamification layer, adapted from
Claude Code Game Studios (MIT).

- Pillars, risks, ethics and the collaboration protocol:
  `.claude/docs/game-pillars.md` — read before any game-layer work.
- Registry of approved currencies, constants and formulas:
  `design/game/registry.md`. Never hardcode a game number that is not there;
  game numbers live in one config module, computed server-side.
- Specs: `design/game/<system>.md` (write with `/game-spec`).
- Agents: `game-designer`, `systems-designer`, `economy-designer`,
  `live-ops-designer`, `ux-designer`, `accessibility-specialist`. They design and
  review; they do not edit application code.
- Skills: `/game-spec <system>`, `/balance-check <domain>`, `/ux-review <target>`.

Workflow for a new game feature:

1. `/game-spec <system>` → approved spec + registry entries
2. Implement one task per session, following the spec
3. `/balance-check <domain>` and `/ux-review <route>` before shipping
