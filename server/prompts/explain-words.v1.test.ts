import { describe, expect, it } from "vitest";

import fixtures from "./fixtures/explain-words.json";
import {
  buildExplainWordsPrompt,
  explainWordsResponseSchema,
  MAX_WORDS_PER_CALL,
  type ExplainWordsInput,
} from "./explain-words.v1";

describe("explain-words.v1", () => {
  it.each(fixtures as (ExplainWordsInput & { case: string })[])(
    "builds a prompt: $case",
    (fixture) => {
      const prompt = buildExplainWordsPrompt(fixture);
      expect(prompt).toContain(`Words (${fixture.words.length}):`);
      for (const [index, word] of fixture.words.entries()) {
        expect(prompt).toContain(`${index + 1}. ${word.term}`);
        // Sentences are fenced as data so instructions inside them are not followed
        expect(prompt).toContain(`<<<${word.sentence}>>>`);
        if (word.reading) expect(prompt).toContain(`(reading: ${word.reading})`);
      }
    },
  );

  it("has at least 10 fixtures, none above the per-call limit", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(10);
    expect(fixtures.every((fixture) => fixture.words.length <= MAX_WORDS_PER_CALL)).toBe(true);
  });

  it("names the explanation language", () => {
    const prompt = buildExplainWordsPrompt({
      language: "en",
      displayLanguage: "my",
      words: [{ term: "run", reading: "", sentence: "I run." }],
    });
    expect(prompt).toContain("Explanation language: Burmese (Myanmar)");
  });

  it("parses a well-formed answer and rejects a malformed one", () => {
    const item = { term: "run", meaning: "chạy", partOfSpeech: "động từ", note: null };
    expect(explainWordsResponseSchema.safeParse({ words: [item] }).success).toBe(true);
    expect(
      explainWordsResponseSchema.safeParse({ words: [{ ...item, meaning: "" }] }).success,
    ).toBe(false);
    expect(
      explainWordsResponseSchema.safeParse({ words: Array(MAX_WORDS_PER_CALL + 1).fill(item) })
        .success,
    ).toBe(false);
  });
});
