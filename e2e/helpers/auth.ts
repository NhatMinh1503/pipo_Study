import { expect, type Page, type TestInfo } from "@playwright/test";

import { waitForEmailLink } from "./mailpit";

export const DEMO = { email: "demo@pipo.local", password: "password123" };

/**
 * Signs in through the UI. Guest pages are in English (the default locale) until a
 * signed-in learner's display language takes over.
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
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  if (expectSuccess) await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

/** Creates a brand-new account and confirms it via the Mailpit email; ends signed in on /onboarding. */
export async function signUpAndConfirm(page: Page, testInfo: TestInfo) {
  const email = `e2e-${Date.now()}-${testInfo.project.name}-${testInfo.workerIndex}@pipo.local`;

  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByLabel("Confirm password").fill("password123");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();

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

/** The level-up moment: a modal that covers the page whenever a reward crosses a level. */
export const levelUpMoment = (page: Page) => page.getByRole("dialog", { name: /^Lv \d+ → Lv \d+/ });

/**
 * Tests that are not about the level-up moment close it whenever it shows, so XP earned
 * along the way never blocks the next click. A test about the moment removes the handler.
 */
export async function closeLevelUpsAutomatically(page: Page) {
  await page.addLocatorHandler(levelUpMoment(page), async (moment) => {
    await moment.getByRole("button", { name: /Tiếp tục|Continue/ }).click();
  });
}

/**
 * Brand-new user who finished onboarding (Japanese N4, Vietnamese UI); ends on /dashboard.
 * Onboarding starts in English and switches to Vietnamese when that display language is picked.
 */
export async function createOnboardedUser(page: Page, testInfo: TestInfo) {
  const email = await signUpAndConfirm(page, testInfo);
  await closeLevelUpsAutomatically(page);
  await page.getByText("Japanese", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("N4", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Vietnamese", { exact: true }).click();
  // The UI switches language as soon as it is picked
  await page.getByRole("button", { name: "Bắt đầu học" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return email;
}
