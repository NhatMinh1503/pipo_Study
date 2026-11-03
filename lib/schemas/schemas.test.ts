import { describe, expect, it } from "vitest";

import { isLevelForLanguage, LEVEL_MISMATCH_MESSAGE } from "./common";
import { createLessonSchema } from "./lesson";
import { onboardingSchema } from "./profile";

describe("isLevelForLanguage", () => {
  it.each([
    ["ja", "N5", true],
    ["ja", "N1", true],
    ["en", "A1", true],
    ["en", "C2", true],
    ["ja", "B1", false],
    ["en", "N3", false],
  ] as const)("%s + %s → %s", (language, level, expected) => {
    expect(isLevelForLanguage(language, level)).toBe(expected);
  });
});

describe("onboardingSchema", () => {
  it("accepts a consistent choice", () => {
    const result = onboardingSchema.safeParse({
      learningLanguage: "ja",
      level: "N3",
      displayLanguage: "vi",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a level from the other language on the level field", () => {
    const result = onboardingSchema.safeParse({
      learningLanguage: "en",
      level: "N3",
      displayLanguage: "vi",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ["level"],
      message: LEVEL_MISMATCH_MESSAGE,
    });
  });

  it("rejects unknown display languages", () => {
    const result = onboardingSchema.safeParse({
      learningLanguage: "ja",
      level: "N3",
      displayLanguage: "fr",
    });
    expect(result.success).toBe(false);
  });
});

describe("createLessonSchema", () => {
  const valid = {
    title: "  Đi chợ  ",
    language: "ja",
    level: "N4",
    text: "駅に行きます。",
  } as const;

  it("trims title and text", () => {
    const result = createLessonSchema.parse(valid);
    expect(result.title).toBe("Đi chợ");
  });

  it("rejects whitespace-only text", () => {
    expect(createLessonSchema.safeParse({ ...valid, text: "   " }).success).toBe(false);
  });

  it("rejects a title over 120 characters", () => {
    expect(createLessonSchema.safeParse({ ...valid, title: "a".repeat(121) }).success).toBe(false);
  });

  it("rejects mismatched level", () => {
    expect(createLessonSchema.safeParse({ ...valid, level: "C1" }).success).toBe(false);
  });
});
