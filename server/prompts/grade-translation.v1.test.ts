import { describe, expect, it } from "vitest";

import fixtures from "./fixtures/grade-translation.json";
import {
  buildGradePrompt,
  gradeResponseSchema,
  sanitizeGrade,
  type GradeInput,
} from "./grade-translation.v1";

const base: GradeInput = {
  source: "駅に行きます。",
  userTranslation: "Tôi đi đến ga.",
  sourceLanguage: "ja",
  level: "N5",
  targetLanguage: "vi",
  contextBefore: null,
  contextAfter: "電車に乗ります。",
  referenceTranslation: "Tôi đi ra ga.",
};

describe("buildGradePrompt", () => {
  it("includes languages, level, context and the fenced learner text", () => {
    const prompt = buildGradePrompt(base);
    expect(prompt).toContain("Source language: Japanese");
    expect(prompt).toContain("Target language: Vietnamese");
    expect(prompt).toContain("Learner level: N5");
    expect(prompt).toContain("Previous sentence: (none)");
    expect(prompt).toContain("Next sentence: 電車に乗ります。");
    expect(prompt).toContain("<<<\nTôi đi đến ga.\n>>>");
  });

  it("omits the reference line when there is none", () => {
    expect(buildGradePrompt({ ...base, referenceTranslation: null })).not.toContain("Reference");
  });

  it.each(fixtures)("builds a prompt for fixture: $name", (fixture) => {
    const prompt = buildGradePrompt({
      ...(fixture.input as Omit<
        GradeInput,
        "contextBefore" | "contextAfter" | "referenceTranslation"
      >),
      contextBefore: null,
      contextAfter: null,
      referenceTranslation: null,
    });
    expect(prompt).toContain(fixture.input.source);
    expect(prompt).toContain(fixture.input.userTranslation);
  });
});

describe("gradeResponseSchema", () => {
  it("rejects tags outside the taxonomy", () => {
    const result = gradeResponseSchema.safeParse({
      verdict: "incorrect",
      feedback: "x",
      hint: "y",
      errorTags: ["made_up_tag"],
      referenceTranslation: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("sanitizeGrade", () => {
  it("never leaks the reference translation on an incorrect verdict", () => {
    const result = sanitizeGrade({
      verdict: "incorrect",
      feedback: "Sai thì.",
      hint: "Chú ý thì của động từ.",
      errorTags: ["tense", "tense"],
      referenceTranslation: "Tôi đã đi ra ga.",
    });
    expect(result.referenceTranslation).toBeNull();
    expect(result.errorTags).toEqual(["tense"]);
  });

  it("drops error tags for an exact answer", () => {
    const result = sanitizeGrade({
      verdict: "exact",
      feedback: "Chính xác.",
      hint: null,
      errorTags: ["naturalness"],
      referenceTranslation: "Tôi đi ra ga.",
    });
    expect(result.errorTags).toEqual([]);
    expect(result.referenceTranslation).toBe("Tôi đi ra ga.");
  });
});
