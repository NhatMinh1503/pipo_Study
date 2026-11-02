import { expect, test, type Page } from "@playwright/test";

import { cancelWaitingBattles } from "./helpers/admin";
import { createOnboardedUser } from "./helpers/auth";

async function finishOneLesson(page: Page, title: string) {
  await page.goto("/lessons/new");
  await page.getByLabel("Tiêu đề").fill(title);
  await page.getByLabel("Đoạn văn").fill("駅に行きます。");
  await page.getByRole("button", { name: "Tạo bài và bắt đầu dịch" }).click();
  await page.getByLabel(/Bản dịch của bạn/).fill("Tôi đi ga.");
  await page.getByLabel(/Bản dịch của bạn/).press("Enter");
  await page.getByRole("button", { name: "Câu tiếp theo" }).click();
  await page.getByRole("button", { name: "Nhận thưởng & xem kết quả" }).click();
  await expect(page).toHaveURL(/\/result$/);
}

test.describe("community", () => {
  test("publish a lesson, then like and comment on it", async ({ page }, testInfo) => {
    await createOnboardedUser(page, testInfo);
    const title = `Bài chia sẻ ${testInfo.project.name} ${Date.now()}`;
    await finishOneLesson(page, title);

    await page.getByRole("button", { name: "Chia sẻ lên cộng đồng" }).click();
    await expect(page).toHaveURL(/\/community$/);

    const post = page.getByRole("article").filter({ hasText: title });
    await expect(post).toContainText("Tôi đi ga.");

    await post.getByRole("button", { name: /Thích/ }).click();
    await expect(post.getByRole("button", { name: /Thích/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await post.getByLabel("Viết bình luận…").fill("Hay quá!");
    await post.getByRole("button", { name: "Gửi" }).click();
    await expect(post.getByText("Hay quá!")).toBeVisible();
    await expect(post).toContainText("1 bình luận");
  });

  test("leaderboard shows the learner after earning XP", async ({ page }, testInfo) => {
    await createOnboardedUser(page, testInfo);
    await finishOneLesson(page, "Leo bảng");

    await page.goto("/leaderboard");
    await expect(page.getByRole("heading", { name: "Bảng xếp hạng" })).toBeVisible();
    await expect(page.locator("li[aria-current='true']")).toContainText("Bạn");

    await page.getByRole("link", { name: "Chuỗi ngày" }).click();
    await expect(page.locator("li[aria-current='true']")).toContainText("1 ngày");
  });
});

test.describe("battle", () => {
  test("two learners battle and one wins", async ({ browser, page }, testInfo) => {
    // Matchmaking is global, so only one project runs this and old lobbies are cleared first
    test.skip(testInfo.project.name !== "desktop", "matchmaking is shared across projects");
    test.setTimeout(120_000);
    await cancelWaitingBattles();

    const otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    await createOnboardedUser(page, testInfo);
    await createOnboardedUser(other, testInfo);

    await page.goto("/battle");
    await page.getByRole("button", { name: "Tìm đối thủ" }).click();
    // First visit may compile the room route on the dev server
    await expect(page.getByRole("heading", { name: "Đang chờ đối thủ…" })).toBeVisible({
      timeout: 20_000,
    });

    await other.goto("/battle");
    await other.getByRole("button", { name: "Tìm đối thủ" }).click();
    await expect(other).toHaveURL(page.url());

    // The waiting player is pulled into the match without reloading
    await expect(page.getByText("Câu 1/5")).toBeVisible({ timeout: 15_000 });

    for (let index = 1; index <= 5; index++) {
      await expect(page.getByText(`Câu ${index}/5`)).toBeVisible();
      await page.getByLabel("Bản dịch của bạn").fill(`Câu dịch số ${index}`);
      await page.getByLabel("Bản dịch của bạn").press("Enter");
    }
    await expect(page.getByText("Bạn đã xong!")).toBeVisible();

    // The fake grader marks answers containing "sai" incorrect, so this player scores 0
    for (let index = 1; index <= 5; index++) {
      await expect(other.getByText(`Câu ${index}/5`)).toBeVisible();
      await other.getByLabel("Bản dịch của bạn").fill("sai");
      await other.getByLabel("Bản dịch của bạn").press("Enter");
    }

    await expect(other.getByRole("heading", { name: "Thua" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Thắng" })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("link", { name: "Về sảnh đấu" }).click();
    await expect(page.getByRole("link", { name: /Thắng/ })).toBeVisible();
    await otherContext.close();
  });

  test("leaving an active battle forfeits it", async ({ browser, page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "matchmaking is shared across projects");
    test.setTimeout(90_000);
    await cancelWaitingBattles();

    const otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    await createOnboardedUser(page, testInfo);
    await createOnboardedUser(other, testInfo);

    await page.goto("/battle");
    await page.getByRole("button", { name: "Tìm đối thủ" }).click();
    // First visit may compile the room route on the dev server
    await expect(page.getByRole("heading", { name: "Đang chờ đối thủ…" })).toBeVisible({
      timeout: 20_000,
    });
    await other.goto("/battle");
    await other.getByRole("button", { name: "Tìm đối thủ" }).click();
    await expect(other.getByText("Câu 1/5")).toBeVisible();

    await other.getByRole("button", { name: "Bỏ cuộc" }).click();
    await other.getByRole("alertdialog").getByRole("button", { name: "Bỏ cuộc" }).click();
    await expect(other).toHaveURL(/\/battle$/);

    await expect(page.getByRole("heading", { name: "Thắng" })).toBeVisible({ timeout: 15_000 });
    await otherContext.close();
  });
});
