import { expect, type Page, type TestInfo } from "@playwright/test";

import { waitForEmailLink } from "./mailpit";

export const DEMO = { email: "demo@pipo.local", password: "password123" };

/** Signs in through the UI (Vietnamese labels, the default locale). */
export async function signIn(page: Page, email = DEMO.email, password = DEMO.password) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

/** Creates a brand-new account and confirms it via the Mailpit email; ends signed in on /onboarding. */
export async function signUpAndConfirm(page: Page, testInfo: TestInfo) {
  const email = `e2e-${Date.now()}-${testInfo.project.name}-${testInfo.workerIndex}@pipo.local`;

  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("password123");
  await page.getByLabel("Nhập lại mật khẩu").fill("password123");
  await page.getByRole("button", { name: "Đăng ký" }).click();
  await expect(page.getByText("Kiểm tra email của bạn")).toBeVisible();

  await page.goto(await waitForEmailLink(email));
  await expect(page).toHaveURL(/\/onboarding$/);
  return email;
}

/** Signs out through the account menu in the app header. */
export async function signOutViaMenu(page: Page) {
  await page
    .getByRole("button", { name: /menu tài khoản|account menu|アカウントメニュー/ })
    .click();
  await page.getByRole("button", { name: /Đăng xuất|Sign out|ログアウト/ }).click();
}
