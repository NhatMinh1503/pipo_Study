import { describe, expect, it } from "vitest";

import type { Token } from "@/lib/nlp/token";
import { tokenizeEnglish } from "@/lib/nlp/tokenize-english";

import { collectLessonWords } from "./lesson-words";

const ja = (surface: string, base: string, reading: string, isWord = true): Token => ({
  surface,
  base,
  reading,
  pos: "noun",
  isWord,
});

describe("collectLessonWords", () => {
  it("lists each word once, in reading order, with its first sentence", () => {
    const sentences = ["I run fast.", "You run, I walk."].map((sourceText) => ({
      sourceText,
      tokens: tokenizeEnglish(sourceText),
    }));
    expect(collectLessonWords(sentences)).toEqual([
      { term: "i", reading: "", sentence: "I run fast." },
      { term: "run", reading: "", sentence: "I run fast." },
      { term: "fast", reading: "", sentence: "I run fast." },
      { term: "you", reading: "", sentence: "You run, I walk." },
      { term: "walk", reading: "", sentence: "You run, I walk." },
    ]);
  });

  it("keeps the same spelling with different readings apart", () => {
    const words = collectLessonWords([
      { sourceText: "生", tokens: [ja("生", "生", "なま")] },
      { sourceText: "生", tokens: [ja("生", "生", "せい")] },
    ]);
    expect(words.map((word) => word.reading)).toEqual(["なま", "せい"]);
  });

  it("skips punctuation, untokenized sentences and over-long terms", () => {
    expect(
      collectLessonWords([
        { sourceText: "。", tokens: [ja("。", "。", "", false)] },
        { sourceText: "x", tokens: null },
        { sourceText: "long", tokens: [ja("a", "a".repeat(101), "")] },
      ]),
    ).toEqual([]);
  });

  it("returns nothing for a lesson without sentences", () => {
    expect(collectLessonWords([])).toEqual([]);
  });
});
