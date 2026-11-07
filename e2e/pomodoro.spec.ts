import { expect, test } from "@playwright/test";

import { plantTree } from "./helpers/admin";
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

  // garden-scene test case #11: choose the species of a new tree; locked ones need a seed
  test("a new tree's species is chosen before starting; sakura and maple need seeds", async ({
    page,
  }, testInfo) => {
    await createOnboardedUser(page, testInfo);
    await page.goto("/pomodoro");

    const picker = page.getByRole("radiogroup", { name: "Cây sẽ trồng" });
    await expect(picker.getByRole("radio", { name: /Thông Nhật/ })).toBeChecked();
    await expect(picker.getByRole("radio", { name: /Anh đào/ })).toBeDisabled();
    await expect(picker.getByRole("radio", { name: /Phong đỏ/ })).toBeDisabled();
    await expect(picker).toContainText("Cần hạt giống");

    await picker.getByRole("radio", { name: /Tre/ }).check();
    await page.getByRole("button", { name: "Bắt đầu 25 phút" }).click();
    await expect(page.getByText("Tập trung", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Bỏ cuộc (không nhận thưởng)" }).click();
    await expect(page.getByText("Sẵn sàng")).toBeVisible();
  });

  test("while a tree is growing, the next sessions tend it", async ({ page }, testInfo) => {
    const email = await createOnboardedUser(page, testInfo);
    await plantTree(email, { species: "bamboo", sessions: 2 });
    await page.goto("/pomodoro");

    await expect(page.getByText("Đang chăm: Tre · 2/4 phiên")).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Cây sẽ trồng" })).toHaveCount(0);
  });
});
