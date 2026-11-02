import { describe, expect, it } from "vitest";

import { hasKanji, toHiragana } from "./kana";

describe("toHiragana", () => {
  it.each([
    ["エキ", "えき"],
    ["スーパー", "すーぱー"],
    ["ヴァイオリン", "ゔぁいおりん"],
    ["駅カタカナabc", "駅かたかなabc"],
    ["", ""],
  ])("%s → %s", (input, expected) => {
    expect(toHiragana(input)).toBe(expected);
  });
});

describe("hasKanji", () => {
  it.each([
    ["駅", true],
    ["人々", true],
    ["えき", false],
    ["スーパー", false],
    ["abc", false],
  ])("%s → %s", (input, expected) => {
    expect(hasKanji(input)).toBe(expected);
  });
});
