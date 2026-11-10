import { expect, test } from "@playwright/test";

import { signUpAndConfirm } from "./helpers/auth";

test.describe("onboarding", () => {
  test("new user starts in English, picks language, level and display language, then lands on dashboard", async ({
    page,
  }, testInfo) => {
    await signUpAndConfirm(page, testInfo);

    // Main app is locked until onboarding is done
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/onboarding$/);

    // A new visitor sees English until they pick a display language
    await expect(page.getByText("Step 1 of 3")).toBeVisible();
    const next = page.getByRole("button", { name: "Continue" });
    await expect(next).toBeDisabled();

    await page.getByText("Japanese", { exact: true }).click();
    await next.click();

    // Only JLPT levels are offered for Japanese
    await expect(page.getByText("Step 2 of 3")).toBeVisible();
    await expect(page.getByText("B1", { exact: true })).toHaveCount(0);
    await page.getByText("N3", { exact: true }).click();
    await next.click();

    await expect(page.getByText("Step 3 of 3")).toBeVisible();
    await page.getByText("Vietnamese", { exact: true }).click();
    // Picking the display language switches the UI right away
    await expect(page.getByText("Bước 3/3")).toBeVisible();
    await page.getByRole("button", { name: "Bắt đầu học" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Xin chào!" })).toBeVisible();

    // Onboarding cannot be repeated
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("going back keeps choices and switching language clears an incompatible level", async ({
    page,
  }, testInfo) => {
    await signUpAndConfirm(page, testInfo);

    await page.getByText("Japanese", { exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByText("N5", { exact: true }).click();
    await page.getByRole("button", { name: "Back" }).click();

    await page.getByText("English", { exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("A1", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  });
});
