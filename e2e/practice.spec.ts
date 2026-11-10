import { expect, test, type Page } from "@playwright/test";

import { createOnboardedUser } from "./helpers/auth";

async function createLesson(page: Page, text: string) {
  await page.goto("/lessons/new");
  await page.getByLabel("Tiêu đề").fill("Luyện tập");
  await page.getByLabel("Đoạn văn").fill(text);
  await page.getByRole("button", { name: "Tạo bài và bắt đầu dịch" }).click();
  await expect(page).toHaveURL(/\/lessons\/([0-9a-f-]{36})\/translate$/);
  return page.url().replace(/\/translate$/, "");
}

test.describe("practice modes", () => {
  test("dictation scores an exact copy 100% and marks mistakes", async ({ page }, testInfo) => {
    await createOnboardedUser(page, testInfo);
    const lessonUrl = await createLesson(page, "駅に行きます。猫がいます。");

    await page.goto(`${lessonUrl}/dictation`);
    const box = page.getByLabel("Gõ lại câu bạn vừa nghe...");

    await box.fill("駅に行きます");
    await page.getByRole("button", { name: "Kiểm tra" }).click();
    await expect(page.getByText("100%")).toBeVisible();
    await page.getByRole("button", { name: "Câu tiếp theo" }).click();

    await box.fill("猫います");
    await page.getByRole("button", { name: "Kiểm tra" }).click();
    await expect(page.getByTitle("Thiếu")).toHaveText("が");
    await page.getByRole("button", { name: "Câu tiếp theo" }).click();

    await expect(page.getByText("Trung bình của 2 câu")).toBeVisible();
  });

  test("cloze blanks a word chosen for the level and checks the answer", async ({
    page,
  }, testInfo) => {
    await createOnboardedUser(page, testInfo);
    const lessonUrl = await createLesson(page, "駅に行きます。");

    // The fake selector in E2E blanks the first noun (駅)
    await page.goto(`${lessonUrl}/cloze`);
    await page.getByLabel("Ô trống").fill("えき");
    await page.getByRole("button", { name: "Kiểm tra" }).click();
    await expect(page.getByText("Đúng 1/1 ô")).toBeVisible();
    await page.getByRole("button", { name: "Xem điểm" }).click();
    await expect(page.getByText("100%")).toBeVisible();
  });

  test("quiz needs words first, then runs a multiple-choice round", async ({ page }, testInfo) => {
    await createOnboardedUser(page, testInfo);

    await page.goto("/quiz");
    await expect(page.getByText("Cần ít nhất 4 từ có nghĩa trong Sổ tay")).toBeVisible();

    await createLesson(page, "駅に猫と犬と本があります。");
    const log: string[] = [];
    page.on("console", (m) => log.push(`console.${m.type()}: ${m.text().slice(0, 300)}`));
    page.on("pageerror", (e) => log.push(`pageerror: ${e.message.slice(0, 300)}`));
    page.on("framenavigated", (f) => { if (f === page.mainFrame()) log.push(`nav: ${f.url()}`); });
    page.on("response", (r) => { if (r.url().includes("/api/") || r.request().method() === "POST") log.push(`resp ${r.status()} ${r.request().method()} ${r.url().slice(0, 160)}`); });
    const source = page.getByRole("region", { name: "Văn bản gốc" });
    for (const word of ["駅", "猫", "犬", "本"]) {
      log.push(`--- word ${word}`);
      await source.getByRole("button", { name: word, exact: true }).click();
      try {
        await page.getByRole("dialog").getByRole("button", { name: "Thêm vào Sổ tay" }).click({ timeout: 20000 });
      } catch {
        const dialogs = await page.getByRole("dialog").evaluateAll((els) => els.map((e) => e.outerHTML.slice(0, 1500)));
        throw new Error(`DEBUG\n${log.join("\n")}\nDIALOGS\n${dialogs.join("\n====\n")}`);
      }
      await expect(
        page.getByRole("dialog").getByRole("button", { name: "Đã có trong Sổ tay" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
    }

    await page.goto("/quiz");
    for (let question = 1; question <= 4; question += 1) {
      await expect(page.getByText(`Câu ${question}/4`)).toBeVisible();
      const choices = page.getByRole("group", { name: "Chọn nghĩa đúng" }).getByRole("button");
      await expect(choices).toHaveCount(4);
      await page.keyboard.press("1");
      await page.getByRole("button", { name: "Tiếp theo" }).click();
    }
    await expect(page.getByText("Kết quả")).toBeVisible();
    await expect(page.getByText(/Đúng \d\/4/)).toBeVisible();
  });
});
