import { describe, expect, it } from "vitest";

import { tokenizeJapanese } from "./tokenize-japanese";

describe("tokenizeJapanese (kuromoji)", () => {
  it("keeps the full sentence and gives dictionary forms, readings and POS", async () => {
    const sentence = "昨日、安いりんごを食べました。";
    const tokens = await tokenizeJapanese(sentence);

    expect(tokens.map((token) => token.surface).join("")).toBe(sentence);
    expect(tokens.find((token) => token.surface === "昨日")).toMatchObject({
      reading: "きのう",
      pos: "noun",
      isWord: true,
    });
    expect(tokens.find((token) => token.surface === "安い")).toMatchObject({
      base: "安い",
      reading: "やすい",
      pos: "i-adjective",
    });
    expect(tokens.find((token) => token.surface === "食べ")).toMatchObject({
      base: "食べる",
      pos: "verb",
    });
    expect(tokens.find((token) => token.surface === "を")).toMatchObject({
      pos: "particle",
      isWord: true,
    });
    expect(tokens.find((token) => token.surface === "。")).toMatchObject({
      pos: "symbol",
      isWord: false,
    });
  }, 20_000);

  it("recognizes na-adjective stems", async () => {
    const tokens = await tokenizeJapanese("静かな町です。");
    expect(tokens.find((token) => token.surface === "静か")).toMatchObject({ pos: "na-adjective" });
  }, 20_000);
});
