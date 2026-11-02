import { expect, test } from "@playwright/test";

import { signUpAndConfirm } from "./helpers/auth";

test.describe("onboarding", () => {
  test("new user picks language, level and display language, then lands on dashboard", async ({
    page,
  }, testInfo) => {
    await signUpAndConfirm(page, testInfo);

    // Main app is locked until onboarding is done
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/onboarding$/);

    await expect(page.getByText("Bước 1/3")).toBeVisible();
    const next = page.getByRole("button", { name: "Tiếp tục" });
    await expect(next).toBeDisabled();

    await page.getByText("Tiếng Nhật").click();
    await next.click();

    // Only JLPT levels are offered for Japanese
    await expect(page.getByText("Bước 2/3")).toBeVisible();
    await expect(page.getByText("B1", { exact: true })).toHaveCount(0);
    await page.getByText("N3", { exact: true }).click();
    await next.click();

    await expect(page.getByText("Bước 3/3")).toBeVisible();
    await page.getByText("Tiếng Anh").click();
    await page.getByRole("button", { name: "Bắt đầu học" }).click();

    // Display language switched the UI to English
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Hi there!" })).toBeVisible();

    // Onboarding cannot be repeated
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("going back keeps choices and switching language clears an incompatible level", async ({
    page,
  }, testInfo) => {
    await signUpAndConfirm(page, testInfo);

    await page.getByText("Tiếng Nhật").click();
    await page.getByRole("button", { name: "Tiếp tục" }).click();
    await page.getByText("N5", { exact: true }).click();
    await page.getByRole("button", { name: "Quay lại" }).click();

    await page.getByText("Tiếng Anh").click();
    await page.getByRole("button", { name: "Tiếp tục" }).click();

    await expect(page.getByText("A1", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tiếp tục" })).toBeDisabled();
  });
});
