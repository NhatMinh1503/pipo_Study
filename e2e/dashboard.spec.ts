import { expect, test } from "@playwright/test";

import { signIn } from "./helpers/auth";

test.describe("dashboard", () => {
  test("shows the seeded user's stats, due cards and lesson in progress", async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole("heading", { name: "Xin chào, Minh Demo!" })).toBeVisible();

    const stats = page.getByRole("region", { name: "Thống kê" });
    await expect(stats).toContainText("120");
    await expect(stats).toContainText("35");
    await expect(stats).toContainText("Kỷ lục: 5 ngày");

    await expect(page.getByText("3 thẻ đang chờ bạn")).toBeVisible();
    await expect(page.getByRole("link", { name: /スーパーで買い物/ })).toBeVisible();
  });

  test("switching the display language updates the whole UI", async ({ page }) => {
    await signIn(page);

    await page.getByRole("button", { name: "Mở menu tài khoản" }).click();
    await page.getByRole("menuitem", { name: "Ngôn ngữ hiển thị" }).click();
    await page.getByRole("menuitemradio", { name: "Tiếng Nhật" }).click();

    await expect(page.getByRole("heading", { name: "こんにちは、Minh Demoさん！" })).toBeVisible();

    // Restore Vietnamese so other tests keep their labels
    await page.getByRole("button", { name: "アカウントメニューを開く" }).click();
    await page.getByRole("menuitem", { name: "表示言語" }).click();
    await page.getByRole("menuitemradio", { name: "ベトナム語" }).click();
    await expect(page.getByRole("heading", { name: "Xin chào, Minh Demo!" })).toBeVisible();
  });

  test("navigation highlights the current page", async ({ page }) => {
    await signIn(page);
    const nav = page.getByRole("navigation", { name: "Điều hướng chính" }).locator("visible=true");
    await expect(nav.getByRole("link", { name: "Tổng quan" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
