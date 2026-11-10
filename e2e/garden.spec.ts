import { expect, test } from "@playwright/test";

import { plotTile, SCENE_HEIGHT, SCENE_WIDTH, tileBase } from "../lib/garden/layout";

import { grantItem, plantTree } from "./helpers/admin";
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

    // Plot 0 is the top corner of the isometric map: click the sapling just above its base
    const scene = page.getByRole("img", { name: /Vườn tri thức/ });
    // Focusing the list may have scrolled the top of the scene (plot 0) out of view
    await scene.evaluate((element) => element.scrollIntoView({ block: "center" }));
    const box = await scene.boundingBox();
    if (!box) throw new Error("scene has no size");
    const base = tileBase(plotTile(0));
    await page.mouse.click(
      box.x + (base.x / SCENE_WIDTH) * box.width,
      box.y + ((base.y - 24) / SCENE_HEIGHT) * box.height,
    );
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

  // garden-scene test case #14: place, move and remove a decoration
  test("places a decoration on a slot and puts it back in storage", async ({ page }, testInfo) => {
    const email = await createOnboardedUser(page, testInfo);
    await grantItem(email, "deco-lantern");
    await grantItem(email, "deco-bench");
    await page.goto("/garden");
    await expect(page.locator("[data-scene-ready='true']")).toHaveCount(1);

    const lantern = page.getByLabel("Vị trí của Đèn lồng");
    await expect(lantern).toHaveValue("storage");
    await lantern.selectOption({ label: "Ô 2" });
    await expect(page.getByLabel("Vị trí của Đèn lồng")).toHaveValue("1");
    await expect(page.locator("[data-scene-ready='true']")).toHaveCount(1);

    // The bench cannot take the lantern's slot
    await expect(
      page.getByLabel("Vị trí của Ghế gỗ").locator("option", { hasText: "Ô 2 · Đèn lồng" }),
    ).toBeDisabled();

    await page.reload();
    await expect(page.getByLabel("Vị trí của Đèn lồng")).toHaveValue("1");
    await page.getByLabel("Vị trí của Đèn lồng").selectOption("storage");
    await expect(page.getByLabel("Vị trí của Đèn lồng")).toHaveValue("storage");
  });

  // garden-scene spec §3.4: 31 plots per garden; more trees open garden 2
  test("switches between gardens once the first one is full", async ({ page }, testInfo) => {
    const email = await createOnboardedUser(page, testInfo);
    for (let plot = 0; plot < 31; plot += 1) {
      await plantTree(email, { species: "pine", sessions: 4, plot });
    }
    await plantTree(email, { species: "bamboo", sessions: 4, plot: 0, garden: 2 });
    await page.goto("/garden");

    const nav = page.getByRole("navigation", { name: "Khu vườn" });
    await expect(nav).toContainText("Khu vườn 2/2");
    await expect(page.getByRole("button", { name: "Tre · Trưởng thành" })).toHaveCount(1);

    await nav.getByRole("link", { name: "Khu vườn trước" }).click();
    await expect(nav).toContainText("Khu vườn 1/2");
    await expect(page.getByRole("button", { name: "Thông Nhật · Trưởng thành" })).toHaveCount(31);
    await expect(page.locator("[data-scene-ready='true']")).toHaveCount(1);
  });
});
