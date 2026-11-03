import { describe, expect, it } from "vitest";

import { scoreLesson, scoreSentence } from "./scoring";

describe("scoreSentence", () => {
  it.each([
    [["exact"], 10, 1],
    [["acceptable"], 7, 1],
    [["incorrect", "exact"], 8, 2],
    [["incorrect", "incorrect", "acceptable"], 3, 3],
    [["incorrect", "incorrect", "incorrect", "incorrect", "exact"], 2, 5],
  ] as const)("%j → %i points in %i attempts", (verdicts, points, attempts) => {
    expect(scoreSentence({ verdicts })).toMatchObject({ points, attempts });
  });

  it("ignores attempts after the sentence was passed", () => {
    expect(scoreSentence({ verdicts: ["exact", "incorrect"] })).toMatchObject({
      points: 10,
      attempts: 1,
      finalVerdict: "exact",
    });
  });

  it("scores 0 for a sentence never passed", () => {
    expect(scoreSentence({ verdicts: ["incorrect", "incorrect"] })).toEqual({
      points: 0,
      attempts: 2,
      finalVerdict: "incorrect",
    });
    expect(scoreSentence({ verdicts: [] })).toEqual({
      points: 0,
      attempts: 0,
      finalVerdict: null,
    });
  });
});

describe("scoreLesson", () => {
  it("adds a perfect bonus when every sentence is exact on the first try", () => {
    const result = scoreLesson([{ verdicts: ["exact"] }, { verdicts: ["exact"] }]);
    expect(result).toMatchObject({
      points: 20,
      maxPoints: 20,
      percent: 100,
      xp: 20,
      coins: 2 + 3,
      perfect: true,
    });
  });

  it("computes percent, XP and coins for a mixed lesson", () => {
    const result = scoreLesson([
      { verdicts: ["exact"] },
      { verdicts: ["incorrect", "acceptable"] },
      { verdicts: ["acceptable"] },
    ]);
    // 10 + 5 + 7 = 22 of 30
    expect(result).toMatchObject({
      points: 22,
      maxPoints: 30,
      percent: 73,
      xp: 22,
      coins: 2,
      perfect: false,
    });
  });

  it("handles an empty lesson", () => {
    expect(scoreLesson([])).toMatchObject({ points: 0, percent: 0, coins: 0, perfect: false });
  });
});
