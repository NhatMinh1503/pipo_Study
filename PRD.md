# pipo_Study — Product Requirement Document

> Nền tảng học ngoại ngữ tương tác qua dịch thuật ngữ cảnh & AI.
> Nguồn: mô tả của Project "pipo_Study" trên claude.ai (bản sao để làm việc offline).

## 1. Tổng quan & Tầm nhìn

- **Mục tiêu:** Giải quyết triệt để vấn đề "học vẹt / nhớ ngắn hạn" khi dịch từ đơn lẻ hoặc dịch thụ động.
- **Triết lý cốt lõi:** Dịch thuật chủ động (Active Contextual Translation) + Lặp lại ngắt quãng (SRS) + Phản hồi AI thời gian thực + Game hóa.
- **Người dùng:** Người học tiếng Nhật (N5 → N1) và tiếng Anh (A1 → C2).

## 2. Tính năng

### A. Dịch thuật tương tác song song (Dual-Pane — Core Engine)

- **Source Pane (trái):** văn bản gốc chia theo câu.
  - Câu đang dịch: highlight, chữ lớn hơn.
  - Câu chưa dịch: opacity 40%, khóa cho tới khi xong câu trước.
  - Câu đã dịch: tích xanh + bản dịch chuẩn.
- **Target Pane (phải):** textarea cho câu tương ứng.
- **AI Verification:** gửi [câu gốc, bản dịch user, cấp độ, ngữ cảnh câu xung quanh] → trả về:
  1. Đánh giá: Exact / Acceptable (Awkward) / Incorrect.
  2. Nhận xét chi tiết: ngữ pháp, từ vựng, độ tự nhiên.
  3. Nếu sai: Hint (không cho đáp án), user dịch lại để mở khóa câu tiếp.
- **Điểm:** xong cả đoạn → tính điểm theo số lần thử + độ chính xác → thưởng XP/Coins.

### B. Từ điển popup theo ngữ cảnh

- Click/hover từ bất kỳ (văn bản gốc hoặc bản dịch).
- Hiển thị: từ gốc, âm đọc (Furigana/Romaji; IPA cho tiếng Anh), từ loại (danh từ, động từ nhóm I/II/III, tính từ i/na…), định nghĩa theo ngôn ngữ hiển thị, câu ví dụ trong bài, nút "Thêm vào Sổ tay Flashcard" (tự lưu câu hiện tại làm ví dụ).

### C. Sổ tay từ vựng SRS & Flashcard

- SRS kiểu Anki: chu kỳ 1 / 3 / 7 / 14 / 30 ngày theo độ khó tự đánh giá.
- Mặt trước: từ + âm đọc + câu gốc chứa từ (từ bị ẩn bằng `___`).
- Mặt sau: định nghĩa + nghĩa cả câu + AI audio đọc câu.
- Chế độ Quizlet: Flashcard, Trắc nghiệm, Điền từ, Ghép thẻ.

### D. Luyện nghe & Chép chính tả

- Nguồn: user tải lên văn bản/âm thanh; API tin tức hằng ngày (NHK Web Easy cho N3–N4, NHK News cho N1–N2, BBC/CNN cho tiếng Anh).
- Dictation: TTS đọc từng câu → user chép → AI diff & chấm từng ký tự/từ.
- Cloze Test: AI đục lỗ từ vựng thuộc cấp độ đã chọn (vd. toàn bộ từ N2) → nghe và điền.

### E. AI cá nhân hóa & Phân tích lỗi

- Error Analytics Dashboard: biểu đồ loại lỗi hay gặp (trợ từ は/が, chia thì, kính ngữ/thân mật…).
- Micro-Lessons: AI tạo bài tập 3–5 phút nhắm đúng lỗ hổng.
- Content Generator: nhập chủ đề → AI viết đoạn văn đúng trình độ (N5→N1) để luyện dịch.

### F. Gamification & Kinh tế

- Pomodoro "Forest style": 25/5 phút; xong 1 phiên = trồng 1 cây trong "Vườn tri thức" + Coins.
- Tiền tệ: kiếm Coins/XP từ dịch bài, Pomodoro, Streak; tiêu vào trang trí vườn, Themes, chủ đề bài đọc độc quyền.
- Skill Tree: lộ trình theo nhánh chủ đề & cấp độ, mở khóa dần.

### G. Cộng đồng

- Community Feed: publish bài dịch / đoạn văn hay; Like, Comment, thảo luận.
- Leaderboards: tuần/tháng theo XP, Streak, thời gian Pomodoro.
- Translation Battle 1v1 realtime: cùng dịch 1 đoạn 5 câu, AI chấm theo Tốc độ + Độ chính xác.

### H. Hệ sinh thái mở rộng

- Browser Extension: bôi đen để dịch trên mọi trang, đồng bộ từ vựng về app.
- Mobile App (PWA/Flutter) tối ưu Pomodoro và Dictation.

## 3. KPIs

- Retention D7 > 40%.
- Engagement: ≥ 2 phiên dịch + 1 phiên Pomodoro / user / ngày.
- Chất lượng AI: độ chính xác > 95%, latency < 1.5s / câu.
