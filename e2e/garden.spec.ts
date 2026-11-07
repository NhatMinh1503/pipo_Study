import { expect, test } from "@playwright/test";

import { plantTree } from "./helpers/admin";
import { createOnboardedUser } from "./helpers/auth";

test.describe("garden scene", () => {
  // garden-scene test case #13: the scene loads, with a text summary and no errors
  test("draws the garden for the learner's trees without errors", async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    const email = await createOnboardedUser(page, testInfo);
    await plantTree(email, { species: "bamboo", sessions: 4, plot: 0 });
    await plantTree(email, { species: "pine", sessions: 2, plot: 9 });
    await page.goto("/garden");

    const scene = page.getByRole("img", { name: "Vườn tri thức: 2 cây, 1 cây đang lớn" });
    await expect(scene).toBeVisible();
    await expect(scene.locator("canvas")).toHaveCount(1);
    await expect(page.locator("[data-scene-ready='true']")).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test("respects reduced motion", async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await createOnboardedUser(page, testInfo);
    await page.goto("/garden");
    await expect(page.locator("[data-scene-ready='true']")).toHaveAttribute(
      "data-motion",
      "reduced",
    );
  });
});
