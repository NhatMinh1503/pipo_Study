# pipo_Study — Danh sách Session (code)

> Mỗi session = **1 trang** hoặc **1 chức năng** cần code. Làm lần lượt từ trên xuống.
> Bối cảnh sản phẩm xem `PRD.md`. Mỗi session gồm: **Làm gì**, **File chính**, **Xong khi**.
> **Local-first:** S01–S28 chạy hoàn toàn trên máy. Deploy ở S29.

---

## Stack

| Phần               | Công nghệ                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------- |
| Ngôn ngữ           | **TypeScript** strict + `noUncheckedIndexedAccess` · SQL (migrations)                    |
| App                | **Một app Next.js** (App Router) + Tailwind + **shadcn/ui**                              |
| State / data       | **TanStack Query** (dữ liệu server) + **Zustand** (state UI)                             |
| Validation         | **Zod** — schema ở `lib/schemas/`                                                        |
| i18n               | **next-intl** (VI / EN / JA), setup từ S05                                               |
| Database           | **Supabase Postgres** (local trong Docker) · RLS cho mọi bảng · type sinh tự động        |
| Đăng nhập          | **Supabase Auth** (`@supabase/ssr`) · email local xem qua Mailpit                        |
| Server logic       | Next.js **Route Handlers** (`app/api/**`) + Postgres functions (RPC)                     |
| Realtime           | **Supabase Realtime** (Battle 1v1)                                                       |
| File               | **Supabase Storage**                                                                     |
| Lịch chạy          | **pg_cron** (+ `pg_net` khi cần gọi route của app)                                       |
| Đọc câu (TTS)      | **Web Speech API** (`speechSynthesis`) của trình duyệt                                   |
| AI                 | **Gemini API** free tier (Flash; tên model trong `GEMINI_MODEL`), key trong `.env.local` |
| Tách từ tiếng Nhật | kuromoji.js + từ điển JMdict                                                             |
| Test               | Vitest (`lib/`, `server/`, route handlers) · pgTAP (RLS, functions) · Playwright (E2E)   |
| CI                 | Husky + lint-staged · GitHub Actions                                                     |
| Deploy (S29)       | Docker image Next.js standalone + Supabase (chọn nơi host ở S29)                         |

Quy tắc chung:

- Gemini key và service role key **chỉ** dùng ở `server/`, không bao giờ ở client.
- Coins, XP, Streak chỉ thay đổi qua Postgres function `security definer`, không tin dữ liệu từ client.
- `user_id` luôn là `auth.uid()` / user từ session server, không nhận từ body request.
- Tên file **kebab-case** (`split-sentences.ts`, `source-pane.tsx`); bảng/cột SQL `snake_case`.

### Cấu trúc thư mục

```
app/                      # pages (App Router) — colocation theo trang
  (auth)/  (main)/        # route groups
  (main)/<page>/
    page.tsx              # mỏng, chỉ ghép component
    _components/ _hooks/ _lib/   # code CHỈ trang này dùng
  api/                    # route handlers (server logic)
components/
  ui/                     # shadcn primitives
  common/                 # khối UI dùng nhiều trang
  layout/                 # nav, theme toggle
  <feature>/              # component tính năng dùng ở nhiều trang (flashcard, dictionary, audio)
hooks/                    # hook dùng chung (use-speech, use-hotkeys...)
proxy.ts                  # Next.js 16: refresh session Supabase, chặn route cần đăng nhập
lib/                      # dùng được cả client & server
  schemas/                # zod schemas
  srs/ nlp/ scoring.ts diff.ts   # pure logic + *.test.ts
  supabase/               # browser client, server client (SSR)
  api/                    # TanStack Query hooks
  stores/                 # Zustand stores
server/                   # server-only: gemini, prompts, rate-limit, logger, admin client
messages/                 # i18n: vi.json, en.json, ja.json
types/database.ts         # sinh bởi `supabase gen types` — không sửa tay
supabase/
  config.toml
  migrations/             # *.sql — nguồn sự thật duy nhất của schema
  tests/                  # pgTAP
  seed.sql                # dữ liệu mẫu cho local
e2e/                      # Playwright
```

---

## Tổng quan

| #      | Session                                       | Loại              | Nhóm           |
| ------ | --------------------------------------------- | ----------------- | -------------- |
| S01 ✅ | Khởi tạo dự án + Supabase local + tooling     | Nền               | Nền tảng       |
| S02 ✅ | Data models (migrations + RLS + Zod)          | Nền               | Nền tảng       |
| S03 ✅ | Trang Đăng nhập / Đăng ký                     | Trang             | Nền tảng       |
| S04 ✅ | Trang Onboarding                              | Trang             | Nền tảng       |
| S05 ✅ | Layout chung + i18n + Trang Dashboard         | Trang             | Nền tảng       |
| S06 ✅ | Trang Danh sách bài + Tạo bài (tách câu)      | Trang             | Dịch           |
| S07 ✅ | Chức năng AI chấm bản dịch (Gemini)           | Chức năng         | Dịch           |
| S08 ✅ | Trang Dịch song song (UI)                     | Trang             | Dịch           |
| S09 ✅ | Chức năng Luồng làm bài + chấm điểm           | Chức năng         | Dịch           |
| S10 ✅ | Chức năng Tách từ + Popup từ điển             | Chức năng         | Từ vựng        |
| S11 ✅ | Chức năng Thêm Flashcard + Trang Sổ tay       | Trang + Chức năng | Từ vựng        |
| S12 ✅ | Chức năng Thuật toán SRS                      | Chức năng         | Từ vựng        |
| S13 ✅ | Trang Ôn tập Flashcard                        | Trang             | Từ vựng        |
| S14 ✅ | Trang Quiz (trắc nghiệm / điền từ / ghép thẻ) | Trang             | Từ vựng        |
| S15 ✅ | Chức năng TTS (Web Speech API)                | Chức năng         | Nghe           |
| S16 ✅ | Trang Chép chính tả                           | Trang             | Nghe           |
| S17 ✅ | Trang Cloze Test                              | Trang             | Nghe           |
| S18 ✅ | Chức năng Lấy tin tức tự động                 | Chức năng         | Nghe           |
| S19 ✅ | Chức năng Ghi lỗi + Trang Phân tích lỗi       | Trang + Chức năng | AI cá nhân hóa |
| S20 ✅ | Trang Tạo bài bằng AI + Micro-lesson          | Trang + Chức năng | AI cá nhân hóa |
| S21 ✅ | Trang Pomodoro + Vườn tri thức                | Trang             | Game hóa       |
| S22 ✅ | Chức năng Ví Coins/XP + Streak                | Chức năng         | Game hóa       |
| S23 ✅ | Trang Shop + Themes                           | Trang             | Game hóa       |
| S24 ✅ | Trang Skill Tree                              | Trang             | Game hóa       |
| S25 ✅ | Trang Hồ sơ & Cài đặt                         | Trang             | Tài khoản      |
| S26 ✅ | Trang Community Feed                          | Trang             | Cộng đồng      |
| S27 ✅ | Trang Bảng xếp hạng                           | Trang             | Cộng đồng      |
| S28 ✅ | Trang Battle 1v1                              | Trang             | Cộng đồng      |
| S29 🟡 | PWA + Docker hoá + Deploy                     | Nền               | Ra mắt         |
| S30    | Browser Extension                             | Dự án phụ         | Mở rộng        |
| S31    | Mobile App                                    | Dự án phụ         | Mở rộng        |

**MVP = S01 → S13 + S21.** Làm xong phần này là đã có một app học dùng được.

---

## Nền tảng

### S01 · Khởi tạo dự án + Supabase local + tooling

- **Làm gì:**
  - `git init`; Next.js (App Router, TS, Tailwind, ESLint) + shadcn/ui (dark mặc định).
  - `tsconfig`: strict + `noUncheckedIndexedAccess`; ESLint cấm `any`; Prettier; Husky + lint-staged.
  - Vitest; GitHub Actions (lint, typecheck, test) — chỉ CI, không deploy.
  - `supabase init` + `supabase start`; `lib/supabase/client.ts`, `lib/supabase/server.ts`, `proxy.ts` (`@supabase/ssr`).
  - Script `db:types`; `server/logger.ts` (JSON log); `.env.example`.
  - Kiểm tra giới hạn hiện tại của Gemini free tier (RPM / RPD của model Flash) → ghi vào `.claude/progress.md`.
- **File chính:** `package.json`, `tsconfig.json`, `supabase/config.toml`, `lib/supabase/*`, `proxy.ts`, `.env.example`, `.github/workflows/ci.yml`
- **Xong khi:** trang "Hello pipo" chạy ở `localhost:3000`, đọc được 1 dòng từ Supabase local; Studio mở được; CI xanh trên GitHub.

### S02 · Data models (migrations + RLS + Zod)

- **Làm gì:**
  - Migration tạo bảng: `profiles` (ngôn ngữ học, trình độ, ngôn ngữ hiển thị), `wallets` (xp, coins, streak — tách riêng để khoá quyền ghi), `lessons`, `sentences`, `attempts`, `vocab_items`, `flashcards` (due_date, interval, ease), `pomodoro_sessions`, `transactions`, `error_logs`.
  - Trigger tạo `profiles` + `wallets` khi có user mới trong `auth.users`.
  - RLS mọi bảng: owner `user_id = auth.uid()`; `wallets` client chỉ SELECT.
  - Index: `flashcards (user_id, due_date)`, `sentences (lesson_id, position)`.
  - Zod schema cho input của các form/route; `npm run db:types`; `seed.sql` có 1 user + 1 bài mẫu.
  - Test pgTAP: user A không đọc/ghi được dữ liệu user B; client không UPDATE được `wallets`.
- **File chính:** `supabase/migrations/*_init_schema.sql`, `supabase/tests/rls.test.sql`, `supabase/seed.sql`, `lib/schemas/*.ts`, `types/database.ts`
- **Xong khi:** `supabase db reset` chạy sạch; `supabase test db` pass; tạo/đọc được 1 lesson từ client.

### S03 · Trang Đăng nhập / Đăng ký

- **Làm gì:** Supabase Auth: email + mật khẩu, xác thực email (xem mail ở Mailpit), quên mật khẩu, (tuỳ chọn) đăng nhập Google; form shadcn + Zod; `proxy.ts` chặn trang cần đăng nhập.
- **File chính:** `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `app/auth/callback/route.ts`, `proxy.ts`
- **Xong khi:** đăng ký → xác thực → đăng nhập → đăng xuất chạy trọn vẹn; vào `/dashboard` khi chưa đăng nhập bị chuyển về `/login`.

### S04 · Trang Onboarding

- **Làm gì:** 3 bước: chọn ngôn ngữ học (Nhật / Anh) → trình độ (N5–N1 / A1–C2) → ngôn ngữ hiển thị (VI / EN / JA); lưu vào `profiles`. User mới (chưa onboarding) tự chuyển tới đây.
- **File chính:** `app/onboarding/page.tsx`
- **Xong khi:** user mới hoàn tất onboarding và vào Dashboard với đúng cài đặt.

### S05 · Layout chung + i18n + Trang Dashboard

- **Làm gì:**
  - next-intl: mọi text UI qua key; điền `vi.json` trước, `en.json` / `ja.json` cùng key; ngôn ngữ theo `profiles`.
  - Theme dark mặc định, có nút chuyển light.
  - Layout: thanh điều hướng (Dashboard, Bài học, Sổ tay, Ôn tập, Pomodoro, Hồ sơ), responsive mobile.
  - Dashboard: XP, Coins, Streak, số thẻ cần ôn hôm nay, bài đang làm dở.
- **File chính:** `app/(main)/layout.tsx`, `app/(main)/dashboard/page.tsx`, `messages/*.json`, `i18n/*`
- **Xong khi:** đi được giữa các mục; đổi ngôn ngữ hiển thị đổi toàn bộ UI; hiển thị tốt ở 375px và desktop.

---

## Dịch song song (Tính năng A)

### S06 · Trang Danh sách bài + Tạo bài

- **Làm gì:**
  - Form dán đoạn văn + chọn ngôn ngữ/trình độ → lưu `lessons` + các `sentences` (một RPC để lưu trong 1 transaction).
  - `split-sentences.ts`: tiếng Nhật tách theo `。！？`, tiếng Anh dùng `Intl.Segmenter`; viết test.
  - Danh sách bài: tiến độ (x/y câu), nút tiếp tục, xoá bài.
- **File chính:** `app/(main)/lessons/page.tsx`, `app/(main)/lessons/new/page.tsx`, `lib/nlp/split-sentences.ts`
- **Xong khi:** dán 1 đoạn tiếng Nhật và 1 đoạn tiếng Anh → tách câu đúng; test pass.

### S07 · Chức năng AI chấm bản dịch (Gemini)

- **Làm gì:**
  - Route `POST /api/translations/verify` gọi Gemini; nhận `{sentenceId, userTranslation}`, server tự lấy câu gốc, trình độ, ngữ cảnh câu trước/sau, ngôn ngữ hiển thị từ DB.
  - Structured output (JSON schema), trả về: `verdict` (exact / acceptable / incorrect), `feedback`, `hint`, `errorTags[]`, `referenceTranslation` (chỉ khi không phải incorrect).
  - Prompt ở `server/prompts/grade-translation.v1.ts` + fixtures ≥ 10 câu (đúng / gượng / sai).
  - Zod parse; retry 2 lần (backoff) khi lỗi mạng / 429 / 5xx / JSON sai; timeout; log latency.
  - Rate limit theo user / ngày (bảng `rate_limits` + RPC) — vừa túi free tier của Gemini.
- **File chính:** `app/api/translations/verify/route.ts`, `server/gemini.ts`, `server/prompts/grade-translation.v1.ts`, `server/rate-limit.ts`
- **Xong khi:** chạy 10 câu thử cho kết quả hợp lý; key không xuất hiện trong bundle client; test route (mock Gemini) pass.

### S08 · Trang Dịch song song (UI)

- **Làm gì:**
  - Khung trái: từng câu với 3 trạng thái — đang dịch (highlight, chữ to), chưa dịch (mờ 40%, khoá), đã xong (tích xanh + bản dịch chuẩn).
  - Khung phải: textarea, Enter = Kiểm tra, Shift+Enter = xuống dòng.
  - Vùng hiện kết quả AI (verdict, nhận xét, hint). Mobile: xếp dọc.
- **File chính:** `app/(main)/lessons/[id]/translate/page.tsx`, `app/(main)/lessons/[id]/translate/_components/{source-pane,target-pane,feedback-panel}.tsx`, `_hooks/use-translate-session.ts`
- **Xong khi:** chạy mượt với dữ liệu giả, chưa cần gọi AI.

### S09 · Chức năng Luồng làm bài + chấm điểm

- **Làm gì:**
  - Nối S07 vào S08: sai → hiện hint, bắt dịch lại; đúng → mở khoá câu sau. AI lỗi → nút "Thử lại", không tính lần thử.
  - Route S07 ghi `attempts` phía server; mở lại bài thì tiếp tục đúng câu đang dở.
  - Hết bài: `scoring.ts` tính điểm theo số lần thử + verdict → RPC tính lại từ `attempts` và cộng XP/Coins → màn hình tổng kết.
- **File chính:** `lib/scoring.ts`, `app/(main)/lessons/[id]/result/page.tsx`, `supabase/migrations/*_complete_lesson.sql`
- **Xong khi:** làm trọn 1 bài 5 câu; điểm, XP, Coins lưu đúng; E2E Playwright cho luồng này pass.

---

## Từ vựng & SRS (Tính năng B, C)

### S10 · Chức năng Tách từ + Popup từ điển

- **Làm gì:**
  - kuromoji.js tách từ tiếng Nhật → từ loại, cách đọc → furigana / romaji.
  - Từ điển: JMdict (Nhật) nạp vào Postgres hoặc file tĩnh; từ điển + IPA cho tiếng Anh.
  - Mọi từ trong 2 khung đều click được → popup: từ, âm đọc, từ loại, nghĩa, câu ví dụ trong bài, nút "Thêm vào Flashcard".
- **File chính:** `lib/nlp/tokenize.ts`, `components/dictionary/word-popup.tsx`
- **Xong khi:** click từ bất kỳ đều ra popup đúng, nhanh.

### S11 · Chức năng Thêm Flashcard + Trang Sổ tay

- **Làm gì:**
  - Nút trong popup lưu `vocab_items` + câu ngữ cảnh hiện tại → tạo `flashcards` (mặt trước: từ + âm đọc + câu có `___`; mặt sau: nghĩa + nghĩa câu + nút đọc).
  - Trang Sổ tay: danh sách, tìm kiếm, lọc theo bài/trình độ, sửa, xoá.
- **File chính:** `app/(main)/notebook/page.tsx`, `lib/api/vocab.ts`
- **Xong khi:** thêm từ từ popup → thấy ngay trong Sổ tay với đúng câu ngữ cảnh.

### S12 · Chức năng Thuật toán SRS

- **Làm gì:** `schedule.ts`: lịch 1 → 3 → 7 → 14 → 30 ngày theo đánh giá Again / Hard / Good / Easy; hàm lấy thẻ đến hạn; unit test đầy đủ.
- **File chính:** `lib/srs/schedule.ts`, `lib/srs/schedule.test.ts`
- **Xong khi:** test pass cho mọi trường hợp đánh giá.

### S13 · Trang Ôn tập Flashcard

- **Làm gì:** hàng đợi thẻ đến hạn (`due_date <= now()`), lật thẻ (phím Space), 4 nút đánh giá (phím 1–4), cập nhật lịch bằng S12, màn hình xong phiên.
- **File chính:** `app/(main)/review/page.tsx`, `components/flashcard/card.tsx`
- **Xong khi:** ôn 10 thẻ, ngày đến hạn cập nhật đúng.

### S14 · Trang Quiz

- **Làm gì:** 3 chế độ dùng chung dữ liệu flashcard: Trắc nghiệm (sinh đáp án nhiễu cùng từ loại), Điền từ, Ghép thẻ (có đếm giờ).
- **File chính:** `app/(main)/quiz/page.tsx`, `app/(main)/quiz/_components/*`
- **Xong khi:** mỗi chế độ chơi được với ≥ 10 thẻ.

---

## Nghe & Chép chính tả (Tính năng D)

### S15 · Chức năng TTS (Web Speech API)

- **Làm gì:** hook `hooks/use-speech.ts` bọc `speechSynthesis`: chọn giọng theo ngôn ngữ (ja-JP / en-US), ưu tiên giọng chất lượng cao nếu máy có; chỉnh tốc độ; nghe lại; báo khi thiết bị không có giọng phù hợp. Component nút phát; gắn vào mặt sau flashcard.
- **File chính:** `hooks/use-speech.ts`, `components/audio/play-button.tsx`
- **Xong khi:** đọc đúng câu Nhật và Anh trên Chrome + Safari; đổi tốc độ được.

### S16 · Trang Chép chính tả

- **Làm gì:** phát từng câu (S15) → user gõ lại → `diff.ts` so sánh theo **ký tự** (Nhật) / **từ** (Anh) → tô màu đúng / sai / thiếu → điểm từng câu và cả bài.
- **File chính:** `app/(main)/dictation/[id]/page.tsx`, `lib/diff.ts`
- **Xong khi:** chép 1 bài 5 câu, điểm khớp với phần tô màu.

### S17 · Trang Cloze Test

- **Làm gì:** nạp danh sách từ JLPT (N5–N1) và CEFR (A1–C2); dùng tokenizer S10 để đục lỗ đúng các từ thuộc cấp độ đã chọn; nghe + điền; chấm.
- **File chính:** `app/(main)/cloze/[id]/page.tsx`, `data/wordlists/*`
- **Xong khi:** chọn N2 → chỉ các từ N2 bị đục lỗ.

### S18 · Chức năng Lấy tin tức tự động

- **Làm gì:** trước khi code, kiểm tra điều khoản sử dụng của NHK / BBC / CNN. Nếu được phép: route `POST /api/cron/fetch-news` (bảo vệ bằng `CRON_SECRET`) lấy bài → tạo `lessons` gắn cấp độ; `pg_cron` + `pg_net` gọi route mỗi sáng. Nếu không: chỉ lưu tiêu đề + link, user tự dán nội dung.
- **File chính:** `app/api/cron/fetch-news/route.ts`, `supabase/migrations/*_cron_fetch_news.sql`
- **Xong khi:** gọi tay route tạo được bài; job `pg_cron` chạy đúng lịch trên local.

---

## AI cá nhân hóa (Tính năng E)

### S19 · Chức năng Ghi lỗi + Trang Phân tích lỗi

- **Làm gì:** từ `errorTags` của mỗi attempt, ghi `error_logs` (trợ từ は/が, chia thì, kính ngữ…); view/RPC tổng hợp; trang biểu đồ theo loại lỗi và theo thời gian, top 3 điểm yếu.
- **File chính:** `app/(main)/analytics/page.tsx`, `supabase/migrations/*_error_stats.sql`
- **Xong khi:** biểu đồ đúng với dữ liệu thật sau ≥ 3 bài đã làm.

### S20 · Trang Tạo bài bằng AI + Micro-lesson

- **Làm gì:**
  - Form nhập chủ đề + trình độ → route gọi Gemini viết đoạn văn → lưu thành `lessons` → mở luôn trang Dịch.
  - Nút "Luyện điểm yếu": lấy top lỗi (S19) → Gemini sinh bài tập 3–5 phút.
  - Prompt `generate-lesson.v1.ts`, `micro-lesson.v1.ts` + fixtures; rate limit theo user.
- **File chính:** `app/(main)/lessons/generate/page.tsx`, `app/api/lessons/generate/route.ts`
- **Xong khi:** tạo bài "Công nghệ AI" cấp N3 và dịch được ngay.

---

## Game hóa (Tính năng F)

### S21 · Trang Pomodoro + Vườn tri thức

- **Làm gì:** đồng hồ 25 / 5 phút (Zustand, tính theo thời điểm bắt đầu, vẫn đúng khi đổi tab), thông báo khi hết giờ; xong phiên → RPC kiểm tra thời lượng theo `started_at` server ghi → trồng cây + Coins; trang Vườn hiển thị cây đã trồng.
- **File chính:** `app/(main)/pomodoro/page.tsx`, `app/(main)/garden/page.tsx`, `lib/stores/pomodoro.ts`
- **Xong khi:** 1 phiên đủ 25 phút ghi `pomodoro_sessions` và cộng Coins; kết thúc sớm không được thưởng.

### S22 · Chức năng Ví Coins/XP + Streak

- **Làm gì:** Postgres function `security definer` duy nhất xử lý cộng/trừ (`wallet_apply`): ghi `transactions`, khoá dòng (`for update`), không cho số dư âm, idempotency key (unique); streak tính theo múi giờ user; gom mọi nguồn thưởng (dịch bài, Pomodoro, ôn thẻ) về đây.
- **File chính:** `supabase/migrations/*_wallet.sql`, `supabase/tests/wallet.test.sql`
- **Xong khi:** test pgTAP: gọi đồng thời không sai số dư; gửi lại cùng idempotency key không cộng 2 lần; client gọi trực tiếp UPDATE bị chặn.

### S23 · Trang Shop + Themes

- **Làm gì:** danh sách vật phẩm (trang trí vườn, theme, chủ đề bài đọc độc quyền); mua qua S22; áp dụng theme cho toàn app.
- **File chính:** `app/(main)/shop/page.tsx`
- **Xong khi:** mua 1 theme → trừ Coins đúng, đổi giao diện được.

### S24 · Trang Skill Tree

- **Làm gì:** định nghĩa cây (nhánh chủ đề × cấp độ) trong file dữ liệu; điều kiện mở khoá theo thành tựu; vẽ cây, node khoá / mở / đã xong.
- **File chính:** `app/(main)/skills/page.tsx`, `lib/data/skill-tree.ts`
- **Xong khi:** hoàn thành bài → node tiếp theo mở khoá.

---

## Tài khoản

### S25 · Trang Hồ sơ & Cài đặt

- **Làm gì:** sửa tên, ảnh đại diện (Supabase Storage, bucket có policy theo owner), đổi ngôn ngữ học / trình độ / ngôn ngữ hiển thị, thống kê cá nhân, xoá tài khoản (route server dùng admin client, xoá cascade).
- **File chính:** `app/(main)/profile/page.tsx`, `app/(main)/settings/page.tsx`, `app/api/account/route.ts`
- **Xong khi:** đổi cài đặt → các trang khác cập nhật theo; xoá tài khoản xoá hết dữ liệu.

---

## Cộng đồng (Tính năng G)

### S26 · Trang Community Feed

- **Làm gì:** bảng `posts`, `comments`, `likes` (RLS: ai đăng nhập cũng đọc, chỉ chủ sửa/xoá); publish bài dịch từ màn tổng kết; feed phân trang (cursor); like, comment; nút báo cáo.
- **File chính:** `app/(main)/community/page.tsx`, `supabase/migrations/*_community.sql`
- **Xong khi:** 2 tài khoản tương tác được với bài của nhau.

### S27 · Trang Bảng xếp hạng

- **Làm gì:** SQL function tổng hợp XP / Streak / phút Pomodoro theo tuần và tháng → ghi bảng `leaderboards`; `pg_cron` chạy mỗi giờ; trang hiển thị 3 tab, làm nổi vị trí của mình.
- **File chính:** `app/(main)/leaderboard/page.tsx`, `supabase/migrations/*_leaderboard.sql`
- **Xong khi:** bảng đúng với dữ liệu seed.

### S28 · Trang Battle 1v1

- **Làm gì:** bảng `battles`, `battle_players`; ghép cặp (RPC); phòng realtime bằng **Supabase Realtime** (broadcast + presence, channel `battle:<id>`); cùng dịch 1 đoạn 5 câu; chấm Tốc độ + Độ chính xác bằng S07 (server ghi kết quả); xử lý thoát giữa chừng (presence leave).
- **File chính:** `app/(main)/battle/page.tsx`, `app/(main)/battle/[id]/page.tsx`, `app/(main)/battle/[id]/_hooks/use-battle-channel.ts`
- **Xong khi:** 2 trình duyệt đấu với nhau, có người thắng, kết quả lưu lại.

---

## Ra mắt

### S29 · PWA + Docker hoá + Deploy

- **Làm gì:**
  - Manifest + service worker (Sổ tay / Ôn tập dùng được khi mất mạng).
  - `next.config` `output: "standalone"`; `Dockerfile` multi-stage; `docker-compose.yml` chạy app + kết nối Supabase.
  - Chọn nơi deploy (ưu tiên miễn phí) cùng Minh: Supabase cloud + Vercel / Docker image lên host khác.
  - `supabase db push` migrations lên cloud; biến môi trường production; Playwright chạy trong CI.
- **Xong khi:** `docker compose up` chạy được bản production trên máy; cài được app lên điện thoại từ link production.

---

## Mở rộng (sau)

### S30 · Browser Extension

- Bôi đen văn bản trên trang bất kỳ → dịch / tra từ → lưu vào Sổ tay (gọi cùng API).

### S31 · Mobile App

- Flutter hoặc PWA nâng cao, ưu tiên Pomodoro và Chép chính tả.

---

## Cách bắt đầu một session với Claude

> "Làm session **S0X**." — skill `session-runner` sẽ đọc file này + `PRD.md`, lên plan, chờ duyệt rồi làm. Xong thì ghi vào `.claude/progress.md`.
