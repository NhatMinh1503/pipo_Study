import { expect, test } from "@playwright/test";

import { createOnboardedUser } from "./helpers/auth";

// AI_PROVIDER=fake: the generator writes 今日は晴れです。…; answers containing "sai" are wrong.

test.describe("AI personalization", () => {
  test("generate a lesson from a topic suggestion", async ({ page }, testInfo) => {
    await createOnboardedUser(page, testInfo);
    await page.goto("/lessons/generate");
    await expect(page.getByText("Đoạn văn sẽ ở trình độ N4.")).toBeVisible();

    await page.getByRole("button", { name: "Du lịch" }).click();
    await expect(page.getByLabel("Chủ đề", { exact: true })).toHaveValue("Du lịch");
    await page.getByRole("button", { name: "Tạo bài" }).click();

    await expect(page).toHaveURL(/\/translate$/);
    await expect(page.getByRole("heading", { name: "Du lịch" })).toBeVisible();
    await expect(page.getByText("今日は晴れです。").first()).toBeVisible();
  });

  test("mistakes appear in analytics and become a micro-lesson", async ({ page }, testInfo) => {
    await createOnboardedUser(page, testInfo);

    await page.goto("/analytics");
    await expect(page.getByText("Chưa có lỗi nào được ghi nhận.")).toBeVisible();

    await page.goto("/lessons/new");
    await page.getByLabel("Tiêu đề").fill("Sai một câu");
    await page.getByLabel("Đoạn văn").fill("駅に行きます。");
    await page.getByRole("button", { name: "Tạo bài và bắt đầu dịch" }).click();
    await page.getByLabel(/Bản dịch của bạn/).fill("Câu này sai");
    await page.getByLabel(/Bản dịch của bạn/).press("Enter");
    await expect(page.getByRole("region", { name: "Nhận xét từ AI" })).toContainText("Chưa đúng");

    await page.goto("/analytics");
    await expect(page.getByTitle("Sai nghĩa: 1 lần")).toBeVisible();
    await expect(page.getByRole("heading", { name: "3 điểm yếu nhất" })).toBeVisible();

    await page.getByRole("button", { name: "Luyện điểm yếu (3–5 phút)" }).click();
    await expect(page).toHaveURL(/\/translate$/);
    await expect(page.getByText("今日は晴れです。").first()).toBeVisible();
  });

  test("news page lists headlines or explains why it cannot", async ({ page }, testInfo) => {
    await createOnboardedUser(page, testInfo);
    await page.goto("/news");
    await expect(page.getByRole("heading", { name: "Tin tức hôm nay" })).toBeVisible();

    const makeLesson = page.getByRole("link", { name: "Tạo bài" }).first();
    if (await makeLesson.isVisible()) {
      const title = await page.getByRole("listitem").first().locator("p").first().innerText();
      await makeLesson.click();
      await expect(page.getByLabel("Tiêu đề")).toHaveValue(title.slice(0, 120));
    } else {
      await expect(page.getByText("Chưa tải được tin tức.")).toBeVisible();
    }
  });
});
