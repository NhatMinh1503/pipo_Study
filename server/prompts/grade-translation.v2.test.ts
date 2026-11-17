import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { buildGradePrompt, isRewordingTask, PROMPT_VERSION, SYSTEM_INSTRUCTION } =
  await import("./grade-translation.v2");

const base = {
  source: "毎朝、電車で通学しています。",
  userTranslation: "朝はいつも電車で学校へ行きます。",
  sourceLanguage: "ja",
  level: "N4",
  targetLanguage: "ja",
  contextBefore: null,
  contextAfter: null,
  referenceTranslation: null,
} as const;

describe("grade-translation.v2", () => {
  it("has its own version so v1 cached verdicts are never reused", () => {
    expect(PROMPT_VERSION).toBe("grade-translation.v2");
  });

  it("asks for a rewording when lesson and display language are the same", () => {
    expect(isRewordingTask(base)).toBe(true);
    const prompt = buildGradePrompt(base);
    expect(prompt).toContain("Task: reword");
    expect(prompt).toContain("Sentence to reword: 毎朝、電車で通学しています。");
    expect(prompt).toContain("<<<\n朝はいつも電車で学校へ行きます。\n>>>");
  });

  it("keeps the translate task across languages", () => {
    const input = { ...base, targetLanguage: "vi" as const, userTranslation: "Tôi đi học." };
    expect(isRewordingTask(input)).toBe(false);
    const prompt = buildGradePrompt(input);
    expect(prompt).toContain("Task: translate");
    expect(prompt).toContain("Target language: Vietnamese");
  });

  it("tells the model that copying the source fails a rewording", () => {
    expect(SYSTEM_INSTRUCTION).toContain('"incorrect" if the answer copies the source');
    expect(SYSTEM_INSTRUCTION).toContain("the source pasted back");
  });
});
