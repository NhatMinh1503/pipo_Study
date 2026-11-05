import { expect, test, type Page } from "@playwright/test";

import { deleteLessonByTitle } from "./helpers/admin";
import { DEMO, signIn } from "./helpers/auth";

test.describe("lessons", () => {
  test("create a Japanese lesson with live sentence preview, then delete it", async ({
    page,
  }, testInfo) => {
    const title = `E2E ${testInfo.project.name} ${Date.now()}`;
    // Always remove this test's lesson, even if a step below fails
    try {
      await createThenDeleteLesson(page, title);
    } finally {
      await deleteLessonByTitle(DEMO.email, title);
    }
  });

  test("shows validation errors and keeps the level valid when switching language", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/lessons/new");

    await page.getByRole("button", { name: "Tạo bài và bắt đầu dịch" }).click();
    await expect(page.getByText("Không được để trống.")).toHaveCount(2);

    // Demo user studies Japanese N4; switching to English must not keep a JLPT level
    await page.getByLabel("Ngôn ngữ").click();
    await page.getByRole("option", { name: "Tiếng Anh" }).click();
    await expect(page.getByLabel("Trình độ")).toHaveText("A1");
  });
});

/** Creates a 3-sentence lesson on the demo account, checks it, then deletes it in the UI. */
async function createThenDeleteLesson(page: Page, title: string) {
  await signIn(page);

  await page.goto("/lessons/new");
  await page.getByLabel("Tiêu đề").fill(title);
  await page
    .getByLabel("Đoạn văn")
    .fill("彼は「ありがとう。」と言った。私も笑った。\n明日また会いましょう！");

  const preview = page.getByRole("complementary");
  await expect(preview.getByText("Xem trước · 3 câu")).toBeVisible();
  await expect(preview.getByText("彼は「ありがとう。」と言った。")).toBeVisible();

  await page.getByRole("button", { name: "Tạo bài và bắt đầu dịch" }).click();
  await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]{36}\/translate$/);

  await page.goto("/lessons");
  const row = page.getByRole("listitem").filter({ hasText: title });
  await expect(row).toContainText("0/3");

  await row.getByRole("button", { name: `Xoá bài ${title}` }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Xoá" }).click();
  await expect(page.getByText("Đã xoá bài học.")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: title })).toHaveCount(0);
}
