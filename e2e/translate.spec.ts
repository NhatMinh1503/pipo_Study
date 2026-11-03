import { expect, test, type Page } from "@playwright/test";

import { createOnboardedUser } from "./helpers/auth";

// The E2E server uses the fake grader: an answer containing "sai" is incorrect,
// any other answer is acceptable (exact only when it matches a stored reference).

async function createLesson(page: Page, title: string, text: string) {
  await page.goto("/lessons/new");
  await page.getByLabel("Tiêu đề").fill(title);
  await page.getByLabel("Đoạn văn").fill(text);
  await page.getByRole("button", { name: "Tạo bài và bắt đầu dịch" }).click();
  await expect(page).toHaveURL(/\/translate$/);
}

const answerBox = (page: Page) => page.getByLabel(/Bản dịch của bạn/);

test.describe("translate flow", () => {
  test("wrong answer shows a hint, right answer unlocks the next sentence, finishing pays XP", async ({
    page,
  }, testInfo) => {
    await createOnboardedUser(page, testInfo);
    await createLesson(page, "Hai câu", "猫が寝ています。犬が走っています。");

    await expect(page.getByText("0/2 câu")).toBeVisible();
    const source = page.getByRole("region", { name: "Văn bản gốc" });
    await expect(source.locator('[aria-current="step"]')).toContainText("猫が寝ています。");

    // Incorrect: hint, no answer, still on the same sentence
    await answerBox(page).fill("Câu này sai");
    await answerBox(page).press("Enter");
    const feedback = page.getByRole("region", { name: "Nhận xét từ AI" });
    await expect(feedback).toContainText("Chưa đúng");
    await expect(feedback).toContainText("Gợi ý");
    await expect(feedback).not.toContainText("Bản dịch tham khảo");
    await expect(page.getByText("Lần thử thứ 1")).toBeVisible();

    // Correct: verdict + reference, then move on
    await answerBox(page).fill("Con mèo đang ngủ.");
    await answerBox(page).press("Enter");
    await expect(feedback).toContainText("Chấp nhận được");
    await expect(page.getByText("1/2 câu")).toBeVisible();
    await page.getByRole("button", { name: "Câu tiếp theo" }).click();
    await expect(source.locator('[aria-current="step"]')).toContainText("犬が走っています。");

    // Shift+Enter adds a line break instead of submitting
    await answerBox(page).fill("Con chó");
    await answerBox(page).press("Shift+Enter");
    await expect(feedback).toHaveCount(0);
    await answerBox(page).press("Enter");
    await expect(page.getByText("2/2 câu")).toBeVisible();
    await page.getByRole("button", { name: "Câu tiếp theo" }).click();

    // Finish: reward screen
    await page.getByRole("button", { name: "Nhận thưởng & xem kết quả" }).click();
    await expect(page).toHaveURL(/\/result$/);
    const stats = page.getByRole("region", { name: "Kết quả" });
    // 5 points (acceptable after one miss) + 7 points (acceptable first try) = 12 of 20
    await expect(stats).toContainText("60%");
    await expect(stats).toContainText("+12");

    await page.goto("/dashboard");
    await expect(page.getByRole("region", { name: "Thống kê" })).toContainText("12");
  });

  test("progress is kept when the learner leaves and comes back", async ({ page }, testInfo) => {
    await createOnboardedUser(page, testInfo);
    await createLesson(page, "Ba câu", "一。二。三。");

    await answerBox(page).fill("Một.");
    await answerBox(page).press("Enter");
    await expect(page.getByText("1/3 câu")).toBeVisible();
    const url = page.url();

    await page.goto("/dashboard");
    await page.goto(url);
    await expect(page.getByText("1/3 câu")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Văn bản gốc" }).locator('[aria-current="step"]'),
    ).toContainText("二。");
  });
});
