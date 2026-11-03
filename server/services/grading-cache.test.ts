import { describe, expect, it } from "vitest";

import type { GradeInput } from "@/server/prompts/grade-translation.v1";

import { gradingCacheKey } from "./grading-cache";

const input: GradeInput = {
  source: "駅に行きます。",
  userTranslation: "Tôi đi ga.",
  sourceLanguage: "ja",
  level: "N5",
  targetLanguage: "vi",
  contextBefore: null,
  contextAfter: null,
  referenceTranslation: null,
};

describe("gradingCacheKey", () => {
  it("is a sha-256 hex digest", () => {
    expect(gradingCacheKey(input)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("ignores extra spaces and Unicode form", () => {
    expect(gradingCacheKey({ ...input, userTranslation: "  Tôi   đi ga. " })).toBe(
      gradingCacheKey(input),
    );
    expect(gradingCacheKey({ ...input, userTranslation: "Tôi đi ga." })).toBe(
      gradingCacheKey(input),
    );
  });

  it.each([
    ["wording", { userTranslation: "Tôi đi nhà ga." }],
    ["punctuation", { userTranslation: "Tôi đi ga!" }],
    ["level", { level: "N4" as const }],
    ["feedback language", { targetLanguage: "en" as const }],
    ["context", { contextAfter: "電車に乗ります。" }],
    ["reference", { referenceTranslation: "Tôi đến nhà ga." }],
  ])("changes with the %s", (_label, change) => {
    expect(gradingCacheKey({ ...input, ...change })).not.toBe(gradingCacheKey(input));
  });
});
