import { expect, test, type Page } from "@playwright/test";

import { grantCoins } from "./helpers/admin";
import { createOnboardedUser } from "./helpers/auth";

async function finishOneLesson(page: Page) {
  await page.goto("/lessons/new");
  await page.getByLabel("Tiêu đề").fill("Một câu");
  await page.getByLabel("Đoạn văn").fill("駅に行きます。");
  await page.getByRole("button", { name: "Tạo bài và bắt đầu dịch" }).click();
  await page.getByLabel(/Bản dịch của bạn/).fill("Tôi đi ga.");
  await page.getByLabel(/Bản dịch của bạn/).press("Enter");
  await page.getByRole("button", { name: "Câu tiếp theo" }).click();
  await page.getByRole("button", { name: "Nhận thưởng & xem kết quả" }).click();
  await expect(page).toHaveURL(/\/result$/);
}

test.describe("gamification and account", () => {
  test("finishing a lesson starts a streak and unlocks the next skill", async ({
    page,
  }, testInfo) => {
    await createOnboardedUser(page, testInfo);

    await page.goto("/skills");
    await expect(page.getByLabel("Hoàn thành 1 bài — đang thực hiện")).toBeVisible();

    await finishOneLesson(page);

    await page.goto("/dashboard");
    await expect(page.getByRole("region", { name: "Thống kê" })).toContainText("Kỷ lục: 1 ngày");
    await page.goto("/skills");
    await expect(page.getByLabel("Hoàn thành 1 bài — đã hoàn thành")).toBeVisible();
    await expect(page.getByLabel("Hoàn thành 3 bài — đang thực hiện")).toBeVisible();
  });

  test("buy a decoration with coins and the balance goes down", async ({ page }, testInfo) => {
    const email = await createOnboardedUser(page, testInfo);

    await page.goto("/shop");
    await expect(page.getByRole("button", { name: "Chưa đủ Coins" }).first()).toBeDisabled();
    // Placeholder accent colours and topic packs are no longer sold
    await expect(page.getByRole("article").filter({ hasText: "Sakura" })).toHaveCount(0);

    await grantCoins(email, 100);
    await page.reload();
    await expect(page.getByLabel("Số Coins hiện có")).toHaveText("100");

    const bench = page.getByRole("article").filter({ hasText: "Ghế gỗ" });
    await bench.getByRole("button", { name: "Mua" }).click();
    await expect(page.getByText("Đã mua!")).toBeVisible();
    await expect(page.getByLabel("Số Coins hiện có")).toHaveText("75");
  });

  test("edit profile and settings, then delete the account", async ({ page }, testInfo) => {
    await createOnboardedUser(page, testInfo);

    await page.goto("/profile");
    await page.getByLabel("Tên hiển thị").fill("Học viên E2E");
    await page.getByRole("button", { name: "Lưu", exact: true }).click();
    await expect(page.getByText("Đã lưu.")).toBeVisible();

    await page.goto("/settings");
    await page.getByLabel("Ngôn ngữ hiển thị").click();
    await page.getByRole("option", { name: "Tiếng Anh" }).click();
    await page.getByRole("button", { name: "Lưu cài đặt" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    await page.getByRole("button", { name: "Delete account" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete account" }).click();
    await expect(page).toHaveURL(/\/$/);

    // Signed out and the account is gone: the app sends us to login
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
