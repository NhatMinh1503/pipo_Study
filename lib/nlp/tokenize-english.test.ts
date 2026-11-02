import { describe, expect, it } from "vitest";

import { tokenizeEnglish } from "./tokenize-english";

describe("tokenizeEnglish", () => {
  it("keeps every character so tokens can be re-joined into the sentence", () => {
    const sentence = "Mr. Smith's well-known café, 3.5 km away!";
    expect(
      tokenizeEnglish(sentence)
        .map((token) => token.surface)
        .join(""),
    ).toBe(sentence);
  });

  it("marks only words as clickable and lowercases the base form", () => {
    const words = tokenizeEnglish("I don't KNOW.").filter((token) => token.isWord);
    expect(words.map((token) => token.base)).toEqual(["i", "don't", "know"]);
  });

  it("treats hyphenated words as one word", () => {
    const words = tokenizeEnglish("a well-known fact").filter((token) => token.isWord);
    expect(words.map((token) => token.surface)).toEqual(["a", "well-known", "fact"]);
  });

  it("returns nothing for an empty string", () => {
    expect(tokenizeEnglish("")).toEqual([]);
  });
});
