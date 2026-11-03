import { expect, test } from "@playwright/test";

import { createOnboardedUser } from "./helpers/auth";

// Requires the JMdict import (`npm run dict:import`) for the offline meaning of 駅.

test.describe("dictionary popup and notebook", () => {
  test("look up a word, ask the AI, save it, then manage it in the notebook", async ({
    page,
  }, testInfo) => {
    await createOnboardedUser(page, testInfo);

    await page.goto("/lessons/new");
    await page.getByLabel("Tiêu đề").fill("Từ điển");
    await page.getByLabel("Đoạn văn").fill("駅に行きます。");
    await page.getByRole("button", { name: "Tạo bài và bắt đầu dịch" }).click();
    await expect(page).toHaveURL(/\/translate$/);

    // Tap a word in the current sentence
    const source = page.getByRole("region", { name: "Văn bản gốc" });
    await source.getByRole("button", { name: "駅", exact: true }).click();
    const popup = page.getByRole("dialog");
    await expect(popup).toContainText("えき");
    await expect(popup).toContainText("Danh từ");
    await expect(popup).toContainText("railway station");
    await expect(popup).toContainText("JMdict");

    // AI explanation: the fake provider answers unless a real explanation is already cached
    const explainButton = popup.getByRole("button", { name: "Giải thích (AI)" });
    const hasCachedExplanation = !(await explainButton.isVisible());
    if (!hasCachedExplanation) {
      await explainButton.click();
      await expect(popup).toContainText("nghĩa của 駅");
    }
    await expect(explainButton).toHaveCount(0);

    await popup.getByRole("button", { name: "Thêm vào Sổ tay" }).click();
    await expect(page.getByText("Đã thêm vào Sổ tay và tạo flashcard.")).toBeVisible();
    await expect(popup.getByRole("button", { name: "Đã có trong Sổ tay" })).toBeDisabled();
    await page.keyboard.press("Escape");

    // Notebook shows the word with its context sentence and AI meaning
    await page.goto("/notebook");
    const card = page.getByRole("article").filter({ hasText: "駅" });
    await expect(card).toContainText("えき");
    if (!hasCachedExplanation) await expect(card).toContainText("nghĩa của 駅");
    await expect(card).toContainText("駅に行きます。");

    await page.getByLabel("Tìm theo từ, cách đọc hoặc nghĩa").fill("xyz");
    await expect(page.getByText("Không có từ nào khớp.")).toBeVisible();
    await page.getByLabel("Tìm theo từ, cách đọc hoặc nghĩa").fill("えき");
    await expect(card).toBeVisible();

    await card.getByRole("button", { name: "Sửa nghĩa của 駅" }).click();
    await page.getByLabel("Nghĩa", { exact: true }).fill("nhà ga");
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(card).toContainText("nhà ga");

    // The new flashcard is due today
    await page.goto("/dashboard");
    await expect(page.getByText("1 thẻ đang chờ bạn")).toBeVisible();

    await page.goto("/notebook");
    await page.getByRole("button", { name: "Xoá 駅" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Xoá" }).click();
    await expect(page.getByText("Sổ tay đang trống.")).toBeVisible();
  });
});
