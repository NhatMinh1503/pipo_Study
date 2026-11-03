import { expect, test } from "@playwright/test";

import { createOnboardedUser } from "./helpers/auth";

test.describe("pomodoro", () => {
  test("a running session survives a reload and can be abandoned without reward", async ({
    page,
  }, testInfo) => {
    await createOnboardedUser(page, testInfo);
    await page.goto("/pomodoro");

    await page.getByRole("button", { name: "Bắt đầu 25 phút" }).click();
    await expect(page.getByText("Tập trung", { exact: true })).toBeVisible();
    await expect(page.getByRole("timer")).toHaveText(/^2[45]:\d\d$/);

    await page.reload();
    await expect(page.getByText("Tập trung", { exact: true })).toBeVisible();
    await expect(page.getByRole("timer")).toHaveText(/^2[45]:\d\d$/);

    await page.getByRole("button", { name: "Bỏ cuộc (không nhận thưởng)" }).click();
    await expect(page.getByText("Sẵn sàng")).toBeVisible();

    await page.goto("/garden");
    await expect(page.getByText("Vườn còn trống.")).toBeVisible();
  });

  test("moving the device clock forward does not earn a reward", async ({ page }, testInfo) => {
    await createOnboardedUser(page, testInfo);
    await page.clock.install();
    await page.goto("/pomodoro");

    await page.getByRole("button", { name: "Bắt đầu 25 phút" }).click();
    await expect(page.getByText("Tập trung", { exact: true })).toBeVisible();

    // The browser thinks 25 minutes passed; the server knows they did not
    await page.clock.fastForward("25:30");
    await expect(page.getByRole("timer")).toHaveText("00:00");
    await expect(page.getByText(/Xong phiên!/)).toHaveCount(0);
    await expect(page.getByText("Tập trung", { exact: true })).toBeVisible();

    await page.goto("/garden");
    await expect(page.getByText("Vườn còn trống.")).toBeVisible();
  });
});
