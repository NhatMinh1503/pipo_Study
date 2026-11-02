---
paths:
  - "supabase/**"
---

# Database Rules (Supabase Postgres)

## Migrations

- Schema chỉ thay đổi qua migration: `supabase migration new <snake_case_name>`. **Không sửa schema trong Studio.**
- **Không sửa migration đã commit** — tạo migration mới để thay đổi. (Migration chưa commit thì được sửa, rồi chạy lại.)
- Sau mỗi migration: `supabase migration up` → `npm run db:types` → commit cả `types/database.ts`.
- Migration phải chạy lại sạch từ đầu: kiểm tra bằng `supabase db reset` (hỏi Minh trước vì xoá dữ liệu local).

## Đặt tên

- Bảng số nhiều `snake_case` (`vocab_items`); cột `snake_case`; khoá chính `id uuid default gen_random_uuid()`.
- Mọi bảng của user có `user_id uuid not null references auth.users on delete cascade`, `created_at timestamptz default now()`.
- Function: động từ trước (`complete_lesson`, `wallet_apply`); index: `<table>_<cols>_idx`.

## RLS — bắt buộc

- Mọi bảng trong `public`: `alter table ... enable row level security;` ngay trong migration tạo bảng.
- Policy tách theo thao tác (select / insert / update / delete), dùng `(select auth.uid())` để Postgres cache.
- Cột nhạy cảm (xp, coins, streak) nằm ở bảng `wallets`: client chỉ có SELECT; ghi qua function `security definer`.
- Function `security definer` luôn `set search_path = ''` và dùng tên đầy đủ (`public.wallets`); kiểm tra `auth.uid()` bên trong.

## Test (pgTAP)

- `supabase/tests/*.test.sql`, chạy bằng `supabase test db`.
- Mỗi bảng mới: test user A không đọc / sửa / xoá được dữ liệu user B; user chưa đăng nhập không đọc được.
- Mỗi function tiền tệ: test số dư không âm, idempotency, gọi bởi user khác bị chặn.

## Dữ liệu

- `seed.sql` chỉ dữ liệu mẫu cho local (user test, vài bài, vài flashcard) — không có dữ liệu thật.
- Thời gian lưu `timestamptz` (UTC); tính streak / "hôm nay" theo múi giờ user lưu ở `profiles.timezone`.
- Lịch chạy: `pg_cron` khai báo trong migration, tên job rõ ràng (`pipo_build_leaderboard_hourly`).
