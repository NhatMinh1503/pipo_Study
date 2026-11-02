import { expect, test } from "@playwright/test";

import { waitForEmailLink } from "./helpers/mailpit";

const DEMO = { email: "demo@pipo.local", password: "password123" };

test.describe("authentication", () => {
  test("redirects signed-out visitors from protected pages to login, then back", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);

    await page.getByLabel("Email").fill(DEMO.email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(DEMO.password);
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("shows an error for wrong credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(DEMO.email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    await expect(page.locator("form").getByRole("alert")).toHaveText(
      "Email hoặc mật khẩu không đúng.",
    );
  });

  test("validates the form on the client before calling the server", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("short");
    await page.getByRole("button", { name: "Đăng ký" }).click();

    await expect(page.getByText("Email không hợp lệ.")).toBeVisible();
    await expect(page.getByText("Mật khẩu cần ít nhất 8 ký tự.")).toBeVisible();
  });

  test("sign up → confirm email → signed in → sign out", async ({ page }, testInfo) => {
    const email = `e2e-${Date.now()}-${testInfo.project.name}@pipo.local`;

    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill("password123");
    await page.getByLabel("Nhập lại mật khẩu").fill("password123");
    await page.getByRole("button", { name: "Đăng ký" }).click();
    await expect(page.getByText("Kiểm tra email của bạn")).toBeVisible();

    // Signing in before confirming is refused
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText("chưa được xác thực");

    // The confirmation link signs the user in and continues to onboarding
    await page.goto(await waitForEmailLink(email));
    await expect(page).toHaveURL(/\/onboarding/);

    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("signed-in users skip guest pages", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(DEMO.email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(DEMO.password);
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/signup");
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
