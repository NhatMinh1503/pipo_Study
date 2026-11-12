import { expect, test } from "@playwright/test";

import { createOnboardedUser } from "./helpers/auth";

// Requires the English import (`npm run dict:import:en`) for the offline entries.

test.describe("English dictionary popup", () => {
  test("an inflected form shows its lemma, IPA and English senses without the AI", async ({
    page,
  }, testInfo) => {
    await createOnboardedUser(page, testInfo);

    await page.goto("/lessons/new");
    await page.getByLabel("Tiêu đề").fill("English dictionary");
    await page.getByLabel("Ngôn ngữ").click();
    await page.getByRole("option", { name: "Tiếng Anh" }).click();
    await page.getByLabel("Đoạn văn").fill("She went to school.");
    await page.getByRole("button", { name: "Tạo bài và bắt đầu dịch" }).click();
    await expect(page).toHaveURL(/\/translate$/);

    const source = page.getByRole("region", { name: "Văn bản gốc" });
    await source.getByRole("button", { name: "went", exact: true }).click();
    const popup = page.getByRole("dialog");
    await expect(popup).toContainText("/went/");
    await expect(popup).toContainText("quá khứ của go");
    await expect(popup).toContainText("Động từ");
    await expect(popup).toContainText("change location");
    await expect(popup).toContainText("WordNet");
    await expect(popup).not.toContainText("Chưa có trong từ điển offline");
  });
});
