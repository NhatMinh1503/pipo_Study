import { describe, expect, it } from "vitest";

import { CLOZE_BLANK, makeCloze } from "./cloze";

describe("makeCloze", () => {
  it("hides the exact word", () => {
    expect(makeCloze("駅の近くに行きました。", "駅")).toEqual({
      text: `${CLOZE_BLANK}の近くに行きました。`,
      found: true,
    });
  });

  it("falls back to the stem for inflected Japanese words", () => {
    expect(makeCloze("野菜がとても安かったです。", "安い").text).toBe(
      `野菜がとても${CLOZE_BLANK}かったです。`,
    );
    expect(makeCloze("晩ご飯を食べました。", "食べる").text).toBe(`晩ご飯を${CLOZE_BLANK}ました。`);
  });

  it("is case-insensitive for English and keeps the rest of the sentence", () => {
    expect(makeCloze("The Station is near.", "station").text).toBe(`The ${CLOZE_BLANK} is near.`);
  });

  it("only hides the first occurrence", () => {
    expect(makeCloze("cat and cat", "cat").text).toBe(`${CLOZE_BLANK} and cat`);
  });

  it("returns the sentence unchanged when the word is not in it", () => {
    expect(makeCloze("犬が走る。", "猫")).toEqual({ text: "犬が走る。", found: false });
    expect(makeCloze("anything", "")).toEqual({ text: "anything", found: false });
  });
});
