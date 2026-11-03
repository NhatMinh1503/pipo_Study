import { expect, type Page, type TestInfo } from "@playwright/test";

import { waitForEmailLink } from "./mailpit";

export const DEMO = { email: "demo@pipo.local", password: "password123" };

/**
 * Signs in through the UI (Vietnamese labels, the default locale).
 * By default waits until the app has left /login, so the session cookie is set before
 * the test navigates anywhere else.
 */
export async function signIn(
  page: Page,
  email = DEMO.email,
  password = DEMO.password,
  { expectSuccess = true }: { expectSuccess?: boolean } = {},
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  if (expectSuccess) await page.waitForURL((url) => !url.pathname.startsWith("/login"));
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

/** Brand-new user who finished onboarding (Japanese N4, Vietnamese UI); ends on /dashboard. */
export async function createOnboardedUser(page: Page, testInfo: TestInfo) {
  const email = await signUpAndConfirm(page, testInfo);
  await page.getByText("Tiếng Nhật").click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByText("N4", { exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("button", { name: "Bắt đầu học" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return email;
}
