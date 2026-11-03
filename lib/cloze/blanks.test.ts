import { describe, expect, it } from "vitest";

import type { Token } from "@/lib/nlp/token";

import { sanitizeBlanks } from "./blanks";

const tok = (surface: string, pos: Token["pos"] = "noun", isWord = true): Token => ({
  surface,
  base: surface,
  reading: "",
  pos,
  isWord,
});

const s1 = "11111111-1111-4111-8111-111111111111";
const s2 = "22222222-2222-4222-8222-222222222222";
const sentences = [
  {
    id: s1,
    tokens: [
      tok("駅"),
      tok("に", "particle"),
      tok("行き", "verb"),
      tok("ます", "auxiliary"),
      tok("。", "symbol", false),
    ],
  },
  {
    id: s2,
    tokens: [
      tok("猫"),
      tok("が", "particle"),
      tok("好き", "na-adjective"),
      tok("です", "auxiliary"),
    ],
  },
];

describe("sanitizeBlanks", () => {
  it("keeps valid word blanks in lesson order", () => {
    expect(
      sanitizeBlanks(sentences, [
        { sentenceId: s2, tokenIndex: 0 },
        { sentenceId: s1, tokenIndex: 2 },
        { sentenceId: s1, tokenIndex: 0 },
      ]),
    ).toEqual([
      { sentenceId: s1, tokenIndex: 0 },
      { sentenceId: s1, tokenIndex: 2 },
      { sentenceId: s2, tokenIndex: 0 },
    ]);
  });

  it("drops punctuation, particles, auxiliaries, unknown sentences and out-of-range indices", () => {
    expect(
      sanitizeBlanks(sentences, [
        { sentenceId: s1, tokenIndex: 1 },
        { sentenceId: s1, tokenIndex: 3 },
        { sentenceId: s1, tokenIndex: 4 },
        { sentenceId: s1, tokenIndex: 99 },
        { sentenceId: "33333333-3333-4333-8333-333333333333", tokenIndex: 0 },
      ]),
    ).toEqual([]);
  });

  it("allows at most two blanks per sentence and removes duplicates", () => {
    const result = sanitizeBlanks(sentences, [
      { sentenceId: s2, tokenIndex: 0 },
      { sentenceId: s2, tokenIndex: 0 },
      { sentenceId: s2, tokenIndex: 2 },
      { sentenceId: s1, tokenIndex: 0 },
      { sentenceId: s1, tokenIndex: 2 },
      { sentenceId: s1, tokenIndex: 0 },
    ]);
    expect(result.filter((blank) => blank.sentenceId === s2)).toHaveLength(2);
    expect(result).toHaveLength(4);
  });
});
