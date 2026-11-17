import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { buildExplainPrompt, isMonolingual, SYSTEM_INSTRUCTION } = await import("./explain-word.v2");
const words = await import("./explain-words.v2");

const tsugaku = {
  term: "通学",
  reading: "つうがく",
  language: "ja",
  displayLanguage: "ja",
  sentence: "毎朝、電車で通学しています。",
} as const;

describe("explain-word.v2", () => {
  it("switches to the easiest-words mode for a Japanese word in a Japanese UI", () => {
    expect(isMonolingual(tsugaku)).toBe(true);
    expect(buildExplainPrompt(tsugaku)).toContain("Mode: monolingual (use the easiest words)");
  });

  it("stays bilingual when the UI is in another language", () => {
    const prompt = buildExplainPrompt({ ...tsugaku, displayLanguage: "vi" });
    expect(prompt).not.toContain("Mode: monolingual");
    expect(prompt).toContain("Explanation language: Vietnamese");
  });

  it("asks for N5 / A1 words and shows the 通学 example", () => {
    expect(SYSTEM_INSTRUCTION).toContain("JLPT N5");
    expect(SYSTEM_INSTRUCTION).toContain("CEFR A1");
    expect(SYSTEM_INSTRUCTION).toContain('通学 → "学校へ行くこと。学校に通うこと。"');
  });

  it("uses the same rules for the batch prompt", () => {
    expect(words.SYSTEM_INSTRUCTION).toContain("JLPT N5");
    const prompt = words.buildExplainWordsPrompt({
      language: "en",
      displayLanguage: "en",
      words: [{ term: "commute", reading: "", sentence: "I commute by train." }],
    });
    expect(prompt).toContain("Mode: monolingual (use the easiest words)");
    expect(words.PROMPT_VERSION).toBe("explain-words.v2");
  });
});
