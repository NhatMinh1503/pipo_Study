import { describe, expect, it } from "vitest";

import { splitSentences } from "./split-sentences";

describe("splitSentences — Japanese", () => {
  it("splits on 。！？", () => {
    expect(splitSentences("駅に行きました。とても暑かったです！また行きますか？", "ja")).toEqual([
      "駅に行きました。",
      "とても暑かったです！",
      "また行きますか？",
    ]);
  });

  it("does not split on a terminator inside quotes", () => {
    expect(splitSentences("彼は「ありがとう。」と言った。私も笑った。", "ja")).toEqual([
      "彼は「ありがとう。」と言った。",
      "私も笑った。",
    ]);
  });

  it("recovers from an unbalanced closing bracket", () => {
    expect(splitSentences("」変な文。次の文。", "ja")).toEqual(["」変な文。", "次の文。"]);
  });

  it("groups consecutive terminators", () => {
    expect(splitSentences("本当ですか！？信じられない。", "ja")).toEqual([
      "本当ですか！？",
      "信じられない。",
    ]);
  });

  it("treats line breaks as boundaries and keeps a trailing fragment", () => {
    expect(splitSentences("タイトル\n\n  本文です。続き", "ja")).toEqual([
      "タイトル",
      "本文です。",
      "続き",
    ]);
  });

  it("returns nothing for blank input", () => {
    expect(splitSentences("  \n \r\n ", "ja")).toEqual([]);
  });
});

describe("splitSentences — English", () => {
  it("splits on sentence punctuation", () => {
    expect(splitSentences("I went home. It was late! Were you there?", "en")).toEqual([
      "I went home.",
      "It was late!",
      "Were you there?",
    ]);
  });

  it("does not split after common abbreviations", () => {
    expect(splitSentences("Mr. Smith met Dr. Lee today. They talked.", "en")).toEqual([
      "Mr. Smith met Dr. Lee today.",
      "They talked.",
    ]);
  });

  it("keeps a sentence without final punctuation", () => {
    expect(splitSentences("No period at the end", "en")).toEqual(["No period at the end"]);
  });

  it("handles Windows line endings", () => {
    expect(splitSentences("First line\r\nSecond line.", "en")).toEqual([
      "First line",
      "Second line.",
    ]);
  });
});
