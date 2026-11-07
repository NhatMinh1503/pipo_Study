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

  // garden-scene test case #12: every tree is reachable by keyboard and screen reader
  test("opens a tree's details from the list with the keyboard, and from the scene", async ({
    page,
  }, testInfo) => {
    const email = await createOnboardedUser(page, testInfo);
    await plantTree(email, { species: "bamboo", sessions: 2, plot: 0 });
    await page.goto("/garden");
    await expect(page.locator("[data-scene-ready='true']")).toHaveCount(1);

    const treeButton = page.getByRole("button", { name: "Tre · Cây con" });
    await treeButton.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Tre" });
    await expect(dialog).toContainText("Cây con");
    await expect(dialog).toContainText("2/4 phiên");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(treeButton).toBeFocused();

    // Plot 0 sits at the top-left of the map: click its trunk in the scene
    const scene = page.getByRole("img", { name: /Vườn tri thức/ });
    const box = await scene.boundingBox();
    if (!box) throw new Error("scene has no size");
    await page.mouse.click(box.x + (96 / 640) * box.width, box.y + (128 / 432) * box.height);
    await expect(page.getByRole("dialog", { name: "Tre" })).toBeVisible();
  });

  test("greeting Pipo makes it say something, also for screen readers", async ({
    page,
  }, testInfo) => {
    await createOnboardedUser(page, testInfo);
    await page.goto("/garden");
    await expect(page.locator("[data-scene-ready='true']")).toHaveCount(1);

    await page.getByRole("button", { name: "Chào Pipo" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Mình trồng cây đầu tiên nhé?" }),
    ).toHaveCount(1);
  });
});
