import { expect, test } from "@playwright/test";

import { DEMO, signIn, signOutViaMenu } from "./helpers/auth";
import { waitForEmailLink } from "./helpers/mailpit";

test.describe("authentication", () => {
  test("redirects signed-out visitors to login, then back to where they were going", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);

    await page.getByLabel("Email").fill(DEMO.email);
    await page.getByLabel("Password", { exact: true }).fill(DEMO.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("shows an error for wrong credentials", async ({ page }) => {
    await signIn(page, DEMO.email, "wrong-password", { expectSuccess: false });
    await expect(page.locator("form").getByRole("alert")).toHaveText(
      "Incorrect email or password.",
    );
  });

  test("validates the form on the client before calling the server", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page.getByText("Invalid email address.")).toBeVisible();
    await expect(page.getByText("Password must be at least 8 characters.")).toBeVisible();
  });

  test("an unconfirmed account cannot sign in until the email link is opened", async ({
    page,
  }, testInfo) => {
    const email = `e2e-unconfirmed-${Date.now()}-${testInfo.project.name}@pipo.local`;

    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm password").fill("password123");
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page.getByText("Check your email")).toBeVisible();

    await signIn(page, email, "password123", { expectSuccess: false });
    await expect(page.locator("form").getByRole("alert")).toContainText("not confirmed");

    await page.goto(await waitForEmailLink(email));
    await expect(page).toHaveURL(/\/onboarding$/);
  });

  test("signed-in users skip guest pages and can sign out", async ({ page }) => {
    await signIn(page);
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/signup");
    await expect(page).toHaveURL(/\/dashboard$/);

    await signOutViaMenu(page);
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
