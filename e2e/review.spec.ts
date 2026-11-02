import { expect, test, type Page } from "@playwright/test";

import { createOnboardedUser } from "./helpers/auth";

async function saveWordsFromLesson(page: Page, words: string[]) {
  await page.goto("/lessons/new");
  await page.getByLabel("Tiêu đề").fill("Ôn tập");
  await page.getByLabel("Đoạn văn").fill("駅に猫がいます。");
  await page.getByRole("button", { name: "Tạo bài và bắt đầu dịch" }).click();
  await expect(page).toHaveURL(/\/translate$/);

  const source = page.getByRole("region", { name: "Văn bản gốc" });
  for (const word of words) {
    await source.getByRole("button", { name: word, exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Thêm vào Sổ tay" }).click();
    await expect(
      page.getByRole("dialog").getByRole("button", { name: "Đã có trong Sổ tay" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
  }
}

test.describe("flashcard review", () => {
  test("flip with Space, rate with keys, forgotten cards come back, summary at the end", async ({
    page,
  }, testInfo) => {
    await createOnboardedUser(page, testInfo);
    await saveWordsFromLesson(page, ["駅", "猫"]);

    await page.goto("/review");
    await expect(page.getByText("Còn 2 thẻ")).toBeVisible();

    // Front: the word is hidden in its sentence
    await expect(
      page.getByText("＿＿＿に猫がいます。").or(page.getByText("駅に＿＿＿がいます。")),
    ).toBeVisible();

    // Card 1: Space flips, 3 = Good
    await page.keyboard.press("Space");
    await expect(page.getByRole("group", { name: "Bạn nhớ từ này thế nào?" })).toBeVisible();
    await page.keyboard.press("3");
    await expect(page.getByText("Còn 1 thẻ")).toBeVisible();

    // Card 2: forgotten (1 = Again) → it stays in the queue
    await page.keyboard.press("Space");
    await page.keyboard.press("1");
    await expect(page.getByText("Còn 1 thẻ")).toBeVisible();

    // Same card again, now remembered (button click instead of keys)
    await page.getByRole("button", { name: "Xem đáp án" }).click();
    await page.getByRole("button", { name: /Nhớ/ }).click();

    await expect(page.getByRole("heading", { name: "Xong phiên ôn tập!" })).toBeVisible();
    await expect(page.getByText("Bạn đã ôn 3 lượt thẻ.")).toBeVisible();
    // Navigation is offered only once every rating is saved
    await expect(page.getByRole("link", { name: "Về tổng quan" })).toBeVisible();

    // Nothing is due any more
    await page.goto("/review");
    await expect(page.getByRole("heading", { name: "Không có thẻ nào cần ôn" })).toBeVisible();
    await page.goto("/dashboard");
    await expect(page.getByText("Không có thẻ nào đến hạn. Tuyệt vời!")).toBeVisible();
  });

  test("rating keys do nothing before the card is flipped", async ({ page }, testInfo) => {
    await createOnboardedUser(page, testInfo);
    await saveWordsFromLesson(page, ["駅"]);

    await page.goto("/review");
    await expect(page.getByText("Còn 1 thẻ")).toBeVisible();
    await page.keyboard.press("3");
    await expect(page.getByText("Còn 1 thẻ")).toBeVisible();
    await expect(page.getByRole("button", { name: "Xem đáp án" })).toBeVisible();
  });
});
