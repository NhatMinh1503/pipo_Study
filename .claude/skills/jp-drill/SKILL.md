---
name: jp-drill
description: Tạo nội dung bài luyện dịch (đoạn văn chia câu, đáp án, từ vựng) theo trình độ JLPT N5–N1 hoặc CEFR A1–C2. Dùng khi cần seed data, dữ liệu mẫu cho Lesson/Sentence, hoặc test prompt AI chấm bài.
---

# JP Drill — Content Generator

## Input cần có

- Ngôn ngữ: `ja` | `en`
- Trình độ: `N5`–`N1` | `A1`–`C2`
- Chủ đề (vd. "đi siêu thị", "phỏng vấn xin việc")
- Số câu (mặc định 5)

## Output — JSON khớp model `Lesson` + `Sentence`

```json
{
  "title": "スーパーで買い物",
  "language": "ja",
  "level": "N4",
  "sentences": [
    {
      "order": 1,
      "source": "昨日、駅の近くのスーパーに行きました。",
      "reference": "Hôm qua tôi đã đi siêu thị gần nhà ga.",
      "vocab": [{ "word": "駅", "reading": "えき", "pos": "noun" }]
    }
  ]
}
```

## Quy tắc

- Ngữ pháp và từ vựng **không vượt** trình độ đã chọn.
- Câu sau nối tiếp ngữ cảnh câu trước (để AI chấm có ngữ cảnh).
- `reference` là bản dịch tự nhiên, không dịch word-by-word.
- Tiếng Nhật: tách câu theo `。！？`, mỗi `source` là đúng một câu.
