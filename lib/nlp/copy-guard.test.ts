import { describe, expect, it } from "vitest";

import { copySimilarity, isCopyOfSource, normalizeForCopyCheck } from "./copy-guard";

const SOURCE = "毎朝、電車で通学しています。";

describe("normalizeForCopyCheck", () => {
  it("drops spacing, punctuation and width differences", () => {
    expect(normalizeForCopyCheck(" 毎朝、電車で　通学しています。 ")).toBe(
      "毎朝電車で通学しています",
    );
    expect(normalizeForCopyCheck("ＡＢＣ！")).toBe("abc");
  });

  it("returns an empty string for punctuation only", () => {
    expect(normalizeForCopyCheck("。、！？ ")).toBe("");
  });
});

describe("copySimilarity", () => {
  it("is 1 for identical texts and 0 for unrelated ones", () => {
    expect(copySimilarity(SOURCE, SOURCE)).toBe(1);
    expect(copySimilarity("abc", "xyz")).toBe(0);
  });

  it("treats two empty texts as identical", () => {
    expect(copySimilarity("", "。")).toBe(1);
  });
});

describe("isCopyOfSource", () => {
  it("blocks a verbatim paste in the same language", () => {
    expect(isCopyOfSource({ source: SOURCE, answer: SOURCE, sameLanguage: true })).toBe(true);
  });

  it("blocks a paste that only changes punctuation or spacing", () => {
    const answer = "毎朝 電車で通学しています";
    expect(isCopyOfSource({ source: SOURCE, answer, sameLanguage: true })).toBe(true);
  });

  it("blocks a same-language copy with one character changed", () => {
    const answer = "毎朝、電車で通学しています！よ";
    expect(isCopyOfSource({ source: SOURCE, answer, sameLanguage: true })).toBe(true);
  });

  it("accepts a real rewording in the same language", () => {
    const answer = "朝はいつも電車に乗って学校へ行きます。";
    expect(isCopyOfSource({ source: SOURCE, answer, sameLanguage: true })).toBe(false);
  });

  it("blocks pasting the source as a translation into another language", () => {
    expect(isCopyOfSource({ source: SOURCE, answer: SOURCE, sameLanguage: false })).toBe(true);
  });

  it("accepts a real translation into another language", () => {
    const answer = "Mỗi sáng tôi đi học bằng tàu điện.";
    expect(isCopyOfSource({ source: SOURCE, answer, sameLanguage: false })).toBe(false);
  });

  it("is case-insensitive for English", () => {
    const source = "I walk to school every morning.";
    const answer = "i walk to school every morning";
    expect(isCopyOfSource({ source, answer, sameLanguage: true })).toBe(true);
  });

  it("only blocks exact copies of very short sentences", () => {
    expect(isCopyOfSource({ source: "はい。", answer: "はい", sameLanguage: true })).toBe(true);
    expect(isCopyOfSource({ source: "はい。", answer: "はいっ", sameLanguage: true })).toBe(false);
  });

  it("never flags an answer made of punctuation only", () => {
    expect(isCopyOfSource({ source: SOURCE, answer: "。", sameLanguage: true })).toBe(false);
  });
});
