---
paths:
  - "server/prompts/**"
  - "server/gemini.ts"
---

# AI Prompt Rules (Gemini)

- Mỗi prompt một file có version: `server/prompts/grade-translation.v1.ts`. Sửa ý nghĩa prompt → tạo `v2`, giữ `v1` tới khi `v2` được duyệt.
- File prompt export: `PROMPT_VERSION`, hàm `build(input)` trả về prompt, và `responseSchema` (Zod) → chuyển sang JSON schema cho structured output.
- Luôn dùng structured output; luôn parse kết quả bằng Zod — không tin AI trả đúng format.
- Prompt ghi rõ: trình độ học viên, ngôn ngữ hiển thị của nhận xét, và **không** đưa đáp án khi verdict là `incorrect` (chỉ hint).
- Fixtures ở `server/prompts/fixtures/<prompt>.json`: ≥ 10 ca (đúng / gượng / sai / input lạ). Unit test kiểm tra `build()` và parse; chạy thử thật với Gemini chỉ khi Minh yêu cầu (tiết kiệm quota free tier).
- Không đưa dữ liệu cá nhân (email, tên) vào prompt — free tier có thể dùng dữ liệu để cải thiện sản phẩm.
- Đổi model hay prompt → ghi lại kết quả so sánh trên fixtures trong phần tổng kết session.
